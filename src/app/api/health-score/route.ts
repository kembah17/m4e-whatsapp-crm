import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { calculateHealthScore, getHealthScoreHistory } from '@/lib/subscriber-monitoring/health-score'

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'current'
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (action === 'history') {
      const history = await getHealthScoreHistory(account.account_id, days)
      return NextResponse.json({ history })
    }

    // Default: calculate current score
    const score = await calculateHealthScore(account.account_id)
    return NextResponse.json(score)
  } catch (error) {
    console.error('[HealthScore API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
