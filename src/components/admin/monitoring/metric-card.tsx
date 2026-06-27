"use client"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface MonitoringMetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: "green" | "amber" | "red" | "blue"
  trend?: {
    direction: "up" | "down"
    value: string
  }
}

const colorMap = {
  green: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-500",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
  },
}

export function MonitoringMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
}: MonitoringMetricCardProps) {
  const colors = colorMap[color]

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-amber-500/20">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              colors.bg,
            )}
          >
            <Icon className={cn("h-5 w-5", colors.text)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trend.direction === "up"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-red-500/10 text-red-500",
            )}
          >
            <span>{trend.direction === "up" ? "↑" : "↓"}</span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  )
}
