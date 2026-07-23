"use client"

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SLATimerProps {
  dueAt: string | null
  breached: boolean
  label?: string
  compact?: boolean
}

export function SLATimer({ dueAt, breached, label, compact = false }: SLATimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [status, setStatus] = useState<'ok' | 'warning' | 'breached'>('ok')

  useEffect(() => {
    if (!dueAt) return

    function calculate() {
      const now = new Date().getTime()
      const due = new Date(dueAt!).getTime()
      const diff = due - now

      if (breached || diff <= 0) {
        setStatus('breached')
        const overdue = Math.abs(diff)
        const hours = Math.floor(overdue / (1000 * 60 * 60))
        const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60))
        setTimeLeft(`${hours}h ${minutes}m overdue`)
        return
      }

      const totalMs = new Date(dueAt!).getTime() - new Date().getTime()
      const totalOriginal = due - (due - Math.abs(diff) * 2) // approximate
      const percentRemaining = diff / (totalOriginal || 1)

      if (percentRemaining < 0.25 || diff < 30 * 60 * 1000) {
        setStatus('warning')
      } else {
        setStatus('ok')
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 24) {
        const days = Math.floor(hours / 24)
        const remainingHours = hours % 24
        setTimeLeft(`${days}d ${remainingHours}h`)
      } else {
        setTimeLeft(`${hours}h ${minutes}m`)
      }
    }

    calculate()
    const interval = setInterval(calculate, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [dueAt, breached])

  if (!dueAt) return null

  const colorMap = {
    ok: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    breached: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }

  if (compact) {
    return (
      <Badge variant="outline" className={cn('gap-1 text-xs', colorMap[status])}>
        {status === 'breached' ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Clock className="h-3 w-3" />
        )}
        {timeLeft}
      </Badge>
    )
  }

  return (
    <div className={cn('flex items-center gap-2 rounded-md px-2 py-1 text-sm', colorMap[status])}>
      {status === 'breached' ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <div>
        {label && <span className="font-medium">{label}: </span>}
        <span>{timeLeft}</span>
      </div>
    </div>
  )
}
