"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Brain,
  DollarSign,
  Hash,
  Loader2,
  MessageSquare,
  RefreshCw,
  Save,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FeatureBreakdown {
  feature: string
  calls: number
  cost: number
  cost_usd?: number
  input_tokens?: number
  output_tokens?: number
}

interface DailyTrend {
  date: string
  cost_usd: number
  calls: number
}

interface UsageSummary {
  total_cost_usd: number
  total_input_tokens: number
  total_output_tokens: number
  total_calls: number
  by_feature: FeatureBreakdown[]
  daily_trend: DailyTrend[]
}

interface GlobalUsage {
  global: {
    total_cost: number
    total_calls: number
    input_tokens: number
    output_tokens: number
  }
  by_account: Array<{
    account_id: string
    total_cost: number
    total_calls: number
    input_tokens: number
    output_tokens: number
  }>
  by_feature: FeatureBreakdown[]
  days: number
}

interface BudgetSettings {
  account_id: string
  monthly_budget_usd: number
  alert_threshold_pct: number
  hard_limit_enabled: boolean
}

const FEATURE_COLORS: Record<string, string> = {
  chatbot: "bg-blue-500",
  sentiment: "bg-purple-500",
  bulk_tagging: "bg-emerald-500",
  ghostwriter: "bg-amber-500",
  intent_detection: "bg-rose-500",
}

const FEATURE_LABELS: Record<string, string> = {
  chatbot: "AI Chatbot",
  sentiment: "Sentiment Analysis",
  bulk_tagging: "Bulk Tagging",
  ghostwriter: "Ghostwriter",
  intent_detection: "Intent Detection",
}

export function AIUsageDashboard() {
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<GlobalUsage | null>(null)
  const [days, setDays] = useState(30)
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(null)
  const [savingBudget, setSavingBudget] = useState(false)
  const [budgetForm, setBudgetForm] = useState({
    monthly_budget_usd: 5,
    alert_threshold_pct: 80,
    hard_limit_enabled: false,
  })

  const fetchUsage = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/ai-usage?days=${days}`)
      if (res.ok) {
        const data = await res.json()
        setUsage(data)
      }
    } catch (err) {
      console.error("[ai-usage] fetch failed:", err)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void fetchUsage()
  }, [fetchUsage])

  const saveBudget = async (accountId: string) => {
    setSavingBudget(true)
    try {
      await fetch("/api/admin/ai-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          ...budgetForm,
        }),
      })
    } catch (err) {
      console.error("[ai-budget] save failed:", err)
    } finally {
      setSavingBudget(false)
    }
  }

  const maxDailyCost = usage?.by_feature
    ? Math.max(
        ...((usage as unknown as { summary?: UsageSummary })?.summary?.daily_trend || []).map(
          (d: DailyTrend) => d.cost_usd
        ),
        0.001
      )
    : 0.001

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI Usage & Costs</h2>
          <p className="text-sm text-muted-foreground">
            Monitor AI API usage across all accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border">
            {[7, 14, 30, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
                  days === d
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void fetchUsage()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {loading && !usage ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : usage ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Cost ({days}d)</p>
                  <p className="text-lg font-bold text-foreground">
                    ${usage.global.total_cost.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Hash className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total API Calls</p>
                  <p className="text-lg font-bold text-foreground">
                    {usage.global.total_calls.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Input Tokens</p>
                  <p className="text-lg font-bold text-foreground">
                    {usage.global.input_tokens.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Output Tokens</p>
                  <p className="text-lg font-bold text-foreground">
                    {usage.global.output_tokens.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Breakdown */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Usage by Feature</h3>
            {usage.by_feature.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI usage recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {usage.by_feature.map((f) => {
                  const pct =
                    usage.global.total_cost > 0
                      ? ((f.cost_usd ?? f.cost) / usage.global.total_cost) * 100
                      : 0
                  return (
                    <div key={f.feature}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm text-foreground">
                          {FEATURE_LABELS[f.feature] || f.feature}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {f.calls} calls · ${(f.cost_usd ?? f.cost).toFixed(4)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            FEATURE_COLORS[f.feature] || "bg-gray-500"
                          )}
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Per-Account Table */}
          {usage.by_account.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Usage by Account
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left font-medium text-muted-foreground">
                        Account ID
                      </th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">
                        Calls
                      </th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">
                        Input Tokens
                      </th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">
                        Output Tokens
                      </th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">
                        Cost (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.by_account.map((acct) => (
                      <tr
                        key={acct.account_id}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2 font-mono text-xs text-foreground">
                          {acct.account_id.slice(0, 8)}...
                        </td>
                        <td className="py-2 text-right text-foreground">
                          {acct.total_calls.toLocaleString()}
                        </td>
                        <td className="py-2 text-right text-foreground">
                          {acct.input_tokens.toLocaleString()}
                        </td>
                        <td className="py-2 text-right text-foreground">
                          {acct.output_tokens.toLocaleString()}
                        </td>
                        <td className="py-2 text-right font-medium text-foreground">
                          ${acct.total_cost.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Budget Settings */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Default Budget Settings
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Monthly Budget (USD)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={budgetForm.monthly_budget_usd}
                  onChange={(e) =>
                    setBudgetForm((f) => ({
                      ...f,
                      monthly_budget_usd: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={budgetForm.alert_threshold_pct}
                  onChange={(e) =>
                    setBudgetForm((f) => ({
                      ...f,
                      alert_threshold_pct: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={budgetForm.hard_limit_enabled}
                    onChange={(e) =>
                      setBudgetForm((f) => ({
                        ...f,
                        hard_limit_enabled: e.target.checked,
                      }))
                    }
                    className="rounded border-border"
                  />
                  Hard Limit
                </label>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Budget settings apply per-account. Use the account detail page to set
              individual budgets.
            </p>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Brain className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No AI usage data available.</p>
        </div>
      )}
    </div>
  )
}
