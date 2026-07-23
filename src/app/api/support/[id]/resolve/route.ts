import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { resolveTicket } from '@/lib/support/tickets'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const body = await req.json()

    const ticket = await resolveTicket(
      account.account_id,
      id,
      body.resolution ?? 'Resolved',
      account.profile_id
    )

    return NextResponse.json(ticket)
  } catch (err) {
    return toErrorResponse(err)
  }
}
