import { supabaseAdmin } from '@/lib/ecommerce/admin-client';
import type { FeatureAccessConfig, FeatureTier } from '@/types/business-growth';
import { FEATURE_TIER_MAP } from '@/types/business-growth';

// Tier hierarchy: higher index = higher tier
const TIER_HIERARCHY: FeatureTier[] = ['starter', 'professional', 'business', 'enterprise'];

function tierLevel(tier: FeatureTier): number {
  return TIER_HIERARCHY.indexOf(tier);
}

/**
 * Check if a tier meets or exceeds the required tier.
 */
export function tierMeetsRequirement(currentTier: FeatureTier, requiredTier: FeatureTier): boolean {
  return tierLevel(currentTier) >= tierLevel(requiredTier);
}

/**
 * Get the feature access configuration for an account.
 * Returns null if no config exists (defaults to starter).
 */
export async function getFeatureAccess(accountId: string): Promise<FeatureAccessConfig | null> {
  const { data, error } = await supabaseAdmin
    .from('feature_access_config')
    .select('*')
    .eq('account_id', accountId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching feature access:', error);
    return null;
  }
  return data as FeatureAccessConfig | null;
}

/**
 * Get or create feature access config with defaults.
 */
export async function getOrCreateFeatureAccess(accountId: string): Promise<FeatureAccessConfig> {
  const existing = await getFeatureAccess(accountId);
  if (existing) return existing;

  // Create default starter config
  const defaults = {
    account_id: accountId,
    current_tier: 'starter' as FeatureTier,
    feature_overrides: {},
    max_contacts: 500,
    max_broadcasts_per_month: 10,
    max_campaigns: 3,
    max_invoices_per_month: 20,
    max_ai_queries_per_day: 10,
    upsell_prompts_shown: {},
    upsell_cooldown_days: 7,
    preview_features: [],
  };

  const { data, error } = await supabaseAdmin
    .from('feature_access_config')
    .insert(defaults)
    .select()
    .single();

  if (error) {
    console.error('Error creating feature access:', error);
    // Return a synthetic config
    return {
      ...defaults,
      id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as FeatureAccessConfig;
  }
  return data as FeatureAccessConfig;
}

/**
 * Check if an account can access a specific feature.
 * Returns { allowed, tier_required, preview, reason }
 */
export async function canAccessFeature(
  accountId: string,
  featureName: string
): Promise<{
  allowed: boolean;
  tier_required?: FeatureTier;
  preview?: boolean;
  reason?: string;
}> {
  const config = await getOrCreateFeatureAccess(accountId);

  // Check feature overrides first (admin can grant/revoke specific features)
  if (config.feature_overrides[featureName] === true) {
    return { allowed: true, reason: 'override_granted' };
  }
  if (config.feature_overrides[featureName] === false) {
    return { allowed: false, reason: 'override_revoked' };
  }

  // Check preview features
  if (config.preview_features.includes(featureName)) {
    const previewExpired = config.preview_expires_at
      ? new Date(config.preview_expires_at) < new Date()
      : false;

    if (!previewExpired) {
      return { allowed: true, preview: true, reason: 'preview_active' };
    }
  }

  // Check tier requirement
  const requiredTier = FEATURE_TIER_MAP[featureName];
  if (!requiredTier) {
    // Unknown feature - allow by default
    return { allowed: true, reason: 'no_tier_requirement' };
  }

  if (tierMeetsRequirement(config.current_tier, requiredTier)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    tier_required: requiredTier,
    reason: 'tier_insufficient',
  };
}

/**
 * Check if an upsell prompt should be shown (respects cooldown).
 */
export async function showUpsellPrompt(
  accountId: string,
  featureName: string
): Promise<{ show: boolean; tier_required?: FeatureTier }> {
  const config = await getOrCreateFeatureAccess(accountId);
  const requiredTier = FEATURE_TIER_MAP[featureName];

  if (!requiredTier || tierMeetsRequirement(config.current_tier, requiredTier)) {
    return { show: false };
  }

  // Check cooldown
  const lastShown = config.upsell_prompts_shown[featureName];
  if (lastShown) {
    const lastDate = new Date(lastShown);
    const cooldownMs = config.upsell_cooldown_days * 24 * 60 * 60 * 1000;
    if (Date.now() - lastDate.getTime() < cooldownMs) {
      return { show: false };
    }
  }

  return { show: true, tier_required: requiredTier };
}

/**
 * Record that an upsell prompt was shown.
 */
export async function recordUpsellShown(
  accountId: string,
  featureName: string
): Promise<void> {
  const config = await getOrCreateFeatureAccess(accountId);
  const updatedPrompts = {
    ...config.upsell_prompts_shown,
    [featureName]: new Date().toISOString(),
  };

  await supabaseAdmin
    .from('feature_access_config')
    .update({
      upsell_prompts_shown: updatedPrompts,
      last_upsell_shown_at: new Date().toISOString(),
    })
    .eq('account_id', accountId);
}

/**
 * Get usage limits and current usage for an account.
 */
export async function getUsageLimits(accountId: string): Promise<{
  contacts: { current: number; max: number };
  broadcasts: { current: number; max: number };
  campaigns: { current: number; max: number };
  invoices: { current: number; max: number };
  ai_queries: { current: number; max: number };
}> {
  const config = await getOrCreateFeatureAccess(accountId);

  // Get current counts
  const [contactsRes, broadcastsRes, campaignsRes, invoicesRes] = await Promise.all([
    supabaseAdmin
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId),
    supabaseAdmin
      .from('broadcasts')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabaseAdmin
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId),
    supabaseAdmin
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  return {
    contacts: { current: contactsRes.count ?? 0, max: config.max_contacts },
    broadcasts: { current: broadcastsRes.count ?? 0, max: config.max_broadcasts_per_month },
    campaigns: { current: campaignsRes.count ?? 0, max: config.max_campaigns },
    invoices: { current: invoicesRes.count ?? 0, max: config.max_invoices_per_month },
    ai_queries: { current: 0, max: config.max_ai_queries_per_day },
  };
}

/**
 * Check if a specific usage limit has been reached.
 */
export async function isWithinLimit(
  accountId: string,
  limitType: 'contacts' | 'broadcasts' | 'campaigns' | 'invoices' | 'ai_queries'
): Promise<boolean> {
  const limits = await getUsageLimits(accountId);
  const limit = limits[limitType];
  return limit.current < limit.max;
}

/**
 * Update the account tier (admin only).
 */
export async function updateAccountTier(
  accountId: string,
  newTier: FeatureTier,
  overrides?: Partial<Pick<FeatureAccessConfig,
    'max_contacts' | 'max_broadcasts_per_month' | 'max_campaigns' |
    'max_invoices_per_month' | 'max_ai_queries_per_day' | 'feature_overrides' |
    'preview_features' | 'preview_expires_at'
  >>
): Promise<FeatureAccessConfig | null> {
  const config = await getOrCreateFeatureAccess(accountId);

  // Set tier-appropriate defaults
  const tierDefaults: Record<FeatureTier, Partial<FeatureAccessConfig>> = {
    starter: {
      max_contacts: 500,
      max_broadcasts_per_month: 10,
      max_campaigns: 3,
      max_invoices_per_month: 20,
      max_ai_queries_per_day: 10,
    },
    professional: {
      max_contacts: 2000,
      max_broadcasts_per_month: 50,
      max_campaigns: 10,
      max_invoices_per_month: 100,
      max_ai_queries_per_day: 50,
    },
    business: {
      max_contacts: 10000,
      max_broadcasts_per_month: 200,
      max_campaigns: 50,
      max_invoices_per_month: 500,
      max_ai_queries_per_day: 200,
    },
    enterprise: {
      max_contacts: 999999,
      max_broadcasts_per_month: 999999,
      max_campaigns: 999999,
      max_invoices_per_month: 999999,
      max_ai_queries_per_day: 999999,
    },
  };

  const updates = {
    current_tier: newTier,
    ...tierDefaults[newTier],
    ...overrides,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('feature_access_config')
    .update(updates)
    .eq('id', config.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating tier:', error);
    return null;
  }
  return data as FeatureAccessConfig;
}

/**
 * Get feature list with access status for display.
 */
export function getFeatureList(currentTier: FeatureTier): Array<{
  feature: string;
  label: string;
  tier_required: FeatureTier;
  accessible: boolean;
}> {
  const featureLabels: Record<string, string> = {
    inbox: 'Inbox',
    contacts: 'Contacts',
    quick_replies: 'Quick Replies',
    broadcasts: 'Broadcasts',
    products: 'Products',
    pipelines: 'Pipelines',
    debt_book: 'Debt Book',
    invoices: 'Invoices',
    inventory: 'Inventory',
    installments: 'Installment Plans',
    trust_score: 'Trust Score',
    voice_transcription: 'Voice Transcription',
    receipt_scanner: 'Receipt Scanner',
    price_negotiation: 'Price Negotiation',
    referrals: 'Referral Programme',
    loyalty: 'Loyalty Programme',
    ai_insights: 'AI Business Insights',
    campaigns: 'Campaigns',
    funnel: 'Funnel Engine',
    ecommerce: 'E-Commerce',
    public_api: 'Public API',
    white_label: 'White Label',
    multi_branch: 'Multi-Branch',
  };

  return Object.entries(FEATURE_TIER_MAP).map(([feature, requiredTier]) => ({
    feature,
    label: featureLabels[feature] || feature,
    tier_required: requiredTier,
    accessible: tierMeetsRequirement(currentTier, requiredTier),
  }));
}

/**
 * Tier display metadata.
 */
export const TIER_DISPLAY: Record<FeatureTier, {
  label: string;
  color: string;
  price: string;
  description: string;
}> = {
  starter: {
    label: 'Starter',
    color: 'text-zinc-400 bg-zinc-800/50 border-zinc-700',
    price: 'Free',
    description: 'Essential CRM features for small businesses',
  },
  professional: {
    label: 'Professional',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    price: 'NGN 25,000/mo',
    description: 'Financial tools and AI-powered features',
  },
  business: {
    label: 'Business',
    color: 'text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/30',
    price: 'NGN 50,000/mo',
    description: 'Growth tools, loyalty, and advanced analytics',
  },
  enterprise: {
    label: 'Enterprise',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    price: 'Custom',
    description: 'Full platform access with white-label options',
  },
};
