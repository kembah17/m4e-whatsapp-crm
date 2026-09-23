import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getCurrentAccount,
  toErrorResponse,
} from '@/lib/auth/account'
import { decrypt } from '@/lib/whatsapp/encryption'
import { fetchAdAccounts } from '@/lib/ads/meta-ads-api'

export const runtime = 'nodejs'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/ads/accounts — list connected ad accounts
export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const admin = getAdmin()

    const { data, error } = await admin
      .from('ad_accounts')
      .select('*')
      .eq('account_id', ctx.accountId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ accounts: data || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// POST /api/ads/accounts — connect ad accounts (fetch from Meta and sync)
export async function POST(_req: NextRequest) {
  try {
    const ctx = await getCurrentAccount()
    const admin = getAdmin()

    // Get access token
    const { data: waConfig } = await admin
      .from('whatsapp_config')
      .select('access_token')
      .eq('account_id', ctx.accountId)
      .maybeSingle()

    if (!waConfig?.access_token) {
      return NextResponse.json(
        { error: 'No Meta access token configured. Please connect WhatsApp first.' },
        { status: 400 },
      )
    }

    const accessToken = decrypt(waConfig.access_token)
    const metaAccounts = await fetchAdAccounts(accessToken)

    if (metaAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No ad accounts found for this Meta token.' },
        { status: 404 },
      )
    }

    const upserted = []
    for (const ma of metaAccounts) {
      const { data, error } = await admin
        .from('ad_accounts')
        .upsert(
          {
            account_id: ctx.accountId,
            meta_ad_account_id: ma.id,
            name: ma.name,
            currency: ma.currency,
            account_status: ma.account_status,
            business_name: ma.business_name || null,
            timezone_name: ma.timezone_name || null,
            is_active: true,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'account_id,meta_ad_account_id' },
        )
        .select()
        .single()

      if (!error && data) upserted.push(data)
    }

    return NextResponse.json({
      message: `Connected ${upserted.length} ad account(s)`,
      accounts: upserted,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
