"use client"


import { useCallback, useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  Package, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  TrendingUp, Target, FileText, RefreshCw, ChevronDown,
  ChevronRight, Loader2, BarChart3, Award, Calendar, Users,
  Rocket, Zap, MessageSquare, Settings, Play, Pause, Check,
  X, Plus, Eye, Edit3, Trash2, Download, Upload, Filter,
  Search, MoreVertical, ExternalLink, Lightbulb, ClipboardList,
  GitBranch, Radio, Bot, Workflow, AlertCircle, Star,
} from "lucide-react"

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */
interface PackageConfig {
  id: string
  package_key: string
  name: string
  description: string | null
  price_naira: number
  duration_weeks: number
  tier: number
  campaign_slugs: string[]
  automation_types: string[]
  flow_types: string[]
  report_frequency: string
  retainer_options: Array<{ name: string; price: number; monitoring_level: string; intervention_frequency: string }>
  milestone_template: Array<{ week: number; name: string; description?: string; deliverables: string[]; criteria: string[] }>
  transition_rules: {
    next_packages?: string[]
    quantitative_criteria?: Array<{ metric: string; threshold: number; operator: string }>
    qualitative_criteria?: Array<{ key: string; description: string }>
    qualitative_minimum?: number
  }
  is_active: boolean
}

interface DeliverableItem { name: string; status: "pending" | "in_progress" | "completed"; url?: string }
interface CriterionItem { name: string; met: boolean; value?: number | string }

interface MilestoneData {
  id: string
  milestone_key: string
  name: string
  description: string | null
  week_number: number
  status: "pending" | "in_progress" | "completed" | "skipped" | "blocked"
  started_at: string | null
  completed_at: string | null
  planned_hours: number
  actual_hours: number
  deliverables: DeliverableItem[]
  criteria: CriterionItem[]
  notes: string | null
  account_id: string
  package_config_id: string
}

interface AccountSummary {
  account_id: string
  business_name: string
  subscription_tier: string
  industry: string
  created_at: string
  active_package: {
    package_config_id: string
    package_key: string
    package_name: string
    price_naira: number
    duration_weeks: number
    total_milestones: number
    completed: number
    in_progress: number
    pending: number
    blocked: number
    skipped: number
    progress_percent: number
    current_week: number
    current_milestone: string | null
    started_at: string | null
    last_activity: string | null
    estimated_end: string | null
  } | null
  campaign_stats: { total: number; active: number; draft: number }
  automation_stats: { total: number; active: number }
  contact_count: number
}

interface ManagementData {
  accounts: AccountSummary[]
  packages: PackageConfig[]
  stats: {
    total_accounts: number
    with_package: number
    without_package: number
    total_milestones: number
    completed_milestones: number
  }
}

type Tab = "overview" | "assign" | "execute" | "configure" | "reports" | "transitions"

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */
const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(n)

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"

const formatDateShort = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "—"

const statusColors: Record<string, string> = {
  pending: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  skipped: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  blocked: "bg-red-500/10 text-red-400 border-red-500/20",
}

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  in_progress: Play,
  completed: CheckCircle2,
  skipped: ArrowRight,
  blocked: AlertTriangle,
}

const tierColors: Record<number, string> = {
  1: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  2: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  3: "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

const tierLabels: Record<number, string> = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3" }

const campaignLabels: Record<string, string> = {
  win_back: "Win-Back Campaign",
  review_collection: "Review Collection",
  birthday_campaign: "Birthday Campaign",
  referral_program: "Referral Programme",
  vip_rewards: "VIP Rewards",
  post_purchase_thank_you: "Post-Purchase Thank You",
  "ad-lead-nurture": "Ad Lead Nurture",
  "whatsapp-flow-survey": "WhatsApp Flow Survey",
  abandoned_cart: "Abandoned Cart",
  order_status: "Order Status",
  cod_confirmation: "COD Confirmation",
  upsell_cross_sell: "Upsell / Cross-Sell",
  "catalog-browse": "Catalogue Browse",
  "sentiment-recovery": "Sentiment Recovery",
}

const automationLabels: Record<string, string> = {
  welcome_message: "Welcome Message",
  out_of_office: "Out of Office",
  satisfaction_gate: "Satisfaction Gate",
  wonback_detection: "Won-Back Detection",
  new_lead_welcome: "New Lead Welcome",
  lead_scoring: "Lead Scoring",
  email_nurture_trigger: "Email Nurture Trigger",
  cart_abandonment_trigger: "Cart Abandonment",
  order_status_update: "Order Status Update",
  cod_confirmation_flow: "COD Confirmation Flow",
  cross_sell_trigger: "Cross-Sell Trigger",
  catalog_browse_trigger: "Catalogue Browse Trigger",
}

const flowLabels: Record<string, string> = {
  welcome_menu: "Welcome Menu",
  satisfaction_collection: "Satisfaction Collection",
  lead_qualification: "Lead Qualification",
  ad_lead_capture: "Ad Lead Capture",
  retargeting_flow: "Retargeting Flow",
  conversion_funnel: "Conversion Funnel",
}


/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */
export default function PackageManagerPage() {
  const [data, setData] = useState<ManagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [milestones, setMilestones] = useState<MilestoneData[]>([])
  const [milestonesLoading, setMilestonesLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)
  const [noteText, setNoteText] = useState("")

  /* ---- Fetch management data ---- */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/packages/management")
      if (!res.ok) throw new Error("Failed to load data")
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* ---- Fetch milestones for selected account ---- */
  const fetchMilestones = useCallback(async (accountId: string, pkgConfigId: string) => {
    setMilestonesLoading(true)
    try {
      const res = await fetch(`/api/admin/packages/${pkgConfigId}/milestones?account_id=${accountId}`)
      if (!res.ok) throw new Error("Failed to load milestones")
      const json = await res.json()
      setMilestones(json.milestones ?? [])
    } catch {
      setMilestones([])
    } finally {
      setMilestonesLoading(false)
    }
  }, [])

  /* ---- API action helper ---- */
  const doAction = useCallback(async (body: Record<string, unknown>) => {
    setActionLoading(true)
    try {
      const res = await fetch("/api/packages/management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Action failed")
      return json
    } finally {
      setActionLoading(false)
    }
  }, [])

  /* ---- Select account and load milestones ---- */
  const selectAccount = useCallback((accountId: string) => {
    setSelectedAccount(accountId)
    const acct = data?.accounts.find(a => a.account_id === accountId)
    if (acct?.active_package) {
      setSelectedPackage(acct.active_package.package_config_id)
      fetchMilestones(accountId, acct.active_package.package_config_id)
    } else {
      setSelectedPackage(null)
      setMilestones([])
    }
  }, [data, fetchMilestones])

  /* ---- Filtered accounts ---- */
  const filteredAccounts = useMemo(() => {
    if (!data) return []
    if (!searchQuery.trim()) return data.accounts
    const q = searchQuery.toLowerCase()
    return data.accounts.filter(a =>
      a.business_name.toLowerCase().includes(q) ||
      a.industry.toLowerCase().includes(q) ||
      (a.active_package?.package_name ?? "").toLowerCase().includes(q)
    )
  }, [data, searchQuery])

  /* ---- Selected account data ---- */
  const selectedAccountData = useMemo(() =>
    data?.accounts.find(a => a.account_id === selectedAccount) ?? null
  , [data, selectedAccount])

  /* ---- Selected package config ---- */
  const selectedPkgConfig = useMemo(() =>
    data?.packages.find(p => p.id === selectedPackage) ?? null
  , [data, selectedPackage])

  /* ---- Tabs ---- */
  const tabs: { id: Tab; label: string; icon: typeof Package; count?: number }[] = [
    { id: "overview", label: "Overview", icon: BarChart3, count: data?.stats.total_accounts },
    { id: "assign", label: "Assign", icon: Plus, count: data?.stats.without_package },
    { id: "execute", label: "Execute", icon: ClipboardList, count: data?.stats.with_package },
    { id: "configure", label: "Configure", icon: Settings },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "transitions", label: "Transitions", icon: ArrowRight },
  ]

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent-500 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading Package Manager...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={fetchData} className="text-sm text-accent-500 hover:underline">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-7 w-7 text-accent-500" />
            Package Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage client packages, milestones, deliverables, and transitions
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-card transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Clients", value: data.stats.total_accounts, icon: Users, color: "text-blue-400" },
            { label: "With Package", value: data.stats.with_package, icon: Package, color: "text-emerald-400" },
            { label: "No Package", value: data.stats.without_package, icon: AlertCircle, color: "text-amber-400" },
            { label: "Total Milestones", value: data.stats.total_milestones, icon: Target, color: "text-purple-400" },
            { label: "Completed", value: data.stats.completed_milestones, icon: CheckCircle2, color: "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={cn("h-4 w-4", s.color)} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "bg-card border border-b-0 border-border text-accent-500"
                : "text-muted-foreground hover:text-foreground hover:bg-card/50"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                activeTab === tab.id ? "bg-accent-500/10 text-accent-500" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[50vh]">
        {activeTab === "overview" && <OverviewTab accounts={filteredAccounts} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelectAccount={(id) => { selectAccount(id); setActiveTab("execute") }} />}
        {activeTab === "assign" && <AssignTab accounts={data?.accounts ?? []} packages={data?.packages ?? []} onAssign={async (accountId, pkgId) => { const result = await doAction({ action: "assign_package", account_id: accountId, package_config_id: pkgId }); if (result.success) { await fetchData(); selectAccount(accountId); setActiveTab("execute") } return result }} actionLoading={actionLoading} />}
        {activeTab === "execute" && <ExecuteTab account={selectedAccountData} pkgConfig={selectedPkgConfig} milestones={milestones} milestonesLoading={milestonesLoading} expandedMilestone={expandedMilestone} setExpandedMilestone={setExpandedMilestone} noteText={noteText} setNoteText={setNoteText} accounts={filteredAccounts} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelectAccount={selectAccount} onUpdateMilestone={async (body) => { const result = await doAction(body); if (result.success && selectedAccount && selectedPackage) { await fetchMilestones(selectedAccount, selectedPackage) } return result }} onUpdateDeliverable={async (body) => { const result = await doAction(body); if (result.success && selectedAccount && selectedPackage) { await fetchMilestones(selectedAccount, selectedPackage) } return result }} onUpdateCriterion={async (body) => { const result = await doAction(body); if (result.success && selectedAccount && selectedPackage) { await fetchMilestones(selectedAccount, selectedPackage) } return result }} actionLoading={actionLoading} />}
        {activeTab === "configure" && <ConfigureTab account={selectedAccountData} pkgConfig={selectedPkgConfig} accounts={filteredAccounts} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelectAccount={selectAccount} />}
        {activeTab === "reports" && <ReportsTab account={selectedAccountData} pkgConfig={selectedPkgConfig} milestones={milestones} accounts={filteredAccounts} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelectAccount={selectAccount} />}
        {activeTab === "transitions" && <TransitionsTab account={selectedAccountData} pkgConfig={selectedPkgConfig} milestones={milestones} packages={data?.packages ?? []} accounts={filteredAccounts} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSelectAccount={selectAccount} onTransition={async (body) => { const result = await doAction(body); if (result.success) await fetchData(); return result }} actionLoading={actionLoading} />}
      </div>
    </div>
  )
}


/* ================================================================== */
/*  Shared: Account Selector Sidebar                                   */
/* ================================================================== */
function AccountSelector({
  accounts, searchQuery, setSearchQuery, selectedId, onSelect, showUnassignedOnly = false,
}: {
  accounts: AccountSummary[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedId: string | null
  onSelect: (id: string) => void
  showUnassignedOnly?: boolean
}) {
  const filtered = showUnassignedOnly
    ? accounts.filter(a => !a.active_package)
    : accounts

  return (
    <div className="w-full md:w-72 shrink-0 border border-border rounded-lg bg-card overflow-hidden">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {showUnassignedOnly ? "All clients have packages assigned" : "No clients found"}
          </div>
        ) : (
          filtered.map(acct => (
            <button
              key={acct.account_id}
              onClick={() => onSelect(acct.account_id)}
              className={cn(
                "w-full text-left p-3 border-b border-border/50 hover:bg-accent-500/5 transition-colors",
                selectedId === acct.account_id && "bg-accent-500/10 border-l-2 border-l-accent-500"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground truncate">{acct.business_name}</span>
                {acct.active_package ? (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                    {acct.active_package.progress_percent}%
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">No pkg</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{acct.industry}</span>
                {acct.active_package && (
                  <>
                    <span className="text-xs text-muted-foreground">\u00b7</span>
                    <span className="text-xs text-muted-foreground">{acct.active_package.package_name}</span>
                  </>
                )}
              </div>
              {acct.active_package && (
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-500 rounded-full transition-all"
                    style={{ width: `${acct.active_package.progress_percent}%` }}
                  />
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab 1: Overview                                                    */
/* ================================================================== */
function OverviewTab({
  accounts, searchQuery, setSearchQuery, onSelectAccount,
}: {
  accounts: AccountSummary[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  onSelectAccount: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, industry, or package..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* Client Cards */}
      <div className="grid gap-3">
        {accounts.map(acct => (
          <div
            key={acct.account_id}
            className="bg-card border border-border rounded-lg p-4 hover:border-accent-500/30 transition-colors cursor-pointer"
            onClick={() => onSelectAccount(acct.account_id)}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Client Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate">{acct.business_name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{acct.industry}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{acct.contact_count} contacts</span>
                  <span className="flex items-center gap-1"><Rocket className="h-3 w-3" />{acct.campaign_stats.active}/{acct.campaign_stats.total} campaigns</span>
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{acct.automation_stats.active}/{acct.automation_stats.total} automations</span>
                </div>
              </div>

              {/* Package Status */}
              {acct.active_package ? (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{acct.active_package.package_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Week {acct.active_package.current_week} of {acct.active_package.duration_weeks}
                      {acct.active_package.current_milestone && (
                        <> \u00b7 {acct.active_package.current_milestone}</>
                      )}
                    </p>
                  </div>
                  <div className="w-24">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{acct.active_package.completed}/{acct.active_package.total_milestones}</span>
                      <span className="font-medium text-accent-500">{acct.active_package.progress_percent}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          acct.active_package.blocked > 0 ? "bg-red-500" :
                          acct.active_package.progress_percent >= 75 ? "bg-emerald-500" :
                          acct.active_package.progress_percent >= 25 ? "bg-accent-500" : "bg-blue-500"
                        )}
                        style={{ width: `${acct.active_package.progress_percent}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> No package assigned
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No clients found</p>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/*  Tab 2: Assign                                                      */
/* ================================================================== */
function AssignTab({
  accounts, packages, onAssign, actionLoading,
}: {
  accounts: AccountSummary[]
  packages: PackageConfig[]
  onAssign: (accountId: string, pkgId: string) => Promise<{ success?: boolean; error?: string }>
  actionLoading: boolean
}) {
  const [selectedAcct, setSelectedAcct] = useState<string | null>(null)
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null)

  const unassigned = accounts.filter(a => !a.active_package)
  const assignable = packages.filter(p => p.is_active && p.milestone_template.length > 0)
  const selectedPkgData = packages.find(p => p.id === selectedPkg)

  const handleAssign = async () => {
    if (!selectedAcct || !selectedPkg) return
    setAssignError(null)
    setAssignSuccess(null)
    try {
      const result = await onAssign(selectedAcct, selectedPkg)
      if (result.success) {
        const acctName = accounts.find(a => a.account_id === selectedAcct)?.business_name ?? ""
        const pkgName = packages.find(p => p.id === selectedPkg)?.name ?? ""
        setAssignSuccess(`${pkgName} assigned to ${acctName} successfully!`)
        setSelectedAcct(null)
        setSelectedPkg(null)
      } else {
        setAssignError(result.error ?? "Assignment failed")
      }
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Assignment failed")
    }
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-400">Package Assignment</p>
          <p className="text-muted-foreground mt-1">
            Assign a package to a client to initialise their milestones, deliverables, and success criteria.
            The first milestone will automatically start. Complete and Unicorn programmes should be assigned
            as individual packages (Pkg 1 \u2192 Pkg 2 \u2192 Pkg 3).
          </p>
        </div>
      </div>

      {assignSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm text-emerald-400">{assignSuccess}</span>
        </div>
      )}
      {assignError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-400">{assignError}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Step 1: Select Client */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-accent-500/10 text-accent-500 flex items-center justify-center text-xs font-bold">1</span>
            Select Client
          </h3>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {unassigned.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All clients have packages assigned!</p>
                <p className="text-xs text-muted-foreground mt-1">To reassign, remove the current package first from the Transitions tab.</p>
              </div>
            ) : (
              unassigned.map(acct => (
                <button
                  key={acct.account_id}
                  onClick={() => setSelectedAcct(acct.account_id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    selectedAcct === acct.account_id
                      ? "border-accent-500 bg-accent-500/5"
                      : "border-border bg-card hover:border-accent-500/30"
                  )}
                >
                  <p className="font-medium text-sm text-foreground">{acct.business_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{acct.industry}</span>
                    <span>{acct.contact_count} contacts</span>
                    <span>Joined {formatDate(acct.created_at)}</span>
                  </div>
                </button>
              ))
            )}
            {/* Also show assigned clients for reassignment */}
            {accounts.filter(a => a.active_package).length > 0 && (
              <>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-2">Clients with existing packages:</p>
                {accounts.filter(a => a.active_package).map(acct => (
                  <button
                    key={acct.account_id}
                    onClick={() => setSelectedAcct(acct.account_id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors opacity-70",
                      selectedAcct === acct.account_id
                        ? "border-accent-500 bg-accent-500/5 opacity-100"
                        : "border-border bg-card hover:border-accent-500/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-foreground">{acct.business_name}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                        {acct.active_package?.package_name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{acct.industry} \u00b7 {acct.active_package?.progress_percent}% complete</p>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Step 2: Select Package */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-accent-500/10 text-accent-500 flex items-center justify-center text-xs font-bold">2</span>
            Select Package
          </h3>
          <div className="space-y-2">
            {assignable.map(pkg => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg.id)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border transition-colors",
                  selectedPkg === pkg.id
                    ? "border-accent-500 bg-accent-500/5"
                    : "border-border bg-card hover:border-accent-500/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-foreground">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pkg.duration_weeks} weeks \u00b7 {pkg.milestone_template.length} milestones \u00b7 {pkg.campaign_slugs.length} campaigns
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatNaira(pkg.price_naira)}</p>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded", tierColors[pkg.tier])}>{tierLabels[pkg.tier]}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Package Preview */}
          {selectedPkgData && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Package Preview: {selectedPkgData.name}</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-muted-foreground">Campaigns</p>
                  <p className="font-semibold text-foreground">{selectedPkgData.campaign_slugs.length}</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-muted-foreground">Automations</p>
                  <p className="font-semibold text-foreground">{selectedPkgData.automation_types.length}</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-muted-foreground">Flows</p>
                  <p className="font-semibold text-foreground">{selectedPkgData.flow_types.length}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Milestones:</p>
                {selectedPkgData.milestone_template.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-mono">{m.week}</span>
                    <span className="text-foreground">{m.name}</span>
                    <span className="text-muted-foreground">({m.deliverables.length} deliverables, {m.criteria.length} criteria)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assign Button */}
          <button
            onClick={handleAssign}
            disabled={!selectedAcct || !selectedPkg || actionLoading}
            className={cn(
              "w-full py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2",
              selectedAcct && selectedPkg
                ? "bg-accent-500 text-white hover:bg-accent-600"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {actionLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Assigning...</>
            ) : (
              <><Plus className="h-4 w-4" /> Assign Package</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


/* ================================================================== */
/*  Tab 3: Execute — Milestone Tracker                                 */
/* ================================================================== */
function ExecuteTab({
  account, pkgConfig, milestones, milestonesLoading, expandedMilestone,
  setExpandedMilestone, noteText, setNoteText, accounts, searchQuery,
  setSearchQuery, onSelectAccount, onUpdateMilestone, onUpdateDeliverable,
  onUpdateCriterion, actionLoading,
}: {
  account: AccountSummary | null
  pkgConfig: PackageConfig | null
  milestones: MilestoneData[]
  milestonesLoading: boolean
  expandedMilestone: string | null
  setExpandedMilestone: (id: string | null) => void
  noteText: string
  setNoteText: (t: string) => void
  accounts: AccountSummary[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  onSelectAccount: (id: string) => void
  onUpdateMilestone: (body: Record<string, unknown>) => Promise<{ success?: boolean }>
  onUpdateDeliverable: (body: Record<string, unknown>) => Promise<{ success?: boolean }>
  onUpdateCriterion: (body: Record<string, unknown>) => Promise<{ success?: boolean }>
  actionLoading: boolean
}) {
  const sortedMilestones = useMemo(() =>
    [...milestones].sort((a, b) => a.week_number - b.week_number)
  , [milestones])

  const currentMilestone = sortedMilestones.find(m => m.status === "in_progress")
  const completedCount = sortedMilestones.filter(m => m.status === "completed").length
  const totalCount = sortedMilestones.length

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Left: Account Selector */}
      <AccountSelector
        accounts={accounts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedId={account?.account_id ?? null}
        onSelect={onSelectAccount}
      />

      {/* Right: Milestone Content */}
      <div className="flex-1 min-w-0">
        {!account ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Select a client to view their package milestones</p>
          </div>
        ) : !account.active_package ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <p className="text-foreground font-medium">{account.business_name}</p>
            <p className="text-muted-foreground mt-1">No package assigned. Go to the Assign tab to assign one.</p>
          </div>
        ) : milestonesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Package Header */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{account.business_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {account.active_package.package_name} \u00b7 Week {account.active_package.current_week} of {account.active_package.duration_weeks}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-accent-500">{account.active_package.progress_percent}%</p>
                    <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} milestones</p>
                  </div>
                  <div className="w-32">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-500 rounded-full transition-all"
                        style={{ width: `${account.active_package.progress_percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{formatDateShort(account.active_package.started_at)}</span>
                      <span>{formatDateShort(account.active_package.estimated_end)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Milestone Timeline */}
            <div className="space-y-2">
              {sortedMilestones.map((ms, idx) => {
                const isExpanded = expandedMilestone === ms.id
                const StatusIcon = statusIcons[ms.status] ?? Clock
                const delivCompleted = ms.deliverables.filter(d => d.status === "completed").length
                const critMet = ms.criteria.filter(c => c.met).length
                const isCurrent = ms.status === "in_progress"

                return (
                  <div
                    key={ms.id}
                    className={cn(
                      "bg-card border rounded-lg transition-colors",
                      isCurrent ? "border-accent-500/50 ring-1 ring-accent-500/20" : "border-border",
                      ms.status === "blocked" && "border-red-500/30"
                    )}
                  >
                    {/* Milestone Header */}
                    <button
                      onClick={() => setExpandedMilestone(isExpanded ? null : ms.id)}
                      className="w-full text-left p-4 flex items-center gap-3"
                    >
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          ms.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                          ms.status === "in_progress" ? "bg-accent-500/20 text-accent-500" :
                          ms.status === "blocked" ? "bg-red-500/20 text-red-400" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {ms.status === "completed" ? <Check className="h-4 w-4" /> : `W${ms.week_number}`}
                        </div>
                        {idx < sortedMilestones.length - 1 && (
                          <div className={cn(
                            "w-0.5 h-4",
                            ms.status === "completed" ? "bg-emerald-500/30" : "bg-border"
                          )} />
                        )}
                      </div>

                      {/* Milestone Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{ms.name}</span>
                          <span className={cn("text-xs px-1.5 py-0.5 rounded border", statusColors[ms.status])}>
                            {ms.status.replace("_", " ")}
                          </span>
                          {isCurrent && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-accent-500/10 text-accent-500 animate-pulse">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{delivCompleted}/{ms.deliverables.length} deliverables</span>
                          <span>{critMet}/{ms.criteria.length} criteria met</span>
                          {ms.started_at && <span>Started {formatDateShort(ms.started_at)}</span>}
                          {ms.completed_at && <span>Done {formatDateShort(ms.completed_at)}</span>}
                          {ms.actual_hours > 0 && <span>{ms.actual_hours}h logged</span>}
                        </div>
                      </div>

                      {/* Progress mini-bar */}
                      <div className="w-16 hidden sm:block">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-500 rounded-full"
                            style={{ width: ms.deliverables.length > 0 ? `${(delivCompleted / ms.deliverables.length) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>

                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180"
                      )} />
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                        {ms.description && (
                          <p className="text-sm text-muted-foreground">{ms.description}</p>
                        )}

                        {/* Status Actions */}
                        <div className="flex flex-wrap gap-2">
                          {(["pending", "in_progress", "completed", "blocked", "skipped"] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => onUpdateMilestone({ action: "update_milestone", milestone_id: ms.id, status: s })}
                              disabled={ms.status === s || actionLoading}
                              className={cn(
                                "text-xs px-3 py-1.5 rounded-md border transition-colors flex items-center gap-1",
                                ms.status === s
                                  ? statusColors[s] + " font-medium"
                                  : "border-border text-muted-foreground hover:border-accent-500/30"
                              )}
                            >
                              {React.createElement(statusIcons[s], { className: "h-3 w-3" })}
                              {s.replace("_", " ")}
                            </button>
                          ))}
                        </div>

                        {/* Deliverables Checklist */}
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-accent-500" />
                            Deliverables ({delivCompleted}/{ms.deliverables.length})
                          </h4>
                          <div className="space-y-1.5">
                            {ms.deliverables.map((d, di) => (
                              <div key={di} className="flex items-center gap-2 group">
                                <button
                                  onClick={() => onUpdateDeliverable({
                                    action: "update_deliverable",
                                    milestone_id: ms.id,
                                    deliverable_index: di,
                                    deliverable_status: d.status === "completed" ? "pending" : "completed",
                                  })}
                                  disabled={actionLoading}
                                  className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                    d.status === "completed"
                                      ? "bg-emerald-500 border-emerald-500 text-white"
                                      : "border-border hover:border-accent-500"
                                  )}
                                >
                                  {d.status === "completed" && <Check className="h-3 w-3" />}
                                </button>
                                <span className={cn(
                                  "text-sm flex-1",
                                  d.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"
                                )}>
                                  {d.name}
                                </span>
                                {d.status !== "completed" && d.status !== "in_progress" && (
                                  <button
                                    onClick={() => onUpdateDeliverable({
                                      action: "update_deliverable",
                                      milestone_id: ms.id,
                                      deliverable_index: di,
                                      deliverable_status: "in_progress",
                                    })}
                                    className="text-xs text-accent-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Start
                                  </button>
                                )}
                                {d.url && (
                                  <a href={d.url} target="_blank" rel="noopener" className="text-accent-500">
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Success Criteria */}
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4 text-purple-400" />
                            Success Criteria ({critMet}/{ms.criteria.length})
                          </h4>
                          <div className="space-y-1.5">
                            {ms.criteria.map((c, ci) => (
                              <div key={ci} className="flex items-center gap-2">
                                <button
                                  onClick={() => onUpdateCriterion({
                                    action: "update_criterion",
                                    milestone_id: ms.id,
                                    criterion_index: ci,
                                    met: !c.met,
                                  })}
                                  disabled={actionLoading}
                                  className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                    c.met
                                      ? "bg-purple-500 border-purple-500 text-white"
                                      : "border-border hover:border-purple-500"
                                  )}
                                >
                                  {c.met && <Check className="h-3 w-3" />}
                                </button>
                                <span className={cn(
                                  "text-sm flex-1",
                                  c.met ? "text-muted-foreground" : "text-foreground"
                                )}>
                                  {c.name}
                                </span>
                                {c.value !== undefined && (
                                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {c.value}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Hours & Notes */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Hours Logged</label>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                defaultValue={ms.actual_hours}
                                onBlur={e => {
                                  const val = parseFloat(e.target.value)
                                  if (!isNaN(val) && val !== ms.actual_hours) {
                                    onUpdateMilestone({ action: "update_milestone", milestone_id: ms.id, actual_hours: val })
                                  }
                                }}
                                className="w-20 px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-500"
                              />
                              <span className="text-xs text-muted-foreground">hours</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Notes</label>
                            <div className="flex gap-2 mt-1">
                              <input
                                type="text"
                                placeholder="Add a note..."
                                value={expandedMilestone === ms.id ? noteText : (ms.notes ?? "")}
                                onChange={e => setNoteText(e.target.value)}
                                onFocus={() => setNoteText(ms.notes ?? "")}
                                className="flex-1 px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent-500"
                              />
                              <button
                                onClick={() => {
                                  onUpdateMilestone({ action: "update_milestone", milestone_id: ms.id, notes: noteText })
                                  setNoteText("")
                                }}
                                disabled={actionLoading}
                                className="px-2 py-1.5 text-xs bg-accent-500/10 text-accent-500 rounded hover:bg-accent-500/20"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {sortedMilestones.length === 0 && (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No milestones found. The package may need to be reassigned.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


/* ================================================================== */
/*  Tab 4: Configure — Campaigns / Automations / Flows Checklist       */
/* ================================================================== */
function ConfigureTab({
  account, pkgConfig, accounts, searchQuery, setSearchQuery, onSelectAccount,
}: {
  account: AccountSummary | null
  pkgConfig: PackageConfig | null
  accounts: AccountSummary[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  onSelectAccount: (id: string) => void
}) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <AccountSelector
        accounts={accounts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedId={account?.account_id ?? null}
        onSelect={onSelectAccount}
      />

      <div className="flex-1 min-w-0">
        {!account ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Select a client to view their package configuration requirements</p>
          </div>
        ) : !pkgConfig ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <p className="text-foreground font-medium">{account.business_name}</p>
            <p className="text-muted-foreground mt-1">No package assigned. Assign a package first to see configuration requirements.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-foreground">{account.business_name} — {pkgConfig.name} Configuration</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Set up the following campaigns, automations, and flows as required by this package.
              </p>
            </div>

            {/* Campaigns */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Rocket className="h-5 w-5 text-blue-400" />
                Campaigns ({pkgConfig.campaign_slugs.length} required)
              </h4>
              <div className="space-y-2">
                {pkgConfig.campaign_slugs.map(slug => {
                  const isActive = account.campaign_stats.active > 0
                  return (
                    <div key={slug} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          "bg-blue-500/10 text-blue-400"
                        )}>
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{campaignLabels[slug] ?? slug}</p>
                          <p className="text-xs text-muted-foreground">Campaign slug: {slug}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Needs setup
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Automations */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-purple-400" />
                Automations ({pkgConfig.automation_types.length} required)
              </h4>
              <div className="space-y-2">
                {pkgConfig.automation_types.map(type => (
                  <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/10 text-purple-400">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{automationLabels[type] ?? type}</p>
                        <p className="text-xs text-muted-foreground">Type: {type}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Needs setup
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flows */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Workflow className="h-5 w-5 text-emerald-400" />
                Flows ({pkgConfig.flow_types.length} required)
              </h4>
              {pkgConfig.flow_types.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No flows required for this package tier.</p>
              ) : (
                <div className="space-y-2">
                  {pkgConfig.flow_types.map(type => (
                    <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                          <GitBranch className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{flowLabels[type] ?? type}</p>
                          <p className="text-xs text-muted-foreground">Flow type: {type}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Needs setup
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Retainer Options */}
            {pkgConfig.retainer_options.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                  <RefreshCw className="h-5 w-5 text-accent-500" />
                  Retainer Options (post-package)
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {pkgConfig.retainer_options.map((r, i) => (
                    <div key={i} className="p-3 rounded-lg bg-background border border-border/50">
                      <p className="text-sm font-medium text-foreground">{r.name}</p>
                      <p className="text-lg font-bold text-accent-500 mt-1">{formatNaira(r.price)}<span className="text-xs text-muted-foreground font-normal">/month</span></p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Monitoring: {r.monitoring_level}</span>
                        <span>\u00b7</span>
                        <span>Intervention: {r.intervention_frequency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-accent-500/5 border border-accent-500/20 rounded-lg p-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-accent-500" />
                Configuration Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{pkgConfig.campaign_slugs.length}</p>
                  <p className="text-xs text-muted-foreground">Campaigns</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pkgConfig.automation_types.length}</p>
                  <p className="text-xs text-muted-foreground">Automations</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pkgConfig.flow_types.length}</p>
                  <p className="text-xs text-muted-foreground">Flows</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pkgConfig.duration_weeks}</p>
                  <p className="text-xs text-muted-foreground">Weeks</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab 5: Reports                                                     */
/* ================================================================== */
function ReportsTab({
  account, pkgConfig, milestones, accounts, searchQuery, setSearchQuery, onSelectAccount,
}: {
  account: AccountSummary | null
  pkgConfig: PackageConfig | null
  milestones: MilestoneData[]
  accounts: AccountSummary[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  onSelectAccount: (id: string) => void
}) {
  const completedMilestones = milestones.filter(m => m.status === "completed")
  const totalHours = milestones.reduce((sum, m) => sum + m.actual_hours, 0)
  const totalDeliverables = milestones.reduce((sum, m) => sum + m.deliverables.length, 0)
  const completedDeliverables = milestones.reduce((sum, m) => sum + m.deliverables.filter(d => d.status === "completed").length, 0)
  const totalCriteria = milestones.reduce((sum, m) => sum + m.criteria.length, 0)
  const metCriteria = milestones.reduce((sum, m) => sum + m.criteria.filter(c => c.met).length, 0)

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <AccountSelector
        accounts={accounts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedId={account?.account_id ?? null}
        onSelect={onSelectAccount}
      />

      <div className="flex-1 min-w-0">
        {!account ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Select a client to view their report data</p>
          </div>
        ) : !pkgConfig ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <p className="text-foreground font-medium">{account.business_name}</p>
            <p className="text-muted-foreground mt-1">No package assigned.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{account.business_name} — Report Data</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pkgConfig.name} \u00b7 Report frequency: <span className="font-medium text-accent-500">{pkgConfig.report_frequency}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Started {formatDate(account.active_package?.started_at ?? null)}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Progress", value: `${account.active_package?.progress_percent ?? 0}%`, sub: `${completedMilestones.length}/${milestones.length} milestones`, color: "text-accent-500" },
                { label: "Hours Logged", value: totalHours.toFixed(1), sub: "total hours", color: "text-blue-400" },
                { label: "Deliverables", value: `${completedDeliverables}/${totalDeliverables}`, sub: `${totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0}% complete`, color: "text-emerald-400" },
                { label: "Criteria Met", value: `${metCriteria}/${totalCriteria}`, sub: `${totalCriteria > 0 ? Math.round((metCriteria / totalCriteria) * 100) : 0}% met`, color: "text-purple-400" },
              ].map(kpi => (
                <div key={kpi.label} className="bg-card border border-border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={cn("text-2xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Milestone Summary Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent-500" />
                  Milestone Summary
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Week</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Milestone</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Deliverables</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Criteria</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Hours</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Dates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...milestones].sort((a, b) => a.week_number - b.week_number).map(ms => {
                      const dc = ms.deliverables.filter(d => d.status === "completed").length
                      const cc = ms.criteria.filter(c => c.met).length
                      return (
                        <tr key={ms.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="p-3 font-mono text-xs">W{ms.week_number}</td>
                          <td className="p-3 font-medium text-foreground">{ms.name}</td>
                          <td className="p-3">
                            <span className={cn("text-xs px-1.5 py-0.5 rounded border", statusColors[ms.status])}>
                              {ms.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={cn("text-xs", dc === ms.deliverables.length && ms.deliverables.length > 0 ? "text-emerald-400" : "text-muted-foreground")}>
                              {dc}/{ms.deliverables.length}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={cn("text-xs", cc === ms.criteria.length && ms.criteria.length > 0 ? "text-purple-400" : "text-muted-foreground")}>
                              {cc}/{ms.criteria.length}
                            </span>
                          </td>
                          <td className="p-3 text-right text-xs text-muted-foreground">{ms.actual_hours > 0 ? `${ms.actual_hours}h` : "\u2014"}</td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {ms.started_at ? formatDateShort(ms.started_at) : "\u2014"}
                            {ms.completed_at ? ` \u2192 ${formatDateShort(ms.completed_at)}` : ""}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-3">Platform Activity</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{account.contact_count}</p>
                  <p className="text-xs text-muted-foreground">Contacts</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{account.campaign_stats.total}</p>
                  <p className="text-xs text-muted-foreground">Campaigns ({account.campaign_stats.active} active)</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{account.automation_stats.total}</p>
                  <p className="text-xs text-muted-foreground">Automations ({account.automation_stats.active} active)</p>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{formatNaira(pkgConfig.price_naira)}</p>
                  <p className="text-xs text-muted-foreground">Package Value</p>
                </div>
              </div>
            </div>

            {/* Report Tip */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-400">Report Generation</p>
                <p className="text-muted-foreground mt-1">
                  Use this data to generate {pkgConfig.report_frequency} client reports.
                  Export the milestone summary table and KPIs for inclusion in branded PDF reports.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Tab 6: Transitions                                                 */
/* ================================================================== */
function TransitionsTab({
  account, pkgConfig, milestones, packages, accounts, searchQuery,
  setSearchQuery, onSelectAccount, onTransition, actionLoading,
}: {
  account: AccountSummary | null
  pkgConfig: PackageConfig | null
  milestones: MilestoneData[]
  packages: PackageConfig[]
  accounts: AccountSummary[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  onSelectAccount: (id: string) => void
  onTransition: (body: Record<string, unknown>) => Promise<{ success?: boolean }>
  actionLoading: boolean
}) {
  const [transitionType, setTransitionType] = useState<string>("upgrade")
  const [targetPkg, setTargetPkg] = useState<string | null>(null)
  const [notes, setNotes] = useState("")

  const completedCount = milestones.filter(m => m.status === "completed").length
  const totalCount = milestones.length
  const isComplete = totalCount > 0 && completedCount === totalCount

  // Quantitative criteria check
  const quantCriteria = pkgConfig?.transition_rules?.quantitative_criteria ?? []
  const qualCriteria = pkgConfig?.transition_rules?.qualitative_criteria ?? []
  const nextPackages = pkgConfig?.transition_rules?.next_packages ?? []
  const nextPkgConfigs = packages.filter(p => nextPackages.includes(p.package_key))

  const handleTransition = async () => {
    if (!account || !pkgConfig) return
    await onTransition({
      action: "record_transition",
      account_id: account.account_id,
      from_package_id: pkgConfig.id,
      to_package_id: targetPkg,
      transition_type: transitionType,
      recommendation: isComplete ? "recommend" : "conditional",
      recommendation_text: notes || null,
      decision: "approved",
      notes,
    })
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <AccountSelector
        accounts={accounts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedId={account?.account_id ?? null}
        onSelect={onSelectAccount}
      />

      <div className="flex-1 min-w-0">
        {!account ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <ArrowRight className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Select a client to manage package transitions</p>
          </div>
        ) : !pkgConfig ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <p className="text-foreground font-medium">{account.business_name}</p>
            <p className="text-muted-foreground mt-1">No active package to transition from.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Package Status */}
            <div className={cn(
              "bg-card border rounded-lg p-4",
              isComplete ? "border-emerald-500/30" : "border-border"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{account.business_name}</h3>
                  <p className="text-sm text-muted-foreground">{pkgConfig.name}</p>
                </div>
                <div className="text-right">
                  {isComplete ? (
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Package Complete!</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-foreground">{account.active_package?.progress_percent}% complete</p>
                      <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} milestones</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transition Criteria */}
            {(quantCriteria.length > 0 || qualCriteria.length > 0) && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-400" />
                  Transition Criteria
                </h4>

                {quantCriteria.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Quantitative</p>
                    <div className="space-y-2">
                      {quantCriteria.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-background border border-border/50">
                          <span className="text-sm text-foreground">{c.metric}</span>
                          <span className="text-xs text-muted-foreground">{c.operator} {c.threshold}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qualCriteria.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Qualitative (minimum {pkgConfig.transition_rules?.qualitative_minimum ?? 0} required)
                    </p>
                    <div className="space-y-2">
                      {qualCriteria.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded bg-background border border-border/50">
                          <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">{i + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.key}</p>
                            <p className="text-xs text-muted-foreground">{c.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transition Actions */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-accent-500" />
                Transition Action
              </h4>

              {/* Transition Type */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                  { id: "upgrade", label: "Upgrade", icon: TrendingUp, desc: "Move to next package" },
                  { id: "retainer", label: "Retainer", icon: RefreshCw, desc: "Monthly maintenance" },
                  { id: "renewal", label: "Renewal", icon: Radio, desc: "Repeat same package" },
                  { id: "completion", label: "Complete", icon: Award, desc: "End engagement" },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTransitionType(t.id)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-colors",
                      transitionType === t.id
                        ? "border-accent-500 bg-accent-500/5"
                        : "border-border hover:border-accent-500/30"
                    )}
                  >
                    <t.icon className={cn("h-5 w-5 mb-1", transitionType === t.id ? "text-accent-500" : "text-muted-foreground")} />
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </button>
                ))}
              </div>

              {/* Target Package (for upgrade) */}
              {transitionType === "upgrade" && nextPkgConfigs.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recommended Next Package</p>
                  <div className="space-y-2">
                    {nextPkgConfigs.map(pkg => (
                      <button
                        key={pkg.id}
                        onClick={() => setTargetPkg(pkg.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors",
                          targetPkg === pkg.id
                            ? "border-accent-500 bg-accent-500/5"
                            : "border-border hover:border-accent-500/30"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-foreground">{pkg.name}</p>
                            <p className="text-xs text-muted-foreground">{pkg.duration_weeks} weeks \u00b7 {pkg.milestone_template.length} milestones</p>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{formatNaira(pkg.price_naira)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Retainer Options */}
              {transitionType === "retainer" && pkgConfig.retainer_options.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Available Retainer Plans</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {pkgConfig.retainer_options.map((r, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border bg-background">
                        <p className="font-medium text-sm text-foreground">{r.name}</p>
                        <p className="text-lg font-bold text-accent-500">{formatNaira(r.price)}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                        <p className="text-xs text-muted-foreground mt-1">{r.monitoring_level} monitoring \u00b7 {r.intervention_frequency} intervention</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="mb-4">
                <label className="text-xs font-medium text-muted-foreground">Transition Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes about this transition decision..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleTransition}
                disabled={actionLoading}
                className="w-full py-3 rounded-lg font-medium text-sm bg-accent-500 text-white hover:bg-accent-600 transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <><ArrowRight className="h-4 w-4" /> Record {transitionType.charAt(0).toUpperCase() + transitionType.slice(1)} Transition</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
