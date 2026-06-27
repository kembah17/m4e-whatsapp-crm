"use client"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface AdminMetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  subtitle?: string
  trend?: {
    value: number
    label: string
  }
  accent?: "amber" | "green" | "blue" | "purple" | "red"
}

const accentStyles = {
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-500",
    trendUp: "text-amber-500",
  },
  green: {
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-500",
    trendUp: "text-emerald-500",
  },
  blue: {
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-500",
    trendUp: "text-blue-500",
  },
  purple: {
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-500",
    trendUp: "text-purple-500",
  },
  red: {
    iconBg: "bg-red-500/10",
    iconText: "text-red-500",
    trendUp: "text-red-500",
  },
}

export function AdminMetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  accent = "amber",
}: AdminMetricCardProps) {
  const styles = accentStyles[accent]

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-amber-500/20">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend.value > 0
                  ? styles.trendUp
                  : trend.value < 0
                    ? "text-red-500"
                    : "text-muted-foreground",
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value.toLocaleString()} {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            styles.iconBg,
          )}
        >
          <Icon className={cn("h-5 w-5", styles.iconText)} />
        </div>
      </div>
    </div>
  )
}

export function AdminMetricSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-7 w-16 animate-pulse rounded bg-muted" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}
