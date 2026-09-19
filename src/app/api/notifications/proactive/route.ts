import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { sendProactiveAlerts } from '@/lib/notifications/proactive'

export async function POST() {
  try {
    const ctx = await getCurrentAccount()
    const result = await sendProactiveAlerts(ctx.accountId)
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}
