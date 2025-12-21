/**
 * Script to clear rate limit for a user
 * Usage: npx tsx scripts/clear-rate-limit.ts <userId>
 */

import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

async function clearRateLimit(userId: string) {
  if (!redis) {
    console.log('Redis not configured - rate limits are not being enforced')
    return
  }

  const keys = [
    `rate_limit:generate:${userId}`,
    `rate_limit:chat:${userId}`,
    `rate_limit:api:${userId}`,
  ]

  for (const key of keys) {
    const deleted = await redis.del(key)
    console.log(`Deleted ${key}: ${deleted}`)
  }

  console.log(`✅ Rate limits cleared for user: ${userId}`)
}

const userId = process.argv[2]
if (!userId) {
  console.error('Usage: npx tsx scripts/clear-rate-limit.ts <userId>')
  process.exit(1)
}

clearRateLimit(userId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

