"use client"

import { Badge } from "@/components/ui/badge"

interface Props {
  sentiment: string
  size?: "sm" | "md"
}

const CONFIG: Record<string, { emoji: string; label: string; className: string }> = {
  positive: {
    emoji: "\ud83d\udfe2",
    label: "Positive",
    className: "bg-green-500/10 text-green-500 border-green-500/30",
  },
  neutral: {
    emoji: "\ud83d\udfe1",
    label: "Neutral",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  },
  negative: {
    emoji: "\ud83d\udd34",
    label: "Negative",
    className: "bg-red-500/10 text-red-500 border-red-500/30",
  },
  urgent: {
    emoji: "\ud83d\udea8",
    label: "Urgent",
    className: "bg-red-600/10 text-red-600 border-red-600/30 animate-pulse",
  },
}

export function SentimentBadge({ sentiment, size = "sm" }: Props) {
  const cfg = CONFIG[sentiment] || CONFIG.neutral
  return (
    <Badge
      variant="outline"
      className={`${cfg.className} ${size === "sm" ? "text-xs" : "text-sm"}`}
    >
      {cfg.emoji} {cfg.label}
    </Badge>
  )
}
