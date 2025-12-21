export interface PaddleCheckoutOptions {
  productId: string
  customerId?: string
  email?: string
  successUrl: string
  passthrough?: Record<string, any>
}

export class PaddleClient {
  private apiKey: string
  private environment: 'sandbox' | 'production'

  constructor() {
    this.environment = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    this.apiKey = this.environment === 'sandbox' 
      ? process.env.PADDLE_SANDBOX_API_KEY || ''
      : process.env.PADDLE_API_KEY || ''
  }

  async createCheckout(options: PaddleCheckoutOptions): Promise<{ checkoutUrl: string }> {
    if (!this.apiKey) {
      throw new Error('Paddle API key not configured')
    }

    const baseUrl = this.environment === 'sandbox'
      ? 'https://sandbox-api.paddle.com'
      : 'https://api.paddle.com'

    // Use Paddle's Checkout Links API (v2)
    const response = await fetch(`${baseUrl}/checkout-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        items: [
          {
            price_id: options.productId,
            quantity: 1,
          },
        ],
        customer_id: options.customerId,
        customer_email: options.email,
        custom_data: options.passthrough,
        return_url: options.successUrl,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = 'Failed to create checkout'
      
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error?.message || errorData.message || errorMessage
      } catch {
        errorMessage = errorText || errorMessage
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    // Handle Paddle API v2 response format
    if (data.data?.url) {
      return { checkoutUrl: data.data.url }
    } else if (data.url) {
      return { checkoutUrl: data.url }
    } else {
      throw new Error('Invalid checkout response format')
    }
  }

  async createOrGetCustomer(email: string, userId: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Paddle API key not configured')
    }

    const baseUrl = this.environment === 'sandbox'
      ? 'https://sandbox-api.paddle.com'
      : 'https://api.paddle.com'

    // Try to find existing customer
    const searchResponse = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    if (searchResponse.ok) {
      const searchData = await searchResponse.json()
      if (searchData.data && searchData.data.length > 0) {
        return searchData.data[0].id
      }
    }

    // Create new customer
    const createResponse = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        email,
        custom_data: {
          userId,
        },
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`Failed to create customer: ${errorText}`)
    }

    const createData = await createResponse.json()
    return createData.data?.id || createData.id
  }

  verifyWebhook(signature: string, body: string): boolean {
    const secret = process.env.PADDLE_WEBHOOK_SECRET || ''
    const hmac = require('crypto').createHmac('sha256', secret)
    const hash = hmac.update(body).digest('base64')
    return signature === hash
  }
}

