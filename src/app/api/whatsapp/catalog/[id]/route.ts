import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getCatalogProducts, syncProductToCatalog } from '@/lib/whatsapp/catalog-api'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id: catalogId } = await params
    const ctx = await getCurrentAccount()

    const { data: config } = await ctx.supabase
      .from('whatsapp_config')
      .select('access_token')
      .eq('account_id', ctx.accountId)
      .single()

    if (!config?.access_token) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
    }

    const result = await getCatalogProducts({ catalogId, accessToken: config.access_token })
    return NextResponse.json({ products: result.data || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id: catalogId } = await params
    const ctx = await requireRole('admin')
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    const { data: config } = await ctx.supabase
      .from('whatsapp_config')
      .select('access_token')
      .eq('account_id', ctx.accountId)
      .single()

    if (!config?.access_token) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
    }

    const { data: product, error } = await ctx.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('account_id', ctx.accountId)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const metaResult = await syncProductToCatalog({
      catalogId,
      accessToken: config.access_token,
      crmProduct: product,
    })

    await ctx.supabase.from('catalog_sync_status').upsert({
      account_id: ctx.accountId,
      product_id: product.id,
      catalog_id: catalogId,
      meta_product_id: metaResult.id || null,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      error_message: null,
    }, { onConflict: 'product_id' })

    return NextResponse.json({ success: true, metaProductId: metaResult.id })
  } catch (err) {
    return toErrorResponse(err)
  }
}
