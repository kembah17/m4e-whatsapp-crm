import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import {
  verifyWooCommerceWebhook,
  parseWooCommerceOrderEvent,
  parseWooCommerceCartEvent,
  parseWooCommerceProductEvent,
} from '@/lib/ecommerce/woocommerce'
import { syncProduct, syncOrder, syncCart, deleteProduct } from '@/lib/ecommerce/sync'
import { fireTrigger } from '@/lib/campaigns/trigger-engine'
import type { TriggerEvent, TriggerContext } from '@/types/campaigns'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/webhooks/woocommerce
 *
 * Receives WooCommerce webhooks. No auth required — verified by HMAC signature.
 * The integration is identified by the X-WC-Webhook-Source header (store URL).
 */
export async function POST(request: Request): Promise<Response> {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`webhook:${clientIp}`, RATE_LIMITS.webhook);
    if (!rl.success) return rateLimitResponse(rl);

  const body = await request.text()
  const signature = request.headers.get('x-wc-webhook-signature') ?? ''
  const topic = request.headers.get('x-wc-webhook-topic') ?? ''
  const source = request.headers.get('x-wc-webhook-source') ?? ''

  if (!signature || !topic) {
    return NextResponse.json(
      { error: 'Missing required WooCommerce headers' },
      { status: 400 },
    )
  }

  const db = supabaseAdmin()

  // Look up the integration by store URL
  const { data: integration, error: intErr } = await db
    .from('ecommerce_integrations')
    .select('id, account_id, webhook_secret, is_active')
    .eq('platform', 'woocommerce')
    .ilike('store_url', `%${new URL(source || 'https://unknown').hostname}%`)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (intErr || !integration) {
    console.error('[woocommerce-webhook] Integration not found for source:', source)
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  // Verify the webhook signature
  try {
    const isValid = verifyWooCommerceWebhook(body, signature, integration.webhook_secret)
    if (!isValid) {
      console.error('[woocommerce-webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch {
    console.error('[woocommerce-webhook] Signature verification failed')
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
  }

  const payload = JSON.parse(body) as Record<string, unknown>
  const { account_id: accountId, id: integrationId } = integration

  try {
    switch (topic) {
      // ---- Orders ----
      case 'order.created':
      case 'order.updated': {
        const orderEvent = parseWooCommerceOrderEvent(payload)
        const order = await syncOrder(db, accountId, integrationId, orderEvent)

        let triggerEventType: TriggerEvent['event'] | null = null
        if (topic === 'order.created') {
          triggerEventType = 'order_placed'
        } else if (orderEvent.payment_status === 'paid') {
          triggerEventType = 'payment_confirmed'
        } else if (orderEvent.fulfillment_status === 'fulfilled') {
          triggerEventType = 'order_delivered'
        } else if (orderEvent.status === 'cancelled') {
          triggerEventType = 'order_cancelled'
        }

        if (triggerEventType && order.contact_id) {
          const context: TriggerContext = {
            contact_id: order.contact_id,
            order_number: order.order_number ?? undefined,
            order_total: order.total_amount ?? undefined,
            order_status: order.status,
            product_names: orderEvent.line_items.map((li) => li.title),
          }
          await fireTrigger(db, accountId, {
            event: triggerEventType,
            account_id: accountId,
            contact_id: order.contact_id,
            order_id: order.id,
          }, context)
        }
        break
      }

      case 'order.deleted': {
        // WooCommerce order deletion — update status to cancelled
        const orderEvent = parseWooCommerceOrderEvent(payload)
        await syncOrder(db, accountId, integrationId, {
          ...orderEvent,
          status: 'cancelled',
        })
        break
      }

      // ---- Products ----
      case 'product.created':
      case 'product.updated': {
        const productEvent = parseWooCommerceProductEvent(payload)
        await syncProduct(db, accountId, integrationId, productEvent)
        break
      }

      case 'product.deleted': {
        const externalId = String(payload.id ?? '')
        if (externalId) {
          await deleteProduct(db, accountId, integrationId, externalId)
        }
        break
      }

      // ---- Carts (if WooCommerce cart plugin is installed) ----
      case 'cart.created':
      case 'cart.updated': {
        const cartEvent = parseWooCommerceCartEvent(payload)
        await syncCart(db, accountId, integrationId, cartEvent)
        break
      }

      default:
        console.log(`[woocommerce-webhook] Unhandled topic: ${topic}`)
    }

    // Update last_synced_at
    await db
      .from('ecommerce_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', integrationId)
  } catch (err) {
    console.error(`[woocommerce-webhook] Error processing ${topic}:`, err)
  }

  return NextResponse.json({ received: true })
}
