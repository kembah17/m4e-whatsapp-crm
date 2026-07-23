import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { TicketCategory } from '@/types/business-growth'

// ============================================================
// List categories
// ============================================================
export async function getCategories(
  accountId: string
): Promise<TicketCategory[]> {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('ticket_categories')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('position', { ascending: true })

  if (error) throw error
  return (data ?? []) as TicketCategory[]
}

// ============================================================
// Create category
// ============================================================
export interface CreateCategoryData {
  name: string
  description?: string
  icon?: string
  color?: string
  auto_assign_to?: string
  sla_policy_id?: string
  position?: number
}

export async function createCategory(
  accountId: string,
  data: CreateCategoryData
): Promise<TicketCategory> {
  const db = supabaseAdmin()

  // Get next position if not specified
  let position = data.position
  if (position === undefined) {
    const { count } = await db
      .from('ticket_categories')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
    position = (count ?? 0)
  }

  const { data: category, error } = await db
    .from('ticket_categories')
    .insert({
      account_id: accountId,
      name: data.name,
      description: data.description ?? null,
      icon: data.icon ?? 'tag',
      color: data.color ?? '#6366f1',
      auto_assign_to: data.auto_assign_to ?? null,
      sla_policy_id: data.sla_policy_id ?? null,
      position,
    })
    .select()
    .single()

  if (error) throw error
  return category as TicketCategory
}

// ============================================================
// Update category
// ============================================================
export async function updateCategory(
  accountId: string,
  id: string,
  data: Partial<CreateCategoryData> & { is_active?: boolean }
): Promise<TicketCategory> {
  const db = supabaseAdmin()

  const { data: category, error } = await db
    .from('ticket_categories')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('account_id', accountId)
    .select()
    .single()

  if (error) throw error
  return category as TicketCategory
}

// ============================================================
// Delete category (soft delete)
// ============================================================
export async function deleteCategory(
  accountId: string,
  id: string
): Promise<void> {
  const db = supabaseAdmin()

  const { error } = await db
    .from('ticket_categories')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('account_id', accountId)

  if (error) throw error
}

// ============================================================
// Seed default categories
// ============================================================
export async function seedDefaultCategories(
  accountId: string
): Promise<TicketCategory[]> {
  const db = supabaseAdmin()

  // Check if any exist
  const { count } = await db
    .from('ticket_categories')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)

  if ((count ?? 0) > 0) {
    const { data } = await db
      .from('ticket_categories')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('position')
    return (data ?? []) as TicketCategory[]
  }

  const defaults = [
    {
      account_id: accountId,
      name: 'General Inquiry',
      description: 'General questions and information requests',
      icon: 'help-circle',
      color: '#6366f1',
      position: 0,
    },
    {
      account_id: accountId,
      name: 'Technical Issue',
      description: 'Technical problems and bugs',
      icon: 'wrench',
      color: '#ef4444',
      position: 1,
    },
    {
      account_id: accountId,
      name: 'Billing',
      description: 'Payment, invoicing, and billing questions',
      icon: 'credit-card',
      color: '#f59e0b',
      position: 2,
    },
    {
      account_id: accountId,
      name: 'Complaint',
      description: 'Customer complaints and grievances',
      icon: 'alert-triangle',
      color: '#dc2626',
      position: 3,
    },
    {
      account_id: accountId,
      name: 'Feature Request',
      description: 'Suggestions and feature requests',
      icon: 'lightbulb',
      color: '#10b981',
      position: 4,
    },
    {
      account_id: accountId,
      name: 'Order Issue',
      description: 'Problems with orders, delivery, or products',
      icon: 'package',
      color: '#8b5cf6',
      position: 5,
    },
  ]

  const { data, error } = await db
    .from('ticket_categories')
    .insert(defaults)
    .select()

  if (error) throw error
  return (data ?? []) as TicketCategory[]
}
