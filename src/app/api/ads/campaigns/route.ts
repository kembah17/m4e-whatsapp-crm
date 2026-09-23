import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getCurrentAccount,
  toErrorResponse,
} from '@/lib/auth/account'

export const runtime = 'nodejs'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/ads/campaigns — list campaigns with optional filters
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount()
    const admin = getAdmin()
    const { searchParams } = new URL(req.url)

    const status = searchParams.get('status') // ACTIVE, PAUSED, etc.
    const adAccountId = searchParams.get('ad_account_id')

    let query = admin
      .from('ad_campaigns')
      .select('*, ad_accounts!inner(name, meta_ad_account_id, currency)')
      .eq('account_id', ctx.accountId)
      .order('updated_at', { ascending: false })

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }
    if (adAccountId) {
      query = query.eq('ad_account_id', adAccountId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns: data || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}
