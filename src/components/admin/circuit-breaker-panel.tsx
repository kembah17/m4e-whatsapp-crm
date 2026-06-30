"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldOff,
  Unlock,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CircuitBreakerTrip {
  id: string
  account_id: string
  contact_id: string | null
  rule_name: string
  triggered_at: string
  cooldown_until: string
  message_count: number
  resolved: boolean
  resolved_at: string | null
}

interface RateLogStats {
  total_outbound: number
  total_blocked: number
  block_rate: number
}

const RULE_LABELS: Record<string, { label: string; severity: string }> = {
  contact_5min: { label: "Contact 5-min limit (10 msgs)", severity: "warning" },
  contact_1hr: { label: "Contact 1-hr limit (30 msgs)", severity: "warning" },
  contact_24hr: { label: "Contact 24-hr limit (100 msgs)", severity: "critical" },
  account_1hr: { label: "Account 1-hr limit (500 msgs)", severity: "critical" },
  account_24hr: { label: "Account 24-hr limit (5000 msgs)", severity: "critical" },
}

export function CircuitBreakerPanel() {
  const [loading, setLoading] = useState(true)
  const [trips, setTrips] = useState<CircuitBreakerTrip[]>([])
  const [stats, setStats] = useState<RateLogStats | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/monitoring/security?type=circuit_breaker")
      if (res.ok) {
        const data = await res.json()
        // Use circuit_breaker_state data if available, otherwise empty
        setTrips(data.trips || [])
        setStats(data.rate_stats || null)
      } else {
        // Fallback: fetch directly from circuit_breaker_state
        // This will work once the table exists
        setTrips([])
        setStats(null)
      }
    } catch (err) {
      console.error("[circuit-breaker] fetch failed:", err)
      setTrips([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleReset = async (tripId: string, accountId: string, contactId: string | null) => {
    setResetting(tripId)
    try {
      await fetch("/api/admin/monitoring/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_circuit_breaker",
          trip_id: tripId,
          account_id: accountId,
          contact_id: contactId,
        }),
      })
      await fetchData()
    } catch (err) {
      console.error("[circuit-breaker] reset failed:", err)
    } finally {
      setResetting(null)
    }
  }

  const activeTrips = trips.filter((t) => !t.resolved)
  const resolvedTrips = trips.filter((t) => t.resolved).slice(0, 20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Message Loop Detection
          </h2>
          <p className="text-sm text-muted-foreground">
            Circuit breaker status and rate limiting
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchData()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {loading && trips.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Status Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    activeTrips.length > 0
                      ? "bg-red-500/10"
                      : "bg-emerald-500/10"
                  )}
                >
                  {activeTrips.length > 0 ? (
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                  ) : (
                    <Shield className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Trips</p>
                  <p className="text-lg font-bold text-foreground">
                    {activeTrips.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Blocked Messages</p>
                  <p className="text-lg font-bold text-foreground">
                    {stats?.total_blocked ?? 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <ShieldOff className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Block Rate</p>
                  <p className="text-lg font-bold text-foreground">
                    {stats ? `${(stats.block_rate * 100).toFixed(2)}%` : "0%"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rate Limit Rules */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Rate Limit Rules
            </h3>
            <div className="space-y-2">
              {Object.entries(RULE_LABELS).map(([key, { label, severity }]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2"
                >
                  <span className="text-sm text-foreground">{label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      severity === "critical"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-amber-500/10 text-amber-500"
                    )}
                  >
                    {severity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Trips */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Active Circuit Breaker Trips
            </h3>
            {activeTrips.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  All clear — no active circuit breaker trips
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTrips.map((trip) => {
                  const rule = RULE_LABELS[trip.rule_name]
                  const cooldownDate = new Date(trip.cooldown_until)
                  const isExpired = cooldownDate < new Date()
                  return (
                    <div
                      key={trip.id}
                      className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                          <span className="text-sm font-medium text-foreground">
                            {rule?.label || trip.rule_name}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Account: {trip.account_id.slice(0, 8)}...</span>
                          {trip.contact_id && (
                            <span>Contact: {trip.contact_id.slice(0, 8)}...</span>
                          )}
                          <span>{trip.message_count} messages</span>
                          <span>
                            Cooldown until:{" "}
                            {isExpired ? (
                              <span className="text-amber-500">Expired (auto-resolving)</span>
                            ) : (
                              cooldownDate.toLocaleTimeString()
                            )}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void handleReset(trip.id, trip.account_id, trip.contact_id)
                        }
                        disabled={resetting === trip.id}
                        className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        {resetting === trip.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                        Reset
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Resolved Trips */}
          {resolvedTrips.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Recently Resolved
              </h3>
              <div className="space-y-1">
                {resolvedTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-muted-foreground"
                  >
                    <span>
                      {RULE_LABELS[trip.rule_name]?.label || trip.rule_name} —{" "}
                      {trip.account_id.slice(0, 8)}...
                    </span>
                    <span>
                      {trip.resolved_at
                        ? new Date(trip.resolved_at).toLocaleString()
                        : "Auto-resolved"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
