import { NextRequest } from 'next/server'
import { PaddleClient } from '@/lib/paddle/client'
import { updateUserSubscription, getUserByPaddleCustomerId } from '@/lib/paddle/subscriptions'
import { createApiHandler } from '@/lib/utils/api-wrapper'
import { successResponse, AuthenticationError } from '@/lib/utils/error-handler'
import { logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/db/prisma'

const paddle = new PaddleClient()

function mapProductIdToTier(productId: string): 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE' {
  if (productId === process.env.PADDLE_PRODUCT_ID_PRO) return 'PRO'
  if (productId === process.env.PADDLE_PRODUCT_ID_TEAM) return 'TEAM'
  if (productId === process.env.PADDLE_PRODUCT_ID_ENTERPRISE) return 'ENTERPRISE'
  return 'FREE'
}

export const POST = createApiHandler(
  async (context) => {
    const signature = context.request.headers.get('paddle-signature') || ''
    const body = await context.request.text()

    // Verify webhook signature
    if (!process.env.PADDLE_WEBHOOK_SECRET) {
      logger.warn('Paddle webhook secret not configured')
      throw new AuthenticationError('Webhook secret not configured')
    }

    if (!paddle.verifyWebhook(signature, body)) {
      logger.warn('Invalid Paddle webhook signature', {
        signature: signature.substring(0, 20) + '...',
      })
      throw new AuthenticationError('Invalid webhook signature')
    }

    // Parse event
    let event
    try {
      event = JSON.parse(body)
    } catch (error) {
      throw new Error('Invalid webhook payload format')
    }

    const eventType = event.event_type
    const data = event.data

    logger.info('Paddle webhook received', {
      eventType,
      customerId: data?.customer_id,
    })

    // Handle subscription events
    if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
      const customerId = data.customer_id
      if (!customerId) {
        throw new Error('Missing customer_id in webhook data')
      }

      const user = await getUserByPaddleCustomerId(customerId)

      if (user) {
        const tier = mapProductIdToTier(data.items?.[0]?.price_id || '')
        const status = data.status === 'active' ? 'ACTIVE' : 'CANCELLED'
        const endsAt = data.current_billing_period?.ends_at
          ? new Date(data.current_billing_period.ends_at)
          : undefined

        await updateUserSubscription(customerId, tier, status, endsAt)

        logger.info('User subscription updated', {
          userId: user.id,
          customerId,
          tier,
          status,
        })
      } else {
        logger.warn('Paddle webhook received for unknown customer', {
          customerId,
        })
      }
    } else if (eventType === 'subscription.canceled') {
      const customerId = data.customer_id
      if (!customerId) {
        throw new Error('Missing customer_id in webhook data')
      }

      const user = await getUserByPaddleCustomerId(customerId)

      if (user) {
        await updateUserSubscription(
          customerId,
          user.subscriptionTier as any,
          'CANCELLED'
        )

        logger.info('User subscription canceled', {
          userId: user.id,
          customerId,
        })
      } else {
        logger.warn('Paddle webhook received for unknown customer', {
          customerId,
        })
      }
    } else {
      logger.info('Unhandled Paddle webhook event', {
        eventType,
      })
    }

    return successResponse({
      received: true,
      eventType,
    })
  },
  {
    requireAuth: false, // Webhooks don't use user authentication
    methods: ['POST'],
  }
)

