import { prisma } from '@/lib/db/prisma'
import type { SubscriptionTier } from '@/types/paddle'

export async function updateUserSubscription(
  customerId: string,
  tier: SubscriptionTier,
  status: string,
  endsAt?: Date
) {
  await prisma.user.update({
    where: { paddleCustomerId: customerId },
    data: {
      subscriptionTier: tier,
      subscriptionStatus: status,
      subscriptionEndsAt: endsAt,
    },
  })
}

export async function getUserByPaddleCustomerId(customerId: string) {
  return prisma.user.findUnique({
    where: { paddleCustomerId: customerId },
  })
}

export const TIER_LIMITS = {
  FREE: {
    repos: 3, // Increased from 1 to 3 for free tier
    chatsPerMonth: 10,
    generateJobsPerDay: 1,
  },
  PRO: {
    repos: 5,
    chatsPerMonth: -1,
    generateJobsPerDay: 10,
  },
  TEAM: {
    repos: 20,
    chatsPerMonth: -1,
    generateJobsPerDay: 50,
  },
  ENTERPRISE: {
    repos: -1,
    chatsPerMonth: -1,
    generateJobsPerDay: -1,
  },
} as const

