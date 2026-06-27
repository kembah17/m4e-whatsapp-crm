// Payment Provider Types
// Paystack and Flutterwave integration types

// ============================================================
// Payment Providers
// ============================================================
export type PaymentProviderName = 'paystack' | 'flutterwave'
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'abandoned' | 'reversed'

export interface PaymentProvider {
  id: string
  account_id: string
  provider: PaymentProviderName
  public_key_encrypted: string | null
  secret_key_encrypted: string | null
  webhook_secret: string | null
  is_active: boolean
  is_test_mode: boolean
  supported_channels: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreatePaymentProviderPayload {
  provider: PaymentProviderName
  public_key?: string
  secret_key?: string
  webhook_secret?: string
  is_test_mode?: boolean
  supported_channels?: string[]
}

// ============================================================
// Payment Transactions
// ============================================================
export interface PaymentTransaction {
  id: string
  account_id: string
  provider_id: string | null
  contact_id: string | null
  order_id: string | null
  external_reference: string | null
  amount: number
  currency: string
  status: TransactionStatus
  payment_channel: string | null
  provider_response: Record<string, unknown> | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ============================================================
// Payment Provider Adapter Interface
// ============================================================
export interface CreatePaymentLinkParams {
  amount: number
  currency: string
  email: string
  reference: string
  callbackUrl?: string
  metadata?: Record<string, unknown>
}

export interface PaymentLinkResult {
  url: string
  reference: string
  accessCode?: string
}

export interface PaymentWebhookEvent {
  event: 'charge.success' | 'charge.failed' | 'transfer.success' | 'transfer.failed'
  reference: string
  amount: number
  currency: string
  status: string
  channel?: string
  metadata?: Record<string, unknown>
}

export interface TransactionVerification {
  verified: boolean
  status: string
  amount: number
  currency: string
}

export interface PaymentProviderAdapter {
  createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult>
  verifyWebhook(body: string, signature: string): boolean
  parseWebhookEvent(payload: Record<string, unknown>): PaymentWebhookEvent
  verifyTransaction(reference: string): Promise<TransactionVerification>
}
