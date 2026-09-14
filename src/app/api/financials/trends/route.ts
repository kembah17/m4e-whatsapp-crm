import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getMonthlyTrend } from '@/lib/financials'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '6', 10)
    const trends = await getMonthlyTrend(ctx.accountId, months)
    return NextResponse.json({ trends })
  } catch (err) {
    return toErrorResponse(err)
  }
}
