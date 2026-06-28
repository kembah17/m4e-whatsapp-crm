import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getCatalogs, syncProductToCatalog } from '@/lib/whatsapp/catalog-api'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()

    // Get WhatsApp config for access token and WABA ID
    const { data: config } = await ctx.supabase
      .from('whatsapp_config')
      .select('access_token, waba_id')
      .eq('account_id', ctx.accountId)
      .single()

    if (!config?.access_token || !config?.waba_id) {
      return NextResponse.json({ catalogs: [], error: 'WhatsApp not configured' })
    }

    const result = await getCatalogs({ wabaId: config.waba_id, accessToken: config.access_token })
    return NextResponse.json({ catalogs: result.data || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST() {
  try {
    const ctx = await requireRole('admin')

    // Get WhatsApp config
    const { data: config } = await ctx.supabase
      .from('whatsapp_config')
      .select('access_token, waba_id')
      .eq('account_id', ctx.accountId)
      .single()

    if (!config?.access_token || !config?.waba_id) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
    }

    // Get all active products
    const { data: products, error: prodError } = await ctx.supabase
      .from('products')
      .select('*')
      .eq('account_id', ctx.accountId)
      .eq('status', 'active')

    if (prodError) return NextResponse.json({ error: prodError.message }, { status: 500 })

    // Get catalogs to find the first one
    const catalogResult = await getCatalogs({ wabaId: config.waba_id, accessToken: config.access_token })
    const catalogs = catalogResult.data || []
    if (catalogs.length === 0) {
      return NextResponse.json({ error: 'No catalog found. Create one in Meta Business Suite first.' }, { status: 400 })
    }
    const catalogId = catalogs[0].id

    const results: Array<{ productId: string; name: string; status: string; error?: string }> = []

    for (const product of (products || [])) {
      try {
        const metaResult = await syncProductToCatalog({
          catalogId,
          accessToken: config.access_token,
          crmProduct: product,
        })

        // Upsert sync status
        await ctx.supabase.from('catalog_sync_status').upsert({
          account_id: ctx.accountId,
          product_id: product.id,
          catalog_id: catalogId,
          meta_product_id: metaResult.id || null,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          error_message: null,
        }, { onConflict: 'product_id' })

        results.push({ productId: product.id, name: product.name, status: 'synced' })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        await ctx.supabase.from('catalog_sync_status').upsert({
          account_id: ctx.accountId,
          product_id: product.id,
          catalog_id: catalogId,
          sync_status: 'error',
          error_message: errorMsg,
        }, { onConflict: 'product_id' })
        results.push({ productId: product.id, name: product.name, status: 'error', error: errorMsg })
      }
    }

    return NextResponse.json({ results, catalogId })
  } catch (err) {
    return toErrorResponse(err)
  }
}
