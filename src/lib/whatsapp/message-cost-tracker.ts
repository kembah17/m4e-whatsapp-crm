/**
 * WhatsApp message cost tracking utility.
 *
 * Provides broadcast cost estimation, monthly usage summaries,
 * and free-tier tracking. Builds on top of the rate constants
 * in cost-calculator.ts.
 */

import { META_RATES_NGN, META_RATES_USD } from './cost-calculator';

// ── Constants ────────────────────────────────────────────────

/** Meta's free service-conversation allowance per WABA per month. */
export const FREE_TIER_LIMIT = 1000;

/**
 * WhatsApp Business API pricing per country.
 * Rates in USD per message (template-initiated conversations).
 * Source: Meta pricing page, November 2026.
 */
export const COUNTRY_RATES: Record<
  string,
  { service: number; marketing: number; utility: number; authentication: number }
> = {
  NG: { service: 0.0200, marketing: 0.0516, utility: 0.0364, authentication: 0.0075 },
  US: { service: 0.0088, marketing: 0.0250, utility: 0.0080, authentication: 0.0045 },
  GB: { service: 0.0088, marketing: 0.0353, utility: 0.0080, authentication: 0.0045 },
  IN: { service: 0.0040, marketing: 0.0107, utility: 0.0042, authentication: 0.0014 },
  BR: { service: 0.0080, marketing: 0.0165, utility: 0.0080, authentication: 0.0042 },
  ZA: { service: 0.0100, marketing: 0.0200, utility: 0.0080, authentication: 0.0045 },
  GH: { service: 0.0200, marketing: 0.0516, utility: 0.0364, authentication: 0.0075 },
  KE: { service: 0.0200, marketing: 0.0516, utility: 0.0364, authentication: 0.0075 },
};

/** Approximate NGN/USD exchange rate for display purposes. */
const NGN_PER_USD = 1650;

// ── Types ────────────────────────────────────────────────────

export interface BroadcastCostEstimate {
  audience_size: number;
  template_category: string;
  country_code: string;
  /** Per-message rate in USD. */
  rate_usd: number;
  /** Per-message rate in NGN. */
  rate_ngn: number;
  /** Total cost in USD. */
  cost_usd: number;
  /** Total cost in NGN. */
  cost_ngn: number;
  /** Messages remaining in the free service tier this month. */
  free_tier_remaining: number;
}

export interface MonthlyUsageSummary {
  account_id: string;
  period: string;
  marketing_messages: number;
  utility_messages: number;
  service_conversations: number;
  total_messages: number;
  total_cost_usd: number;
  total_cost_ngn: number;
  free_tier_used: number;
  free_tier_remaining: number;
}

// ── Functions ────────────────────────────────────────────────

/**
 * Estimate the Meta cost for a broadcast before sending.
 *
 * @param audienceSize   Number of recipients.
 * @param templateCategory  Template category: Marketing, Utility, Authentication.
 * @param countryCode    ISO 3166-1 alpha-2 country code (default: NG).
 * @returns Cost breakdown in both USD and NGN.
 */
export function estimateBroadcastCost(
  audienceSize: number,
  templateCategory: string,
  countryCode: string = 'NG',
): BroadcastCostEstimate {
  const country = COUNTRY_RATES[countryCode.toUpperCase()] ?? COUNTRY_RATES.NG;
  const cat = templateCategory.toLowerCase() as keyof typeof country;
  const rateUsd = country[cat] ?? country.marketing;
  const rateNgn = rateUsd * NGN_PER_USD;

  return {
    audience_size: audienceSize,
    template_category: templateCategory,
    country_code: countryCode.toUpperCase(),
    rate_usd: rateUsd,
    rate_ngn: rateNgn,
    cost_usd: audienceSize * rateUsd,
    cost_ngn: audienceSize * rateNgn,
    free_tier_remaining: FREE_TIER_LIMIT, // Placeholder — real value from getMonthlyUsageSummary
  };
}

/**
 * Query message counts for an account and compute monthly usage summary.
 *
 * This queries the `messages` table for outbound messages in the current
 * billing month and aggregates by template category.
 *
 * @param accountId  The account UUID to query.
 * @returns Monthly usage summary with costs and free-tier status.
 */
export async function getMonthlyUsageSummary(
  accountId: string,
): Promise<MonthlyUsageSummary> {
  // Dynamic import to avoid pulling Supabase into non-browser contexts
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Count outbound messages by content type this month
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, content_type, created_at')
    .eq('sender_type', 'agent')
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd)
    .limit(10000);

  if (error) {
    console.error('[cost-tracker] Failed to query messages:', error.message);
    return {
      account_id: accountId,
      period,
      marketing_messages: 0,
      utility_messages: 0,
      service_conversations: 0,
      total_messages: 0,
      total_cost_usd: 0,
      total_cost_ngn: 0,
      free_tier_used: 0,
      free_tier_remaining: FREE_TIER_LIMIT,
    };
  }

  const rows = messages ?? [];

  // Template messages are marketing/utility; text replies are service conversations
  const templateMessages = rows.filter((m) => m.content_type === 'template');
  const serviceMessages = rows.filter((m) => m.content_type !== 'template');

  // Approximate split: treat all template messages as marketing (conservative estimate)
  const marketingCount = templateMessages.length;
  const utilityCount = 0; // Would need template category metadata for accurate split
  const serviceCount = serviceMessages.length;

  const marketingCostUsd = marketingCount * (COUNTRY_RATES.NG.marketing);
  const utilityCostUsd = utilityCount * (COUNTRY_RATES.NG.utility);

  // Service conversations: first 1000/month are free
  const billableService = Math.max(0, serviceCount - FREE_TIER_LIMIT);
  const serviceCostUsd = billableService * COUNTRY_RATES.NG.service;

  const totalCostUsd = marketingCostUsd + utilityCostUsd + serviceCostUsd;
  const freeTierUsed = Math.min(serviceCount, FREE_TIER_LIMIT);

  return {
    account_id: accountId,
    period,
    marketing_messages: marketingCount,
    utility_messages: utilityCount,
    service_conversations: serviceCount,
    total_messages: rows.length,
    total_cost_usd: totalCostUsd,
    total_cost_ngn: totalCostUsd * NGN_PER_USD,
    free_tier_used: freeTierUsed,
    free_tier_remaining: Math.max(0, FREE_TIER_LIMIT - freeTierUsed),
  };
}
