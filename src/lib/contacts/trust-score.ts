import { createClient } from '@/lib/supabase/client'
import type {
  TrustScoreConfig,
  TrustScoreHistory,
} from '@/types/business-growth'

// ============================================================
// Trust Score Display Helpers
// ============================================================

export function getTrustScoreColor(score: number): string {
  if (score < 35) return 'text-red-500'
  if (score <= 75) return 'text-yellow-500'
  return 'text-green-500'
}

export function getTrustScoreBgColor(score: number): string {
  if (score < 35) return 'bg-red-500/10 border-red-500/30'
  if (score <= 75) return 'bg-yellow-500/10 border-yellow-500/30'
  return 'bg-green-500/10 border-green-500/30'
}

export function getTrustScoreLabel(score: number): string {
  if (score < 35) return 'Low Trust'
  if (score <= 75) return 'Medium Trust'
  return 'High Trust'
}

// ============================================================
// Trust Score Config CRUD (client-side)
// ============================================================

export async function getTrustScoreConfig(
  accountId: string
): Promise<TrustScoreConfig | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('trust_score_config')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle()
  if (error) throw error
  return data as TrustScoreConfig | null
}

export async function updateTrustScoreConfig(
  accountId: string,
  config: Partial<Pick<TrustScoreConfig,
    | 'weight_payment_speed'
    | 'weight_order_frequency'
    | 'weight_order_value'
    | 'weight_communication'
    | 'weight_referrals'
    | 'weight_returns'
    | 'weight_loyalty'
    | 'high_trust_threshold'
    | 'low_trust_threshold'
    | 'auto_recalculate'
    | 'recalculate_interval_days'
  >>
): Promise<TrustScoreConfig> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from('trust_score_config')
    .select('id')
    .eq('account_id', accountId)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('trust_score_config')
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq('account_id', accountId)
      .select()
      .single()
    if (error) throw error
    return data as TrustScoreConfig
  } else {
    const { data, error } = await supabase
      .from('trust_score_config')
      .insert({ account_id: accountId, ...config })
      .select()
      .single()
    if (error) throw error
    return data as TrustScoreConfig
  }
}

// ============================================================
// Trust Score Operations (client-side)
// ============================================================

export async function recalculateTrustScore(
  accountId: string,
  contactId: string
): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('recalculate_trust_score', {
    p_account_id: accountId,
    p_contact_id: contactId,
  })
  if (error) throw error
  return typeof data === 'number' ? data : 0
}

export async function getTrustScoreHistory(
  accountId: string,
  contactId: string,
  limit = 20
): Promise<TrustScoreHistory[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('trust_score_history')
    .select('*')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as TrustScoreHistory[]
}
