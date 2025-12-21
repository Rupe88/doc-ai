import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createApiHandler } from '@/lib/utils/api-wrapper'
import { successResponse } from '@/lib/utils/error-handler'
import { logger } from '@/lib/utils/logger'

export const GET = createApiHandler(
  async (context) => {
    if (!context.user) {
      throw new Error('User not authenticated')
    }

    const userId = context.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        paddleCustomerId: true,
        email: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    logger.info('Subscription fetched', { userId, tier: user.subscriptionTier })

    return successResponse({
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      endsAt: user.subscriptionEndsAt,
      customerId: user.paddleCustomerId,
      email: user.email,
    })
  },
  {
    requireAuth: true,
    methods: ['GET'],
  }
)

