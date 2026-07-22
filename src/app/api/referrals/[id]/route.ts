import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { updateReferralStatus, convertReferral } from '@/lib/referrals'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { action, status, first_purchase_amount, ...extra } = body

    if (action === 'convert') {
      const referral = await convertReferral(id, account.account_id, first_purchase_amount)
      return NextResponse.json({ referral })
    }

    if (!status) {
      return NextResponse.json({ error: 'status or action is required' }, { status: 400 })
    }

    const referral = await updateReferralStatus(id, status, extra)
    return NextResponse.json({ referral })
  } catch (err) {
    console.error('Update referral error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update referral' },
      { status: 500 }
    )
  }
}
