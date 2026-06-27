import crypto from 'crypto'
import type {
  PaymentProviderAdapter,
  CreatePaymentLinkParams,
  PaymentLinkResult,
  PaymentWebhookEvent,
  TransactionVerification,
} from '@/types/payments'

/**
 * Paystack payment provider adapter.
 *
 * STUB IMPLEMENTATION — all methods throw with guidance.
 * The API structure is correct and ready for full implementation
 * once Paystack API keys are configured.
 *
 * Paystack API Reference: https://paystack.com/docs/api/
 */
export class PaystackAdapter implements PaymentProviderAdapter {
  private readonly secretKey: string

  constructor(secretKey: string) {
    this.secretKey = secretKey
  }

  /**
   * Initialize a Paystack transaction and return a payment link.
   *
   * API: POST https://api.paystack.co/transaction/initialize
   * Headers: Authorization: Bearer {secret_key}
   * Body: { email, amount (in kobo), reference, callback_url, metadata }
   * Response: { status, data: { authorization_url, access_code, reference } }
   */
  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
    // TODO: Implement when Paystack keys are configured
    // const response = await fetch('https://api.paystack.co/transaction/initialize', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.secretKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     email: params.email,
    //     amount: Math.round(params.amount * 100), // Convert to kobo
    //     reference: params.reference,
    //     callback_url: params.callbackUrl,
    //     currency: params.currency,
    //     metadata: params.metadata,
    //   }),
    // })
    // const data = await response.json()
    // return {
    //   url: data.data.authorization_url,
    //   reference: data.data.reference,
    //   accessCode: data.data.access_code,
    // }
    void params
    throw new Error(
      'Paystack integration coming soon — configure your API keys in Settings > Payments',
    )
  }

  /**
   * Verify a Paystack webhook signature.
   *
   * Paystack signs webhooks with HMAC-SHA512 using the secret key.
   * The signature is sent in the X-Paystack-Signature header.
   */
  verifyWebhook(body: string, signature: string): boolean {
    const computed = crypto
      .createHmac('sha512', this.secretKey)
      .update(body)
      .digest('hex')
    return computed === signature
  }

  /**
   * Parse a Paystack webhook event payload.
   *
   * Events: charge.success, charge.failed, transfer.success, transfer.failed
   * Payload: { event, data: { reference, amount, currency, status, channel, metadata } }
   */
  parseWebhookEvent(payload: Record<string, unknown>): PaymentWebhookEvent {
    const data = payload.data as Record<string, unknown> | undefined
    return {
      event: payload.event as PaymentWebhookEvent['event'],
      reference: String(data?.reference ?? ''),
      amount: Number(data?.amount ?? 0) / 100, // Convert from kobo
      currency: String(data?.currency ?? 'NGN'),
      status: String(data?.status ?? 'unknown'),
      channel: data?.channel ? String(data.channel) : undefined,
      metadata: data?.metadata as Record<string, unknown> | undefined,
    }
  }

  /**
   * Verify a transaction by reference.
   *
   * API: GET https://api.paystack.co/transaction/verify/:reference
   * Headers: Authorization: Bearer {secret_key}
   * Response: { status, data: { status, amount, currency } }
   */
  async verifyTransaction(reference: string): Promise<TransactionVerification> {
    // TODO: Implement when Paystack keys are configured
    // const response = await fetch(
    //   `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    //   {
    //     headers: { 'Authorization': `Bearer ${this.secretKey}` },
    //   },
    // )
    // const data = await response.json()
    // return {
    //   verified: data.data.status === 'success',
    //   status: data.data.status,
    //   amount: Number(data.data.amount) / 100,
    //   currency: data.data.currency,
    // }
    void reference
    throw new Error(
      'Paystack integration coming soon — configure your API keys in Settings > Payments',
    )
  }
}
