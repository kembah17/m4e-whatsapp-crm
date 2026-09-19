"use client"

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/currency'

interface FinancialAlert {
  level: 'red' | 'orange' | 'yellow' | 'green'
  message: string
}

export function FinancialAlertsWidget() {
  const { defaultCurrency } = useAuth()
  const [alerts, setAlerts] = useState<FinancialAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/financials/summary')
      if (!res.ok) throw new Error('Failed to fetch financials')
      const data = await res.json()

      const newAlerts: FinancialAlert[] = []

      // Red: Overdue debts
      const overdueCount = data.overdue_debts_count ?? data.overdueDebtsCount ?? 0
      const overdueTotal = data.overdue_debts_total ?? data.overdueDebtsTotal ?? 0
      if (overdueCount > 0) {
        newAlerts.push({
          level: 'red',
          message: `You have ${overdueCount} overdue debt${overdueCount === 1 ? '' : 's'} totaling ${formatCurrency(overdueTotal, defaultCurrency)}`,
        })
      }

      // Orange: Collections rate < 70%
      const collectionsRate = data.collections_rate ?? data.collectionsRate ?? 100
      if (collectionsRate < 70) {
        newAlerts.push({
          level: 'orange',
          message: `Collections rate is ${collectionsRate.toFixed(1)}%, below 70% target`,
        })
      }

      // Yellow: Outstanding invoices > 30 days
      const outstandingInvoices = data.outstanding_invoices_30d ?? data.outstandingInvoices30d ?? 0
      if (outstandingInvoices > 0) {
        newAlerts.push({
          level: 'yellow',
          message: `${outstandingInvoices} outstanding invoice${outstandingInvoices === 1 ? '' : 's'} older than 30 days`,
        })
      }

      // Green: All clear
      if (newAlerts.length === 0) {
        newAlerts.push({
          level: 'green',
          message: 'Financial health looks good!',
        })
      }

      setAlerts(newAlerts)
    } catch (err) {
      console.error('[financial-alerts] fetch error:', err)
      setAlerts([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [defaultCurrency])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const levelStyles: Record<string, string> = {
    red: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    orange: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200',
    yellow: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    green: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200',
  }

  if (error) return null

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-foreground">Financial Alerts</h3>
        </div>
        <Link
          href="/financials"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Details <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-muted h-12" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${levelStyles[alert.level]}`}
            >
              {alert.level === 'green' ? (
                <CheckCircle className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
