import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')
    const days = parseInt(searchParams.get('days') || '30', 10)

    const db = supabaseAdmin()

    if (accountId) {
      // Single account summary via RPC
      const { data, error } = await db.rpc('get_ai_usage_summary', {
        p_account_id: accountId,
        p_days: days,
      })

      if (error) {
        console.error('[ai-usage] RPC error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ summary: data })
    }

    // All accounts summary (super admin)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get per-account totals
    const { data: accountUsage, error: usageErr } = await db
      .from('ai_usage_log')
      .select('account_id, feature, estimated_cost_usd, input_tokens, output_tokens')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10000)

    if (usageErr) {
      console.error('[ai-usage] query error:', usageErr)
      return NextResponse.json({ error: usageErr.message }, { status: 500 })
    }

    // Aggregate by account
    const byAccount = new Map<string, {
      account_id: string
      total_cost: number
      total_calls: number
      input_tokens: number
      output_tokens: number
    }>()

    for (const row of accountUsage || []) {
      const existing = byAccount.get(row.account_id) || {
        account_id: row.account_id,
        total_cost: 0,
        total_calls: 0,
        input_tokens: 0,
        output_tokens: 0,
      }
      existing.total_cost += Number(row.estimated_cost_usd)
      existing.total_calls += 1
      existing.input_tokens += row.input_tokens
      existing.output_tokens += row.output_tokens
      byAccount.set(row.account_id, existing)
    }

    // Global totals
    const globalTotal = {
      total_cost: 0,
      total_calls: 0,
      input_tokens: 0,
      output_tokens: 0,
    }
    for (const acct of byAccount.values()) {
      globalTotal.total_cost += acct.total_cost
      globalTotal.total_calls += acct.total_calls
      globalTotal.input_tokens += acct.input_tokens
      globalTotal.output_tokens += acct.output_tokens
    }

    // By feature
    const byFeature = new Map<string, { calls: number; cost: number }>()
    for (const row of accountUsage || []) {
      const existing = byFeature.get(row.feature) || { calls: 0, cost: 0 }
      existing.calls += 1
      existing.cost += Number(row.estimated_cost_usd)
      byFeature.set(row.feature, existing)
    }

    return NextResponse.json({
      global: globalTotal,
      by_account: Array.from(byAccount.values()),
      by_feature: Array.from(byFeature.entries()).map(([feature, data]) => ({
        feature,
        ...data,
      })),
      days,
    })
  } catch (err) {
    console.error('[ai-usage] unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
