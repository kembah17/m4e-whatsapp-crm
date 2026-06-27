import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { PaystackAdapter } from '@/lib/payments/paystack'
import { fireTrigger } from '@/lib/campaigns/trigger-engine'
import { matchContactByPhoneOrEmail } from '@/lib/ecommerce/sync'

/**
 * POST /api/webhooks/paystack
 *
 * Receives Paystack webhook events.
 * Verifies HMAC-SHA512 signature, logs transactions, and fires campaign triggers.
 *
 * NOTE: This is a functional stub — it processes webhooks correctly but
 * the PaystackAdapter.createPaymentLink and verifyTransaction methods
 * are not yet implemented. Webhook reception and trigger firing work.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Paystack signature header' },
      { status: 400 },
    )
  }

  const db = supabaseAdmin()

  // Find all active Paystack providers and try to verify against each
  const { data: providers, error: provErr } = await db
    .from('payment_providers')
    .select('id, account_id, secret_key_encrypted, webhook_secret')
    .eq('provider', 'paystack')
    .eq('is_active', true)

  if (provErr || !providers || providers.length === 0) {
    console.error('[paystack-webhook] No active Paystack providers found')
    return NextResponse.json({ error: 'No provider configured' }, { status: 404 })
  }

  // Try to find the matching provider by verifying the signature
  let matchedProvider: typeof providers[0] | null = null

  for (const provider of providers) {
    // Use webhook_secret if available, otherwise use the secret key
    const secret = provider.webhook_secret ?? provider.secret_key_encrypted ?? ''
    if (!secret) continue

    const adapter = new PaystackAdapter(secret)
    if (adapter.verifyWebhook(body, signature)) {
      matchedProvider = provider
      break
    }
  }

  if (!matchedProvider) {
    console.error('[paystack-webhook] Signature verification failed for all providers')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { account_id: accountId, id: providerId } = matchedProvider

  try {
    const payload = JSON.parse(body) as Record<string, unknown>
    const adapter = new PaystackAdapter('')
    const event = adapter.parseWebhookEvent(payload)

    // Look up the customer data from the payload
    const data = payload.data as Record<string, unknown> | undefined
    const customer = data?.customer as Record<string, unknown> | undefined
    const customerEmail = customer?.email ? String(customer.email) : null
    const customerPhone = customer?.phone ? String(customer.phone) : null

    // Match to a contact
    const contactId = await matchContactByPhoneOrEmail(
      db,
      accountId,
      customerPhone,
      customerEmail,
    )

    // Log the transaction
    const { error: txError } = await db
      .from('payment_transactions')
      .insert({
        account_id: accountId,
        provider_id: providerId,
        contact_id: contactId,
        external_reference: event.reference,
        amount: event.amount,
        currency: event.currency,
        status: event.event === 'charge.success' ? 'success' : 'failed',
        payment_channel: event.channel ?? null,
        provider_response: payload,
        metadata: event.metadata ?? {},
      })

    if (txError) {
      console.error('[paystack-webhook] Transaction insert error:', txError)
    }

    // Fire campaign triggers
    if (contactId) {
      const triggerEvent = event.event === 'charge.success'
        ? 'payment_confirmed'
        : 'payment_failed'

      await fireTrigger(db, accountId, {
        event: triggerEvent,
        account_id: accountId,
        contact_id: contactId,
      }, {
        contact_id: contactId,
        order_total: event.amount,
      })
    }

    // TODO: Link transaction to ecommerce_order if reference matches
    // TODO: Update order payment_status based on event
  } catch (err) {
    console.error('[paystack-webhook] Processing error:', err)
  }

  return NextResponse.json({ received: true })
}
