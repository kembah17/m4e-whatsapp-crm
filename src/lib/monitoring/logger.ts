import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { LogLevel, LogCategory } from './types'

interface LogEntry {
  level: LogLevel
  category: string
  message: string
  metadata: Record<string, unknown>
  request_id?: string
  user_id?: string
  account_id?: string
  ip_address?: string
  user_agent?: string
  duration_ms?: number
  status_code?: number
}

const LOG_BUFFER: LogEntry[] = []
const FLUSH_INTERVAL_MS = 5000
const FLUSH_THRESHOLD = 50
let flushTimer: ReturnType<typeof setInterval> | null = null

/** Generate a unique request ID */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/** Flush buffered logs to Supabase */
export async function flushLogs(): Promise<void> {
  if (LOG_BUFFER.length === 0) return

  const batch = LOG_BUFFER.splice(0, LOG_BUFFER.length)

  try {
    const db = supabaseAdmin()
    const { error } = await db.from('system_logs').insert(
      batch.map((entry) => ({
        level: entry.level,
        category: entry.category,
        message: entry.message,
        metadata: entry.metadata,
        request_id: entry.request_id ?? null,
        user_id: entry.user_id ?? null,
        account_id: entry.account_id ?? null,
        ip_address: entry.ip_address ?? null,
        user_agent: entry.user_agent ?? null,
        duration_ms: entry.duration_ms ?? null,
        status_code: entry.status_code ?? null,
      }))
    )

    if (error) {
      // Put entries back if flush failed, but don't grow unbounded
      console.error('[monitoring] Failed to flush logs:', error.message)
      if (LOG_BUFFER.length < 500) {
        LOG_BUFFER.unshift(...batch)
      }
    }
  } catch (err) {
    console.error('[monitoring] Log flush exception:', err)
  }
}

/** Start the background flush timer (server-side only) */
function ensureFlushTimer(): void {
  if (typeof window !== 'undefined') return // Skip in browser
  if (flushTimer) return

  flushTimer = setInterval(() => {
    void flushLogs()
  }, FLUSH_INTERVAL_MS)

  // Don't prevent process exit
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref()
  }
}

/** Core log function */
export function log(
  level: LogLevel,
  category: LogCategory | string,
  message: string,
  metadata: Record<string, unknown> = {},
  extra?: Partial<Pick<LogEntry, 'request_id' | 'user_id' | 'account_id' | 'ip_address' | 'user_agent' | 'duration_ms' | 'status_code'>>
): void {
  const entry: LogEntry = {
    level,
    category,
    message,
    metadata,
    ...extra,
  }

  LOG_BUFFER.push(entry)

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    const prefix = `[${level.toUpperCase()}] [${category}]`
    if (level === 'error' || level === 'fatal') {
      console.error(prefix, message, metadata)
    } else if (level === 'warn') {
      console.warn(prefix, message, metadata)
    } else {
      console.log(prefix, message, metadata)
    }
  }

  // Flush if threshold reached
  if (LOG_BUFFER.length >= FLUSH_THRESHOLD) {
    void flushLogs()
  }

  ensureFlushTimer()
}

/** Convenience: info log */
export function logInfo(
  category: LogCategory | string,
  message: string,
  metadata: Record<string, unknown> = {},
  extra?: Partial<Pick<LogEntry, 'request_id' | 'user_id' | 'account_id'>>
): void {
  log('info', category, message, metadata, extra)
}

/** Convenience: warning log */
export function logWarn(
  category: LogCategory | string,
  message: string,
  metadata: Record<string, unknown> = {},
  extra?: Partial<Pick<LogEntry, 'request_id' | 'user_id' | 'account_id'>>
): void {
  log('warn', category, message, metadata, extra)
}

/** Convenience: error log */
export function logError(
  category: LogCategory | string,
  message: string,
  metadata: Record<string, unknown> = {},
  extra?: Partial<Pick<LogEntry, 'request_id' | 'user_id' | 'account_id'>>
): void {
  log('error', category, message, metadata, extra)
}

/** Convenience: security log */
export function logSecurity(
  message: string,
  metadata: Record<string, unknown> = {},
  extra?: Partial<Pick<LogEntry, 'request_id' | 'user_id' | 'ip_address' | 'user_agent'>>
): void {
  log('warn', 'security', message, metadata, extra)
}
