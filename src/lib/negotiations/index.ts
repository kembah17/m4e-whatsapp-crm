import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  PriceNegotiation,
  NegotiationOutcome,
} from '@/types/business-growth'

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

export async function getNegotiations(
  accountId: string,
  filters?: {
    contact_id?: string
    product_id?: string
    outcome?: NegotiationOutcome
    limit?: number
    offset?: number
  },
) {
  const db = supabaseAdmin()
  let query = db
    .from('price_negotiations')
    .select(
      '*, contact:contacts!contact_id(name, phone), product:products!product_id(name)',
      { count: 'exact' },
    )
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (filters?.contact_id) query = query.eq('contact_id', filters.contact_id)
  if (filters?.product_id) query = query.eq('product_id', filters.product_id)
  if (filters?.outcome) query = query.eq('outcome', filters.outcome)

  const limit = filters?.limit ?? 50
  const offset = filters?.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { negotiations: (data ?? []) as PriceNegotiation[], total: count ?? 0 }
}

export async function createNegotiation(
  accountId: string,
  input: {
    contact_id: string
    product_id?: string | null
    original_price: number
    offered_price: number
    final_price?: number | null
    outcome?: NegotiationOutcome
    channel?: string | null
    notes?: string | null
    created_by?: string | null
  },
) {
  const db = supabaseAdmin()
  const discountPercent =
    input.original_price > 0
      ? ((input.original_price - input.offered_price) / input.original_price) * 100
      : 0

  const { data, error } = await db
    .from('price_negotiations')
    .insert({
      account_id: accountId,
      contact_id: input.contact_id,
      product_id: input.product_id ?? null,
      original_price: input.original_price,
      offered_price: input.offered_price,
      final_price: input.final_price ?? null,
      discount_percent: Math.round(discountPercent * 100) / 100,
      outcome: input.outcome || 'pending',
      channel: input.channel ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as PriceNegotiation
}

export async function updateNegotiation(
  accountId: string,
  negotiationId: string,
  updates: {
    final_price?: number | null
    outcome?: NegotiationOutcome
    notes?: string | null
  },
) {
  const db = supabaseAdmin()

  // If final_price is set, recalculate discount
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  if (updates.final_price !== undefined) {
    const { data: current } = await db
      .from('price_negotiations')
      .select('original_price')
      .eq('id', negotiationId)
      .single()
    if (current && current.original_price > 0 && updates.final_price !== null) {
      updateData.discount_percent =
        Math.round(
          ((current.original_price - updates.final_price) / current.original_price) * 100 * 100,
        ) / 100
    }
  }

  const { data, error } = await db
    .from('price_negotiations')
    .update(updateData)
    .eq('account_id', accountId)
    .eq('id', negotiationId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as PriceNegotiation
}

/* ------------------------------------------------------------------ */
/*  Stats                                                              */
/* ------------------------------------------------------------------ */

export async function getContactNegotiations(
  accountId: string,
  contactId: string,
) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('price_negotiations')
    .select('*')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PriceNegotiation[]
}

export async function getProductNegotiations(
  accountId: string,
  productId: string,
) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('price_negotiations')
    .select('*')
    .eq('account_id', accountId)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PriceNegotiation[]
}

export async function getNegotiationStats(accountId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('price_negotiations')
    .select('discount_percent, outcome')
    .eq('account_id', accountId)
  if (error) throw new Error(error.message)

  const all = data ?? []
  const accepted = all.filter((n) => n.outcome === 'accepted')
  const avgDiscount =
    accepted.length > 0
      ? accepted.reduce((sum, n) => sum + (n.discount_percent || 0), 0) / accepted.length
      : 0
  const acceptanceRate =
    all.length > 0 ? (accepted.length / all.length) * 100 : 0

  return {
    total: all.length,
    accepted: accepted.length,
    rejected: all.filter((n) => n.outcome === 'rejected').length,
    pending: all.filter((n) => n.outcome === 'pending').length,
    countered: all.filter((n) => n.outcome === 'countered').length,
    avg_discount: Math.round(avgDiscount * 100) / 100,
    acceptance_rate: Math.round(acceptanceRate * 100) / 100,
  }
}
