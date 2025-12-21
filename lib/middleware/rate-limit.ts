import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import type { SubscriptionTier } from '@/types/paddle'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

const RATE_LIMITS: Record<SubscriptionTier, { api: number; chat: number; generate: number }> = {
  FREE: { api: 30, chat: 2, generate: 5 }, // Increased from 1 to 5 per hour
  PRO: { api: 120, chat: 10, generate: 10 },
  TEAM: { api: 300, chat: 30, generate: 50 },
  ENTERPRISE: { api: -1, chat: -1, generate: -1 },
}

export async function rateLimit(
  userId: string,
  tier: SubscriptionTier,
  type: 'api' | 'chat' | 'generate',
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limits = RATE_LIMITS[tier]
  const limit = limits[type]

  if (limit === -1) {
    return { allowed: true, remaining: -1, resetAt: Date.now() + windowSeconds * 1000 }
  }

  // If Redis not configured, allow all (for development)
  // This prevents rate limiting errors during development when Redis is not set up
  if (!redis) {
    console.warn(`[Rate Limit] Redis not configured - allowing all requests (dev mode)`)
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 }
  }

  const key = `rate_limit:${type}:${userId}`
  
  try {
    const current = await redis.incr(key)
    
    if (current === 1) {
      await redis.expire(key, windowSeconds)
    }

    const ttl = await redis.ttl(key)
    const resetAt = Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
    }
  } catch (error) {
    // If Redis fails, allow the request (fail open for development)
    console.error('[Rate Limit] Redis error, allowing request:', error)
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 }
  }
}

export function createRateLimitResponse(remaining: number, resetAt: number) {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetAt.toString(),
        'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
      },
    }
  )
}

/**
 * Clear rate limit for a user (useful for testing/admin)
 */
export async function clearRateLimitForUser(userId: string, type?: 'api' | 'chat' | 'generate'): Promise<void> {
  if (!redis) {
    return // No Redis, no rate limits to clear
  }

  try {
    if (type) {
      const key = `rate_limit:${type}:${userId}`
      await redis.del(key)
    } else {
      // Clear all rate limits for user
      const keys = ['api', 'chat', 'generate'].map(t => `rate_limit:${t}:${userId}`)
      for (const key of keys) {
        await redis.del(key)
      }
    }
  } catch (error) {
    console.error('[Rate Limit] Error clearing rate limit:', error)
  }
}

