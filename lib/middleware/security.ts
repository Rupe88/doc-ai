import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from './rate-limit'
import type { SubscriptionTier } from '@/types/paddle'

/**
 * CSRF protection middleware
 */
export function validateCSRF(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL

  if (!expectedOrigin) {
    // In development, allow all origins
    return process.env.NODE_ENV !== 'production'
  }

  // Check origin header
  if (origin && origin !== expectedOrigin) {
    return false
  }

  // Check referer header
  if (referer && !referer.startsWith(expectedOrigin)) {
    return false
  }

  return true
}

/**
 * Apply rate limiting to request
 */
export async function applyRateLimit(
  userId: string,
  tier: SubscriptionTier,
  type: 'api' | 'chat' | 'generate'
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const result = await rateLimit(userId, tier, type)

  if (!result.allowed) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Rate limit exceeded', resetAt: result.resetAt },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetAt.toString(),
            'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          },
        }
      ),
    }
  }

  return { allowed: true }
}

/**
 * Security headers middleware
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.github.com https://github.com;"
  )

  // X-Frame-Options
  response.headers.set('X-Frame-Options', 'DENY')

  // X-Content-Type-Options
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer-Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  return response
}

/**
 * Validate request size
 */
export function validateRequestSize(request: NextRequest, maxSize: number = 10 * 1024 * 1024): boolean {
  const contentLength = request.headers.get('content-length')
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    return size <= maxSize
  }
  return true
}

/**
 * Sanitize error messages (prevent information leakage)
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // In production, don't expose internal error messages
    if (process.env.NODE_ENV === 'production') {
      return 'An error occurred. Please try again later.'
    }
    return error.message
  }
  return 'An unexpected error occurred'
}

