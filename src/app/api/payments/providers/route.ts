import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { encrypt } from '@/lib/whatsapp/encryption'
import type { CreatePaymentProviderPayload, PaymentProviderName } from '@/types/payments'

const VALID_PROVIDERS: PaymentProviderName[] = ['paystack', 'flutterwave']

/**
 * GET /api/payments/providers
 * List configured payment providers for the current account.
 */
export async function GET() {
  try {
    const { accountId, supabase } = await getCurrentAccount()

    const { data, error } = await supabase
      .from('payment_providers')
      .select('id, provider, is_active, is_test_mode, supported_channels, metadata, created_at, updated_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ providers: data ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/payments/providers
 * Configure a payment provider.
 */
export async function POST(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const body = (await request.json()) as CreatePaymentProviderPayload

    if (!body.provider || !VALID_PROVIDERS.includes(body.provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
        { status: 400 },
      )
    }

    const payload: Record<string, unknown> = {
      account_id: accountId,
      provider: body.provider,
      is_test_mode: body.is_test_mode ?? true,
      is_active: false, // Must be explicitly activated
    }

    if (body.public_key) {
      payload.public_key_encrypted = encrypt(body.public_key)
    }
    if (body.secret_key) {
      payload.secret_key_encrypted = encrypt(body.secret_key)
    }
    if (body.webhook_secret) {
      payload.webhook_secret = body.webhook_secret
    }
    if (body.supported_channels) {
      payload.supported_channels = body.supported_channels
    }

    const { data, error } = await supabase
      .from('payment_providers')
      .upsert(payload, { onConflict: 'account_id,provider' })
      .select('id, provider, is_active, is_test_mode, supported_channels, created_at')
      .single()

    if (error) throw error

    return NextResponse.json({ provider: data }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
