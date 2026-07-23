"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Headphones,
  TrendingUp,
  Star,
  ArrowUpCircle,
} from 'lucide-react'

interface StatsData {
  total_open: number
  total_resolved: number
  total_closed: number
  critical_open: number
  high_open: number
  sla_breached: number
  avg_resolution_hours: number | null
  avg_first_response_hours: number | null
  escalated: number
  waiting_customer: number
  today_created: number
  today_resolved: number
  satisfaction?: {
    average_rating: number | null
    total_responses: number
    response_rate: number
  }
}

export function SupportStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/support/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="mt-2 h-8 w-12 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      label: 'Open Tickets',
      value: stats.total_open,
      icon: Headphones,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Critical',
      value: stats.critical_open,
      icon: Flame,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/30',
      highlight: stats.critical_open > 0,
    },
    {
      label: 'SLA Breached',
      value: stats.sla_breached,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      highlight: stats.sla_breached > 0,
    },
    {
      label: 'Avg Resolution',
      value: stats.avg_resolution_hours != null ? `${stats.avg_resolution_hours}h` : '-',
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      label: 'CSAT Score',
      value: stats.satisfaction?.average_rating != null
        ? `${stats.satisfaction.average_rating}/5`
        : '-',
      icon: Star,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    },
    {
      label: 'Today',
      value: `${stats.today_created} new / ${stats.today_resolved} done`,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
      small: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={card.highlight ? 'border-red-300 dark:border-red-800' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`rounded-md p-1.5 ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className={`mt-2 ${card.small ? 'text-sm' : 'text-2xl'} font-bold`}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
