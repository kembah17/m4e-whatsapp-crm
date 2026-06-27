import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { encrypt } from '@/lib/whatsapp/encryption'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/ecommerce/integrations/:id
 * Get integration details.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { accountId, supabase } = await getCurrentAccount()

    const { data, error } = await supabase
      .from('ecommerce_integrations')
      .select('id, platform, store_url, webhook_secret, sync_products, sync_orders, sync_customers, is_active, last_synced_at, metadata, created_at, updated_at')
      .eq('id', id)
      .eq('account_id', accountId)
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    return NextResponse.json({ integration: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * PUT /api/ecommerce/integrations/:id
 * Update integration settings.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { accountId, supabase } = await getCurrentAccount()
    const body = await request.json()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.store_url !== undefined) updates.store_url = body.store_url
    if (body.sync_products !== undefined) updates.sync_products = body.sync_products
    if (body.sync_orders !== undefined) updates.sync_orders = body.sync_orders
    if (body.sync_customers !== undefined) updates.sync_customers = body.sync_customers
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.metadata !== undefined) updates.metadata = body.metadata

    // Encrypt sensitive fields if provided
    if (body.api_key) updates.api_key_encrypted = encrypt(body.api_key)
    if (body.api_secret) updates.api_secret_encrypted = encrypt(body.api_secret)
    if (body.access_token) updates.access_token_encrypted = encrypt(body.access_token)

    const { data, error } = await supabase
      .from('ecommerce_integrations')
      .update(updates)
      .eq('id', id)
      .eq('account_id', accountId)
      .select('id, platform, store_url, sync_products, sync_orders, sync_customers, is_active, last_synced_at, updated_at')
      .single()

    if (error) throw error

    return NextResponse.json({ integration: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/ecommerce/integrations/:id
 * Deactivate an integration (soft delete).
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { accountId, supabase } = await getCurrentAccount()

    const { error } = await supabase
      .from('ecommerce_integrations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
