import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getTicketStats } from '@/lib/support/tickets'
import { getSatisfactionStats } from '@/lib/support/satisfaction'

export async function GET() {
  try {
    const account = await getCurrentAccount()

    const [ticketStats, satisfactionStats] = await Promise.all([
      getTicketStats(account.account_id),
      getSatisfactionStats(account.account_id),
    ])

    return NextResponse.json({
      ...ticketStats,
      satisfaction: satisfactionStats,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
