/**
 * Loyalty programme management.
 * Points, tiers, transactions, and rewards.
 */

import { createClient } from '@supabase/supabase-js'
import type {
  LoyaltyConfig, LoyaltyTransaction, LoyaltyTier,
} from '@/types/business-growth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: any = null
function supabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

// ── Config ──────────────────────────────────────────────────

export async function getLoyaltyConfig(
  accountId: string
): Promise<LoyaltyConfig | null> {
  const { data } = await supabaseAdmin()
    .from('loyalty_config')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle()
  return data as LoyaltyConfig | null
}

export async function updateLoyaltyConfig(
  accountId: string,
  config: Partial<LoyaltyConfig>
): Promise<LoyaltyConfig> {
  const db = supabaseAdmin()

  const { data: existing } = await db
    .from('loyalty_config')
    .select('id')
    .eq('account_id', accountId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await db
      .from('loyalty_config')
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq('account_id', accountId)
      .select()
      .single()
    if (error) throw new Error(`Failed to update loyalty config: ${error.message}`)
    return data as LoyaltyConfig
  } else {
    const { data, error } = await db
      .from('loyalty_config')
      .insert({ account_id: accountId, ...config })
      .select()
      .single()
    if (error) throw new Error(`Failed to create loyalty config: ${error.message}`)
    return data as LoyaltyConfig
  }
}

// ── Points Management ───────────────────────────────────────

export async function awardPoints(
  accountId: string,
  contactId: string,
  type: string,
  points: number,
  description: string,
  referenceId?: string,
  referenceType?: string
): Promise<LoyaltyTransaction> {
  const db = supabaseAdmin()

  // Get current contact loyalty info
  const { data: contact } = await db
    .from('contacts')
    .select('loyalty_points, loyalty_tier')
    .eq('id', contactId)
    .single()

  if (!contact) throw new Error('Contact not found')

  const currentPoints = contact.loyalty_points || 0
  const newBalance = currentPoints + points

  // Get config for expiry
  const config = await getLoyaltyConfig(accountId)
  let expiresAt: string | null = null
  if (config?.points_expire && config.points_expiry_months > 0) {
    const expiry = new Date()
    expiry.setMonth(expiry.getMonth() + config.points_expiry_months)
    expiresAt = expiry.toISOString()
  }

  // Record transaction
  const { data: txn, error: txnErr } = await db
    .from('loyalty_transactions')
    .insert({
      account_id: accountId,
      contact_id: contactId,
      transaction_type: type,
      points,
      balance_after: newBalance,
      description,
      reference_type: referenceType || null,
      reference_id: referenceId || null,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (txnErr) throw new Error(`Failed to record loyalty transaction: ${txnErr.message}`)

  // Update contact balance
  await db
    .from('contacts')
    .update({ loyalty_points: newBalance })
    .eq('id', contactId)

  // Check tier upgrade
  if (config) {
    await checkTierUpgrade(accountId, contactId, newBalance, config)
  }

  return txn as LoyaltyTransaction
}

export async function redeemPoints(
  accountId: string,
  contactId: string,
  points: number,
  description: string
): Promise<LoyaltyTransaction> {
  const db = supabaseAdmin()

  // Get current balance
  const { data: contact } = await db
    .from('contacts')
    .select('loyalty_points')
    .eq('id', contactId)
    .single()

  if (!contact) throw new Error('Contact not found')

  const currentPoints = contact.loyalty_points || 0
  if (currentPoints < points) {
    throw new Error(`Insufficient points. Available: ${currentPoints}, Requested: ${points}`)
  }

  // Check minimum redemption
  const config = await getLoyaltyConfig(accountId)
  if (config && points < config.min_redemption_points) {
    throw new Error(`Minimum redemption is ${config.min_redemption_points} points`)
  }

  const newBalance = currentPoints - points

  // Record transaction (negative points)
  const { data: txn, error: txnErr } = await db
    .from('loyalty_transactions')
    .insert({
      account_id: accountId,
      contact_id: contactId,
      transaction_type: 'redemption',
      points: -points,
      balance_after: newBalance,
      description,
    })
    .select()
    .single()

  if (txnErr) throw new Error(`Failed to record redemption: ${txnErr.message}`)

  // Update contact balance
  await db
    .from('contacts')
    .update({ loyalty_points: newBalance })
    .eq('id', contactId)

  return txn as LoyaltyTransaction
}

// ── Tier Management ─────────────────────────────────────────

export function determineTier(
  totalPoints: number,
  config: LoyaltyConfig
): LoyaltyTier {
  if (totalPoints >= config.platinum_threshold) return 'platinum'
  if (totalPoints >= config.gold_threshold) return 'gold'
  if (totalPoints >= config.silver_threshold) return 'silver'
  return 'bronze'
}

export async function checkTierUpgrade(
  accountId: string,
  contactId: string,
  currentPoints?: number,
  config?: LoyaltyConfig | null
): Promise<{ upgraded: boolean; newTier: LoyaltyTier; oldTier: LoyaltyTier }> {
  const db = supabaseAdmin()

  if (!config) {
    config = await getLoyaltyConfig(accountId)
  }
  if (!config) return { upgraded: false, newTier: 'bronze', oldTier: 'bronze' }

  // Get contact
  const { data: contact } = await db
    .from('contacts')
    .select('loyalty_points, loyalty_tier')
    .eq('id', contactId)
    .single()

  if (!contact) return { upgraded: false, newTier: 'bronze', oldTier: 'bronze' }

  const points = currentPoints ?? (contact.loyalty_points || 0)
  const oldTier = (contact.loyalty_tier || 'bronze') as LoyaltyTier
  const newTier = determineTier(points, config)

  if (newTier !== oldTier) {
    await db
      .from('contacts')
      .update({ loyalty_tier: newTier })
      .eq('id', contactId)

    return { upgraded: true, newTier, oldTier }
  }

  return { upgraded: false, newTier, oldTier }
}

// ── Transactions ────────────────────────────────────────────

export async function getLoyaltyTransactions(
  accountId: string,
  contactId?: string,
  limit = 50,
  offset = 0
): Promise<{ transactions: LoyaltyTransaction[]; total: number }> {
  const db = supabaseAdmin()

  let query = db
    .from('loyalty_transactions')
    .select('*, contact:contacts(id, name, phone)', { count: 'exact' })
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (contactId) query = query.eq('contact_id', contactId)

  const { data, count, error } = await query
  if (error) throw new Error(`Failed to list transactions: ${error.message}`)
  return { transactions: (data || []) as LoyaltyTransaction[], total: count || 0 }
}

// ── Stats ───────────────────────────────────────────────────

export async function getLoyaltyStats(accountId: string): Promise<{
  active_members: number
  total_points_outstanding: number
  tier_distribution: Record<string, number>
  total_redeemed: number
}> {
  const db = supabaseAdmin()

  // Get contacts with loyalty points
  const { data: contacts } = await db
    .from('contacts')
    .select('loyalty_points, loyalty_tier')
    .eq('account_id', accountId)
    .gt('loyalty_points', 0)

  const all = contacts || []
  const active_members = all.length
  const total_points_outstanding = all.reduce(
    (sum: number, c: { loyalty_points: number }) => sum + (c.loyalty_points || 0), 0
  )

  const tier_distribution: Record<string, number> = {
    bronze: 0, silver: 0, gold: 0, platinum: 0,
  }
  for (const c of all) {
    const tier = (c as { loyalty_tier: string }).loyalty_tier || 'bronze'
    tier_distribution[tier] = (tier_distribution[tier] || 0) + 1
  }

  // Get total redeemed
  const { data: redemptions } = await db
    .from('loyalty_transactions')
    .select('points')
    .eq('account_id', accountId)
    .eq('transaction_type', 'redemption')

  const total_redeemed = (redemptions || []).reduce(
    (sum: number, t: { points: number }) => sum + Math.abs(t.points), 0
  )

  return { active_members, total_points_outstanding, tier_distribution, total_redeemed }
}

// ── Point Expiry ────────────────────────────────────────────

export async function expirePoints(accountId: string): Promise<number> {
  const db = supabaseAdmin()
  const now = new Date().toISOString()

  // Find expired transactions that haven't been offset
  const { data: expired } = await db
    .from('loyalty_transactions')
    .select('id, contact_id, points, balance_after')
    .eq('account_id', accountId)
    .lt('expires_at', now)
    .gt('points', 0)
    .is('reference_type', null) // Only expire original awards, not adjustments

  if (!expired || expired.length === 0) return 0

  let expiredCount = 0
  for (const txn of expired) {
    try {
      // Create expiry transaction
      await db.from('loyalty_transactions').insert({
        account_id: accountId,
        contact_id: txn.contact_id,
        transaction_type: 'expiry',
        points: -txn.points,
        balance_after: 0, // Will be recalculated
        description: `Points expired (original transaction ${txn.id})`,
        reference_type: 'expiry',
        reference_id: txn.id,
      })

      // Update contact balance
      const { data: contact } = await db
        .from('contacts')
        .select('loyalty_points')
        .eq('id', txn.contact_id)
        .single()

      if (contact) {
        const newBalance = Math.max(0, (contact.loyalty_points || 0) - txn.points)
        await db
          .from('contacts')
          .update({ loyalty_points: newBalance })
          .eq('id', txn.contact_id)
      }

      expiredCount++
    } catch { /* continue with next */ }
  }

  return expiredCount
}

// ── Contact Loyalty Details ─────────────────────────────────

export async function getContactLoyalty(
  accountId: string,
  contactId: string
): Promise<{
  points: number
  tier: LoyaltyTier
  transactions: LoyaltyTransaction[]
  tier_benefits: { discount_percent: number } | null
}> {
  const db = supabaseAdmin()

  const [contactRes, txnRes, config] = await Promise.all([
    db.from('contacts').select('loyalty_points, loyalty_tier').eq('id', contactId).single(),
    db.from('loyalty_transactions')
      .select('*')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(50),
    getLoyaltyConfig(accountId),
  ])

  const contact = contactRes.data
  const points = contact?.loyalty_points || 0
  const tier = (contact?.loyalty_tier || 'bronze') as LoyaltyTier

  let tier_benefits: { discount_percent: number } | null = null
  if (config) {
    const discountMap: Record<string, number> = {
      silver: config.silver_discount_percent,
      gold: config.gold_discount_percent,
      platinum: config.platinum_discount_percent,
    }
    if (discountMap[tier]) {
      tier_benefits = { discount_percent: discountMap[tier] }
    }
  }

  return {
    points,
    tier,
    transactions: (txnRes.data || []) as LoyaltyTransaction[],
    tier_benefits,
  }
}
