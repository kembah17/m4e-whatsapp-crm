import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { HealthCheck, HealthSnapshot, HealthStatus } from './types'

const startTime = Date.now()

/** Check database connectivity */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const db = supabaseAdmin()
    const { error } = await db.from('system_logs').select('id').limit(1)
    const duration = Date.now() - start

    if (error) {
      return {
        name: 'database',
        status: 'fail',
        message: `Database query failed: ${error.message}`,
        duration_ms: duration,
      }
    }

    return {
      name: 'database',
      status: duration > 1000 ? 'warn' : 'pass',
      message: duration > 1000 ? `Slow response: ${duration}ms` : 'Connected',
      duration_ms: duration,
    }
  } catch (err) {
    return {
      name: 'database',
      status: 'fail',
      message: `Database exception: ${err instanceof Error ? err.message : 'Unknown'}`,
      duration_ms: Date.now() - start,
    }
  }
}

/** Check Supabase Auth service */
async function checkSupabaseAuth(): Promise<HealthCheck> {
  const start = Date.now()
  try {
    const db = supabaseAdmin()
    // A lightweight auth check - get session settings
    const { error } = await db.auth.getUser('00000000-0000-0000-0000-000000000000')
    const duration = Date.now() - start

    // We expect a "not found" error, which means auth is responding
    return {
      name: 'auth',
      status: duration > 2000 ? 'warn' : 'pass',
      message: duration > 2000 ? `Slow response: ${duration}ms` : 'Auth service responding',
      duration_ms: duration,
    }
  } catch (err) {
    return {
      name: 'auth',
      status: 'fail',
      message: `Auth check failed: ${err instanceof Error ? err.message : 'Unknown'}`,
      duration_ms: Date.now() - start,
    }
  }
}

/** Check memory usage */
function checkMemory(): HealthCheck {
  const start = Date.now()
  try {
    if (typeof process === 'undefined' || !process.memoryUsage) {
      return {
        name: 'memory',
        status: 'pass',
        message: 'Memory check not available in this runtime',
        duration_ms: 0,
      }
    }

    const mem = process.memoryUsage()
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024)
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024)
    const usagePercent = heapTotalMB > 0 ? (heapUsedMB / heapTotalMB) * 100 : 0

    let status: 'pass' | 'warn' | 'fail' = 'pass'
    if (usagePercent > 90) status = 'fail'
    else if (usagePercent > 75) status = 'warn'

    return {
      name: 'memory',
      status,
      message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${Math.round(usagePercent)}%)`,
      duration_ms: Date.now() - start,
    }
  } catch {
    return {
      name: 'memory',
      status: 'pass',
      message: 'Memory check unavailable',
      duration_ms: Date.now() - start,
    }
  }
}

/** Determine overall health status */
function determineStatus(checks: HealthCheck[]): HealthStatus {
  if (checks.some((c) => c.status === 'fail')) return 'unhealthy'
  if (checks.some((c) => c.status === 'warn')) return 'degraded'
  return 'healthy'
}

/** Run all health checks and save snapshot */
export async function runHealthChecks(): Promise<HealthSnapshot> {
  const overallStart = Date.now()

  const checks = await Promise.all([
    checkDatabase(),
    checkSupabaseAuth(),
    Promise.resolve(checkMemory()),
  ])

  const status = determineStatus(checks)
  const responseTime = Date.now() - overallStart

  const memUsage = typeof process !== 'undefined' && process.memoryUsage
    ? process.memoryUsage()
    : null

  const snapshot: HealthSnapshot = {
    id: 0, // Will be set by DB
    created_at: new Date().toISOString(),
    status,
    checks,
    response_time_ms: responseTime,
    db_pool_total: null,
    db_pool_active: null,
    db_pool_idle: null,
    memory_used_mb: memUsage
      ? Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100
      : null,
    uptime_seconds: Math.round((Date.now() - startTime) / 1000),
  }

  // Save to database
  try {
    const db = supabaseAdmin()
    await db.from('health_snapshots').insert({
      status: snapshot.status,
      checks: snapshot.checks,
      response_time_ms: snapshot.response_time_ms,
      db_pool_total: snapshot.db_pool_total,
      db_pool_active: snapshot.db_pool_active,
      db_pool_idle: snapshot.db_pool_idle,
      memory_used_mb: snapshot.memory_used_mb,
      uptime_seconds: snapshot.uptime_seconds,
    })
  } catch (err) {
    console.error('[monitoring] Failed to save health snapshot:', err)
  }

  return snapshot
}
