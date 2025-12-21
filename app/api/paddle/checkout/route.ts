import { NextRequest, NextResponse } from 'next/server'
import { PaddleClient } from '@/lib/paddle/client'
import { prisma } from '@/lib/db/prisma'
import { createApiHandler, getRequestBody } from '@/lib/utils/api-wrapper'
import { successResponse, ValidationError, ExternalServiceError } from '@/lib/utils/error-handler'

export const dynamic = 'force-dynamic'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

const paddle = new PaddleClient()

const PRODUCT_IDS: Record<string, string> = {
  PRO: process.env.PADDLE_PRODUCT_ID_PRO || '',
  TEAM: process.env.PADDLE_PRODUCT_ID_TEAM || '',
  ENTERPRISE: process.env.PADDLE_PRODUCT_ID_ENTERPRISE || '',
}

const checkoutSchema = z.object({
  tier: z.enum(['PRO', 'TEAM', 'ENTERPRISE']),
})

export const POST = createApiHandler(
  async (context) => {
    if (!context.user) {
      throw new Error('User not authenticated')
    }

    const userId = context.user.id
    const body = await getRequestBody(context, checkoutSchema)
    const { tier } = body

    // Validate product ID is configured
    if (!PRODUCT_IDS[tier] || PRODUCT_IDS[tier] === '') {
      throw new ValidationError(
        `Product ID for ${tier} tier not configured. Please set PADDLE_PRODUCT_ID_${tier} in environment variables.`
      )
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, paddleCustomerId: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (!user.email) {
      throw new ValidationError('User email is required for checkout')
    }

    // Create or get Paddle customer
    let customerId = user.paddleCustomerId
    if (!customerId) {
      try {
        customerId = await paddle.createOrGetCustomer(user.email, userId)
        
        // Save customer ID to database
        await prisma.user.update({
          where: { id: userId },
          data: { paddleCustomerId: customerId },
        })

        logger.info('Created Paddle customer', { userId, customerId })
      } catch (error) {
        logger.error('Failed to create Paddle customer', { error, userId })
        throw new ExternalServiceError('Paddle', 'Failed to create customer')
      }
    }

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&tier=${tier}`

    // Create checkout link
    try {
      const { checkoutUrl } = await paddle.createCheckout({
        productId: PRODUCT_IDS[tier],
        customerId,
        email: user.email,
        successUrl,
        passthrough: {
          userId,
          tier,
        },
      })

      logger.info('Checkout created', { userId, tier, customerId })

      return successResponse({ checkoutUrl })
    } catch (error) {
      logger.error('Failed to create checkout', { error, userId, tier })
      throw new ExternalServiceError('Paddle', 'Failed to create checkout link')
    }
  },
  {
    requireAuth: true,
    methods: ['POST'],
  }
)

