import { NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { getCashFlowProjection } from '@/lib/financials'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const projection = await getCashFlowProjection(ctx.accountId)
    return NextResponse.json({ projection })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
