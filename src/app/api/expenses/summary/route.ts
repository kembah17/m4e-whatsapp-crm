import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getExpenseSummary } from '@/lib/expenses'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') || undefined
    const end = searchParams.get('end') || undefined
    const period = start && end ? { start, end } : undefined
    const summary = await getExpenseSummary(ctx.accountId, period)
    return NextResponse.json(summary)
  } catch (err) {
    return toErrorResponse(err)
  }
}
