import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getAgingAnalysis } from '@/lib/financials'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const aging = await getAgingAnalysis(ctx.accountId)
    return NextResponse.json(aging)
  } catch (err) {
    return toErrorResponse(err)
  }
}
