import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

interface MetricSample {
  durations: number[]
  errorCount: number
  totalCount: number
}

// In-memory samples keyed by "endpoint:method:hourISO"
const samples = new Map<string, MetricSample>()

function getHourKey(date: Date): string {
  const d = new Date(date)
  d.setMinutes(0, 0, 0)
  return d.toISOString()
}

function makeKey(endpoint: string, method: string, hour: string): string {
  return `${endpoint}:${method}:${hour}`
}

/** Calculate percentile from sorted array */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

/** Track a single API request */
export function trackRequest(
  endpoint: string,
  method: string,
  durationMs: number,
  statusCode: number
): void {
  const hour = getHourKey(new Date())
  const key = makeKey(endpoint, method, hour)

  let sample = samples.get(key)
  if (!sample) {
    sample = { durations: [], errorCount: 0, totalCount: 0 }
    samples.set(key, sample)
  }

  sample.durations.push(durationMs)
  sample.totalCount++
  if (statusCode >= 400) {
    sample.errorCount++
  }
}

/** Flush in-memory metrics to api_metrics_hourly table */
export async function flushMetrics(): Promise<number> {
  if (samples.size === 0) return 0

  const entries = Array.from(samples.entries())
  samples.clear()

  const db = supabaseAdmin()
  let flushed = 0

  for (const [key, sample] of entries) {
    const parts = key.split(':')
    // Key format: "endpoint:method:hourISO" - hour contains colons in ISO format
    // So we take first part as endpoint, second as method, rest joined as hour
    const endpoint = parts[0]
    const method = parts[1]
    const hour = parts.slice(2).join(':')
    if (!endpoint || !method || !hour) continue

    const sorted = [...sample.durations].sort((a, b) => a - b)
    const avg = sorted.length > 0
      ? sorted.reduce((s, v) => s + v, 0) / sorted.length
      : 0

    const { error: upsertError } = await db
      .from('api_metrics_hourly')
      .upsert(
        {
          hour,
          endpoint,
          method,
          total_requests: sample.totalCount,
          error_count: sample.errorCount,
          avg_duration_ms: Math.round(avg * 100) / 100,
          p95_duration_ms: Math.round(percentile(sorted, 95) * 100) / 100,
          p99_duration_ms: Math.round(percentile(sorted, 99) * 100) / 100,
          min_duration_ms: sorted[0] ?? 0,
          max_duration_ms: sorted[sorted.length - 1] ?? 0,
        },
        { onConflict: 'hour,endpoint,method' }
      )

    if (upsertError) {
      console.error('[monitoring] Failed to flush metrics:', upsertError.message)
    } else {
      flushed++
    }
  }

  return flushed
}

/** Get current in-memory metrics summary */
export function getMetricsSummary(): {
  endpoints: number
  totalSamples: number
  oldestHour: string | null
} {
  let totalSamples = 0
  let oldestHour: string | null = null

  for (const [key, sample] of samples.entries()) {
    totalSamples += sample.totalCount
    const parts = key.split(':')
    const hour = parts.slice(2).join(':')
    if (hour && (!oldestHour || hour < oldestHour)) {
      oldestHour = hour
    }
  }

  return {
    endpoints: samples.size,
    totalSamples,
    oldestHour,
  }
}
