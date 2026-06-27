import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { encrypt } from '@/lib/whatsapp/encryption'
import type { CreateEcommerceIntegrationPayload, EcommercePlatform } from '@/types/ecommerce'

const VALID_PLATFORMS: EcommercePlatform[] = ['shopify', 'woocommerce']

/**
 * GET /api/ecommerce/integrations
 * List all e-commerce integrations for the current account.
 */
export async function GET() {
  try {
    const { accountId, supabase } = await getCurrentAccount()

    const { data, error } = await supabase
      .from('ecommerce_integrations')
      .select('id, platform, store_url, sync_products, sync_orders, sync_customers, is_active, last_synced_at, metadata, created_at, updated_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ integrations: data ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/ecommerce/integrations
 * Create a new e-commerce integration.
 */
export async function POST(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const body = (await request.json()) as CreateEcommerceIntegrationPayload

    // Validate platform
    if (!body.platform || !VALID_PLATFORMS.includes(body.platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 },
      )
    }

    // Validate store URL
    if (!body.store_url?.trim()) {
      return NextResponse.json(
        { error: 'Store URL is required' },
        { status: 400 },
      )
    }

    // Encrypt sensitive fields
    const payload: Record<string, unknown> = {
      account_id: accountId,
      platform: body.platform,
      store_url: body.store_url.trim(),
      sync_products: body.sync_products ?? true,
      sync_orders: body.sync_orders ?? true,
      sync_customers: body.sync_customers ?? true,
      is_active: true,
    }

    if (body.api_key) {
      payload.api_key_encrypted = encrypt(body.api_key)
    }
    if (body.api_secret) {
      payload.api_secret_encrypted = encrypt(body.api_secret)
    }
    if (body.access_token) {
      payload.access_token_encrypted = encrypt(body.access_token)
    }

    const { data, error } = await supabase
      .from('ecommerce_integrations')
      .insert(payload)
      .select('id, platform, store_url, webhook_secret, sync_products, sync_orders, sync_customers, is_active, created_at')
      .single()

    if (error) throw error

    return NextResponse.json({ integration: data }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
