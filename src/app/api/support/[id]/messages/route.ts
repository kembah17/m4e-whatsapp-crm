import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getTicketMessages, addTicketMessage } from '@/lib/support/messages'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const messages = await getTicketMessages(account.account_id, id)
    return NextResponse.json(messages)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const body = await req.json()

    const message = await addTicketMessage(account.account_id, id, {
      sender_id: account.profile_id,
      sender_type: 'agent',
      message_type: body.message_type ?? (body.is_internal ? 'internal_note' : 'reply'),
      content: body.content,
      attachments: body.attachments,
      is_internal: body.is_internal ?? false,
      send_via_whatsapp: body.send_via_whatsapp ?? false,
    })

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
