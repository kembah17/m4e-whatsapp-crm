import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getTicketById, updateTicket } from '@/lib/support/tickets'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const ticket = await getTicketById(account.account_id, id)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    return NextResponse.json(ticket)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const body = await req.json()

    const ticket = await updateTicket(account.account_id, id, {
      subject: body.subject,
      description: body.description,
      status: body.status,
      priority: body.priority,
      category_id: body.category_id,
      assigned_to: body.assigned_to,
      tags: body.tags,
    })

    return NextResponse.json(ticket)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const db = supabaseAdmin()

    const { error } = await db
      .from('support_tickets')
      .delete()
      .eq('id', id)
      .eq('account_id', account.account_id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
