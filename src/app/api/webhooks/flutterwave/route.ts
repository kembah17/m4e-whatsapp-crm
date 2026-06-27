import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { FlutterwaveAdapter } from '@/lib/payments/flutterwave'
import { fireTrigger } from '@/lib/campaigns/trigger-engine'
import { matchContactByPhoneOrEmail } from '@/lib/ecommerce/sync'

/**
 * POST /api/webhooks/flutterwave
 *
 * Receives Flutterwave webhook events.
 * Verifies the verif-hash header against the stored secret hash.
 *
 * NOTE: This is a functional stub — webhook reception and trigger firing work,
 * but the FlutterwaveAdapter payment methods are not yet implemented.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  const verifHash = request.headers.get('verif-hash') ?? ''

  if (!verifHash) {
    return NextResponse.json(
      { error: 'Missing Flutterwave verif-hash header' },
      { status: 400 },
    )
  }

  const db = supabaseAdmin()

  // Find all active Flutterwave providers
  const { data: providers, error: provErr } = await db
    .from('payment_providers')
    .select('id, account_id, secret_key_encrypted, webhook_secret')
    .eq('provider', 'flutterwave')
    .eq('is_active', true)

  if (provErr || !providers || providers.length === 0) {
    console.error('[flutterwave-webhook] No active Flutterwave providers found')
    return NextResponse.json({ error: 'No provider configured' }, { status: 404 })
  }

  // Try to find the matching provider
  let matchedProvider: typeof providers[0] | null = null

  for (const provider of providers) {
    const secretHash = provider.webhook_secret ?? ''
    if (!secretHash) continue

    const adapter = new FlutterwaveAdapter('', secretHash)
    if (adapter.verifyWebhook(body, verifHash)) {
      matchedProvider = provider
      break
    }
  }

  if (!matchedProvider) {
    console.error('[flutterwave-webhook] Verification failed for all providers')
    return NextResponse.json({ error: 'Invalid verification hash' }, { status: 401 })
  }

  const { account_id: accountId, id: providerId } = matchedProvider

  try {
    const payload = JSON.parse(body) as Record<string, unknown>
    const adapter = new FlutterwaveAdapter('', '')
    const event = adapter.parseWebhookEvent(payload)

    // Extract customer info
    const data = payload.data as Record<string, unknown> | undefined
    const customer = data?.customer as Record<string, unknown> | undefined
    const customerEmail = customer?.email ? String(customer.email) : null
    const customerPhone = customer?.phone_number ? String(customer.phone_number) : null

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
      console.error('[flutterwave-webhook] Transaction insert error:', txError)
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
  } catch (err) {
    console.error('[flutterwave-webhook] Processing error:', err)
  }

  return NextResponse.json({ received: true })
}
