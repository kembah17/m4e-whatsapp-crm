"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  FileText,
  BarChart3,
  Users,
  Target,
  Calendar,
  Lightbulb,
  RefreshCw,
  Save,
  ChevronRight,
  Edit,
} from "lucide-react"
import {
  generatePerformanceSummary,
  generateMarketOpportunity,
  generateAudienceIntelligence,
  generateBudgetModelling,
  generateSessionSummary,
  generateCampaignArchitecture,
  generateCreativeBrief,
  generateTwelveWeekCalendar,
  generateDefaultAgenda,
} from "@/lib/packages/templates"
import type { AccountContext } from "@/lib/packages/templates"
import type { StrategySessionDocument, StrategySessionAgenda } from "@/types/packages"

type Section = "pre-session" | "agenda" | "post-session"

const sections: { id: Section; label: string; icon: typeof FileText }[] = [
  { id: "pre-session", label: "Pre-Session Documents", icon: FileText },
  { id: "agenda", label: "Session Agenda", icon: Calendar },
  { id: "post-session", label: "Post-Session", icon: Lightbulb },
]

/* ------------------------------------------------------------------ */
/*  Account Context Form                                               */
/* ------------------------------------------------------------------ */
function AccountContextForm({
  ctx,
  onChange,
}: {
  ctx: AccountContext
  onChange: (ctx: AccountContext) => void
}) {
  const update = (key: keyof AccountContext, value: string | number | boolean) => {
    onChange({ ...ctx, [key]: value })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Account Context</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Account Name *</label>
          <input
            type="text" value={ctx.accountName} onChange={(e) => update("accountName", e.target.value)}
            placeholder="Business name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Industry</label>
          <input
            type="text" value={ctx.industry ?? ""} onChange={(e) => update("industry", e.target.value)}
            placeholder="e.g. Retail, Healthcare"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Current Package</label>
          <input
            type="text" value={ctx.currentPackage ?? ""} onChange={(e) => update("currentPackage", e.target.value)}
            placeholder="e.g. pkg1_reactivation"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Contact Count</label>
          <input
            type="number" value={ctx.contactCount ?? ""} onChange={(e) => update("contactCount", parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Conversation Count</label>
          <input
            type="number" value={ctx.conversationCount ?? ""} onChange={(e) => update("conversationCount", parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Campaign Count</label>
          <input
            type="number" value={ctx.campaignCount ?? ""} onChange={(e) => update("campaignCount", parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Reactivation Rate (0-1)</label>
          <input
            type="number" step="0.01" min="0" max="1" value={ctx.reactivationRate ?? ""}
            onChange={(e) => update("reactivationRate", parseFloat(e.target.value) || 0)}
            placeholder="0.15"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Satisfaction Score (0-5)</label>
          <input
            type="number" step="0.1" min="0" max="5" value={ctx.satisfactionScore ?? ""}
            onChange={(e) => update("satisfactionScore", parseFloat(e.target.value) || 0)}
            placeholder="4.2"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Revenue Recovered (₦)</label>
          <input
            type="number" value={ctx.revenueRecovered ?? ""}
            onChange={(e) => update("revenueRecovered", parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox" checked={ctx.whatsappConnected ?? false}
              onChange={(e) => update("whatsappConnected", e.target.checked)}
              className="rounded border-border"
            />
            WhatsApp Connected
          </label>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Document Preview                                                   */
/* ------------------------------------------------------------------ */
function DocumentPreview({ doc }: { doc: StrategySessionDocument | null }) {
  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
        <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Generate a document to preview it here.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-foreground">{doc.title}</h4>
        <span className="text-xs text-muted-foreground">
          Generated: {new Date(doc.generated_at).toLocaleString("en-NG")}
        </span>
      </div>
      <pre className="whitespace-pre-wrap font-mono text-sm text-foreground leading-relaxed">
        {doc.content}
      </pre>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Pre-Session Section                                                */
/* ------------------------------------------------------------------ */
function PreSessionSection({
  ctx,
  onGenerate,
}: {
  ctx: AccountContext
  onGenerate: (doc: StrategySessionDocument) => void
}) {
  const buttons = [
    { label: "Performance Summary", icon: BarChart3, fn: generatePerformanceSummary },
    { label: "Market Opportunity", icon: Target, fn: generateMarketOpportunity },
    { label: "Audience Intelligence", icon: Users, fn: generateAudienceIntelligence },
    { label: "Budget Modelling", icon: FileText, fn: generateBudgetModelling },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Generate pre-session documents for the strategy meeting.</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {buttons.map((btn) => {
          const Icon = btn.icon
          return (
            <button
              key={btn.label}
              onClick={() => {
                if (!ctx.accountName.trim()) return
                const doc = btn.fn(ctx)
                onGenerate(doc)
              }}
              disabled={!ctx.accountName.trim()}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-amber-500/30 hover:bg-amber-500/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Icon className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">{btn.label}</span>
                <p className="text-xs text-muted-foreground">Click to generate</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Agenda Section                                                     */
/* ------------------------------------------------------------------ */
function AgendaSection() {
  const [agenda] = useState<StrategySessionAgenda>(() => generateDefaultAgenda())

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">3-hour strategy session agenda.</h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground w-32">Time</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground w-48">Section</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</th>
            </tr>
          </thead>
          <tbody>
            {agenda.sections.map((section, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                <td className="p-3 font-mono text-amber-500 font-medium">{section.time}</td>
                <td className="p-3 font-medium text-foreground">{section.title}</td>
                <td className="p-3 text-muted-foreground">{section.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Post-Session Section                                               */
/* ------------------------------------------------------------------ */
function PostSessionSection({
  ctx,
  onGenerate,
}: {
  ctx: AccountContext
  onGenerate: (doc: StrategySessionDocument) => void
}) {
  const [sessionNotes, setSessionNotes] = useState("")

  const postButtons = [
    { label: "Session Summary", icon: FileText, fn: () => generateSessionSummary(ctx, sessionNotes) },
    { label: "Campaign Architecture", icon: Target, fn: () => generateCampaignArchitecture(ctx) },
    { label: "Creative Brief", icon: Lightbulb, fn: () => generateCreativeBrief(ctx) },
    { label: "12-Week Calendar", icon: Calendar, fn: () => generateTwelveWeekCalendar(ctx) },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Capture session notes and generate post-session deliverables.</h3>

      {/* Session notes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <label className="mb-2 block text-sm font-medium text-foreground">Session Notes</label>
        <textarea
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          rows={6}
          placeholder="Capture key discussion points, decisions, action items..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none"
        />
      </div>

      {/* Generate buttons */}
      <div className="grid gap-3 sm:grid-cols-2">
        {postButtons.map((btn) => {
          const Icon = btn.icon
          return (
            <button
              key={btn.label}
              onClick={() => {
                if (!ctx.accountName.trim()) return
                const doc = btn.fn()
                onGenerate(doc)
              }}
              disabled={!ctx.accountName.trim()}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-amber-500/30 hover:bg-amber-500/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Icon className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">{btn.label}</span>
                <p className="text-xs text-muted-foreground">Click to generate</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function StrategySessionPage() {
  const [activeSection, setActiveSection] = useState<Section>("pre-session")
  const [currentDoc, setCurrentDoc] = useState<StrategySessionDocument | null>(null)
  const [ctx, setCtx] = useState<AccountContext>({
    accountName: "",
    industry: "",
    contactCount: 0,
    conversationCount: 0,
    campaignCount: 0,
    reactivationRate: 0,
    satisfactionScore: 0,
    revenueRecovered: 0,
    whatsappConnected: false,
    currentPackage: "",
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Strategy Session</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Prepare, conduct, and follow up on client strategy sessions.
        </p>
      </div>

      {/* Account context form */}
      <AccountContextForm ctx={ctx} onChange={setCtx} />

      {/* Section tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {sections.map((sec) => {
          const Icon = sec.icon
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeSection === sec.id
                  ? "bg-background text-amber-500 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />{sec.label}
            </button>
          )
        })}
      </div>

      {/* Two-column layout: controls + preview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          {activeSection === "pre-session" && (
            <PreSessionSection ctx={ctx} onGenerate={setCurrentDoc} />
          )}
          {activeSection === "agenda" && <AgendaSection />}
          {activeSection === "post-session" && (
            <PostSessionSection ctx={ctx} onGenerate={setCurrentDoc} />
          )}
        </div>
        <div>
          <DocumentPreview doc={currentDoc} />
        </div>
      </div>
    </div>
  )
}
