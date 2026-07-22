import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import {
  getActiveInsights,
  generateInsights,
} from '@/lib/ai/business-insights'
import type { InsightCategory, InsightPriority } from '@/types/business-growth'

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') as InsightCategory | null
    const priority = searchParams.get('priority') as InsightPriority | null

    const insights = await getActiveInsights(
      account.account_id,
      category || undefined,
      priority || undefined
    )

    return NextResponse.json({ insights, total: insights.length })
  } catch (err) {
    console.error('Insights list error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list insights' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const insights = await generateInsights(account.account_id)

    return NextResponse.json({
      insights,
      generated: insights.length,
      message: `Generated ${insights.length} new insights`,
    })
  } catch (err) {
    console.error('Insight generation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
