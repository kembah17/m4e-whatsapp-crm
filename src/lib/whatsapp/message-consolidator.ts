/**
 * Message Consolidation Utility
 * Batches multiple pending messages to the same contact into a single
 * consolidated message to reduce WhatsApp costs.
 */

import { NGN_PER_USD, COUNTRY_RATES } from '@/lib/whatsapp/message-cost-tracker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PendingMessage {
  id: string;
  contact_id: string;
  contact_name?: string;
  body: string;
  category: 'marketing' | 'utility' | 'authentication' | 'service';
  priority?: number; // lower = higher priority
  created_at: string;
}

export interface ConsolidatedMessage {
  contact_id: string;
  contact_name?: string;
  body: string;
  original_ids: string[];
  category: 'marketing' | 'utility' | 'authentication' | 'service';
}

export interface ConsolidationSummary {
  original_count: number;
  consolidated_count: number;
  messages_saved: number;
  estimated_savings_usd: number;
  estimated_savings_ngn: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTION_DIVIDER = '\n---\n';
const MAX_CONSOLIDATED_LENGTH = 1000; // WhatsApp practical limit

// ---------------------------------------------------------------------------
// Core Logic
// ---------------------------------------------------------------------------

/**
 * Consolidate an array of pending messages for the SAME contact into
 * as few messages as possible.
 */
export function consolidateMessages(
  messages: PendingMessage[],
  countryCode: string = 'NG',
): { consolidated: ConsolidatedMessage[]; summary: ConsolidationSummary } {
  if (messages.length === 0) {
    return {
      consolidated: [],
      summary: {
        original_count: 0,
        consolidated_count: 0,
        messages_saved: 0,
        estimated_savings_usd: 0,
        estimated_savings_ngn: 0,
      },
    };
  }

  // Sort by priority (lower first), then by created_at
  const sorted = [...messages].sort((a, b) => {
    const pa = a.priority ?? 99;
    const pb = b.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const consolidated: ConsolidatedMessage[] = [];
  let currentBatch: PendingMessage[] = [];
  let currentLength = 0;

  for (const msg of sorted) {
    const sectionLen =
      currentBatch.length > 0
        ? SECTION_DIVIDER.length + msg.body.length
        : msg.body.length;

    if (currentLength + sectionLen > MAX_CONSOLIDATED_LENGTH && currentBatch.length > 0) {
      // Flush current batch
      consolidated.push(buildConsolidated(currentBatch));
      currentBatch = [msg];
      currentLength = msg.body.length;
    } else {
      currentBatch.push(msg);
      currentLength += sectionLen;
    }
  }

  // Flush remaining
  if (currentBatch.length > 0) {
    consolidated.push(buildConsolidated(currentBatch));
  }

  // Calculate savings
  const rates = COUNTRY_RATES[countryCode] ?? COUNTRY_RATES['NG'];
  const primaryCategory = sorted[0]?.category ?? 'marketing';
  const rateKey = primaryCategory === 'service' ? 'service' : primaryCategory;
  const rateUsd = rates[rateKey as keyof typeof rates] ?? rates.marketing;
  const messagesSaved = messages.length - consolidated.length;
  const savingsUsd = messagesSaved * rateUsd;
  const savingsNgn = savingsUsd * NGN_PER_USD;

  return {
    consolidated,
    summary: {
      original_count: messages.length,
      consolidated_count: consolidated.length,
      messages_saved: messagesSaved,
      estimated_savings_usd: Math.round(savingsUsd * 100) / 100,
      estimated_savings_ngn: Math.round(savingsNgn * 100) / 100,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildConsolidated(batch: PendingMessage[]): ConsolidatedMessage {
  const body =
    batch.length === 1
      ? batch[0].body
      : batch.map((m) => m.body).join(SECTION_DIVIDER);

  // Use the highest-priority category (marketing > utility > service)
  const categoryPriority: Record<string, number> = {
    marketing: 0,
    utility: 1,
    authentication: 2,
    service: 3,
  };
  const category = batch.reduce((best, m) => {
    return (categoryPriority[m.category] ?? 99) < (categoryPriority[best] ?? 99)
      ? m.category
      : best;
  }, batch[0].category);

  return {
    contact_id: batch[0].contact_id,
    contact_name: batch[0].contact_name,
    body,
    original_ids: batch.map((m) => m.id),
    category,
  };
}
