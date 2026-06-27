import crypto from 'crypto'
import type {
  PaymentProviderAdapter,
  CreatePaymentLinkParams,
  PaymentLinkResult,
  PaymentWebhookEvent,
  TransactionVerification,
} from '@/types/payments'

/**
 * Flutterwave payment provider adapter.
 *
 * STUB IMPLEMENTATION — all methods throw with guidance.
 * The API structure is correct and ready for full implementation
 * once Flutterwave API keys are configured.
 *
 * Flutterwave API Reference: https://developer.flutterwave.com/reference
 */
export class FlutterwaveAdapter implements PaymentProviderAdapter {
  private readonly secretKey: string
  private readonly secretHash: string

  constructor(secretKey: string, secretHash: string = '') {
    this.secretKey = secretKey
    this.secretHash = secretHash
  }

  /**
   * Create a Flutterwave payment link.
   *
   * API: POST https://api.flutterwave.com/v3/payments
   * Headers: Authorization: Bearer {secret_key}
   * Body: { tx_ref, amount, currency, redirect_url, customer: { email }, meta }
   * Response: { status, data: { link } }
   */
  async createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
    // TODO: Implement when Flutterwave keys are configured
    // const response = await fetch('https://api.flutterwave.com/v3/payments', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.secretKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     tx_ref: params.reference,
    //     amount: params.amount,
    //     currency: params.currency,
    //     redirect_url: params.callbackUrl,
    //     customer: { email: params.email },
    //     meta: params.metadata,
    //   }),
    // })
    // const data = await response.json()
    // return {
    //   url: data.data.link,
    //   reference: params.reference,
    // }
    void params
    throw new Error(
      'Flutterwave integration coming soon — configure your API keys in Settings > Payments',
    )
  }

  /**
   * Verify a Flutterwave webhook.
   *
   * Flutterwave sends a secret hash in the verif-hash header.
   * Compare it with your stored secret_hash.
   */
  verifyWebhook(body: string, signature: string): boolean {
    // Flutterwave uses a simple hash comparison, not HMAC
    // The verif-hash header value must match the secret_hash configured in the dashboard
    void body
    if (!this.secretHash) return false
    return crypto.timingSafeEqual(
      Buffer.from(this.secretHash),
      Buffer.from(signature),
    )
  }

  /**
   * Parse a Flutterwave webhook event payload.
   *
   * Events: charge.completed, transfer.completed
   * Payload: { event, data: { tx_ref, amount, currency, status, payment_type, meta } }
   */
  parseWebhookEvent(payload: Record<string, unknown>): PaymentWebhookEvent {
    const data = payload.data as Record<string, unknown> | undefined
    const event = String(payload.event ?? '')

    // Map Flutterwave events to our standard events
    let mappedEvent: PaymentWebhookEvent['event'] = 'charge.success'
    if (event === 'charge.completed') {
      const status = String(data?.status ?? '')
      mappedEvent = status === 'successful' ? 'charge.success' : 'charge.failed'
    } else if (event === 'transfer.completed') {
      const status = String(data?.status ?? '')
      mappedEvent = status === 'SUCCESSFUL' ? 'transfer.success' : 'transfer.failed'
    }

    return {
      event: mappedEvent,
      reference: String(data?.tx_ref ?? data?.reference ?? ''),
      amount: Number(data?.amount ?? 0),
      currency: String(data?.currency ?? 'NGN'),
      status: String(data?.status ?? 'unknown'),
      channel: data?.payment_type ? String(data.payment_type) : undefined,
      metadata: data?.meta as Record<string, unknown> | undefined,
    }
  }

  /**
   * Verify a transaction by ID.
   *
   * API: GET https://api.flutterwave.com/v3/transactions/:id/verify
   * Headers: Authorization: Bearer {secret_key}
   * Response: { status, data: { status, amount, currency } }
   */
  async verifyTransaction(reference: string): Promise<TransactionVerification> {
    // TODO: Implement when Flutterwave keys are configured
    // const response = await fetch(
    //   `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(reference)}/verify`,
    //   {
    //     headers: { 'Authorization': `Bearer ${this.secretKey}` },
    //   },
    // )
    // const data = await response.json()
    // return {
    //   verified: data.data.status === 'successful',
    //   status: data.data.status,
    //   amount: Number(data.data.amount),
    //   currency: data.data.currency,
    // }
    void reference
    throw new Error(
      'Flutterwave integration coming soon — configure your API keys in Settings > Payments',
    )
  }
}
