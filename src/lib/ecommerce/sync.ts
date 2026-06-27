import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  EcommerceProduct,
  EcommerceOrder,
  EcommerceCart,
  ParsedOrderEvent,
  ParsedCartEvent,
  ParsedProductEvent,
} from '@/types/ecommerce'

/**
 * Match a contact by phone or email within an account.
 * Returns the contact ID if found, null otherwise.
 */
export async function matchContactByPhoneOrEmail(
  db: SupabaseClient,
  accountId: string,
  phone: string | null,
  email: string | null,
): Promise<string | null> {
  if (!phone && !email) return null

  // Try phone first (more reliable for WhatsApp CRM)
  if (phone) {
    // Normalize: strip non-digits for comparison
    const digits = phone.replace(/\D/g, '')
    if (digits.length >= 7) {
      const { data } = await db
        .from('contacts')
        .select('id')
        .eq('account_id', accountId)
        .or(`phone.eq.${phone},phone_normalized.eq.${digits}`)
        .limit(1)
        .maybeSingle()
      if (data?.id) return data.id
    }
  }

  // Fall back to email
  if (email) {
    const { data } = await db
      .from('contacts')
      .select('id')
      .eq('account_id', accountId)
      .ilike('email', email)
      .limit(1)
      .maybeSingle()
    if (data?.id) return data.id
  }

  return null
}

/**
 * Upsert a product from an external e-commerce platform.
 */
export async function syncProduct(
  db: SupabaseClient,
  accountId: string,
  integrationId: string,
  product: ParsedProductEvent,
): Promise<EcommerceProduct> {
  const payload = {
    account_id: accountId,
    integration_id: integrationId,
    external_product_id: product.external_product_id,
    title: product.title,
    description: product.description,
    price: product.price,
    currency: product.currency,
    image_url: product.image_url,
    inventory_quantity: product.inventory_quantity,
    variant_id: product.variant_id,
    variant_title: product.variant_title,
    status: product.status,
    synced_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('ecommerce_products')
    .upsert(payload, {
      onConflict: 'integration_id,external_product_id',
    })
    .select()
    .single()

  if (error) {
    console.error('[syncProduct] upsert error:', error)
    throw new Error(`Failed to sync product: ${error.message}`)
  }

  return data as EcommerceProduct
}

/**
 * Upsert an order from an external e-commerce platform.
 * Automatically matches the customer to an existing contact.
 */
export async function syncOrder(
  db: SupabaseClient,
  accountId: string,
  integrationId: string,
  order: ParsedOrderEvent,
): Promise<EcommerceOrder> {
  // Try to match the customer to an existing contact
  const contactId = await matchContactByPhoneOrEmail(
    db,
    accountId,
    order.customer_phone,
    order.customer_email,
  )

  const payload = {
    account_id: accountId,
    integration_id: integrationId,
    contact_id: contactId,
    external_order_id: order.external_order_id,
    order_number: order.order_number,
    status: order.status,
    payment_status: order.payment_status,
    fulfillment_status: order.fulfillment_status,
    total_amount: order.total_amount,
    currency: order.currency,
    customer_email: order.customer_email,
    customer_phone: order.customer_phone,
    shipping_address: order.shipping_address,
    line_items: order.line_items,
    payment_method: order.payment_method,
    external_created_at: order.external_created_at,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('ecommerce_orders')
    .upsert(payload, {
      onConflict: 'integration_id,external_order_id',
    })
    .select()
    .single()

  if (error) {
    console.error('[syncOrder] upsert error:', error)
    throw new Error(`Failed to sync order: ${error.message}`)
  }

  return data as EcommerceOrder
}

/**
 * Upsert a cart from an external e-commerce platform.
 * Automatically matches the customer to an existing contact.
 */
export async function syncCart(
  db: SupabaseClient,
  accountId: string,
  integrationId: string,
  cart: ParsedCartEvent,
): Promise<EcommerceCart> {
  const contactId = await matchContactByPhoneOrEmail(
    db,
    accountId,
    cart.customer_phone,
    cart.customer_email,
  )

  const payload = {
    account_id: accountId,
    integration_id: integrationId,
    contact_id: contactId,
    external_cart_id: cart.external_cart_id,
    customer_email: cart.customer_email,
    customer_phone: cart.customer_phone,
    line_items: cart.line_items,
    total_amount: cart.total_amount,
    currency: cart.currency,
    cart_url: cart.cart_url,
    status: 'active' as const,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await db
    .from('ecommerce_carts')
    .upsert(payload, {
      onConflict: 'integration_id,external_cart_id',
    })
    .select()
    .single()

  if (error) {
    console.error('[syncCart] upsert error:', error)
    throw new Error(`Failed to sync cart: ${error.message}`)
  }

  return data as EcommerceCart
}

/**
 * Delete a product by external ID (for product deletion webhooks).
 */
export async function deleteProduct(
  db: SupabaseClient,
  accountId: string,
  integrationId: string,
  externalProductId: string,
): Promise<void> {
  const { error } = await db
    .from('ecommerce_products')
    .delete()
    .eq('account_id', accountId)
    .eq('integration_id', integrationId)
    .eq('external_product_id', externalProductId)

  if (error) {
    console.error('[deleteProduct] error:', error)
    throw new Error(`Failed to delete product: ${error.message}`)
  }
}
