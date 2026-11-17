/**
 * Composite Inactivity Score (0-100, where 100 = most inactive)
 *
 * Weights:
 * - Days since last message: 40% (cap at 180 days)
 * - Days since last purchase: 30% (cap at 365 days)
 * - Message response rate: 20% (inverted — low response = high inactivity)
 * - Trust score: 10% (inverted — low trust = high inactivity)
 */

export interface InactivityScoreInput {
  lastMessageAt: string | null
  lastPurchaseAt: string | null
  responseRate: number // 0-1
  trustScore: number // 0-100
}

export type InactivityTier = 'active' | 'cooling' | 'dormant' | 'lost'

/**
 * Compute the composite inactivity score for a contact.
 *
 * Formula:
 *   score = (daysSinceMsg/180 * 40)
 *         + (daysSincePurchase/365 * 30)
 *         + ((1 - responseRate) * 20)
 *         + ((100 - trustScore)/100 * 10)
 *
 * Clamped to 0-100.
 */
export function computeInactivityScore(input: InactivityScoreInput): number {
  const now = Date.now()

  // Days since last message (cap at 180)
  const lastMsgMs = input.lastMessageAt
    ? new Date(input.lastMessageAt).getTime()
    : now - 180 * 24 * 60 * 60 * 1000 // If null, treat as max
  const daysSinceMsg = Math.max(0, (now - lastMsgMs) / (24 * 60 * 60 * 1000))
  const msgComponent = Math.min(daysSinceMsg / 180, 1) * 40

  // Days since last purchase (cap at 365)
  const lastPurchaseMs = input.lastPurchaseAt
    ? new Date(input.lastPurchaseAt).getTime()
    : now - 365 * 24 * 60 * 60 * 1000 // If null, treat as max
  const daysSincePurchase = Math.max(0, (now - lastPurchaseMs) / (24 * 60 * 60 * 1000))
  const purchaseComponent = Math.min(daysSincePurchase / 365, 1) * 30

  // Response rate (inverted: low response = high inactivity)
  const responseRate = Math.max(0, Math.min(1, input.responseRate))
  const responseComponent = (1 - responseRate) * 20

  // Trust score (inverted: low trust = high inactivity)
  const trustScore = Math.max(0, Math.min(100, input.trustScore))
  const trustComponent = ((100 - trustScore) / 100) * 10

  const raw = msgComponent + purchaseComponent + responseComponent + trustComponent
  return Math.max(0, Math.min(100, Math.round(raw * 100) / 100))
}

/**
 * Map an inactivity score to a human-readable tier.
 *
 * - active:  0-25
 * - cooling: 26-50
 * - dormant: 51-75
 * - lost:    76-100
 */
export function getInactivityTier(score: number): InactivityTier {
  if (score <= 25) return 'active'
  if (score <= 50) return 'cooling'
  if (score <= 75) return 'dormant'
  return 'lost'
}

/**
 * SQL expression for computing inactivity score directly in Postgres.
 * Used by the segment engine for server-side filtering.
 */
export const INACTIVITY_SCORE_SQL = `(
  LEAST(EXTRACT(EPOCH FROM (NOW() - COALESCE(c.last_message_at, c.created_at))) / 86400 / 180, 1) * 40 +
  LEAST(EXTRACT(EPOCH FROM (NOW() - COALESCE(c.last_purchase_at, c.created_at))) / 86400 / 365, 1) * 30 +
  (1 - COALESCE(c.reply_rate, 0)) * 20 +
  (100 - COALESCE(c.trust_score, 50)) / 100.0 * 10
)::numeric`
