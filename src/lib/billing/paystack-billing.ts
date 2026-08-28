import crypto from 'crypto'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'

interface PaystackResponse<T = Record<string, unknown>> {
  status: boolean
  message: string
  data: T
}

interface PaystackPlan {
  id: number
  plan_code: string
  name: string
  amount: number
  interval: string
  currency: string
}

interface PaystackTransaction {
  authorization_url: string
  access_code: string
  reference: string
}

interface PaystackSubscription {
  subscription_code: string
  email_token: string
  status: string
  amount: number
  next_payment_date: string
}

interface PaystackCustomer {
  customer_code: string
  email: string
  first_name: string
  last_name: string
  id: number
}

/**
 * M4E Paystack Billing Service
 * Handles subscriptions (recurring) and one-time package payments
 */
export class PaystackBillingService {
  private readonly secretKey: string

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.PAYSTACK_SECRET_KEY || ''
    if (!this.secretKey) {
      console.warn('[PaystackBilling] No secret key configured')
    }
  }

  // ============================================================
  // HTTP Helper
  // ============================================================
  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<PaystackResponse<T>> {
    const url = `${PAYSTACK_BASE_URL}${path}`
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    }
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    const data = await response.json() as PaystackResponse<T>

    if (!response.ok || !data.status) {
      throw new Error(`Paystack API error: ${data.message || response.statusText}`)
    }

    return data
  }

  // ============================================================
  // Webhook Verification
  // ============================================================
  verifyWebhookSignature(body: string, signature: string): boolean {
    const computed = crypto
      .createHmac('sha512', this.secretKey)
      .update(body)
      .digest('hex')
    return computed === signature
  }

  // ============================================================
  // Customer Management
  // ============================================================
  async createCustomer(params: {
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    metadata?: Record<string, unknown>
  }): Promise<PaystackCustomer> {
    const resp = await this.request<PaystackCustomer>('POST', '/customer', params)
    return resp.data
  }

  async getCustomer(emailOrCode: string): Promise<PaystackCustomer | null> {
    try {
      const resp = await this.request<PaystackCustomer>(
        'GET',
        `/customer/${encodeURIComponent(emailOrCode)}`,
      )
      return resp.data
    } catch {
      return null
    }
  }

  // ============================================================
  // Plan Management
  // ============================================================
  async createPlan(params: {
    name: string
    amount: number // in kobo
    interval: 'monthly' | 'annually'
    currency?: string
    description?: string
  }): Promise<PaystackPlan> {
    const resp = await this.request<PaystackPlan>('POST', '/plan', {
      name: params.name,
      amount: params.amount,
      interval: params.interval,
      currency: params.currency || 'NGN',
      description: params.description,
    })
    return resp.data
  }

  async listPlans(): Promise<PaystackPlan[]> {
    const resp = await this.request<PaystackPlan[]>('GET', '/plan')
    return resp.data
  }

  // ============================================================
  // Subscription Management
  // ============================================================

  /**
   * Initialize a subscription transaction.
   * The user pays via the returned authorization_url.
   * On success, Paystack automatically creates the subscription.
   */
  async initializeSubscription(params: {
    email: string
    plan: string // plan code
    amount?: number // override amount in kobo
    callbackUrl?: string
    metadata?: Record<string, unknown>
  }): Promise<PaystackTransaction> {
    const resp = await this.request<PaystackTransaction>(
      'POST',
      '/transaction/initialize',
      {
        email: params.email,
        plan: params.plan,
        amount: params.amount,
        callback_url: params.callbackUrl,
        metadata: {
          ...params.metadata,
          payment_type: 'subscription',
        },
        channels: ['card', 'bank', 'ussd', 'bank_transfer'],
      },
    )
    return resp.data
  }

  /**
   * Get subscription details by code
   */
  async getSubscription(subscriptionCode: string): Promise<PaystackSubscription> {
    const resp = await this.request<PaystackSubscription>(
      'GET',
      `/subscription/${encodeURIComponent(subscriptionCode)}`,
    )
    return resp.data
  }

  /**
   * Enable a subscription
   */
  async enableSubscription(subscriptionCode: string, emailToken: string): Promise<void> {
    await this.request('POST', '/subscription/enable', {
      code: subscriptionCode,
      token: emailToken,
    })
  }

  /**
   * Disable (cancel) a subscription
   */
  async disableSubscription(subscriptionCode: string, emailToken: string): Promise<void> {
    await this.request('POST', '/subscription/disable', {
      code: subscriptionCode,
      token: emailToken,
    })
  }

  /**
   * Generate a subscription management link for the customer
   */
  async getSubscriptionManageLink(subscriptionCode: string): Promise<string> {
    const resp = await this.request<{ link: string }>(
      'GET',
      `/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`,
    )
    return resp.data.link
  }

  // ============================================================
  // One-Time Payments (Package Purchases)
  // ============================================================

  /**
   * Initialize a one-time payment for a package purchase
   */
  async initializePackagePayment(params: {
    email: string
    amount: number // in kobo
    reference?: string
    callbackUrl?: string
    packageKey: string
    packageName: string
    accountId: string
    metadata?: Record<string, unknown>
  }): Promise<PaystackTransaction> {
    const reference = params.reference || `pkg_${params.packageKey}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const resp = await this.request<PaystackTransaction>(
      'POST',
      '/transaction/initialize',
      {
        email: params.email,
        amount: params.amount,
        reference,
        callback_url: params.callbackUrl,
        metadata: {
          ...params.metadata,
          payment_type: 'package',
          package_key: params.packageKey,
          package_name: params.packageName,
          account_id: params.accountId,
        },
        channels: ['card', 'bank', 'ussd', 'bank_transfer'],
      },
    )
    return resp.data
  }

  // ============================================================
  // Transaction Verification
  // ============================================================

  async verifyTransaction(reference: string): Promise<{
    status: string
    amount: number
    currency: string
    channel: string
    reference: string
    customer: { email: string; customer_code: string }
    metadata: Record<string, unknown>
    plan?: { plan_code: string }
    subscription?: { subscription_code: string }
  }> {
    const resp = await this.request<{
      status: string
      amount: number
      currency: string
      channel: string
      reference: string
      customer: { email: string; customer_code: string }
      metadata: Record<string, unknown>
      plan?: { plan_code: string }
      subscription?: { subscription_code: string }
    }>('GET', `/transaction/verify/${encodeURIComponent(reference)}`)
    return resp.data
  }
}

// Singleton instance
let _instance: PaystackBillingService | null = null

export function getPaystackBilling(): PaystackBillingService {
  if (!_instance) {
    _instance = new PaystackBillingService()
  }
  return _instance
}
