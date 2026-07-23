import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { closeTicket } from '@/lib/support/tickets'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params

    const ticket = await closeTicket(
      account.account_id,
      id,
      account.profile_id
    )

    return NextResponse.json(ticket)
  } catch (err) {
    return toErrorResponse(err)
  }
}
