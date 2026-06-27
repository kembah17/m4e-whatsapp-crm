"use client"

import type { PlatformAccountRow } from "@/types/admin"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  Circle,
  MessageSquare,
  Radio,
  Users,
  Wifi,
} from "lucide-react"

interface OnboardingStep {
  key: string
  label: string
  icon: typeof CheckCircle2
  check: (row: PlatformAccountRow) => boolean
}

const steps: OnboardingStep[] = [
  {
    key: "whatsapp",
    label: "WhatsApp Connected",
    icon: Wifi,
    check: (r) => r.whatsapp_connected,
  },
  {
    key: "contacts",
    label: "Contacts Added",
    icon: Users,
    check: (r) => r.contact_count > 0,
  },
  {
    key: "conversations",
    label: "First Conversation",
    icon: MessageSquare,
    check: (r) => r.conversation_count > 0,
  },
  {
    key: "broadcasts",
    label: "First Broadcast",
    icon: Radio,
    check: (r) => r.broadcast_count > 0,
  },
]

interface AdminOnboardingTrackerProps {
  accounts: PlatformAccountRow[] | null
  loading: boolean
}

export function AdminOnboardingTracker({
  accounts,
  loading,
}: AdminOnboardingTrackerProps) {
  if (loading || !accounts) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  // Calculate completion rates
  const total = accounts.length
  const completionRates = steps.map((step) => ({
    ...step,
    completed: accounts.filter(step.check).length,
    rate: total > 0 ? (accounts.filter(step.check).length / total) * 100 : 0,
  }))

  // Find accounts needing attention (signed up but haven't connected WhatsApp)
  const needsAttention = accounts.filter(
    (a) => !a.whatsapp_connected && a.contact_count === 0,
  )

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Onboarding Progress
        </h3>
        <p className="text-xs text-muted-foreground">
          {total} total accounts
        </p>
      </div>

      {/* Step completion bars */}
      <div className="space-y-3">
        {completionRates.map((step) => (
          <div key={step.key}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <step.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  {step.label}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {step.completed}/{total} ({Math.round(step.rate)}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  step.rate >= 75
                    ? "bg-emerald-500"
                    : step.rate >= 50
                      ? "bg-amber-500"
                      : step.rate >= 25
                        ? "bg-orange-500"
                        : "bg-red-500",
                )}
                style={{ width: `${step.rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Needs attention */}
      {needsAttention.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-medium text-amber-500">
            ⚠️ {needsAttention.length} account{needsAttention.length !== 1 ? "s" : ""} need onboarding help
          </p>
          <div className="mt-2 space-y-1">
            {needsAttention.slice(0, 5).map((a) => (
              <p key={a.account_id} className="text-[11px] text-muted-foreground">
                {a.account_name || a.owner_name || a.owner_email || "Unknown"}
                {" — "}
                <span className="text-amber-500/70">
                  signed up{" "}
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </p>
            ))}
            {needsAttention.length > 5 && (
              <p className="text-[11px] text-muted-foreground">
                +{needsAttention.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
