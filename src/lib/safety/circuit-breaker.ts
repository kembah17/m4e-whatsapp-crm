// ============================================================
// Message Loop Detection — Circuit Breaker
//
// In-memory rate limiter that prevents runaway message loops.
// Uses a Map with TTL entries for speed (no DB on hot path).
// Persists trip events to DB for audit and admin visibility.
// ============================================================

import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

// ============================================================
// Rate limit rules
// ============================================================
interface RateRule {
  name: string
  windowMs: number
  maxMessages: number
  cooldownMs: number
  scope: 'contact' | 'account'
}

const RATE_RULES: RateRule[] = [
  // Per-contact rules
  { name: 'contact_5min', windowMs: 5 * 60 * 1000, maxMessages: 10, cooldownMs: 10 * 60 * 1000, scope: 'contact' },
  { name: 'contact_1hr', windowMs: 60 * 60 * 1000, maxMessages: 30, cooldownMs: 30 * 60 * 1000, scope: 'contact' },
  { name: 'contact_24hr', windowMs: 24 * 60 * 60 * 1000, maxMessages: 100, cooldownMs: 60 * 60 * 1000, scope: 'contact' },
  // Per-account rules
  { name: 'account_1hr', windowMs: 60 * 60 * 1000, maxMessages: 500, cooldownMs: 15 * 60 * 1000, scope: 'account' },
  { name: 'account_24hr', windowMs: 24 * 60 * 60 * 1000, maxMessages: 5000, cooldownMs: 60 * 60 * 1000, scope: 'account' },
]

// ============================================================
// In-memory tracking with TTL
// ============================================================
interface TimestampEntry {
  timestamps: number[]
}

// Key format: "contact:{accountId}:{contactId}" or "account:{accountId}"
const messageLog = new Map<string, TimestampEntry>()

// Cooldown set: keys that are currently blocked
const cooldowns = new Map<string, number>() // key -> cooldown expiry timestamp

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupStaleEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  const maxWindow = 24 * 60 * 60 * 1000 // 24 hours
  const cutoff = now - maxWindow

  for (const [key, entry] of messageLog.entries()) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff)
    if (entry.timestamps.length === 0) {
      messageLog.delete(key)
    }
  }

  for (const [key, expiry] of cooldowns.entries()) {
    if (now > expiry) {
      cooldowns.delete(key)
    }
  }
}

// ============================================================
// Public API
// ============================================================

export interface CircuitBreakerResult {
  allowed: boolean
  blockedBy?: string
  messageCount?: number
  cooldownUntil?: Date
}

/**
 * Check if an outbound message is allowed and record it.
 * Call this BEFORE sending any outbound message.
 *
 * Returns { allowed: true } if the message can be sent.
 * Returns { allowed: false, blockedBy, ... } if rate limit hit.
 */
export function checkAndRecord(
  accountId: string,
  contactId: string
): CircuitBreakerResult {
  cleanupStaleEntries()

  const now = Date.now()
  const contactKey = `contact:${accountId}:${contactId}`
  const accountKey = `account:${accountId}`

  // Check if currently in cooldown
  for (const key of [contactKey, accountKey]) {
    const cooldownExpiry = cooldowns.get(key)
    if (cooldownExpiry && now < cooldownExpiry) {
      return {
        allowed: false,
        blockedBy: `cooldown_active`,
        cooldownUntil: new Date(cooldownExpiry),
      }
    } else if (cooldownExpiry && now >= cooldownExpiry) {
      cooldowns.delete(key)
    }
  }

  // Check each rule
  for (const rule of RATE_RULES) {
    const key = rule.scope === 'contact' ? contactKey : accountKey
    const entry = messageLog.get(key) || { timestamps: [] }
    const windowStart = now - rule.windowMs
    const recentCount = entry.timestamps.filter(t => t > windowStart).length

    if (recentCount >= rule.maxMessages) {
      // Trip the circuit breaker
      const cooldownUntil = now + rule.cooldownMs
      cooldowns.set(key, cooldownUntil)

      // Fire-and-forget: persist trip to DB
      persistTrip(accountId, contactId, rule.name, recentCount, new Date(cooldownUntil))
        .catch(err => console.error('[circuit-breaker] persist failed:', err))

      // Fire-and-forget: log the blocked message
      logRateEvent(accountId, contactId, true, rule.name)
        .catch(err => console.error('[circuit-breaker] log failed:', err))

      return {
        allowed: false,
        blockedBy: rule.name,
        messageCount: recentCount,
        cooldownUntil: new Date(cooldownUntil),
      }
    }
  }

  // All rules passed — record the message
  const contactEntry = messageLog.get(contactKey) || { timestamps: [] }
  contactEntry.timestamps.push(now)
  messageLog.set(contactKey, contactEntry)

  const accountEntry = messageLog.get(accountKey) || { timestamps: [] }
  accountEntry.timestamps.push(now)
  messageLog.set(accountKey, accountEntry)

  // Fire-and-forget: log the allowed message
  logRateEvent(accountId, contactId, false)
    .catch(err => console.error('[circuit-breaker] log failed:', err))

  return { allowed: true }
}

/**
 * Get current circuit breaker status for an account.
 */
export function getAccountStatus(accountId: string): {
  activeTrips: Array<{ key: string; cooldownUntil: Date }>
  recentMessageCount: number
} {
  const now = Date.now()
  const activeTrips: Array<{ key: string; cooldownUntil: Date }> = []

  for (const [key, expiry] of cooldowns.entries()) {
    if (key.includes(accountId) && now < expiry) {
      activeTrips.push({ key, cooldownUntil: new Date(expiry) })
    }
  }

  const accountKey = `account:${accountId}`
  const entry = messageLog.get(accountKey)
  const oneHourAgo = now - 60 * 60 * 1000
  const recentMessageCount = entry
    ? entry.timestamps.filter(t => t > oneHourAgo).length
    : 0

  return { activeTrips, recentMessageCount }
}

/**
 * Manually reset a circuit breaker trip (admin action).
 */
export async function manualReset(
  accountId: string,
  contactId?: string
): Promise<void> {
  const contactKey = contactId ? `contact:${accountId}:${contactId}` : null
  const accountKey = `account:${accountId}`

  if (contactKey) {
    cooldowns.delete(contactKey)
  }
  cooldowns.delete(accountKey)

  // Mark DB records as resolved
  const db = supabaseAdmin()
  const query = db
    .from('circuit_breaker_state')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .eq('resolved', false)

  if (contactId) {
    query.eq('contact_id', contactId)
  }

  await query
}

// ============================================================
// Internal helpers
// ============================================================

async function persistTrip(
  accountId: string,
  contactId: string,
  ruleName: string,
  messageCount: number,
  cooldownUntil: Date
): Promise<void> {
  const db = supabaseAdmin()
  await db.from('circuit_breaker_state').insert({
    account_id: accountId,
    contact_id: contactId,
    rule_name: ruleName,
    message_count: messageCount,
    cooldown_until: cooldownUntil.toISOString(),
  })

  // Also create a system alert
  await db.from('system_alerts').insert({
    severity: 'warning',
    category: 'security',
    title: `Circuit breaker tripped: ${ruleName}`,
    description: `Account ${accountId} hit rate limit ${ruleName} with ${messageCount} messages. Contact: ${contactId}. Cooldown until ${cooldownUntil.toISOString()}.`,
    metadata: { accountId, contactId, ruleName, messageCount },
    auto_resolve_at: cooldownUntil.toISOString(),
  }).then(({ error }: { error: unknown }) => {
    if (error) console.error('[circuit-breaker] alert insert failed:', error)
  })
}

async function logRateEvent(
  accountId: string,
  contactId: string,
  blocked: boolean,
  blockReason?: string
): Promise<void> {
  await supabaseAdmin().from('message_rate_log').insert({
    account_id: accountId,
    contact_id: contactId,
    direction: 'outbound',
    channel: 'whatsapp',
    blocked,
    block_reason: blockReason || null,
  })
}
