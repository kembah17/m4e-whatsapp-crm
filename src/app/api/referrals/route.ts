import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { getReferrals, createReferral, getReferralStats } from '@/lib/referrals'

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view')

    if (view === 'stats') {
      const stats = await getReferralStats(account.account_id)
      return NextResponse.json({ stats })
    }

    const status = searchParams.get('status') || undefined
    const referrer_contact_id = searchParams.get('referrer_contact_id') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await getReferrals(account.account_id, {
      status, referrer_contact_id, limit, offset,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Referrals list error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list referrals' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { referrer_contact_id, referred_contact_id, channel, notes } = body

    if (!referrer_contact_id) {
      return NextResponse.json({ error: 'referrer_contact_id is required' }, { status: 400 })
    }

    const referral = await createReferral(account.account_id, {
      referrer_contact_id,
      referred_contact_id,
      channel,
      notes,
    })

    return NextResponse.json({ referral }, { status: 201 })
  } catch (err) {
    console.error('Create referral error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create referral' },
      { status: 500 }
    )
  }
}
