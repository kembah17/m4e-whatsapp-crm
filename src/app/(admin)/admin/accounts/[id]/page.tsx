"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { PlatformAccountDetail } from "@/types/admin"
import {
  ArrowLeft,
  Circle,
  BarChart3,
  CheckCircle2,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Radio,
  Users,
  Zap,
} from "lucide-react"

export default function AdminAccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [detail, setDetail] = useState<PlatformAccountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const db = createClient()
    const { data, error: err } = await db.rpc("get_platform_account_detail", {
      p_account_id: id,
    })
    if (err) {
      setError(err.message)
    } else {
      setDetail(data as unknown as PlatformAccountDetail)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-sm text-destructive">{error || "Account not found"}</p>
        <button
          type="button"
          onClick={() => router.push("/admin/accounts")}
          className="text-sm text-amber-500 hover:underline"
        >
          ← Back to accounts
        </button>
      </div>
    )
  }

  const { account, stats, members, whatsapp, onboarding, recent_activity } = detail
  const owner = members.find((m) => m.user_id === account.owner_user_id)
  const hasWhatsApp = whatsapp.length > 0 && whatsapp.some((w) => w.status === "connected")
  const connectedWa = whatsapp.find((w) => w.status === "connected")

  const statCards = [
    {
      label: "Contacts",
      value: stats.contacts,
      icon: Users,
      accent: "text-blue-500 bg-blue-500/10",
    },
    {
      label: "Conversations",
      value: stats.conversations,
      icon: MessageSquare,
      accent: "text-purple-500 bg-purple-500/10",
    },
    {
      label: "Messages",
      value: stats.messages_total,
      icon: BarChart3,
      accent: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "Broadcasts",
      value: stats.broadcasts_sent,
      icon: Radio,
      accent: "text-amber-500 bg-amber-500/10",
    },
    {
      label: "Automations",
      value: stats.automations_active,
      icon: Zap,
      accent: "text-rose-500 bg-rose-500/10",
    },
    {
      label: "Team Members",
      value: members.length,
      icon: Users,
      accent: "text-indigo-500 bg-indigo-500/10",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button
          type="button"
          onClick={() => router.push("/admin/accounts")}
          className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> All accounts
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {account.name || "Unnamed Account"}
              </h1>
              {hasWhatsApp ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> WhatsApp Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  No WhatsApp
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              ID: {account.id}
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.accent}`}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-foreground">
                  {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column: Account Info + WhatsApp */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Account info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Account Information
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Owner</dt>
              <dd className="font-medium text-foreground">
                {owner?.full_name || "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium text-foreground">
                {owner?.email || "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Currency</dt>
              <dd className="font-medium text-foreground">
                {account.default_currency || "NGN"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium text-foreground">
                {new Date(account.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Branches</dt>
              <dd className="font-medium text-foreground">
                {stats.branches}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Products</dt>
              <dd className="font-medium text-foreground">
                {stats.products}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Open Deals</dt>
              <dd className="font-medium text-foreground">
                {stats.deals_open} ({account.default_currency || "NGN"}{" "}
                {stats.deals_value.toLocaleString()})
              </dd>
            </div>
          </dl>
        </div>

        {/* WhatsApp info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            WhatsApp Connection
          </h3>
          {hasWhatsApp && connectedWa ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="inline-flex items-center gap-1 font-medium text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </dd>
              </div>
              {connectedWa.phone_number_id && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Phone Number ID</dt>
                  <dd className="font-mono text-xs text-foreground">
                    {connectedWa.phone_number_id}
                  </dd>
                </div>
              )}
              {connectedWa.connected_at && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Connected Since</dt>
                  <dd className="font-medium text-foreground">
                    {new Date(connectedWa.connected_at).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "short", day: "numeric" },
                    )}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Messages (7d)</dt>
                <dd className="font-medium text-foreground">
                  {stats.messages_last_7d.toLocaleString()}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Globe className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                WhatsApp not connected yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding checklist */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Onboarding Progress
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([
            { label: "WhatsApp Connected", done: onboarding.has_whatsapp },
            { label: "Contacts Imported", done: onboarding.has_contacts },
            { label: "First Broadcast", done: onboarding.has_sent_broadcast },
            { label: "Automation Created", done: onboarding.has_automation },
            { label: "Pipeline Setup", done: onboarding.has_pipeline },
            { label: "Products Added", done: onboarding.has_products },
          ] as const).map((step) => (
            <div
              key={step.label}
              className={`flex items-center gap-2 rounded-lg border p-3 ${
                step.done
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-muted/30"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={`text-xs font-medium ${
                  step.done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Team members */}
      {members.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Team Members
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => (
                  <tr key={member.user_id}>
                    <td className="py-2.5 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {(member.full_name || member.email || "?")[0].toUpperCase()}
                        </div>
                        {member.full_name || "—"}
                        {member.user_id === account.owner_user_id && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                            Owner
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {member.email || "—"}
                    </td>
                    <td className="py-2.5">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {member.account_role}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recent_activity && recent_activity.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recent_activity.map((activity, i) => (
              <div
                key={i}
                className="flex items-start gap-3 text-sm"
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground">
                    <span className="font-medium capitalize">
                      {activity.sender_type}
                    </span>
                    {" — "}
                    <span className="text-muted-foreground">
                      {activity.content
                        ? activity.content.length > 120
                          ? activity.content.slice(0, 120) + "…"
                          : activity.content
                        : `[${activity.type}]`}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
