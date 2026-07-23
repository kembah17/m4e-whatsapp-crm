import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { escalateTicket } from '@/lib/support/tickets'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const body = await req.json()

    if (!body.escalate_to) {
      return NextResponse.json({ error: 'escalate_to is required' }, { status: 400 })
    }

    const ticket = await escalateTicket(
      account.account_id,
      id,
      body.escalate_to,
      body.reason ?? 'Manual escalation',
      account.profile_id
    )

    return NextResponse.json(ticket)
  } catch (err) {
    return toErrorResponse(err)
  }
}
