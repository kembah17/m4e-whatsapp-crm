import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { generateFinancialDiagnostics } from '@/lib/financials/diagnostics'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const diagnostics = await generateFinancialDiagnostics(ctx.accountId)
    return NextResponse.json({ diagnostics })
  } catch (err) {
    return toErrorResponse(err)
  }
}
