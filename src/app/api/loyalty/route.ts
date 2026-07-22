import { NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { getLoyaltyStats } from '@/lib/loyalty'

export async function GET() {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const stats = await getLoyaltyStats(account.account_id)
    return NextResponse.json({ stats })
  } catch (err) {
    console.error('Loyalty stats error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get stats' },
      { status: 500 }
    )
  }
}
