import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { RevenueCenter } from '@/types/financials'

export async function getRevenueCenters(accountId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('revenue_centers')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as RevenueCenter[]
}

export async function createRevenueCenter(
  accountId: string,
  data: { name: string; description?: string; branch_id?: string },
) {
  const db = supabaseAdmin()
  const { data: row, error } = await db
    .from('revenue_centers')
    .insert({
      account_id: accountId,
      name: data.name,
      description: data.description ?? null,
      branch_id: data.branch_id ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as RevenueCenter
}

export async function updateRevenueCenter(
  accountId: string,
  id: string,
  data: { name?: string; description?: string; branch_id?: string },
) {
  const db = supabaseAdmin()
  const { data: row, error } = await db
    .from('revenue_centers')
    .update(data)
    .eq('account_id', accountId)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as RevenueCenter
}

export async function deleteRevenueCenter(accountId: string, id: string) {
  const db = supabaseAdmin()
  const { error } = await db
    .from('revenue_centers')
    .update({ is_active: false })
    .eq('account_id', accountId)
    .eq('id', id)
  if (error) throw new Error(error.message)
}
