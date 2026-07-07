import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { AccessLevel, GuidedAccessConfig } from '@/types/packages'

/**
 * Check if a feature is managed/self_service/preview for the current account.
 * Returns the access config or a default self_service if none configured.
 */
export async function getFeatureAccess(
  accountId: string,
  featureKey: string
): Promise<{ level: AccessLevel; highlighted: boolean; upgradePrompt: string | null }> {
  const db = supabaseAdmin()
  const { data } = await db
    .from('guided_access_config')
    .select('access_level, is_highlighted, upgrade_prompt')
    .eq('account_id', accountId)
    .eq('feature_key', featureKey)
    .single()

  if (data) {
    return {
      level: data.access_level as AccessLevel,
      highlighted: data.is_highlighted,
      upgradePrompt: data.upgrade_prompt,
    }
  }

  return { level: 'self_service', highlighted: false, upgradePrompt: null }
}

/**
 * Get all guided access configs for an account.
 */
export async function getAccountAccess(
  accountId: string
): Promise<GuidedAccessConfig[]> {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('guided_access_config')
    .select('*')
    .eq('account_id', accountId)
    .order('feature_key')

  if (error) {
    console.error('[guided-access] fetch error:', error)
    return []
  }

  return (data ?? []) as GuidedAccessConfig[]
}

/**
 * Set guided access for a feature on an account (upsert).
 */
export async function setFeatureAccess(
  accountId: string,
  featureKey: string,
  accessLevel: AccessLevel,
  options?: {
    packageConfigId?: string
    isHighlighted?: boolean
    upgradePrompt?: string | null
  }
): Promise<GuidedAccessConfig | null> {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('guided_access_config')
    .upsert(
      {
        account_id: accountId,
        feature_key: featureKey,
        access_level: accessLevel,
        package_config_id: options?.packageConfigId ?? null,
        is_highlighted: options?.isHighlighted ?? false,
        upgrade_prompt: options?.upgradePrompt ?? null,
      },
      { onConflict: 'account_id,feature_key' }
    )
    .select()
    .single()

  if (error) {
    console.error('[guided-access] upsert error:', error)
    return null
  }

  return data as GuidedAccessConfig
}

/** All feature keys that can be configured */
export const FEATURE_KEYS = [
  'campaigns',
  'automations',
  'flows',
  'ai_chatbot',
  'sentiment',
  'ecommerce',
  'catalog',
  'ctwa',
  'broadcasts',
  'analytics',
  'pipelines',
  'imports',
  'qr_codes',
  'branches',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]
