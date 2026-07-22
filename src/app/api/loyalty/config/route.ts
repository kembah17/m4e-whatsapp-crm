import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { getLoyaltyConfig, updateLoyaltyConfig } from '@/lib/loyalty'

export async function GET() {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const config = await getLoyaltyConfig(account.account_id)
    return NextResponse.json({ config })
  } catch (err) {
    console.error('Loyalty config error:', err)
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
    const config = await updateLoyaltyConfig(account.account_id, body)
    return NextResponse.json({ config })
  } catch (err) {
    console.error('Update loyalty config error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update config' },
      { status: 500 }
    )
  }
}
