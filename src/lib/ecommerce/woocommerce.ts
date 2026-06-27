import crypto from 'crypto'
import type {
  ParsedOrderEvent,
  ParsedCartEvent,
  ParsedProductEvent,
  OrderLineItem,
  ShippingAddress,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
} from '@/types/ecommerce'

/**
 * Verify WooCommerce webhook HMAC-SHA256 signature.
 * WooCommerce sends the HMAC in the X-WC-Webhook-Signature header as base64.
 */
export function verifyWooCommerceWebhook(
  body: string,
  signature: string,
  secret: string,
): boolean {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature),
  )
}

/** Map WooCommerce order status to our OrderStatus. */
function mapWcOrderStatus(status: string | undefined): OrderStatus {
  switch (status) {
    case 'completed': return 'delivered'
    case 'processing': return 'processing'
    case 'on-hold': return 'confirmed'
    case 'cancelled': return 'cancelled'
    case 'refunded': return 'refunded'
    case 'failed': return 'cancelled'
    default: return 'pending'
  }
}

/** Map WooCommerce order status to our PaymentStatus. */
function mapWcPaymentStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case 'completed':
    case 'processing': return 'paid'
    case 'refunded': return 'refunded'
    case 'failed': return 'failed'
    case 'on-hold': return 'pending'
    default: return 'pending'
  }
}

/** Map WooCommerce order status to our FulfillmentStatus. */
function mapWcFulfillmentStatus(status: string | undefined): FulfillmentStatus {
  switch (status) {
    case 'completed': return 'fulfilled'
    case 'refunded': return 'returned'
    default: return 'unfulfilled'
  }
}

/** Parse a WooCommerce line item. */
function parseLineItem(item: Record<string, unknown>): OrderLineItem {
  return {
    product_id: item.product_id ? String(item.product_id) : undefined,
    title: String(item.name ?? ''),
    quantity: Number(item.quantity ?? 1),
    price: parseFloat(String(item.price ?? item.total ?? '0')),
    variant_id: item.variation_id ? String(item.variation_id) : undefined,
    variant_title: undefined,
    image_url: (item.image as Record<string, unknown>)?.src
      ? String((item.image as Record<string, unknown>).src)
      : undefined,
  }
}

/** Parse a WooCommerce address. */
function parseAddress(addr: Record<string, unknown> | null | undefined): ShippingAddress | null {
  if (!addr) return null
  return {
    first_name: addr.first_name ? String(addr.first_name) : undefined,
    last_name: addr.last_name ? String(addr.last_name) : undefined,
    address1: addr.address_1 ? String(addr.address_1) : undefined,
    address2: addr.address_2 ? String(addr.address_2) : undefined,
    city: addr.city ? String(addr.city) : undefined,
    state: addr.state ? String(addr.state) : undefined,
    country: addr.country ? String(addr.country) : undefined,
    zip: addr.postcode ? String(addr.postcode) : undefined,
    phone: addr.phone ? String(addr.phone) : undefined,
  }
}

/**
 * Parse a WooCommerce order webhook payload.
 */
export function parseWooCommerceOrderEvent(payload: Record<string, unknown>): ParsedOrderEvent {
  const lineItems = Array.isArray(payload.line_items)
    ? (payload.line_items as Record<string, unknown>[]).map(parseLineItem)
    : []

  const billing = payload.billing as Record<string, unknown> | undefined
  const wcStatus = payload.status as string | undefined

  return {
    external_order_id: String(payload.id ?? ''),
    order_number: payload.number ? String(payload.number) : null,
    status: mapWcOrderStatus(wcStatus),
    payment_status: mapWcPaymentStatus(wcStatus),
    fulfillment_status: mapWcFulfillmentStatus(wcStatus),
    total_amount: parseFloat(String(payload.total ?? '0')),
    currency: String(payload.currency ?? 'NGN').toUpperCase(),
    customer_email: (billing?.email as string) ?? null,
    customer_phone: (billing?.phone as string) ?? null,
    shipping_address: parseAddress(
      payload.shipping as Record<string, unknown> | null | undefined,
    ),
    line_items: lineItems,
    payment_method: (payload.payment_method_title as string) ?? null,
    external_created_at: (payload.date_created as string) ?? null,
  }
}

/**
 * Parse a WooCommerce cart event (from cart/checkout webhooks or custom plugin).
 */
export function parseWooCommerceCartEvent(payload: Record<string, unknown>): ParsedCartEvent {
  const lineItems = Array.isArray(payload.line_items)
    ? (payload.line_items as Record<string, unknown>[]).map(parseLineItem)
    : []

  const billing = payload.billing as Record<string, unknown> | undefined

  return {
    external_cart_id: String(payload.id ?? payload.cart_key ?? ''),
    customer_email: (billing?.email as string) ?? (payload.email as string) ?? null,
    customer_phone: (billing?.phone as string) ?? (payload.phone as string) ?? null,
    line_items: lineItems,
    total_amount: parseFloat(String(payload.total ?? '0')),
    currency: String(payload.currency ?? 'NGN').toUpperCase(),
    cart_url: (payload.cart_url as string) ?? null,
  }
}

/**
 * Parse a WooCommerce product webhook payload.
 */
export function parseWooCommerceProductEvent(payload: Record<string, unknown>): ParsedProductEvent {
  const images = Array.isArray(payload.images)
    ? (payload.images as Record<string, unknown>[])
    : []

  return {
    external_product_id: String(payload.id ?? ''),
    title: String(payload.name ?? ''),
    description: (payload.description as string) ?? (payload.short_description as string) ?? null,
    price: payload.price ? parseFloat(String(payload.price)) : null,
    currency: 'NGN',
    image_url: images[0]?.src ? String(images[0].src) : null,
    inventory_quantity: payload.stock_quantity != null
      ? Number(payload.stock_quantity)
      : null,
    variant_id: null,
    variant_title: null,
    status: payload.status === 'publish' ? 'active' : 'draft',
  }
}

/**
 * Map a WooCommerce customer/billing to contact fields.
 */
export function mapWooCommerceCustomerToContact(
  billing: Record<string, unknown>,
): { phone: string | null; email: string | null; name: string } {
  const firstName = String(billing.first_name ?? '')
  const lastName = String(billing.last_name ?? '')
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown'

  return {
    phone: (billing.phone as string) ?? null,
    email: (billing.email as string) ?? null,
    name,
  }
}
