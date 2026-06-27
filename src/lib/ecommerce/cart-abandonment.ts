import type { SupabaseClient } from '@supabase/supabase-js'
import { fireTrigger } from '@/lib/campaigns/trigger-engine'

/** Default threshold in minutes before a cart is considered abandoned. */
const DEFAULT_ABANDONMENT_THRESHOLD_MINUTES = 60

/**
 * Detect abandoned carts across all accounts.
 *
 * Finds carts that are still 'active' but older than the threshold,
 * marks them as 'abandoned', and fires the cart_abandoned campaign trigger.
 *
 * @returns Number of carts marked as abandoned.
 */
export async function detectAbandonedCarts(
  db: SupabaseClient,
  thresholdMinutes: number = DEFAULT_ABANDONMENT_THRESHOLD_MINUTES,
): Promise<number> {
  const cutoff = new Date(
    Date.now() - thresholdMinutes * 60 * 1000,
  ).toISOString()

  // Find active carts older than the threshold
  const { data: staleCarts, error: fetchError } = await db
    .from('ecommerce_carts')
    .select('id, account_id, contact_id, total_amount, currency, cart_url, line_items')
    .eq('status', 'active')
    .lt('updated_at', cutoff)
    .limit(100)

  if (fetchError) {
    console.error('[detectAbandonedCarts] fetch error:', fetchError)
    return 0
  }

  if (!staleCarts || staleCarts.length === 0) return 0

  let abandonedCount = 0

  for (const cart of staleCarts) {
    // Mark as abandoned
    const { error: updateError } = await db
      .from('ecommerce_carts')
      .update({
        status: 'abandoned',
        abandoned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cart.id)
      .eq('account_id', cart.account_id)

    if (updateError) {
      console.error(`[detectAbandonedCarts] update error for cart ${cart.id}:`, updateError)
      continue
    }

    abandonedCount++

    // Fire the cart_abandoned trigger if there's a linked contact
    if (cart.contact_id) {
      const lineItems = Array.isArray(cart.line_items) ? cart.line_items : []
      const productNames = lineItems
        .map((item: Record<string, unknown>) => String(item.title ?? ''))
        .filter(Boolean)

      try {
        await fireTrigger(db, cart.account_id, {
          event: 'cart_abandoned',
          account_id: cart.account_id,
          contact_id: cart.contact_id,
          cart_id: cart.id,
        }, {
          contact_id: cart.contact_id,
          cart_url: cart.cart_url ?? undefined,
          cart_total: cart.total_amount ?? undefined,
          product_names: productNames,
        })
      } catch (triggerErr) {
        console.error(`[detectAbandonedCarts] trigger error for cart ${cart.id}:`, triggerErr)
      }
    }
  }

  console.log(`[detectAbandonedCarts] Marked ${abandonedCount} carts as abandoned`)
  return abandonedCount
}
