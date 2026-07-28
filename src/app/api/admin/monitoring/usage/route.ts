import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { AccountLimitUsage, ApproachingLimit, UsageLimitData } from '@/lib/monitoring/types'

export async function GET(req: NextRequest) {
  try {
    // Fetch all account usage from the view
    const { data: accounts, error: accountsError } = await supabaseAdmin()
      .from('v_account_limit_usage')
      .select('*')
      .order('account_name')

    if (accountsError) {
      console.error('Error fetching account usage:', accountsError)
      return NextResponse.json(
        { error: 'Failed to fetch account usage data' },
        { status: 500 }
      )
    }

    // Fetch approaching limits (>= 80% usage)
    const { data: approachingRaw, error: approachingError } = await supabaseAdmin()
      .rpc('get_approaching_limits', { p_threshold: 80 })

    if (approachingError) {
      console.error('Error fetching approaching limits:', approachingError)
    }

    const approaching_limits: ApproachingLimit[] = (approachingRaw || []) as ApproachingLimit[]

    // Calculate summary
    const accountIds = new Set<string>()
    const atLimitIds = new Set<string>()
    const approachingIds = new Set<string>()

    for (const limit of approaching_limits) {
      if (limit.percentage >= 100) {
        atLimitIds.add(limit.account_id)
      } else {
        approachingIds.add(limit.account_id)
      }
    }

    const result: UsageLimitData = {
      accounts: (accounts || []) as AccountLimitUsage[],
      approaching_limits,
      summary: {
        total_accounts: (accounts || []).length,
        accounts_at_limit: atLimitIds.size,
        accounts_approaching_limit: approachingIds.size,
      },
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Monitoring usage API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
