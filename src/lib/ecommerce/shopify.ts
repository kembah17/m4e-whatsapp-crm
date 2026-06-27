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
 * Verify Shopify webhook HMAC-SHA256 signature.
 * Shopify sends the HMAC in the X-Shopify-Hmac-Sha256 header as base64.
 */
export function verifyShopifyWebhook(
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

/** Map Shopify financial_status to our PaymentStatus. */
function mapFinancialStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case 'paid': return 'paid'
    case 'partially_paid': return 'partially_paid'
    case 'refunded':
    case 'partially_refunded': return 'refunded'
    case 'voided': return 'failed'
    default: return 'pending'
  }
}

/** Map Shopify fulfillment_status to our FulfillmentStatus. */
function mapFulfillmentStatus(status: string | null | undefined): FulfillmentStatus {
  switch (status) {
    case 'fulfilled': return 'fulfilled'
    case 'partial': return 'partial'
    case 'restocked': return 'returned'
    default: return 'unfulfilled'
  }
}

/** Map Shopify order status to our OrderStatus. */
function mapOrderStatus(
  cancelled: boolean,
  financialStatus: string | undefined,
  fulfillmentStatus: string | null | undefined,
): OrderStatus {
  if (cancelled) return 'cancelled'
  if (financialStatus === 'refunded') return 'refunded'
  if (fulfillmentStatus === 'fulfilled') return 'delivered'
  if (fulfillmentStatus === 'partial') return 'shipped'
  if (financialStatus === 'paid') return 'confirmed'
  return 'pending'
}

/** Parse a Shopify line item into our standard format. */
function parseLineItem(item: Record<string, unknown>): OrderLineItem {
  return {
    product_id: String(item.product_id ?? ''),
    title: String(item.title ?? ''),
    quantity: Number(item.quantity ?? 1),
    price: parseFloat(String(item.price ?? '0')),
    variant_id: item.variant_id ? String(item.variant_id) : undefined,
    variant_title: item.variant_title ? String(item.variant_title) : undefined,
  }
}

/** Parse a Shopify shipping address. */
function parseShippingAddress(addr: Record<string, unknown> | null | undefined): ShippingAddress | null {
  if (!addr) return null
  return {
    first_name: addr.first_name ? String(addr.first_name) : undefined,
    last_name: addr.last_name ? String(addr.last_name) : undefined,
    address1: addr.address1 ? String(addr.address1) : undefined,
    address2: addr.address2 ? String(addr.address2) : undefined,
    city: addr.city ? String(addr.city) : undefined,
    state: addr.province ? String(addr.province) : undefined,
    country: addr.country ? String(addr.country) : undefined,
    zip: addr.zip ? String(addr.zip) : undefined,
    phone: addr.phone ? String(addr.phone) : undefined,
  }
}

/**
 * Parse a Shopify order webhook payload into our standard format.
 */
export function parseShopifyOrderEvent(payload: Record<string, unknown>): ParsedOrderEvent {
  const lineItems = Array.isArray(payload.line_items)
    ? (payload.line_items as Record<string, unknown>[]).map(parseLineItem)
    : []

  const customer = payload.customer as Record<string, unknown> | undefined
  const financialStatus = payload.financial_status as string | undefined
  const fulfillmentStatus = payload.fulfillment_status as string | null | undefined
  const cancelledAt = payload.cancelled_at as string | null | undefined

  return {
    external_order_id: String(payload.id ?? ''),
    order_number: payload.order_number ? String(payload.order_number) : null,
    status: mapOrderStatus(!!cancelledAt, financialStatus, fulfillmentStatus),
    payment_status: mapFinancialStatus(financialStatus),
    fulfillment_status: mapFulfillmentStatus(fulfillmentStatus),
    total_amount: parseFloat(String(payload.total_price ?? '0')),
    currency: String(payload.currency ?? 'NGN').toUpperCase(),
    customer_email: (payload.email as string) ?? (customer?.email as string) ?? null,
    customer_phone: (customer?.phone as string) ?? (payload.phone as string) ?? null,
    shipping_address: parseShippingAddress(
      payload.shipping_address as Record<string, unknown> | null | undefined,
    ),
    line_items: lineItems,
    payment_method: (payload.gateway as string) ?? null,
    external_created_at: (payload.created_at as string) ?? null,
  }
}

/**
 * Parse a Shopify cart/checkout webhook payload.
 */
export function parseShopifyCartEvent(payload: Record<string, unknown>): ParsedCartEvent {
  const lineItems = Array.isArray(payload.line_items)
    ? (payload.line_items as Record<string, unknown>[]).map(parseLineItem)
    : []

  const customer = payload.customer as Record<string, unknown> | undefined

  return {
    external_cart_id: String(payload.token ?? payload.id ?? ''),
    customer_email: (payload.email as string) ?? (customer?.email as string) ?? null,
    customer_phone: (customer?.phone as string) ?? (payload.phone as string) ?? null,
    line_items: lineItems,
    total_amount: parseFloat(String(payload.total_price ?? '0')),
    currency: String(payload.currency ?? 'NGN').toUpperCase(),
    cart_url: (payload.abandoned_checkout_url as string) ?? null,
  }
}

/**
 * Parse a Shopify product webhook payload.
 */
export function parseShopifyProductEvent(payload: Record<string, unknown>): ParsedProductEvent {
  const variants = Array.isArray(payload.variants)
    ? (payload.variants as Record<string, unknown>[])
    : []
  const firstVariant = variants[0] ?? {}
  const images = Array.isArray(payload.images)
    ? (payload.images as Record<string, unknown>[])
    : []

  return {
    external_product_id: String(payload.id ?? ''),
    title: String(payload.title ?? ''),
    description: (payload.body_html as string) ?? null,
    price: firstVariant.price ? parseFloat(String(firstVariant.price)) : null,
    currency: 'NGN',
    image_url: images[0]?.src ? String(images[0].src) : null,
    inventory_quantity: firstVariant.inventory_quantity != null
      ? Number(firstVariant.inventory_quantity)
      : null,
    variant_id: firstVariant.id ? String(firstVariant.id) : null,
    variant_title: firstVariant.title ? String(firstVariant.title) : null,
    status: payload.status === 'active' ? 'active' : 'draft',
  }
}

/**
 * Map a Shopify customer object to contact fields.
 */
export function mapShopifyCustomerToContact(
  customer: Record<string, unknown>,
): { phone: string | null; email: string | null; name: string } {
  const firstName = String(customer.first_name ?? '')
  const lastName = String(customer.last_name ?? '')
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown'

  return {
    phone: (customer.phone as string) ?? null,
    email: (customer.email as string) ?? null,
    name,
  }
}
