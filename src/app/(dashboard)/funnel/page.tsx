"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  Loader2,
  Info,
  Megaphone,
  UserPlus,
  MessageSquare,
  ShoppingCart,
  Repeat,
  FileText,
  RefreshCw,
  ArrowRight,
  Settings2,
  TrendingUp,
  Users,
  Save,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react"
import type {
  FunnelConfig,
  FunnelReport,
  LookalikeSyncEntry,
  PresetChangeEntry,
} from "@/types/funnel"
import { HELP_TEXTS } from "@/types/funnel"
import {
  INDUSTRY_PRESETS,
  CUSTOM_PRESET_PLACEHOLDER,
  applyPresetToConfig,
} from "@/lib/funnel/presets"
import { CustomIndustryWizard } from "@/components/funnel/custom-industry-wizard"
import type { CustomIndustryWizardAnswers } from "@/types/funnel"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type TabValue = "overview" | "configure" | "reports" | "lookalike" | "learning"

const STAGES = [
  {
    id: "attract",
    label: "Attract",
    icon: Megaphone,
    color: "text-blue-400",
    description: "Drive traffic via ads & content",
  },
  {
    id: "capture",
    label: "Capture",
    icon: UserPlus,
    color: "text-green-400",
    description: "Convert visitors to WhatsApp leads",
  },
  {
    id: "nurture",
    label: "Nurture",
    icon: MessageSquare,
    color: "text-yellow-400",
    description: "Automated follow-up sequences",
  },
  {
    id: "close",
    label: "Close",
    icon: ShoppingCart,
    color: "text-orange-400",
    description: "Convert leads to customers",
  },
  {
    id: "expand",
    label: "Expand",
    icon: Repeat,
    color: "text-purple-400",
    description: "Reviews, referrals & repeat sales",
  },
] as const

const CHANNEL_OPTIONS = [
  { value: "instagram_ads", label: "Instagram Ads" },
  { value: "facebook_ads", label: "Facebook Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "google_maps", label: "Google Maps" },
  { value: "tiktok_ads", label: "TikTok Ads" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "referrals", label: "Referrals" },
  { value: "walk_in", label: "Walk-in" },
  { value: "website", label: "Website" },
]

const REPORT_CHANNEL_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "dashboard", label: "Dashboard" },
]

/* ------------------------------------------------------------------ */
/*  Help Box Component                                                 */
/* ------------------------------------------------------------------ */

function HelpBox({
  fieldKey,
  expandedHelp,
  setExpandedHelp,
}: {
  fieldKey: string
  expandedHelp: string | null
  setExpandedHelp: (key: string | null) => void
}) {
  const help = HELP_TEXTS[fieldKey]
  if (!help) return null

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setExpandedHelp(expandedHelp === fieldKey ? null : fieldKey)
        }
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="h-4 w-4" />
      </button>
      {expandedHelp === fieldKey && (
        <div className="col-span-full rounded-lg border border-border bg-card p-3 text-sm space-y-2 animate-in fade-in slide-in-from-top-1">
          <p className="font-medium text-foreground">{help.title}</p>
          <p className="text-muted-foreground">{help.what}</p>
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-blue-400">
              {"\ud83d\udca1"} Example: {help.example}
            </span>
            <span className="text-green-400">
              {"\u2705"} Recommended: {help.recommended}
            </span>
            {help.mistake && (
              <span className="text-red-400">
                {"\u26a0\ufe0f"} Common mistake: {help.mistake}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function FunnelPage() {
  /* ---- state ---- */
  const [activeTab, setActiveTab] = useState<TabValue>("overview")
  const [config, setConfig] = useState<FunnelConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reports, setReports] = useState<FunnelReport[]>([])
  const [syncs, setSyncs] = useState<LookalikeSyncEntry[]>([])
  const [changes, setChanges] = useState<PresetChangeEntry[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null)
  const [formState, setFormState] = useState<Partial<FunnelConfig>>({})

  /* ---- data fetching ---- */
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/funnel/config")
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/funnel/reports")
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports ?? [])
      }
    } catch {
      /* silent */
    }
  }, [])

  const fetchSyncs = useCallback(async () => {
    try {
      const res = await fetch("/api/funnel/lookalike")
      if (res.ok) {
        const data = await res.json()
        setSyncs(data.syncs ?? [])
      }
    } catch {
      /* silent */
    }
  }, [])

  const fetchChanges = useCallback(async () => {
    try {
      const res = await fetch("/api/funnel/changes")
      if (res.ok) {
        const data = await res.json()
        setChanges(data.changes ?? [])
      }
    } catch {
      /* silent */
    }
  }, [])

  /* ---- initial load ---- */
  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  /* ---- lazy fetch on tab switch ---- */
  useEffect(() => {
    if (activeTab === "reports") fetchReports()
    if (activeTab === "lookalike") fetchSyncs()
    if (activeTab === "learning") fetchChanges()
  }, [activeTab, fetchReports, fetchSyncs, fetchChanges])

  /* ---- sync form state with config ---- */
  useEffect(() => {
    if (config) setFormState(config)
  }, [config])

  /* ---- save config ---- */
  async function saveConfig(
    updates: Partial<FunnelConfig>,
    reason?: string
  ) {
    setSaving(true)
    try {
      const method = config ? "PUT" : "POST"
      const body = config
        ? { ...updates, change_reason: reason }
        : { name: "Default Funnel", ...updates }
      const res = await fetch("/api/funnel/config", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setConfig(data.config)
        toast.success("Funnel settings saved")
      } else {
        toast.error("Failed to save settings")
      }
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  /* ---- preset selection ---- */
  function handlePresetSelect(presetId: string) {
    if (presetId === "custom") {
      setShowWizard(true)
      return
    }
    const preset = INDUSTRY_PRESETS.find((p) => p.id === presetId)
    if (preset) {
      const presetValues = applyPresetToConfig(preset)
      setFormState((prev) => ({ ...prev, ...presetValues }))
      toast.success(`Applied ${preset.name} preset settings`)
    }
  }

  /* ---- wizard completion ---- */
  async function handleWizardComplete(answers: CustomIndustryWizardAnswers) {
    try {
      const res = await fetch("/api/funnel/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      })
      if (res.ok) {
        const data = await res.json()
        setFormState((prev) => ({
          ...prev,
          ...data.config,
          industry_preset: "custom",
        }))
        toast.success(
          `Custom settings generated for ${answers.industry_name}`
        )
      }
    } catch {
      toast.error("Failed to generate custom settings")
    }
    setShowWizard(false)
  }

  /* ---- form helpers ---- */
  function updateField(field: string, value: unknown) {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  function toggleArrayItem(field: string, item: string) {
    setFormState((prev) => {
      const current = (prev[field as keyof FunnelConfig] as string[]) ?? []
      const next = current.includes(item)
        ? current.filter((v) => v !== item)
        : [...current, item]
      return { ...prev, [field]: next }
    })
  }

  /* ---- loading state ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Funnel Engine</h1>
        <p className="text-muted-foreground">
          Configure and monitor your marketing funnel from attract to expand.
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configure">Configure</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="lookalike">Lookalike</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ============================================================ */}
      {/*  TAB 1: OVERVIEW                                             */}
      {/* ============================================================ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Funnel Diagram */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3">
                {STAGES.map((stage, idx) => {
                  const Icon = stage.icon
                  // Progressively narrower widths for funnel shape
                  const widths = [
                    "w-full",
                    "w-[92%]",
                    "w-[84%]",
                    "w-[76%]",
                    "w-[68%]",
                  ]
                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40",
                        widths[idx]
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card",
                          stage.color
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {stage.label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {stage.description}
                        </p>
                      </div>
                      {!config && (
                        <span className="text-xs text-muted-foreground italic">
                          Not configured
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {config ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Industry Preset
                  </p>
                  <p className="text-lg font-semibold mt-1 capitalize">
                    {config.industry_preset.replace(/_/g, " ")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Nurture Length
                  </p>
                  <p className="text-lg font-semibold mt-1">
                    {config.nurture_length_days} days
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Close Mechanism
                  </p>
                  <p className="text-lg font-semibold mt-1 capitalize">
                    {config.close_mechanism.replace(/_/g, " ")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Report Frequency
                  </p>
                  <p className="text-lg font-semibold mt-1 capitalize">
                    {config.report_frequency}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Settings2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Set Up Your Funnel
                </h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Configure your marketing funnel to start tracking leads from
                  attract to expand. Choose an industry preset to get started
                  quickly.
                </p>
                <Button
                  onClick={() => setActiveTab("configure")}
                  className="gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Configure Funnel
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB 2: CONFIGURE                                            */}
      {/* ============================================================ */}
      {activeTab === "configure" && (
        <div className="space-y-8">
          {/* ---- Industry Preset Selector ---- */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Industry Preset</h2>
              <HelpBox
                fieldKey="industry_preset"
                expandedHelp={expandedHelp}
                setExpandedHelp={setExpandedHelp}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...INDUSTRY_PRESETS, CUSTOM_PRESET_PLACEHOLDER].map(
                (preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                      formState.industry_preset === preset.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{preset.icon}</span>
                      <span className="font-medium text-foreground">
                        {preset.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {preset.description}
                    </p>
                    {preset.id !== "custom" && (
                      <p className="text-xs text-muted-foreground">
                        Avg deal: {preset.avg_deal_value_range}
                      </p>
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          <Separator />

          {/* ---- Section: Attract ---- */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-400" />
              Attract
            </h2>

            {/* Ad Budget */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Daily Ad Budget</Label>
                <HelpBox
                  fieldKey="ad_budget_daily_ngn"
                  expandedHelp={expandedHelp}
                  setExpandedHelp={setExpandedHelp}
                />
              </div>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {"\u20a6"}
                </span>
                <Input
                  type="number"
                  min={0}
                  className="pl-7"
                  value={formState.ad_budget_daily_ngn ?? ""}
                  onChange={(e) =>
                    updateField(
                      "ad_budget_daily_ngn",
                      Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>

            {/* Channels */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Marketing Channels</Label>
                <HelpBox
                  fieldKey="channels"
                  expandedHelp={expandedHelp}
                  setExpandedHelp={setExpandedHelp}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((ch) => {
                  const selected =
                    (formState.channels ?? []).includes(ch.value)
                  return (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => toggleArrayItem("channels", ch.value)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {ch.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <Separator />

          {/* ---- Section: Nurture ---- */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-yellow-400" />
              Nurture
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Nurture Length */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Nurture Length (days)</Label>
                  <HelpBox
                    fieldKey="nurture_length_days"
                    expandedHelp={expandedHelp}
                    setExpandedHelp={setExpandedHelp}
                  />
                </div>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={formState.nurture_length_days ?? ""}
                  onChange={(e) =>
                    updateField(
                      "nurture_length_days",
                      Number(e.target.value)
                    )
                  }
                />
              </div>

              {/* Max Touchpoints */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Max Touchpoints</Label>
                  <HelpBox
                    fieldKey="nurture_max_touchpoints"
                    expandedHelp={expandedHelp}
                    setExpandedHelp={setExpandedHelp}
                  />
                </div>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={formState.nurture_max_touchpoints ?? ""}
                  onChange={(e) =>
                    updateField(
                      "nurture_max_touchpoints",
                      Number(e.target.value)
                    )
                  }
                />
              </div>

              {/* Escalate After */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Escalate After Unanswered</Label>
                  <HelpBox
                    fieldKey="escalate_after_unanswered"
                    expandedHelp={expandedHelp}
                    setExpandedHelp={setExpandedHelp}
                  />
                </div>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formState.escalate_after_unanswered ?? ""}
                  onChange={(e) =>
                    updateField(
                      "escalate_after_unanswered",
                      Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ---- Section: Close ---- */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-400" />
              Close
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Close Mechanism */}
              <div className="space-y-2">
                <Label>Close Mechanism</Label>
                <Select
                  value={formState.close_mechanism ?? ""}
                  onValueChange={(v) => updateField("close_mechanism", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mechanism" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online_payment">
                      Online Payment
                    </SelectItem>
                    <SelectItem value="cod">Cash on Delivery</SelectItem>
                    <SelectItem value="bank_transfer">
                      Bank Transfer
                    </SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cart Recovery Delay */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Cart Recovery Delay (min)</Label>
                  <HelpBox
                    fieldKey="cart_recovery_delay_minutes"
                    expandedHelp={expandedHelp}
                    setExpandedHelp={setExpandedHelp}
                  />
                </div>
                <Input
                  type="number"
                  min={15}
                  max={1440}
                  value={formState.cart_recovery_delay_minutes ?? ""}
                  onChange={(e) =>
                    updateField(
                      "cart_recovery_delay_minutes",
                      Number(e.target.value)
                    )
                  }
                />
              </div>

              {/* Max Discount */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Max Auto-Discount (%)</Label>
                  <HelpBox
                    fieldKey="max_discount_percent"
                    expandedHelp={expandedHelp}
                    setExpandedHelp={setExpandedHelp}
                  />
                </div>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={formState.max_discount_percent ?? ""}
                  onChange={(e) =>
                    updateField(
                      "max_discount_percent",
                      Number(e.target.value)
                    )
                  }
                />
              </div>

              {/* COD Confirmation */}
              <div className="space-y-2">
                <Label>COD Confirmation</Label>
                <div className="flex items-center gap-3 pt-1">
                  <Switch
                    checked={formState.cod_confirmation_enabled ?? false}
                    onCheckedChange={(v) =>
                      updateField("cod_confirmation_enabled", v)
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {formState.cod_confirmation_enabled
                      ? "Enabled"
                      : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ---- Section: Expand ---- */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Repeat className="h-5 w-5 text-purple-400" />
              Expand
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Review Request Delay */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Review Request Delay (days)</Label>
                  <HelpBox
                    fieldKey="review_request_delay_days"
                    expandedHelp={expandedHelp}
                    setExpandedHelp={setExpandedHelp}
                  />
                </div>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={formState.review_request_delay_days ?? ""}
                  onChange={(e) =>
                    updateField(
                      "review_request_delay_days",
                      Number(e.target.value)
                    )
                  }
                />
              </div>

              {/* Dormancy Threshold */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Dormancy Threshold (days)</Label>
                  <HelpBox
                    fieldKey="dormancy_threshold_days"
                    expandedHelp={expandedHelp}
                    setExpandedHelp={setExpandedHelp}
                  />
                </div>
                <Input
                  type="number"
                  min={7}
                  max={365}
                  value={formState.dormancy_threshold_days ?? ""}
                  onChange={(e) =>
                    updateField(
                      "dormancy_threshold_days",
                      Number(e.target.value)
                    )
                  }
                />
              </div>

              {/* Referral Enabled */}
              <div className="space-y-2">
                <Label>Referral Program</Label>
                <div className="flex items-center gap-3 pt-1">
                  <Switch
                    checked={formState.referral_enabled ?? false}
                    onCheckedChange={(v) =>
                      updateField("referral_enabled", v)
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {formState.referral_enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ---- Section: Lookalike Audiences ---- */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lookalike Audiences
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Auto Sync */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Auto-Sync</Label>
                  <HelpBox
                    fieldKey="lookalike_auto_sync"
                    expandedHelp={expandedHelp}
                    setExpandedHelp={setExpandedHelp}
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Switch
                    checked={formState.lookalike_auto_sync ?? false}
                    onCheckedChange={(v) =>
                      updateField("lookalike_auto_sync", v)
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {formState.lookalike_auto_sync
                      ? "Enabled"
                      : "Disabled"}
                  </span>
                </div>
              </div>

              {/* Seed Minimum */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Seed Minimum</Label>
                  <HelpBox
                    fieldKey="lookalike_seed_minimum"
                    expandedHelp={expandedHelp}
                    setExpandedHelp={setExpandedHelp}
                  />
                </div>
                <Input
                  type="number"
                  min={50}
                  max={1000}
                  value={formState.lookalike_seed_minimum ?? ""}
                  onChange={(e) =>
                    updateField(
                      "lookalike_seed_minimum",
                      Number(e.target.value)
                    )
                  }
                />
              </div>

              {/* Sync Frequency */}
              <div className="space-y-2">
                <Label>Sync Frequency</Label>
                <Select
                  value={formState.lookalike_sync_frequency ?? ""}
                  onValueChange={(v) =>
                    updateField("lookalike_sync_frequency", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* ---- Section: Reporting ---- */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reporting
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Report Frequency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Report Frequency</Label>
                  <HelpBox
                    fieldKey="report_frequency"
                    expandedHelp={expandedHelp}
                    setExpandedHelp={setExpandedHelp}
                  />
                </div>
                <Select
                  value={formState.report_frequency ?? ""}
                  onValueChange={(v) =>
                    updateField("report_frequency", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Report Delivery Channels */}
              <div className="space-y-2">
                <Label>Delivery Channels</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {REPORT_CHANNEL_OPTIONS.map((ch) => {
                    const selected = (
                      formState.report_delivery_channels ?? []
                    ).includes(ch.value)
                    return (
                      <button
                        key={ch.value}
                        type="button"
                        onClick={() =>
                          toggleArrayItem(
                            "report_delivery_channels",
                            ch.value
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {ch.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ---- Sticky Save Bar ---- */}
          <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border p-4 flex justify-end gap-3 -mx-1">
            <Button
              variant="outline"
              onClick={() => setFormState(config ?? {})}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={() => saveConfig(formState)}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB 3: REPORTS                                              */}
      {/* ============================================================ */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Funnel Reports</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReports}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No reports yet</p>
              <p className="text-sm">
                Reports will appear here once your funnel is active and
                generating data.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {report.report_type} Report
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {report.period_start} {"\u2014"} {report.period_end}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.delivered_at ? (
                        <Badge
                          variant="outline"
                          className="text-green-400 border-green-400/30"
                        >
                          Delivered
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-yellow-400 border-yellow-400/30"
                        >
                          Pending
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB 4: LOOKALIKE AUDIENCES                                  */}
      {/* ============================================================ */}
      {activeTab === "lookalike" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lookalike Audiences</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSyncs}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Explainer Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Upload className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">
                  What are Lookalike Audiences?
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your best customer segments are automatically synced to Meta
                  Ads, which finds similar people to target. This helps you
                  reach new customers who look like your existing best buyers.
                </p>
              </div>
            </CardContent>
          </Card>

          {syncs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No syncs yet</p>
              <p className="text-sm">
                Lookalike audience syncs will appear here once you have enough
                contacts and auto-sync is enabled.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {syncs.map((sync) => (
                <Card key={sync.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{sync.segment_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {sync.contact_count} contacts
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        sync.sync_status === "ready" &&
                          "text-green-400 border-green-400/30",
                        sync.sync_status === "error" &&
                          "text-red-400 border-red-400/30",
                        sync.sync_status === "pending" &&
                          "text-yellow-400 border-yellow-400/30",
                        (sync.sync_status === "uploading" ||
                          sync.sync_status === "processing") &&
                          "text-blue-400 border-blue-400/30"
                      )}
                    >
                      {sync.sync_status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB 5: LEARNING                                             */}
      {/* ============================================================ */}
      {activeTab === "learning" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Adaptive Learning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Every time you change a funnel setting, the system tracks the
                change and measures its impact. Over time, this builds
                intelligence about what works best for your industry.
              </p>
              {changes.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No changes recorded yet. Adjust your funnel settings to
                  start learning.
                </p>
              ) : (
                <div className="space-y-2">
                  {changes.map((change) => (
                    <div
                      key={change.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {change.parameter_name.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {change.old_value ?? "(none)"} {"\u2192"}{" "}
                          {change.new_value}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {change.outcome_classification && (
                          <Badge
                            variant="outline"
                            className={cn(
                              change.outcome_classification ===
                                "positive" &&
                                "text-green-400 border-green-400/30",
                              change.outcome_classification ===
                                "negative" &&
                                "text-red-400 border-red-400/30",
                              change.outcome_classification === "mixed" &&
                                "text-yellow-400 border-yellow-400/30",
                              change.outcome_classification ===
                                "inconclusive" &&
                                "text-muted-foreground border-border"
                            )}
                          >
                            {change.outcome_classification}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(
                            change.created_at
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/*  WIZARD MODAL                                                */}
      {/* ============================================================ */}
      <CustomIndustryWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onComplete={handleWizardComplete}
      />
    </div>
  )
}
