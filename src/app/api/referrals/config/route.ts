import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { getReferralConfig, upsertReferralConfig } from '@/lib/referrals'

export async function GET() {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const config = await getReferralConfig(account.account_id)
    return NextResponse.json({ config })
  } catch (err) {
    console.error('Referral config error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get config' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const config = await upsertReferralConfig(account.account_id, body)
    return NextResponse.json({ config })
  } catch (err) {
    console.error('Update referral config error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update config' },
      { status: 500 }
    )
  }
}
