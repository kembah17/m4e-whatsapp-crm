import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { getManagerMetrics } from '@/lib/financials'

export async function GET(request: NextRequest) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
    const end = searchParams.get('end') || new Date().toISOString().slice(0, 10)
    const metrics = await getManagerMetrics(ctx.accountId, { start, end })
    return NextResponse.json({ metrics })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
