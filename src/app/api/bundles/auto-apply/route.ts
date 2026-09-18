import { NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { autoApplyIndustryBundles } from '@/lib/bundles/auto-apply'

export async function POST() {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await autoApplyIndustryBundles(
      account.account_id,
      account.user_id
    )
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Auto-Apply API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
