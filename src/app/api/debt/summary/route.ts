import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getDebtSummary } from '@/lib/debt'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const summary = await getDebtSummary(ctx.accountId)
    return NextResponse.json(summary)
  } catch (err) {
    return toErrorResponse(err)
  }
}
