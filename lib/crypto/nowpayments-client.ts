/**
 * NOWPayments Client - Secure Multi-Crypto Payment Processing
 * Handles subscriptions, checkouts, and webhooks for global SaaS payments
 * Supports 40+ cryptocurrencies with enterprise-grade security
 */

interface NOWPaymentsConfig {
  apiKey: string;
  ipnSecret: string;
  testnet?: boolean;
}

export class NOWPaymentsClient {
  private apiKey: string;
  private ipnSecret: string;
  private baseUrl: string;
  private testnet: boolean;

  constructor(config: NOWPaymentsConfig) {
    this.apiKey = config.apiKey;
    this.ipnSecret = config.ipnSecret;
    this.testnet = config.testnet || false;
    this.baseUrl = this.testnet
      ? 'https://api-sandbox.nowpayments.io/v1'
      : 'https://api.nowpayments.io/v1';
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`NOWPayments API error: ${response.status} ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a crypto payment
   */
  async createPayment(params: {
    price_amount: number;
    price_currency: string;
    pay_currency?: string;
    order_id: string;
    order_description: string;
    success_url?: string;
    cancel_url?: string;
    ipn_callback_url?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    payment_id: string;
    payment_status: string;
    pay_address: string;
    pay_amount: number;
    pay_currency: string;
    price_amount: number;
    price_currency: string;
    order_id: string;
    order_description: string;
    payin_extra_id?: string;
    payout_extra_id?: string;
    invoice_url: string;
    created_at: number;
    updated_at: number;
  }> {
    try {
      const payload = {
        price_amount: params.price_amount,
        price_currency: params.price_currency.toLowerCase(),
        pay_currency: params.pay_currency,
        order_id: params.order_id,
        order_description: params.order_description,
        success_url: params.success_url,
        cancel_url: params.cancel_url,
        ipn_callback_url: params.ipn_callback_url,
        is_fee_paid_by_user: false, // We pay the fees
        ...params.metadata,
      };

      const response = await this.request('/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response || response.error) {
        throw new Error(`Payment creation failed: ${response?.message || 'Unknown error'}`);
      }

      return response;

    } catch (error) {
      console.error('NOWPayments payment creation error:', error);
      throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get payment status
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const response = await this.request(`/payment/${paymentId}`);
      return response;
    } catch (error) {
      console.error('NOWPayments payment retrieval error:', error);
      throw new Error('Failed to retrieve payment details');
    }
  }

  /**
   * Get supported currencies
   */
  async getCurrencies(): Promise<string[]> {
    try {
      const response = await this.request('/currencies');
      return response.currencies || [];
    } catch (error) {
      console.error('NOWPayments currencies error:', error);
      throw new Error('Failed to fetch supported currencies');
    }
  }

  /**
   * Get minimum payment amount for a currency
   */
  async getMinAmount(payCurrency: string): Promise<number> {
    try {
      const response = await this.request(`/min-amount?currency_from=${payCurrency.toLowerCase()}`);
      return response.min_amount || 0;
    } catch (error) {
      console.error('NOWPayments min amount error:', error);
      return 0;
    }
  }

  /**
   * Verify IPN signature
   */
  verifyIPNSignature(payload: any, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', this.ipnSecret);

      // Sort payload keys alphabetically for consistent hashing
      const sortedKeys = Object.keys(payload).sort();
      const sortedPayload: any = {};

      for (const key of sortedKeys) {
        sortedPayload[key] = payload[key];
      }

      hmac.update(JSON.stringify(sortedPayload), 'utf8');
      const expectedSignature = hmac.digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('IPN signature verification error:', error);
      return false;
    }
  }

  /**
   * Parse IPN notification
   */
  parseIPNNotification(payload: any): {
    eventType: string;
    paymentId: string;
    orderId?: string;
    paymentStatus: string;
    payAmount: number;
    payCurrency: string;
    priceAmount: number;
    priceCurrency: string;
    actuallyPaid: number;
    data: any;
  } {
    return {
      eventType: payload.payment_status || 'unknown',
      paymentId: payload.payment_id?.toString(),
      orderId: payload.order_id,
      paymentStatus: payload.payment_status,
      payAmount: payload.pay_amount || 0,
      payCurrency: payload.pay_currency || '',
      priceAmount: payload.price_amount || 0,
      priceCurrency: payload.price_currency || '',
      actuallyPaid: payload.actually_paid || 0,
      data: payload,
    };
  }

  /**
   * Get payment status description
   */
  getPaymentStatusDescription(status: string): string {
    const statuses: Record<string, string> = {
      'waiting': 'Waiting for payment',
      'confirming': 'Payment confirming',
      'confirmed': 'Payment confirmed',
      'sending': 'Sending payment',
      'partially_paid': 'Partially paid',
      'finished': 'Payment completed',
      'failed': 'Payment failed',
      'refunded': 'Payment refunded',
      'expired': 'Payment expired',
    };

    return statuses[status] || 'Unknown status';
  }

  /**
   * Estimate payment amount in crypto
   */
  async estimatePayment(params: {
    amount: number;
    currency_from: string;
    currency_to: string;
  }): Promise<{ estimated_amount: number; min_amount: number }> {
    try {
      const response = await this.request('/estimate', {
        method: 'POST',
        body: JSON.stringify({
          amount: params.amount,
          currency_from: params.currency_from.toLowerCase(),
          currency_to: params.currency_to.toLowerCase(),
        }),
      });

      return {
        estimated_amount: response.estimated_amount || 0,
        min_amount: response.min_amount || 0,
      };
    } catch (error) {
      console.error('NOWPayments estimate error:', error);
      return { estimated_amount: 0, min_amount: 0 };
    }
  }
}

// Singleton instance
let nowpaymentsClient: NOWPaymentsClient | null = null;

export function getNOWPaymentsClient(): NOWPaymentsClient {
  if (!nowpaymentsClient) {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    const testnet = process.env.NODE_ENV !== 'production';

    if (!apiKey || !ipnSecret) {
      throw new Error('NOWPayments configuration missing. Please set NOWPAYMENTS_API_KEY and NOWPAYMENTS_IPN_SECRET in environment variables.');
    }

    nowpaymentsClient = new NOWPaymentsClient({
      apiKey,
      ipnSecret,
      testnet,
    });
  }

  return nowpaymentsClient;
}
