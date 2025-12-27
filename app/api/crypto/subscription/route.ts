/**
 * Crypto Subscription Management API
 * Handles subscription operations for crypto payments
 */

import { NextRequest } from 'next/server';
import { getUserSubscription, cancelUserSubscription } from '@/lib/crypto/subscriptions';
import { createApiHandler, requireUser } from '@/lib/utils/api-wrapper';
import { successResponse, NotFoundError } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

// Get current subscription status
export const GET = createApiHandler(
  async (context) => {
    const user = requireUser(context);

    try {
      const subscription = await getUserSubscription(user.id);

      if (!subscription) {
        throw new NotFoundError('Subscription');
      }

      return successResponse({
        subscription: {
          tier: subscription.subscriptionTier,
          status: subscription.subscriptionStatus,
          endsAt: subscription.subscriptionEndsAt,
          paymentMethod: subscription.paymentMethod,
          lastChargeId: subscription.lastChargeId,
        },
      });

    } catch (error) {
      logger.error('Failed to fetch crypto subscription', { error, userId: user.id });
      throw error;
    }
  },
  { requireAuth: true, methods: ['GET'] }
);

// Cancel subscription
export const DELETE = createApiHandler(
  async (context) => {
    const user = requireUser(context);

    try {
      await cancelUserSubscription(user.id);

      logger.info('Crypto subscription cancelled by user', { userId: user.id });

      return successResponse({
        message: 'Subscription cancelled successfully',
        cancelledAt: new Date(),
      });

    } catch (error) {
      logger.error('Failed to cancel crypto subscription', { error, userId: user.id });
      throw error;
    }
  },
  { requireAuth: true, methods: ['DELETE'] }
);
