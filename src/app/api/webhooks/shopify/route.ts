import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import {
  verifyShopifyWebhook,
  parseShopifyOrderEvent,
  parseShopifyCartEvent,
  parseShopifyProductEvent,
} from '@/lib/ecommerce/shopify'
import { syncProduct, syncOrder, syncCart, deleteProduct } from '@/lib/ecommerce/sync'
import { fireTrigger } from '@/lib/campaigns/trigger-engine'
import type { TriggerEvent, TriggerContext } from '@/types/campaigns'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/webhooks/shopify
 *
 * Receives Shopify webhooks. No auth required — verified by HMAC signature.
 * The integration is identified by the X-Shopify-Shop-Domain header.
 */
export async function POST(request: Request): Promise<Response> {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`webhook:${clientIp}`, RATE_LIMITS.webhook);
    if (!rl.success) return rateLimitResponse(rl);

  const body = await request.text()
  const signature = request.headers.get('x-shopify-hmac-sha256') ?? ''
  const topic = request.headers.get('x-shopify-topic') ?? ''
  const shopDomain = request.headers.get('x-shopify-shop-domain') ?? ''

  if (!signature || !topic || !shopDomain) {
    return NextResponse.json(
      { error: 'Missing required Shopify headers' },
      { status: 400 },
    )
  }

  const db = supabaseAdmin()

  // Look up the integration by store URL
  const { data: integration, error: intErr } = await db
    .from('ecommerce_integrations')
    .select('id, account_id, webhook_secret, is_active')
    .eq('platform', 'shopify')
    .ilike('store_url', `%${shopDomain}%`)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (intErr || !integration) {
    console.error('[shopify-webhook] Integration not found for domain:', shopDomain)
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
  }

  // Verify the webhook signature
  try {
    const isValid = verifyShopifyWebhook(body, signature, integration.webhook_secret)
    if (!isValid) {
      console.error('[shopify-webhook] Invalid signature for domain:', shopDomain)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } catch {
    console.error('[shopify-webhook] Signature verification failed')
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
  }

  const payload = JSON.parse(body) as Record<string, unknown>
  const { account_id: accountId, id: integrationId } = integration

  // Process the webhook asynchronously (return 200 quickly)
  // In production, this would be a background job. For now, we process inline
  // but catch all errors to ensure we always return 200.
  try {
    switch (topic) {
      // ---- Orders ----
      case 'orders/create':
      case 'orders/updated': {
        const orderEvent = parseShopifyOrderEvent(payload)
        const order = await syncOrder(db, accountId, integrationId, orderEvent)

        // Determine trigger event based on order status
        let triggerEventType: TriggerEvent['event'] | null = null
        if (topic === 'orders/create') {
          triggerEventType = 'order_placed'
        } else if (orderEvent.payment_status === 'paid') {
          triggerEventType = 'payment_confirmed'
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

      case 'orders/fulfilled': {
        const orderEvent = parseShopifyOrderEvent(payload)
        const order = await syncOrder(db, accountId, integrationId, {
          ...orderEvent,
          fulfillment_status: 'fulfilled',
          status: 'shipped',
        })

        if (order.contact_id) {
          await fireTrigger(db, accountId, {
            event: 'order_shipped',
            account_id: accountId,
            contact_id: order.contact_id,
            order_id: order.id,
          }, {
            contact_id: order.contact_id,
            order_number: order.order_number ?? undefined,
            order_total: order.total_amount ?? undefined,
            order_status: 'shipped',
          })
        }
        break
      }

      case 'orders/cancelled': {
        const orderEvent = parseShopifyOrderEvent(payload)
        const order = await syncOrder(db, accountId, integrationId, {
          ...orderEvent,
          status: 'cancelled',
        })

        if (order.contact_id) {
          await fireTrigger(db, accountId, {
            event: 'order_cancelled',
            account_id: accountId,
            contact_id: order.contact_id,
            order_id: order.id,
          }, {
            contact_id: order.contact_id,
            order_number: order.order_number ?? undefined,
            order_total: order.total_amount ?? undefined,
            order_status: 'cancelled',
          })
        }
        break
      }

      // ---- Products ----
      case 'products/create':
      case 'products/update': {
        const productEvent = parseShopifyProductEvent(payload)
        await syncProduct(db, accountId, integrationId, productEvent)
        break
      }

      case 'products/delete': {
        const externalId = String(payload.id ?? '')
        if (externalId) {
          await deleteProduct(db, accountId, integrationId, externalId)
        }
        break
      }

      // ---- Carts / Checkouts ----
      case 'carts/create':
      case 'carts/update':
      case 'checkouts/create':
      case 'checkouts/update': {
        const cartEvent = parseShopifyCartEvent(payload)
        await syncCart(db, accountId, integrationId, cartEvent)
        break
      }

      default:
        console.log(`[shopify-webhook] Unhandled topic: ${topic}`)
    }

    // Update last_synced_at
    await db
      .from('ecommerce_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', integrationId)
  } catch (err) {
    console.error(`[shopify-webhook] Error processing ${topic}:`, err)
    // Still return 200 to prevent Shopify from retrying
  }

  return NextResponse.json({ received: true })
}
