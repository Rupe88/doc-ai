export type SubscriptionTier = 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE'
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING'

export interface PaddleSubscription {
  id: string
  status: SubscriptionStatus
  plan_id: string
  customer_id: string
  current_billing_period: {
    starts_at: string
    ends_at: string
  }
  next_billing_date: string
  cancel_url: string
  update_url: string
}

export interface PaddleWebhookEvent {
  event_id: string
  event_type: string
  occurred_at: string
  data: {
    id: string
    status: string
    customer_id: string
    plan_id?: string
    [key: string]: any
  }
}

