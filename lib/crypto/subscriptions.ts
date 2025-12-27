/**
 * Crypto Subscription Management
 * Handles user subscriptions and plan management for crypto payments
 */

import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

export async function updateUserSubscription(
  userId: string,
  tier: string,
  status: string,
  chargeId?: string
) {
  // Map tier to subscription details
  const tierLimits = {
    FREE: { repos: 4, chatsPerMonth: 10, generateJobsPerDay: 1 },
    PRO: { repos: 20, chatsPerMonth: -1, generateJobsPerDay: 10 },
    TEAM: { repos: 100, chatsPerMonth: -1, generateJobsPerDay: 50 },
    ENTERPRISE: { repos: -1, chatsPerMonth: -1, generateJobsPerDay: -1 },
  };

  // Calculate subscription end date (monthly for paid tiers)
  let endsAt: Date | null = null;
  if (tier !== 'FREE' && status === 'ACTIVE') {
    endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + 1);
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        subscriptionStatus: status,
        subscriptionEndsAt: endsAt,
        paymentMethod: 'crypto',
        // Store charge ID for reference
        ...(chargeId && { lastChargeId: chargeId }),
      },
    });

    logger.info('Crypto subscription updated', { userId, tier, status });

  } catch (error) {
    logger.error('Failed to update crypto subscription', { error, userId, tier });
    throw error;
  }
}

export async function cancelUserSubscription(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'CANCELLED',
        subscriptionEndsAt: new Date(), // Cancel immediately for crypto
      },
    });

    logger.info('Crypto subscription cancelled', { userId });

  } catch (error) {
    logger.error('Failed to cancel crypto subscription', { error, userId });
    throw error;
  }
}

export async function getUserSubscription(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      paymentMethod: true,
      lastChargeId: true,
    },
  });
}

export const TIER_LIMITS = {
  FREE: {
    repos: 4,
    chatsPerMonth: 10,
    generateJobsPerDay: 1,
  },
  PRO: {
    repos: 20,
    chatsPerMonth: -1, // Unlimited
    generateJobsPerDay: 10,
  },
  TEAM: {
    repos: 100,
    chatsPerMonth: -1,
    generateJobsPerDay: 50,
  },
  ENTERPRISE: {
    repos: -1, // Unlimited
    chatsPerMonth: -1,
    generateJobsPerDay: -1,
  },
} as const;

export const TIER_PRICES = {
  FREE: { amount: 0, currency: 'USD' },
  PRO: { amount: 29, currency: 'USD' },
  TEAM: { amount: 99, currency: 'USD' },
  ENTERPRISE: { amount: 299, currency: 'USD' },
} as const;

export type SubscriptionTier = keyof typeof TIER_PRICES;
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
