import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`ai:${rlIp}`, RATE_LIMITS.ai);
    if (!rl.success) return rateLimitResponse(rl);

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')

    const db = supabaseAdmin()

    if (accountId) {
      const { data, error } = await db
        .from('ai_budget_settings')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Return defaults if no settings exist
      return NextResponse.json({
        settings: data || {
          account_id: accountId,
          monthly_budget_usd: 5.0,
          alert_threshold_pct: 80,
          hard_limit_enabled: false,
        },
      })
    }

    // All accounts
    const { data, error } = await db
      .from('ai_budget_settings')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data || [] })
  } catch (err) {
    console.error('[ai-budget] GET error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`ai:${rlIp}`, RATE_LIMITS.ai);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await request.json()
    const { account_id, monthly_budget_usd, alert_threshold_pct, hard_limit_enabled } = body

    if (!account_id) {
      return NextResponse.json(
        { error: 'account_id is required' },
        { status: 400 }
      )
    }

    const db = supabaseAdmin()

    const { data, error } = await db
      .from('ai_budget_settings')
      .upsert(
        {
          account_id,
          monthly_budget_usd: monthly_budget_usd ?? 5.0,
          alert_threshold_pct: alert_threshold_pct ?? 80,
          hard_limit_enabled: hard_limit_enabled ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'account_id' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
  } catch (err) {
    console.error('[ai-budget] POST error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
