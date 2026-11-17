/**
 * Human-in-the-Loop Escalation
 *
 * Provides utilities for escalating high-value dormant contacts
 * to human agents with context briefings.
 */

import { computeInactivityScore } from '@/lib/segments/inactivity-score'

export interface EscalationConfig {
  /** LTV threshold in Naira, e.g. 500000 (₦500K) */
  ltvThreshold: number
  /** Inactivity score threshold (0-100), e.g. 50 */
  inactivityScoreThreshold: number
  /** Whether to assign to the account owner */
  assignToOwnerId: boolean
}

export interface EscalationContext {
  contactName: string
  totalSpent: number
  lastInteraction: string
  inactivityScore: number
  churnArchetype: string | null
  recentMessages: string[]
}

/** Default escalation configuration */
export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  ltvThreshold: 500000,
  inactivityScoreThreshold: 50,
  assignToOwnerId: true,
}

/**
 * Determine whether a contact should be escalated to a human agent.
 *
 * Returns true if the contact's total spend exceeds the LTV threshold
 * AND their inactivity score exceeds the inactivity threshold.
 */
export function shouldEscalate(
  contact: { total_spent?: number; trust_score?: number },
  inactivityScore: number,
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
): boolean {
  const totalSpent = contact.total_spent ?? 0
  if (totalSpent < config.ltvThreshold) return false
  if (inactivityScore < config.inactivityScoreThreshold) return false
  return true
}

/**
 * Build a formatted text briefing for the human agent.
 *
 * Provides all relevant context so the agent can take immediate,
 * informed action without needing to research the contact.
 */
export function buildEscalationBriefing(context: EscalationContext): string {
  const archetype = context.churnArchetype
    ? `Churn Archetype: ${context.churnArchetype}`
    : 'Churn Archetype: Not classified'

  const recentMsgs = context.recentMessages.length > 0
    ? context.recentMessages
        .slice(0, 5)
        .map((m, i) => `  ${i + 1}. ${m}`)
        .join('\n')
    : '  (No recent messages)'

  const formattedSpent = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(context.totalSpent)

  return [
    '🚨 HIGH-VALUE CONTACT ESCALATION',
    '═══════════════════════════════════',
    '',
    `👤 Contact: ${context.contactName}`,
    `💰 Total Spent: ${formattedSpent}`,
    `📅 Last Interaction: ${context.lastInteraction}`,
    `📊 Inactivity Score: ${context.inactivityScore}/100`,
    `${archetype}`,
    '',
    '📝 Recent Messages:',
    recentMsgs,
    '',
    '⚡ ACTION REQUIRED:',
    'This high-value contact is showing signs of disengagement.',
    'Please reach out personally within 24 hours.',
    '',
    '💡 Suggested approach:',
    context.churnArchetype === 'price_objection'
      ? '→ Discuss flexible pricing or loyalty discount'
      : context.churnArchetype === 'product_fit_drift'
      ? '→ Schedule a product walkthrough highlighting new features'
      : context.churnArchetype === 'competitor_poaching'
      ? '→ Emphasize unique value props and offer a comparison call'
      : '→ Personal check-in call to understand their current needs',
  ].join('\n')
}
