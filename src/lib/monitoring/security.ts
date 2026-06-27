import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { SecuritySeverity } from './types'

interface AttemptRecord {
  timestamps: number[]
  blocked: boolean
}

// In-memory tracking for brute force detection
const attemptTracker = new Map<string, AttemptRecord>()
const blockedIPs = new Set<string>()

const BRUTE_FORCE_THRESHOLD = 10
const BRUTE_FORCE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const BLOCK_DURATION_MS = 30 * 60 * 1000 // 30 minutes

/** Log a security event to the database */
export async function logSecurityEvent(
  eventType: string,
  severity: SecuritySeverity,
  details: Record<string, unknown>,
  extra?: {
    ip_address?: string
    user_agent?: string
    path?: string
    blocked?: boolean
  }
): Promise<void> {
  try {
    const db = supabaseAdmin()
    await db.from('security_events').insert({
      event_type: eventType,
      severity,
      ip_address: extra?.ip_address ?? null,
      user_agent: extra?.user_agent ?? null,
      path: extra?.path ?? null,
      details,
      blocked: extra?.blocked ?? false,
    })
  } catch (err) {
    console.error('[monitoring] Failed to log security event:', err)
  }
}

/** Detect brute force attempts from an IP */
export function detectBruteForce(
  ip: string,
  path: string
): { blocked: boolean; attempts: number } {
  const key = `${ip}:${path}`
  const now = Date.now()

  let record = attemptTracker.get(key)
  if (!record) {
    record = { timestamps: [], blocked: false }
    attemptTracker.set(key, record)
  }

  // Clean old timestamps
  record.timestamps = record.timestamps.filter(
    (t) => now - t < BRUTE_FORCE_WINDOW_MS
  )

  // Add current attempt
  record.timestamps.push(now)

  const attempts = record.timestamps.length

  if (attempts >= BRUTE_FORCE_THRESHOLD && !record.blocked) {
    record.blocked = true
    blockedIPs.add(ip)

    // Auto-unblock after duration
    setTimeout(() => {
      blockedIPs.delete(ip)
      attemptTracker.delete(key)
    }, BLOCK_DURATION_MS)

    // Log the block event
    void logSecurityEvent('brute_force', 'high', {
      ip,
      path,
      attempts,
      window_minutes: BRUTE_FORCE_WINDOW_MS / 60000,
    }, {
      ip_address: ip,
      path,
      blocked: true,
    })
  }

  return { blocked: record.blocked || blockedIPs.has(ip), attempts }
}

/** Get the set of currently blocked IPs */
export function getBlockedIPs(): Set<string> {
  return new Set(blockedIPs)
}

/** Check if an IP is currently blocked */
export function isIPBlocked(ip: string): boolean {
  return blockedIPs.has(ip)
}

/** Periodic cleanup of stale attempt records */
export function cleanupAttemptTracker(): void {
  const now = Date.now()
  for (const [key, record] of attemptTracker.entries()) {
    record.timestamps = record.timestamps.filter(
      (t) => now - t < BRUTE_FORCE_WINDOW_MS
    )
    if (record.timestamps.length === 0 && !record.blocked) {
      attemptTracker.delete(key)
    }
  }
}
