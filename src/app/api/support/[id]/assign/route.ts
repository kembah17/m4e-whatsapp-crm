import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { assignTicket } from '@/lib/support/tickets'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const body = await req.json()

    if (!body.assigned_to) {
      return NextResponse.json({ error: 'assigned_to is required' }, { status: 400 })
    }

    const ticket = await assignTicket(
      account.account_id,
      id,
      body.assigned_to,
      account.profile_id
    )

    return NextResponse.json(ticket)
  } catch (err) {
    return toErrorResponse(err)
  }
}
