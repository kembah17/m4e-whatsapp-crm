import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { SLAPolicy, TicketPriority } from '@/types/business-growth'

// ============================================================
// List SLA policies
// ============================================================
export async function getSLAPolicies(
  accountId: string
): Promise<SLAPolicy[]> {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('sla_policies')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (error) throw error
  return (data ?? []) as SLAPolicy[]
}

// ============================================================
// Get default SLA for a priority
// ============================================================
export async function getDefaultSLA(
  accountId: string,
  priority: TicketPriority
): Promise<SLAPolicy | null> {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('sla_policies')
    .select('*')
    .eq('account_id', accountId)
    .eq('priority', priority)
    .eq('is_default', true)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as SLAPolicy | null
}

// ============================================================
// Create SLA policy
// ============================================================
export interface CreateSLAData {
  name: string
  description?: string
  priority: TicketPriority
  first_response_minutes: number
  resolution_minutes: number
  escalation_minutes?: number
  escalate_to?: string
  is_default?: boolean
}

export async function createSLAPolicy(
  accountId: string,
  data: CreateSLAData
): Promise<SLAPolicy> {
  const db = supabaseAdmin()

  // If this is set as default, unset other defaults for same priority
  if (data.is_default) {
    await db
      .from('sla_policies')
      .update({ is_default: false })
      .eq('account_id', accountId)
      .eq('priority', data.priority)
      .eq('is_default', true)
  }

  const { data: policy, error } = await db
    .from('sla_policies')
    .insert({
      account_id: accountId,
      name: data.name,
      description: data.description ?? null,
      priority: data.priority,
      first_response_minutes: data.first_response_minutes,
      resolution_minutes: data.resolution_minutes,
      escalation_minutes: data.escalation_minutes ?? null,
      escalate_to: data.escalate_to ?? null,
      is_default: data.is_default ?? false,
    })
    .select()
    .single()

  if (error) throw error
  return policy as SLAPolicy
}

// ============================================================
// Update SLA policy
// ============================================================
export async function updateSLAPolicy(
  accountId: string,
  id: string,
  data: Partial<CreateSLAData> & { is_active?: boolean }
): Promise<SLAPolicy> {
  const db = supabaseAdmin()

  // If setting as default, unset others
  if (data.is_default && data.priority) {
    await db
      .from('sla_policies')
      .update({ is_default: false })
      .eq('account_id', accountId)
      .eq('priority', data.priority)
      .eq('is_default', true)
      .neq('id', id)
  }

  const { data: policy, error } = await db
    .from('sla_policies')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('account_id', accountId)
    .select()
    .single()

  if (error) throw error
  return policy as SLAPolicy
}

// ============================================================
// Calculate SLA due dates
// ============================================================
export function calculateSLADueDates(
  createdAt: string,
  slaPolicy: SLAPolicy
): { firstResponseDue: string; resolutionDue: string } {
  const created = new Date(createdAt)

  const firstResponseDue = new Date(
    created.getTime() + slaPolicy.first_response_minutes * 60 * 1000
  )

  const resolutionDue = new Date(
    created.getTime() + slaPolicy.resolution_minutes * 60 * 1000
  )

  return {
    firstResponseDue: firstResponseDue.toISOString(),
    resolutionDue: resolutionDue.toISOString(),
  }
}

// ============================================================
// Check SLA breaches — find tickets past SLA, update flags
// ============================================================
export async function checkSLABreaches(
  accountId?: string
): Promise<{ breached: number; warnings: number }> {
  const db = supabaseAdmin()
  const now = new Date().toISOString()
  let breached = 0
  let warnings = 0

  // Find tickets with first response SLA breached
  let frQuery = db
    .from('support_tickets')
    .update({
      sla_first_response_breached: true,
      updated_at: now,
    })
    .is('first_response_at', null)
    .eq('sla_first_response_breached', false)
    .lt('sla_first_response_due', now)
    .not('sla_first_response_due', 'is', null)
    .in('status', ['open', 'in_progress', 'waiting_customer', 'waiting_internal', 'escalated'])

  if (accountId) {
    frQuery = frQuery.eq('account_id', accountId)
  }

  const { count: frCount } = await frQuery.select('id', { count: 'exact', head: true })

  // Actually perform the update (the above was just counting)
  let frUpdate = db
    .from('support_tickets')
    .update({
      sla_first_response_breached: true,
      updated_at: now,
    })
    .is('first_response_at', null)
    .eq('sla_first_response_breached', false)
    .lt('sla_first_response_due', now)
    .not('sla_first_response_due', 'is', null)
    .in('status', ['open', 'in_progress', 'waiting_customer', 'waiting_internal', 'escalated'])

  if (accountId) {
    frUpdate = frUpdate.eq('account_id', accountId)
  }

  await frUpdate

  // Find tickets with resolution SLA breached
  let resUpdate = db
    .from('support_tickets')
    .update({
      sla_resolution_breached: true,
      updated_at: now,
    })
    .eq('sla_resolution_breached', false)
    .lt('sla_resolution_due', now)
    .not('sla_resolution_due', 'is', null)
    .in('status', ['open', 'in_progress', 'waiting_customer', 'waiting_internal', 'escalated'])

  if (accountId) {
    resUpdate = resUpdate.eq('account_id', accountId)
  }

  const { count: resCount } = await resUpdate.select('id', { count: 'exact', head: true })

  breached = (frCount ?? 0) + (resCount ?? 0)

  // Count warnings (tickets within 50% of SLA remaining)
  // This is informational only
  const warningTime = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min from now
  let warnQuery = db
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('sla_first_response_breached', false)
    .eq('sla_resolution_breached', false)
    .lt('sla_first_response_due', warningTime)
    .not('sla_first_response_due', 'is', null)
    .in('status', ['open', 'in_progress'])

  if (accountId) {
    warnQuery = warnQuery.eq('account_id', accountId)
  }

  const { count: warnCount } = await warnQuery
  warnings = warnCount ?? 0

  return { breached, warnings }
}

// ============================================================
// Seed default SLA policies
// ============================================================
export async function seedDefaultSLAs(
  accountId: string
): Promise<SLAPolicy[]> {
  const db = supabaseAdmin()

  // Check if any exist
  const { count } = await db
    .from('sla_policies')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)

  if ((count ?? 0) > 0) {
    const { data } = await db
      .from('sla_policies')
      .select('*')
      .eq('account_id', accountId)
      .order('priority')
    return (data ?? []) as SLAPolicy[]
  }

  const defaults = [
    {
      account_id: accountId,
      name: 'Critical SLA',
      description: 'For critical issues requiring immediate attention',
      priority: 'critical',
      first_response_minutes: 60,
      resolution_minutes: 240,
      escalation_minutes: 120,
      is_default: true,
      is_active: true,
    },
    {
      account_id: accountId,
      name: 'High Priority SLA',
      description: 'For high priority issues',
      priority: 'high',
      first_response_minutes: 240,
      resolution_minutes: 480,
      escalation_minutes: 360,
      is_default: true,
      is_active: true,
    },
    {
      account_id: accountId,
      name: 'Normal SLA',
      description: 'Standard response times for normal issues',
      priority: 'normal',
      first_response_minutes: 1440,
      resolution_minutes: 2880,
      escalation_minutes: 2160,
      is_default: true,
      is_active: true,
    },
    {
      account_id: accountId,
      name: 'Low Priority SLA',
      description: 'Extended timelines for low priority items',
      priority: 'low',
      first_response_minutes: 2880,
      resolution_minutes: 5760,
      escalation_minutes: 4320,
      is_default: true,
      is_active: true,
    },
  ]

  const { data, error } = await db
    .from('sla_policies')
    .insert(defaults)
    .select()

  if (error) throw error
  return (data ?? []) as SLAPolicy[]
}
