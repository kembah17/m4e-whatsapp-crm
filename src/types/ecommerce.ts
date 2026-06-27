// E-Commerce Integration Types
// Shopify/WooCommerce sync, orders, carts, and product management

// ============================================================
// E-Commerce Integrations
// ============================================================
export type EcommercePlatform = 'shopify' | 'woocommerce'

export interface EcommerceIntegration {
  id: string
  account_id: string
  platform: EcommercePlatform
  store_url: string
  api_key_encrypted: string | null
  api_secret_encrypted: string | null
  webhook_secret: string
  access_token_encrypted: string | null
  sync_products: boolean
  sync_orders: boolean
  sync_customers: boolean
  is_active: boolean
  last_synced_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateEcommerceIntegrationPayload {
  platform: EcommercePlatform
  store_url: string
  api_key?: string
  api_secret?: string
  access_token?: string
  sync_products?: boolean
  sync_orders?: boolean
  sync_customers?: boolean
}

// ============================================================
// E-Commerce Products
// ============================================================
export interface EcommerceProduct {
  id: string
  account_id: string
  integration_id: string
  external_product_id: string
  title: string
  description: string | null
  price: number | null
  currency: string
  image_url: string | null
  inventory_quantity: number | null
  variant_id: string | null
  variant_title: string | null
  status: string
  synced_at: string
  created_at: string
}

// ============================================================
// E-Commerce Orders
// ============================================================
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'failed'
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'returned'

export interface OrderLineItem {
  product_id?: string
  title: string
  quantity: number
  price: number
  variant_id?: string
  variant_title?: string
  image_url?: string
}

export interface ShippingAddress {
  first_name?: string
  last_name?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  country?: string
  zip?: string
  phone?: string
}

export interface EcommerceOrder {
  id: string
  account_id: string
  integration_id: string
  contact_id: string | null
  external_order_id: string
  order_number: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  fulfillment_status: FulfillmentStatus
  total_amount: number | null
  currency: string
  customer_email: string | null
  customer_phone: string | null
  shipping_address: ShippingAddress | null
  line_items: OrderLineItem[]
  payment_method: string | null
  notes: string | null
  external_created_at: string | null
  synced_at: string
  created_at: string
  updated_at: string
}

// ============================================================
// E-Commerce Carts
// ============================================================
export type CartStatus = 'active' | 'recovered' | 'abandoned' | 'completed'

export interface EcommerceCart {
  id: string
  account_id: string
  integration_id: string
  contact_id: string | null
  external_cart_id: string | null
  customer_email: string | null
  customer_phone: string | null
  line_items: OrderLineItem[]
  total_amount: number | null
  currency: string
  cart_url: string | null
  status: CartStatus
  abandoned_at: string | null
  recovered_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Parsed Webhook Events (platform-agnostic)
// ============================================================
export interface ParsedOrderEvent {
  external_order_id: string
  order_number: string | null
  status: OrderStatus
  payment_status: PaymentStatus
  fulfillment_status: FulfillmentStatus
  total_amount: number
  currency: string
  customer_email: string | null
  customer_phone: string | null
  shipping_address: ShippingAddress | null
  line_items: OrderLineItem[]
  payment_method: string | null
  external_created_at: string | null
}

export interface ParsedCartEvent {
  external_cart_id: string
  customer_email: string | null
  customer_phone: string | null
  line_items: OrderLineItem[]
  total_amount: number
  currency: string
  cart_url: string | null
}

export interface ParsedProductEvent {
  external_product_id: string
  title: string
  description: string | null
  price: number | null
  currency: string
  image_url: string | null
  inventory_quantity: number | null
  variant_id: string | null
  variant_title: string | null
  status: string
}
