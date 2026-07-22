/**
 * Referral tracking and management.
 * Handles referral codes, tracking, conversion, and rewards.
 */

import { createClient } from '@supabase/supabase-js'
import type { Referral, ReferralConfig } from '@/types/business-growth'

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

export async function getReferralConfig(
  accountId: string
): Promise<ReferralConfig | null> {
  const { data } = await supabaseAdmin()
    .from('referral_config')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle()
  return data as ReferralConfig | null
}

export async function upsertReferralConfig(
  accountId: string,
  config: Partial<ReferralConfig>
): Promise<ReferralConfig> {
  const db = supabaseAdmin()

  // Check if exists
  const { data: existing } = await db
    .from('referral_config')
    .select('id')
    .eq('account_id', accountId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await db
      .from('referral_config')
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq('account_id', accountId)
      .select()
      .single()
    if (error) throw new Error(`Failed to update referral config: ${error.message}`)
    return data as ReferralConfig
  } else {
    const { data, error } = await db
      .from('referral_config')
      .insert({ account_id: accountId, ...config })
      .select()
      .single()
    if (error) throw new Error(`Failed to create referral config: ${error.message}`)
    return data as ReferralConfig
  }
}

// ── Referral Code Generation ────────────────────────────────

export function generateReferralCode(contactId: string): string {
  const prefix = contactId.substring(0, 4).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `REF-${prefix}-${random}`
}

// ── CRUD ────────────────────────────────────────────────────

export async function createReferral(
  accountId: string,
  data: {
    referrer_contact_id: string
    referred_contact_id?: string
    channel?: string
    notes?: string
  }
): Promise<Referral> {
  const code = generateReferralCode(data.referrer_contact_id)

  const { data: referral, error } = await supabaseAdmin()
    .from('referrals')
    .insert({
      account_id: accountId,
      referrer_contact_id: data.referrer_contact_id,
      referred_contact_id: data.referred_contact_id || null,
      referral_code: code,
      channel: data.channel || 'whatsapp',
      status: 'pending',
      notes: data.notes || null,
    })
    .select('*, referrer:contacts!referrer_contact_id(id, name, phone), referred:contacts!referred_contact_id(id, name, phone)')
    .single()

  if (error) throw new Error(`Failed to create referral: ${error.message}`)
  return referral as Referral
}

export async function getReferrals(
  accountId: string,
  filters?: {
    status?: string
    referrer_contact_id?: string
    limit?: number
    offset?: number
  }
): Promise<{ referrals: Referral[]; total: number }> {
  const db = supabaseAdmin()
  const limit = filters?.limit || 50
  const offset = filters?.offset || 0

  let query = db
    .from('referrals')
    .select(
      '*, referrer:contacts!referrer_contact_id(id, name, phone), referred:contacts!referred_contact_id(id, name, phone)',
      { count: 'exact' }
    )
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.referrer_contact_id) query = query.eq('referrer_contact_id', filters.referrer_contact_id)

  const { data, count, error } = await query
  if (error) throw new Error(`Failed to list referrals: ${error.message}`)
  return { referrals: (data || []) as Referral[], total: count || 0 }
}

export async function updateReferralStatus(
  referralId: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<Referral> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  }

  if (status === 'converted') {
    updateData.converted_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin()
    .from('referrals')
    .update(updateData)
    .eq('id', referralId)
    .select('*, referrer:contacts!referrer_contact_id(id, name, phone), referred:contacts!referred_contact_id(id, name, phone)')
    .single()

  if (error) throw new Error(`Failed to update referral: ${error.message}`)
  return data as Referral
}

// ── Conversion & Rewards ────────────────────────────────────

export async function convertReferral(
  referralId: string,
  accountId: string,
  firstPurchaseAmount?: number
): Promise<Referral> {
  const db = supabaseAdmin()

  // Get referral
  const { data: referral } = await db
    .from('referrals')
    .select('*')
    .eq('id', referralId)
    .single()

  if (!referral) throw new Error('Referral not found')

  // Get config for reward
  const config = await getReferralConfig(accountId)

  const updateData: Record<string, unknown> = {
    status: 'converted',
    converted_at: new Date().toISOString(),
    first_purchase_amount: firstPurchaseAmount || null,
    updated_at: new Date().toISOString(),
  }

  // Issue reward if config exists
  if (config && config.is_active) {
    const meetsMinPurchase = !config.require_purchase ||
      (firstPurchaseAmount && firstPurchaseAmount >= config.min_purchase_amount)

    if (meetsMinPurchase) {
      updateData.reward_type = config.reward_type
      updateData.reward_value = config.reward_value
      updateData.reward_issued = true
      updateData.reward_issued_at = new Date().toISOString()
      updateData.status = 'rewarded'

      // If reward is points, add to referrer loyalty
      if (config.reward_type === 'points') {
        try {
          const { awardPoints } = await import('@/lib/loyalty')
          await awardPoints(
            accountId,
            referral.referrer_contact_id,
            'referral',
            config.reward_value,
            `Referral reward for ${referral.referral_code}`,
            referralId
          )
        } catch { /* loyalty module may not be available */ }
      }
    }
  }

  const { data, error } = await db
    .from('referrals')
    .update(updateData)
    .eq('id', referralId)
    .select('*, referrer:contacts!referrer_contact_id(id, name, phone), referred:contacts!referred_contact_id(id, name, phone)')
    .single()

  if (error) throw new Error(`Failed to convert referral: ${error.message}`)
  return data as Referral
}

// ── Stats ───────────────────────────────────────────────────

export async function getReferralStats(accountId: string): Promise<{
  total: number
  pending: number
  converted: number
  rewarded: number
  conversion_rate: number
  avg_discount: number
}> {
  const { data } = await supabaseAdmin()
    .from('referrals')
    .select('status, reward_value')
    .eq('account_id', accountId)

  const all = data || []
  const total = all.length
  const pending = all.filter((r: { status: string }) => r.status === 'pending').length
  const converted = all.filter((r: { status: string }) => ['converted', 'rewarded'].includes(r.status)).length
  const rewarded = all.filter((r: { status: string }) => r.status === 'rewarded').length
  const rewardValues = all
    .filter((r: { reward_value: number | null }) => r.reward_value != null)
    .map((r: { reward_value: number }) => r.reward_value)
  const avg_discount = rewardValues.length > 0
    ? rewardValues.reduce((a: number, b: number) => a + b, 0) / rewardValues.length
    : 0

  return {
    total,
    pending,
    converted,
    rewarded,
    conversion_rate: total > 0 ? (converted / total) * 100 : 0,
    avg_discount,
  }
}

export async function getTopReferrers(
  accountId: string,
  limit = 10
): Promise<Array<{ contact_id: string; name: string; phone: string; referral_count: number; converted_count: number }>> {
  const db = supabaseAdmin()

  // Get all referrals with referrer info
  const { data } = await db
    .from('referrals')
    .select('referrer_contact_id, status, referrer:contacts!referrer_contact_id(id, name, phone)')
    .eq('account_id', accountId)

  if (!data || data.length === 0) return []

  // Aggregate by referrer
  const referrerMap = new Map<string, { name: string; phone: string; total: number; converted: number }>()

  for (const r of data) {
    const id = r.referrer_contact_id
    const existing = referrerMap.get(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ref = r.referrer as any
    if (existing) {
      existing.total++
      if (['converted', 'rewarded'].includes(r.status)) existing.converted++
    } else {
      referrerMap.set(id, {
        name: ref?.name || 'Unknown',
        phone: ref?.phone || '',
        total: 1,
        converted: ['converted', 'rewarded'].includes(r.status) ? 1 : 0,
      })
    }
  }

  return Array.from(referrerMap.entries())
    .map(([contact_id, info]) => ({
      contact_id,
      name: info.name,
      phone: info.phone,
      referral_count: info.total,
      converted_count: info.converted,
    }))
    .sort((a, b) => b.referral_count - a.referral_count)
    .slice(0, limit)
}
