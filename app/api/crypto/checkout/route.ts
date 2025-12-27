/**
 * Crypto Checkout API - Secure Cryptocurrency Payment Processing
 * Creates checkout sessions for subscription upgrades with crypto
 */

import { NextRequest } from 'next/server';
import { getNOWPaymentsClient } from '@/lib/crypto/nowpayments-client';
import { TIER_PRICES } from '@/lib/crypto/subscriptions';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler, requireUser } from '@/lib/utils/api-wrapper';
import { successResponse, ValidationError } from '@/lib/utils/error-handler';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

const checkoutSchema = z.object({
  tier: z.enum(['PRO', 'TEAM', 'ENTERPRISE']),
});

export const POST = createApiHandler(
  async (context) => {
    const nowpayments = getNOWPaymentsClient(); // Initialize lazily

    if (!context.user) {
      throw new Error('User not authenticated');
    }

    const userId = context.user.id;
    const body = await context.request.json();
    const { tier } = checkoutSchema.parse(body);

    // Validate tier pricing
    const pricing = TIER_PRICES[tier];
    if (!pricing) {
      throw new ValidationError(`Invalid tier: ${tier}`);
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true&tier=${tier}&payment=crypto`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`;

    try {
      const payment = await nowpayments.createPayment({
        price_amount: pricing.amount,
        price_currency: pricing.currency,
        order_id: userId,
        order_description: `DocAI ${tier} Plan - AI-powered code documentation`,
        success_url: successUrl,
        cancel_url: cancelUrl,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/crypto/webhook`,
        metadata: {
          user_id: userId,
          tier: tier,
          customer_email: user.email,
          customer_name: user.name,
        },
      });

      logger.info('Crypto checkout created', {
        userId,
        tier,
        paymentId: payment.payment_id,
        amount: payment.price_amount,
        currency: payment.price_currency,
        payCurrency: payment.pay_currency,
      });

      return successResponse({
        checkoutUrl: payment.invoice_url,
        paymentId: payment.payment_id,
        amount: payment.price_amount,
        currency: payment.price_currency,
        payAmount: payment.pay_amount,
        payCurrency: payment.pay_currency,
        payAddress: payment.pay_address,
        tier,
        paymentMethod: 'crypto',
      });

    } catch (error) {
      logger.error('Crypto checkout creation failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tier
      });
      throw new Error('Failed to create crypto payment checkout');
    }
  },
  {
    requireAuth: true,
    methods: ['POST']
  }
);
