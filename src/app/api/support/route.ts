import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getTickets, createTicket } from '@/lib/support/tickets'
import type { TicketStatus, TicketPriority, TicketSource } from '@/types/business-growth'

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    const url = req.nextUrl

    const filters: {
      status?: TicketStatus[]
      priority?: TicketPriority[]
      source?: TicketSource[]
      assigned_to?: string
      category_id?: string
      search?: string
      sla_breached?: boolean
    } = {}

    const statusParam = url.searchParams.get('status')
    if (statusParam) filters.status = statusParam.split(',') as TicketStatus[]

    const priorityParam = url.searchParams.get('priority')
    if (priorityParam) filters.priority = priorityParam.split(',') as TicketPriority[]

    const sourceParam = url.searchParams.get('source')
    if (sourceParam) filters.source = sourceParam.split(',') as TicketSource[]

    const assignedTo = url.searchParams.get('assigned_to')
    if (assignedTo) filters.assigned_to = assignedTo

    const categoryId = url.searchParams.get('category_id')
    if (categoryId) filters.category_id = categoryId

    const search = url.searchParams.get('search')
    if (search) filters.search = search

    const slaBreached = url.searchParams.get('sla_breached')
    if (slaBreached === 'true') filters.sla_breached = true

    const tickets = await getTickets(account.account_id, filters)
    return NextResponse.json(tickets)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    const body = await req.json()

    const ticket = await createTicket(account.account_id, {
      subject: body.subject,
      description: body.description,
      contact_id: body.contact_id,
      conversation_id: body.conversation_id,
      category_id: body.category_id,
      priority: body.priority ?? 'normal',
      source: body.source ?? 'manual',
      assigned_to: body.assigned_to,
      tags: body.tags,
      created_by: account.profile_id,
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
