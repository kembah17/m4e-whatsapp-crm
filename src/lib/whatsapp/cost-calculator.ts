/**
 * Meta WhatsApp messaging cost calculator.
 * Nigeria-specific rates based on Meta's 2025 pricing.
 */

export const META_RATES_NGN = {
  marketing: { per_message: 57.17 },
  utility: { per_message: 14.03 },
  authentication: { per_message: 12.38 },
  service: { per_conversation: 6.60 },
  free_tier: { conversations_per_month: 1000 },
} as const;

export const META_RATES_USD = {
  marketing: { per_message: 0.0347 },
  utility: { per_message: 0.0085 },
  authentication: { per_message: 0.0075 },
  service: { per_conversation: 0.004 },
  free_tier: { conversations_per_month: 1000 },
} as const;

export interface CostBreakdownItem {
  category: string;
  quantity: number;
  rate_ngn: number;
  rate_usd: number;
  subtotal_ngn: number;
  subtotal_usd: number;
}

export interface CostEstimate {
  marketing_messages: number;
  utility_messages: number;
  authentication_messages: number;
  service_conversations: number;
  total_cost_ngn: number;
  total_cost_usd: number;
  free_tier_savings_ngn: number;
  breakdown: CostBreakdownItem[];
}

export function estimateMonthlyCost(usage: {
  marketing_messages: number;
  utility_messages: number;
  authentication_messages: number;
  service_conversations: number;
}): CostEstimate {
  const breakdown: CostBreakdownItem[] = [];

  // Marketing
  const mktCostNgn = usage.marketing_messages * META_RATES_NGN.marketing.per_message;
  const mktCostUsd = usage.marketing_messages * META_RATES_USD.marketing.per_message;
  breakdown.push({
    category: 'Marketing',
    quantity: usage.marketing_messages,
    rate_ngn: META_RATES_NGN.marketing.per_message,
    rate_usd: META_RATES_USD.marketing.per_message,
    subtotal_ngn: mktCostNgn,
    subtotal_usd: mktCostUsd,
  });

  // Utility
  const utilCostNgn = usage.utility_messages * META_RATES_NGN.utility.per_message;
  const utilCostUsd = usage.utility_messages * META_RATES_USD.utility.per_message;
  breakdown.push({
    category: 'Utility',
    quantity: usage.utility_messages,
    rate_ngn: META_RATES_NGN.utility.per_message,
    rate_usd: META_RATES_USD.utility.per_message,
    subtotal_ngn: utilCostNgn,
    subtotal_usd: utilCostUsd,
  });

  // Authentication
  const authCostNgn = usage.authentication_messages * META_RATES_NGN.authentication.per_message;
  const authCostUsd = usage.authentication_messages * META_RATES_USD.authentication.per_message;
  breakdown.push({
    category: 'Authentication',
    quantity: usage.authentication_messages,
    rate_ngn: META_RATES_NGN.authentication.per_message,
    rate_usd: META_RATES_USD.authentication.per_message,
    subtotal_ngn: authCostNgn,
    subtotal_usd: authCostUsd,
  });

  // Service conversations (with free tier)
  const billableConversations = Math.max(0, usage.service_conversations - META_RATES_NGN.free_tier.conversations_per_month);
  const freeTierSavingsNgn = Math.min(usage.service_conversations, META_RATES_NGN.free_tier.conversations_per_month) * META_RATES_NGN.service.per_conversation;
  const svcCostNgn = billableConversations * META_RATES_NGN.service.per_conversation;
  const svcCostUsd = billableConversations * META_RATES_USD.service.per_conversation;
  breakdown.push({
    category: 'Service (after free tier)',
    quantity: billableConversations,
    rate_ngn: META_RATES_NGN.service.per_conversation,
    rate_usd: META_RATES_USD.service.per_conversation,
    subtotal_ngn: svcCostNgn,
    subtotal_usd: svcCostUsd,
  });

  return {
    marketing_messages: usage.marketing_messages,
    utility_messages: usage.utility_messages,
    authentication_messages: usage.authentication_messages,
    service_conversations: usage.service_conversations,
    total_cost_ngn: mktCostNgn + utilCostNgn + authCostNgn + svcCostNgn,
    total_cost_usd: mktCostUsd + utilCostUsd + authCostUsd + svcCostUsd,
    free_tier_savings_ngn: freeTierSavingsNgn,
    breakdown,
  };
}

export function estimateBroadcastCost(
  recipientCount: number,
  templateCategory: string,
): {
  cost_ngn: number;
  cost_usd: number;
  per_recipient_ngn: number;
} {
  const cat = templateCategory.toLowerCase() as keyof typeof META_RATES_NGN;
  const rateNgn = cat === 'service'
    ? META_RATES_NGN.service.per_conversation
    : (META_RATES_NGN[cat] as { per_message: number })?.per_message ?? META_RATES_NGN.marketing.per_message;
  const rateUsd = cat === 'service'
    ? META_RATES_USD.service.per_conversation
    : (META_RATES_USD[cat] as { per_message: number })?.per_message ?? META_RATES_USD.marketing.per_message;

  return {
    cost_ngn: recipientCount * rateNgn,
    cost_usd: recipientCount * rateUsd,
    per_recipient_ngn: rateNgn,
  };
}
