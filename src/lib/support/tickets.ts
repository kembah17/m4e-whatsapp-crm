import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketSource,
} from '@/types/business-growth'
import { calculateSLADueDates, getDefaultSLA } from './sla'
import { addSystemMessage } from './messages'

// ============================================================
// Filters
// ============================================================
export interface TicketFilters {
  status?: TicketStatus | TicketStatus[]
  priority?: TicketPriority | TicketPriority[]
  category_id?: string
  assigned_to?: string
  contact_id?: string
  source?: TicketSource
  sla_breached?: boolean
  search?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// ============================================================
// List tickets with joins
// ============================================================
export async function getTickets(
  accountId: string,
  filters: TicketFilters = {}
): Promise<{ data: SupportTicket[]; count: number }> {
  const db = supabaseAdmin()
  let query = db
    .from('support_tickets')
    .select(
      `*,
       contact:contacts(id, name, phone),
       category:ticket_categories(id, name, icon, color),
       assigned_profile:profiles!support_tickets_assigned_to_fkey(id, full_name, avatar_url),
       sla_policy:sla_policies(id, name, priority, first_response_minutes, resolution_minutes)`,
      { count: 'exact' }
    )
    .eq('account_id', accountId)

  // Apply filters
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }
  if (filters.priority) {
    if (Array.isArray(filters.priority)) {
      query = query.in('priority', filters.priority)
    } else {
      query = query.eq('priority', filters.priority)
    }
  }
  if (filters.category_id) query = query.eq('category_id', filters.category_id)
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
  if (filters.contact_id) query = query.eq('contact_id', filters.contact_id)
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.sla_breached === true) {
    query = query.or('sla_first_response_breached.eq.true,sla_resolution_breached.eq.true')
  }
  if (filters.search) {
    query = query.or(
      `subject.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    )
  }
  if (filters.date_from) query = query.gte('created_at', filters.date_from)
  if (filters.date_to) query = query.lte('created_at', filters.date_to)

  // Sorting
  const sortBy = filters.sort_by ?? 'created_at'
  const sortOrder = filters.sort_order === 'asc'
  query = query.order(sortBy, { ascending: sortOrder })

  // Pagination
  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) throw error

  return { data: (data ?? []) as unknown as SupportTicket[], count: count ?? 0 }
}

// ============================================================
// Get single ticket with all joins + message count
// ============================================================
export async function getTicketById(
  accountId: string,
  ticketId: string
): Promise<SupportTicket | null> {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('support_tickets')
    .select(
      `*,
       contact:contacts(id, name, phone),
       category:ticket_categories(id, name, icon, color),
       assigned_profile:profiles!support_tickets_assigned_to_fkey(id, full_name, avatar_url),
       sla_policy:sla_policies(id, name, priority, first_response_minutes, resolution_minutes)`
    )
    .eq('id', ticketId)
    .eq('account_id', accountId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  // Get message count
  const { count } = await db
    .from('ticket_messages')
    .select('id', { count: 'exact', head: true })
    .eq('ticket_id', ticketId)
    .eq('account_id', accountId)

  const ticket = data as unknown as SupportTicket
  ticket.message_count = count ?? 0

  return ticket
}

// ============================================================
// Create ticket
// ============================================================
export interface CreateTicketData {
  subject: string
  description?: string
  contact_id?: string
  conversation_id?: string
  category_id?: string
  priority?: TicketPriority
  source?: TicketSource
  assigned_to?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  created_by?: string
  ai_suggested_category?: string
  ai_suggested_priority?: string
  ai_confidence?: number
  sentiment_score?: number
}

export async function createTicket(
  accountId: string,
  data: CreateTicketData
): Promise<SupportTicket> {
  const db = supabaseAdmin()

  // Generate ticket number via RPC
  const { data: ticketNumber, error: rpcErr } = await db.rpc(
    'generate_ticket_number',
    { p_account_id: accountId }
  )
  if (rpcErr) throw rpcErr

  const priority = data.priority ?? 'normal'

  // Get SLA policy for this priority
  let slaPolicy = null
  let slaFirstResponseDue: string | null = null
  let slaResolutionDue: string | null = null
  let slaPolicyId: string | null = null

  try {
    slaPolicy = await getDefaultSLA(accountId, priority)
    if (slaPolicy) {
      slaPolicyId = slaPolicy.id
      const dueDates = calculateSLADueDates(new Date().toISOString(), slaPolicy)
      slaFirstResponseDue = dueDates.firstResponseDue
      slaResolutionDue = dueDates.resolutionDue
    }
  } catch {
    // SLA not configured yet — proceed without
  }

  const { data: ticket, error } = await db
    .from('support_tickets')
    .insert({
      account_id: accountId,
      ticket_number: ticketNumber as string,
      subject: data.subject,
      description: data.description ?? null,
      contact_id: data.contact_id ?? null,
      conversation_id: data.conversation_id ?? null,
      category_id: data.category_id ?? null,
      sla_policy_id: slaPolicyId,
      priority,
      source: data.source ?? 'manual',
      assigned_to: data.assigned_to ?? null,
      tags: data.tags ?? [],
      metadata: data.metadata ?? {},
      created_by: data.created_by ?? null,
      ai_suggested_category: data.ai_suggested_category ?? null,
      ai_suggested_priority: data.ai_suggested_priority ?? null,
      ai_confidence: data.ai_confidence ?? null,
      sentiment_score: data.sentiment_score ?? null,
      sla_first_response_due: slaFirstResponseDue,
      sla_resolution_due: slaResolutionDue,
    })
    .select()
    .single()

  if (error) throw error

  return ticket as unknown as SupportTicket
}

// ============================================================
// Update ticket
// ============================================================
export interface UpdateTicketData {
  subject?: string
  description?: string
  category_id?: string | null
  priority?: TicketPriority
  status?: TicketStatus
  assigned_to?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
}

export async function updateTicket(
  accountId: string,
  ticketId: string,
  data: UpdateTicketData,
  updatedBy?: string
): Promise<SupportTicket> {
  const db = supabaseAdmin()

  // Get current ticket for change logging
  const { data: current, error: fetchErr } = await db
    .from('support_tickets')
    .select('status, priority, assigned_to, category_id')
    .eq('id', ticketId)
    .eq('account_id', accountId)
    .single()

  if (fetchErr) throw fetchErr

  const updatePayload: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  const { data: ticket, error } = await db
    .from('support_tickets')
    .update(updatePayload)
    .eq('id', ticketId)
    .eq('account_id', accountId)
    .select()
    .single()

  if (error) throw error

  // Log status change
  if (data.status && data.status !== current.status) {
    await addSystemMessage(
      accountId,
      ticketId,
      `Status changed from **${current.status}** to **${data.status}**`,
      'status_change'
    ).catch(() => {})
  }

  // Log priority change
  if (data.priority && data.priority !== current.priority) {
    await addSystemMessage(
      accountId,
      ticketId,
      `Priority changed from **${current.priority}** to **${data.priority}**`,
      'status_change'
    ).catch(() => {})
  }

  return ticket as unknown as SupportTicket
}

// ============================================================
// Assign ticket
// ============================================================
export async function assignTicket(
  accountId: string,
  ticketId: string,
  assigneeId: string,
  assignedBy?: string
): Promise<SupportTicket> {
  const db = supabaseAdmin()

  // Get assignee name
  const { data: profile } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', assigneeId)
    .single()

  const assigneeName = profile?.full_name ?? 'Unknown'

  const { data: ticket, error } = await db
    .from('support_tickets')
    .update({
      assigned_to: assigneeId,
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .eq('account_id', accountId)
    .select()
    .single()

  if (error) throw error

  await addSystemMessage(
    accountId,
    ticketId,
    `Ticket assigned to **${assigneeName}**`,
    'assignment'
  ).catch(() => {})

  return ticket as unknown as SupportTicket
}

// ============================================================
// Escalate ticket
// ============================================================
export async function escalateTicket(
  accountId: string,
  ticketId: string,
  escalateTo: string,
  reason: string,
  escalatedBy?: string
): Promise<SupportTicket> {
  const db = supabaseAdmin()

  // Get escalation target name
  const { data: profile } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', escalateTo)
    .single()

  const targetName = profile?.full_name ?? 'Unknown'

  const { data: ticket, error } = await db
    .from('support_tickets')
    .update({
      status: 'escalated' as TicketStatus,
      escalated_to: escalateTo,
      escalated_at: new Date().toISOString(),
      escalation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .eq('account_id', accountId)
    .select()
    .single()

  if (error) throw error

  await addSystemMessage(
    accountId,
    ticketId,
    `Ticket escalated to **${targetName}**. Reason: ${reason}`,
    'escalation'
  ).catch(() => {})

  return ticket as unknown as SupportTicket
}

// ============================================================
// Resolve ticket
// ============================================================
export async function resolveTicket(
  accountId: string,
  ticketId: string,
  resolution: string,
  resolvedBy?: string
): Promise<SupportTicket> {
  const db = supabaseAdmin()

  const now = new Date().toISOString()

  const { data: ticket, error } = await db
    .from('support_tickets')
    .update({
      status: 'resolved' as TicketStatus,
      resolved_at: now,
      updated_at: now,
    })
    .eq('id', ticketId)
    .eq('account_id', accountId)
    .select()
    .single()

  if (error) throw error

  await addSystemMessage(
    accountId,
    ticketId,
    `Ticket resolved: ${resolution}`,
    'resolution'
  ).catch(() => {})

  // Trigger satisfaction survey (fire-and-forget)
  try {
    const { sendSatisfactionSurvey } = await import('./satisfaction')
    await sendSatisfactionSurvey(accountId, ticketId)
  } catch {
    // Survey sending is best-effort
  }

  return ticket as unknown as SupportTicket
}

// ============================================================
// Close ticket
// ============================================================
export async function closeTicket(
  accountId: string,
  ticketId: string,
  closedBy?: string
): Promise<SupportTicket> {
  const db = supabaseAdmin()

  const now = new Date().toISOString()

  const { data: ticket, error } = await db
    .from('support_tickets')
    .update({
      status: 'closed' as TicketStatus,
      closed_at: now,
      updated_at: now,
    })
    .eq('id', ticketId)
    .eq('account_id', accountId)
    .select()
    .single()

  if (error) throw error

  await addSystemMessage(
    accountId,
    ticketId,
    'Ticket closed',
    'status_change'
  ).catch(() => {})

  return ticket as unknown as SupportTicket
}

// ============================================================
// Get support stats via RPC
// ============================================================
export interface SupportStats {
  total_open: number
  total_resolved: number
  total_closed: number
  critical_open: number
  high_open: number
  sla_breached: number
  avg_resolution_hours: number | null
  avg_first_response_hours: number | null
  escalated: number
  waiting_customer: number
  today_created: number
  today_resolved: number
}

export async function getTicketStats(
  accountId: string
): Promise<SupportStats> {
  const db = supabaseAdmin()

  const { data, error } = await db.rpc('get_support_stats', {
    p_account_id: accountId,
  })

  if (error) throw error

  return (data ?? {
    total_open: 0,
    total_resolved: 0,
    total_closed: 0,
    critical_open: 0,
    high_open: 0,
    sla_breached: 0,
    avg_resolution_hours: null,
    avg_first_response_hours: null,
    escalated: 0,
    waiting_customer: 0,
    today_created: 0,
    today_resolved: 0,
  }) as SupportStats
}
