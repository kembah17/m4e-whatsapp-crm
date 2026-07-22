import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { getLoyaltyTransactions, awardPoints, redeemPoints } from '@/lib/loyalty'

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const contactId = searchParams.get('contact_id') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await getLoyaltyTransactions(
      account.account_id, contactId, limit, offset
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('Loyalty transactions error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list transactions' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { contact_id, action, points, description } = body

    if (!contact_id || !points || !description) {
      return NextResponse.json(
        { error: 'contact_id, points, and description are required' },
        { status: 400 }
      )
    }

    let transaction
    if (action === 'redeem') {
      transaction = await redeemPoints(
        account.account_id, contact_id, Math.abs(points), description
      )
    } else {
      transaction = await awardPoints(
        account.account_id, contact_id, 'manual', Math.abs(points), description
      )
    }

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (err) {
    console.error('Loyalty transaction error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process transaction' },
      { status: 500 }
    )
  }
}
