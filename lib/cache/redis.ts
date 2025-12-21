import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

export const CACHE_KEYS = {
  user: (id: string) => `user:${id}`,
  repo: (id: string) => `repo:${id}`,
  doc: (id: string) => `doc:${id}`,
  chat: (hash: string) => `chat:${hash}`,
  githubRepos: (userId: string) => `github:repos:${userId}`,
}

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null
    try {
      const value = await redis.get(key)
      if (typeof value === 'string') {
        return JSON.parse(value) as T
      }
      return value as T | null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!redis) return
    try {
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, JSON.stringify(value))
      } else {
        await redis.set(key, JSON.stringify(value))
      }
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  async delete(key: string): Promise<void> {
    if (!redis) return
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Cache delete error:', error)
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!redis) return
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error)
    }
  }
}

export const cache = new CacheService()

