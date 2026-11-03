import { NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { getTargetProgress } from '@/lib/financials'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const progress = await getTargetProgress(ctx.accountId)
    return NextResponse.json({ targets: progress })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
