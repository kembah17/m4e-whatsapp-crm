"use client"

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/currency'
import { INDUSTRY_METRIC_CONFIGS } from '@/lib/financials/industry-metrics'
import { BarChart3 } from 'lucide-react'

interface MetricValue {
  key: string
  label: string
  format: 'currency' | 'percent' | 'number'
  value: number | null
}

export function IndustryMetricsWidget() {
  const { industry, defaultCurrency } = useAuth()
  const [metrics, setMetrics] = useState<MetricValue[]>([])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/financials/summary')
      if (!res.ok) throw new Error('Failed to fetch financials')
      const data = await res.json()

      const config = INDUSTRY_METRIC_CONFIGS[industry] || INDUSTRY_METRIC_CONFIGS['retail']
      if (!config) {
        setMetrics([])
        return
      }

      const mapped: MetricValue[] = config.headline_metrics.map((m) => {
        // Try snake_case and camelCase keys
        const val = data[m.key] ?? data[m.key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] ?? null
        return {
          key: m.key,
          label: m.label,
          format: m.format,
          value: typeof val === 'number' ? val : null,
        }
      })

      setMetrics(mapped)
    } catch (err) {
      console.error('[industry-metrics] fetch error:', err)
      setMetrics([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [industry])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const formatValue = (m: MetricValue): string => {
    if (m.value === null || m.value === undefined) return '—'
    switch (m.format) {
      case 'currency':
        return formatCurrency(m.value, defaultCurrency)
      case 'percent':
        return `${m.value.toFixed(1)}%`
      case 'number':
        return m.value.toLocaleString()
      default:
        return String(m.value)
    }
  }

  if (error) return null

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border bg-card p-3 h-16" />
        ))}
      </div>
    )
  }

  if (metrics.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.key}
          className="rounded-lg border bg-card p-3 flex flex-col gap-0.5"
        >
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
              {m.label}
            </span>
          </div>
          <span className="text-lg font-bold text-foreground">
            {formatValue(m)}
          </span>
        </div>
      ))}
    </div>
  )
}
