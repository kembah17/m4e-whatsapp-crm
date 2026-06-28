import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getCTWAStats } from '@/lib/ctwa/tracker'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const stats = await getCTWAStats(ctx.accountId)
    return NextResponse.json(stats)
  } catch (err) {
    return toErrorResponse(err)
  }
}
