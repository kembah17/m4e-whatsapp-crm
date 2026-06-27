import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { AlertSeverity, SystemAlert } from './types'

/** Create a new system alert */
export async function createAlert(
  severity: AlertSeverity,
  category: string,
  title: string,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<string | null> {
  try {
    const db = supabaseAdmin()

    // Check for existing unresolved alert with same category + title to avoid duplicates
    const { data: existing } = await db
      .from('system_alerts')
      .select('id')
      .eq('category', category)
      .eq('title', title)
      .eq('is_resolved', false)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return existing.id as string
    }

    const { data, error } = await db
      .from('system_alerts')
      .insert({
        severity,
        category,
        title,
        description: description ?? null,
        metadata: metadata ?? {},
        auto_resolve_at: severity === 'info'
          ? new Date(Date.now() + 60 * 60 * 1000).toISOString() // Auto-resolve info alerts in 1h
          : null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[monitoring] Failed to create alert:', error.message)
      return null
    }

    return data.id as string
  } catch (err) {
    console.error('[monitoring] Alert creation exception:', err)
    return null
  }
}

/** Resolve an alert */
export async function resolveAlert(
  alertId: string,
  userId?: string
): Promise<boolean> {
  try {
    const db = supabaseAdmin()
    const { error } = await db
      .from('system_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: userId ?? null,
      })
      .eq('id', alertId)

    if (error) {
      console.error('[monitoring] Failed to resolve alert:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[monitoring] Alert resolve exception:', err)
    return false
  }
}

/** Get all active (unresolved) alerts */
export async function getActiveAlerts(): Promise<SystemAlert[]> {
  try {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('system_alerts')
      .select('*')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[monitoring] Failed to fetch alerts:', error.message)
      return []
    }

    return (data ?? []) as SystemAlert[]
  } catch (err) {
    console.error('[monitoring] Alerts fetch exception:', err)
    return []
  }
}

/** Check thresholds and create alerts if exceeded */
export async function checkThresholds(): Promise<void> {
  try {
    const db = supabaseAdmin()

    // Check error rate in last hour
    const { data: logCounts } = await db
      .from('system_logs')
      .select('level', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    const totalLogs = logCounts?.length ?? 0
    const errorLogs = logCounts?.filter(
      (l: Record<string, unknown>) => l.level === 'error' || l.level === 'fatal'
    ).length ?? 0

    if (totalLogs > 0) {
      const errorRate = (errorLogs / totalLogs) * 100

      if (errorRate > 15) {
        await createAlert(
          'critical',
          'error_rate',
          'Critical error rate exceeded',
          `Error rate is ${errorRate.toFixed(1)}% (threshold: 15%)`,
          { error_rate: errorRate, total_logs: totalLogs, error_logs: errorLogs }
        )
      } else if (errorRate > 5) {
        await createAlert(
          'warning',
          'error_rate',
          'Elevated error rate detected',
          `Error rate is ${errorRate.toFixed(1)}% (threshold: 5%)`,
          { error_rate: errorRate, total_logs: totalLogs, error_logs: errorLogs }
        )
      }
    }

    // Check average response time from recent metrics
    const { data: recentMetrics } = await db
      .from('api_metrics_hourly')
      .select('avg_duration_ms')
      .gte('hour', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (recentMetrics && recentMetrics.length > 0) {
      const avgDurations = recentMetrics
        .map((m: Record<string, unknown>) => Number(m.avg_duration_ms))
        .filter((v: number) => !isNaN(v) && v > 0)

      if (avgDurations.length > 0) {
        const overallAvg = avgDurations.reduce((s: number, v: number) => s + v, 0) / avgDurations.length

        if (overallAvg > 5000) {
          await createAlert(
            'critical',
            'response_time',
            'Critical response time',
            `Average response time is ${Math.round(overallAvg)}ms (threshold: 5000ms)`,
            { avg_response_ms: overallAvg }
          )
        } else if (overallAvg > 2000) {
          await createAlert(
            'warning',
            'response_time',
            'Elevated response time',
            `Average response time is ${Math.round(overallAvg)}ms (threshold: 2000ms)`,
            { avg_response_ms: overallAvg }
          )
        }
      }
    }
  } catch (err) {
    console.error('[monitoring] Threshold check exception:', err)
  }
}
