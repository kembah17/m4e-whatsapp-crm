import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getFinancialSummary } from '@/lib/financials'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const now = new Date()
    const start = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const end = searchParams.get('end') || now.toISOString().slice(0, 10)
    const summary = await getFinancialSummary(ctx.accountId, { start, end })
    return NextResponse.json(summary)
  } catch (err) {
    return toErrorResponse(err)
  }
}
