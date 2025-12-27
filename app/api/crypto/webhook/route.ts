/**
 * NOWPayments IPN Handler - Secure Crypto Payment Processing
 * Processes payment notifications from NOWPayments IPN system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNOWPaymentsClient } from '@/lib/crypto/nowpayments-client';
import { updateUserSubscription } from '@/lib/crypto/subscriptions';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const nowpayments = getNOWPaymentsClient(); // Initialize lazily

    const body = await request.text();
    const signature = request.headers.get('x-nowpayments-sig');

    logger.info('NOWPayments IPN received', {
      signature: signature ? 'present' : 'missing',
      contentLength: body.length,
    });

    // Parse payload first
    const payload = JSON.parse(body);

    // Verify IPN signature
    if (!signature || !nowpayments.verifyIPNSignature(payload, signature)) {
      logger.warn('Invalid NOWPayments IPN signature', {
        paymentId: payload.payment_id
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const ipn = nowpayments.parseIPNNotification(payload);

    logger.info('Processing NOWPayments IPN', {
      eventType: ipn.eventType,
      paymentId: ipn.paymentId,
      orderId: ipn.orderId,
      paymentStatus: ipn.paymentStatus,
      payAmount: ipn.payAmount,
      payCurrency: ipn.payCurrency,
    });

    switch (ipn.paymentStatus) {
      case 'finished':
        await handlePaymentFinished(ipn);
        break;

      case 'failed':
        await handlePaymentFailed(ipn);
        break;

      case 'partially_paid':
        await handlePaymentPartial(ipn);
        break;

      case 'waiting':
      case 'confirming':
      case 'confirmed':
      case 'sending':
        await handlePaymentProcessing(ipn);
        break;

      default:
        logger.info('Unhandled NOWPayments IPN status', {
          paymentStatus: ipn.paymentStatus,
          paymentId: ipn.paymentId
        });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Crypto webhook processing error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentFinished(ipn: any) {
  const { orderId: userId, paymentId, data } = ipn;

  if (!userId || !data) {
    logger.warn('Missing userId or data in finished payment', { paymentId });
    return;
  }

  // Extract tier from metadata
  const tier = data.metadata?.tier || 'FREE';

  try {
    await updateUserSubscription(userId, tier, 'ACTIVE', paymentId);

    logger.info('Crypto subscription activated via NOWPayments', {
      userId,
      tier,
      paymentId,
      amount: ipn.priceAmount,
      currency: ipn.priceCurrency,
    });

    // Here you could send a welcome email, update usage counters, etc.

  } catch (error) {
    logger.error('Failed to process NOWPayments subscription confirmation', {
      error,
      userId,
      tier,
      paymentId
    });
  }
}

async function handlePaymentFailed(ipn: any) {
  const { paymentId, orderId: userId } = ipn;

  logger.warn('NOWPayments payment failed', {
    paymentId,
    userId,
    amount: ipn.priceAmount,
    currency: ipn.priceCurrency,
  });

  // Could send failure notification email, log for analysis, etc.
  // For now, just log the failure
}

async function handlePaymentPartial(ipn: any) {
  const { paymentId, orderId: userId } = ipn;

  logger.warn('NOWPayments partial payment received', {
    paymentId,
    userId,
    paid: ipn.actuallyPaid,
    required: ipn.priceAmount,
  });

  // Could notify user about partial payment
  // Or set up a mechanism to wait for remaining payment
}

async function handlePaymentProcessing(ipn: any) {
  const { paymentId, orderId: userId, paymentStatus } = ipn;

  logger.info('NOWPayments payment processing', {
    paymentId,
    userId,
    status: paymentStatus,
    amount: ipn.priceAmount,
  });

  // Could update UI to show "payment processing" status
  // Or send processing notification
}
