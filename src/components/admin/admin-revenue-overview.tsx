"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type {
  PlatformRevenueOverview,
  SubscriptionTier,
  SubscriptionStatus,
} from "@/types/admin"
import { AdminExportButton } from "./admin-export-button"
import {
  BadgeDollarSign,
  Building2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  Rocket,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

const TIER_CONFIG: Record<
  SubscriptionTier,
  { label: string; price: number; color: string; icon: React.ElementType }
> = {
  starter: {
    label: "Starter",
    price: 50000,
    color: "text-blue-400 bg-blue-500/10",
    icon: Rocket,
  },
  professional: {
    label: "Professional",
    price: 120000,
    color: "text-amber-500 bg-amber-500/10",
    icon: TrendingUp,
  },
  business: {
    label: "Business",
    price: 250000,
    color: "text-emerald-400 bg-emerald-500/10",
    icon: Building2,
  },
  enterprise: {
    label: "Enterprise",
    price: 0,
    color: "text-purple-400 bg-purple-500/10",
    icon: Crown,
  },
}

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-500",
  trial: "bg-blue-500/10 text-blue-400",
  suspended: "bg-red-500/10 text-red-500",
  cancelled: "bg-zinc-500/10 text-zinc-400",
}

const TIER_OPTIONS: SubscriptionTier[] = ["starter", "professional", "business", "enterprise"]
const STATUS_OPTIONS: SubscriptionStatus[] = ["active", "trial", "suspended", "cancelled"]

function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AdminRevenueOverview() {
  const [data, setData] = useState<PlatformRevenueOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    const db = createClient()
    try {
      const { data: result, error } = await db.rpc("get_platform_revenue_overview")
      if (error) {
        console.error("[admin] revenue failed:", error)
      } else {
        setData(result as unknown as PlatformRevenueOverview)
      }
    } catch (err) {
      console.error("[admin] revenue error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateSubscription = async (
    accountId: string,
    field: "tier" | "status",
    value: string,
  ) => {
    setUpdating(accountId)
    const db = createClient()
    try {
      const { error } = await db.rpc("update_account_subscription", {
        p_account_id: accountId,
        p_tier: field === "tier" ? value : null,
        p_status: field === "status" ? value : null,
      })
      if (error) {
        console.error("[admin] update subscription failed:", error)
      } else {
        await load()
      }
    } catch (err) {
      console.error("[admin] update subscription error:", err)
    } finally {
      setUpdating(null)
    }
  }

  const exportData = useMemo(
    () =>
      (data?.accounts ?? []).map((a) => ({
        Account: a.account_name,
        Email: a.owner_email || "-",
        Tier: a.subscription_tier,
        Status: a.subscription_status,
        Contacts: a.contact_count,
        Created: a.created_at,
      })),
    [data],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (!data) return null

  const totalAccounts = Object.values(data.tier_distribution).reduce(
    (s, v) => s + v,
    0,
  )

  return (
    <div className="space-y-6">
      {/* Paystack banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <CreditCard className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Paystack Integration Coming Soon
            </p>
            <p className="text-xs text-muted-foreground">
              Automated billing and payment collection will be available once
              Paystack integration is complete. For now, manage tiers manually.
            </p>
          </div>
        </div>
      </div>

      {/* MRR + Tier cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Projected MRR */}
        <div className="rounded-xl border border-border bg-card p-5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BadgeDollarSign className="h-4 w-4" />
            Projected MRR
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {formatNaira(data.projected_mrr)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on current tier assignments
          </p>
        </div>

        {/* Tier distribution */}
        {TIER_OPTIONS.map((tier) => {
          const cfg = TIER_CONFIG[tier]
          const count = data.tier_distribution[tier] || 0
          const pct = totalAccounts > 0 ? Math.round((count / totalAccounts) * 100) : 0

          return (
            <div key={tier} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    cfg.color,
                  )}
                >
                  <cfg.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatNaira(cfg.price)}/mo</span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Accounts table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Account Subscriptions
            </h3>
            <p className="text-xs text-muted-foreground">
              {data.accounts.length} accounts
            </p>
          </div>
          <AdminExportButton
            data={exportData as unknown as Record<string, unknown>[]}
            filename="revenue-accounts"
          />
        </div>

        {data.accounts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No accounts yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                    Account
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                    Tier
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Contacts
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    MRR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.accounts.map((acct) => {
                  const tierCfg = TIER_CONFIG[acct.subscription_tier]
                  const isUpdating = updating === acct.account_id

                  return (
                    <tr
                      key={acct.account_id}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        isUpdating && "opacity-50",
                      )}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">
                          {acct.account_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {acct.owner_email || "No email"}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={acct.subscription_tier}
                          disabled={isUpdating}
                          onChange={(e) =>
                            updateSubscription(
                              acct.account_id,
                              "tier",
                              e.target.value,
                            )
                          }
                          className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                        >
                          {TIER_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {TIER_CONFIG[t].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={acct.subscription_status}
                          disabled={isUpdating}
                          onChange={(e) =>
                            updateSubscription(
                              acct.account_id,
                              "status",
                              e.target.value,
                            )
                          }
                          className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                        {acct.contact_count.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-foreground">
                        {formatNaira(tierCfg.price)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
