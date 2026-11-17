"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import type {
  PackageConfig,
  PackageKey,
  RetainerOption,
  MilestoneTemplate,
  TransitionRules,
  TransitionCriterion,
  QualitativeCriterion,
  ReportFrequency,
} from "@/types/packages"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PackageConfigEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  packageConfig: PackageConfig | null // null = create new
  onSaved: () => void
}

type EditablePackage = Omit<PackageConfig, "id" | "created_at" | "updated_at">

const PACKAGE_KEYS: PackageKey[] = [
  "pkg1_reactivation",
  "pkg2_online_presence",
  "pkg3_growth_engine",
  "complete",
  "unicorn",
]

const REPORT_FREQUENCIES: ReportFrequency[] = ["weekly", "monthly"]

const AUTOMATION_OPTIONS = [
  "reactivation",
  "cart_recovery",
  "post_purchase",
  "lifecycle",
  "engagement",
  "feedback",
  "revenue",
]

const FLOW_OPTIONS = [
  "welcome",
  "reactivation",
  "feedback",
  "appointment",
  "support",
  "order_status",
  "lead_qualification",
]

const EMPTY_RETAINER: RetainerOption = {
  name: "",
  price: 0,
  monitoring_level: "",
  intervention_frequency: "",
}

const EMPTY_MILESTONE: MilestoneTemplate = {
  week: 1,
  name: "",
  description: "",
  deliverables: [],
  criteria: [],
}

const EMPTY_QUANT_CRITERION: TransitionCriterion = {
  metric: "",
  threshold: 0,
  operator: ">=",
}

const EMPTY_QUAL_CRITERION: QualitativeCriterion = {
  key: "",
  description: "",
}

const DEFAULT_PACKAGE: EditablePackage = {
  package_key: "pkg1_reactivation",
  name: "",
  description: "",
  price_naira: 0,
  duration_weeks: 8,
  tier: 1,
  campaign_slugs: [],
  automation_types: [],
  flow_types: [],
  report_frequency: "weekly",
  retainer_options: [],
  milestone_template: [],
  transition_rules: {},
  is_active: true,
}

// ---------------------------------------------------------------------------
// Collapsible Section
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t border-border p-4 space-y-4">{children}</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {hint && (
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{hint}</p>
      )}
    </div>
  )
}

function TagInput({
  values,
  onChange,
  placeholder,
  options,
}: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  options?: string[]
}) {
  const [input, setInput] = useState("")

  const addTag = (tag: string) => {
    const t = tag.trim()
    if (t && !values.includes(t)) {
      onChange([...values, t])
    }
    setInput("")
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-500"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addTag(input)
            }
          }}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        {options && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addTag(e.target.value)
            }}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
          >
            <option value="">Quick add…</option>
            {options
              .filter((o) => !values.includes(o))
              .map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
          </select>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PackageConfigEditor({
  open,
  onOpenChange,
  packageConfig,
  onSaved,
}: PackageConfigEditorProps) {
  const isNew = !packageConfig
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [form, setForm] = useState<EditablePackage>(DEFAULT_PACKAGE)
  const [availableTemplates, setAvailableTemplates] = useState<
    { slug: string; name: string }[]
  >([])

  // Load available campaign templates
  useEffect(() => {
    if (!open) return
    fetch("/api/campaigns/templates")
      .then((r) => r.json())
      .then((d) => {
        const templates = (d.templates ?? []) as Array<{
          slug: string
          name: string
        }>
        setAvailableTemplates(templates)
      })
      .catch(() => {})
  }, [open])

  // Initialize form
  useEffect(() => {
    if (!open) return
    if (packageConfig) {
      const { id, created_at, updated_at, ...rest } = packageConfig
      setForm(rest)
    } else {
      setForm({ ...DEFAULT_PACKAGE })
    }
    setDirty(false)
  }, [open, packageConfig])

  const update = <K extends keyof EditablePackage>(
    key: K,
    value: EditablePackage[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  // ---- Retainer helpers ----
  const addRetainer = () => {
    update("retainer_options", [
      ...form.retainer_options,
      { ...EMPTY_RETAINER },
    ])
  }
  const updateRetainer = (
    idx: number,
    field: keyof RetainerOption,
    value: string | number
  ) => {
    const updated = [...form.retainer_options]
    updated[idx] = { ...updated[idx], [field]: value }
    update("retainer_options", updated)
  }
  const removeRetainer = (idx: number) => {
    update(
      "retainer_options",
      form.retainer_options.filter((_, i) => i !== idx)
    )
  }

  // ---- Milestone helpers ----
  const addMilestone = () => {
    const nextWeek =
      form.milestone_template.length > 0
        ? Math.max(...form.milestone_template.map((m) => m.week)) + 1
        : 1
    update("milestone_template", [
      ...form.milestone_template,
      { ...EMPTY_MILESTONE, week: nextWeek },
    ])
  }
  const updateMilestone = (
    idx: number,
    field: keyof MilestoneTemplate,
    value: unknown
  ) => {
    const updated = [...form.milestone_template]
    updated[idx] = { ...updated[idx], [field]: value }
    update("milestone_template", updated)
  }
  const removeMilestone = (idx: number) => {
    update(
      "milestone_template",
      form.milestone_template.filter((_, i) => i !== idx)
    )
  }
  const moveMilestone = (idx: number, direction: "up" | "down") => {
    const arr = [...form.milestone_template]
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= arr.length) return
    ;[arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]]
    update("milestone_template", arr)
  }

  // ---- Transition rule helpers ----
  const rules = form.transition_rules ?? {}
  const updateRules = (patch: Partial<TransitionRules>) => {
    update("transition_rules", { ...rules, ...patch })
  }
  const addQuantCriterion = () => {
    updateRules({
      quantitative_criteria: [
        ...(rules.quantitative_criteria ?? []),
        { ...EMPTY_QUANT_CRITERION },
      ],
    })
  }
  const updateQuantCriterion = (
    idx: number,
    field: keyof TransitionCriterion,
    value: string | number
  ) => {
    const arr = [...(rules.quantitative_criteria ?? [])]
    arr[idx] = { ...arr[idx], [field]: value }
    updateRules({ quantitative_criteria: arr })
  }
  const removeQuantCriterion = (idx: number) => {
    updateRules({
      quantitative_criteria: (rules.quantitative_criteria ?? []).filter(
        (_, i) => i !== idx
      ),
    })
  }
  const addQualCriterion = () => {
    updateRules({
      qualitative_criteria: [
        ...(rules.qualitative_criteria ?? []),
        { ...EMPTY_QUAL_CRITERION },
      ],
    })
  }
  const updateQualCriterion = (
    idx: number,
    field: keyof QualitativeCriterion,
    value: string
  ) => {
    const arr = [...(rules.qualitative_criteria ?? [])]
    arr[idx] = { ...arr[idx], [field]: value }
    updateRules({ qualitative_criteria: arr })
  }
  const removeQualCriterion = (idx: number) => {
    updateRules({
      qualitative_criteria: (rules.qualitative_criteria ?? []).filter(
        (_, i) => i !== idx
      ),
    })
  }

  // ---- Save ----
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Package name is required")
      return
    }
    if (form.price_naira <= 0) {
      toast.error("Price must be greater than zero")
      return
    }

    setSaving(true)
    try {
      const url = isNew
        ? "/api/admin/packages"
        : `/api/admin/packages/${packageConfig!.id}`
      const method = isNew ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed (${res.status})`)
      }

      toast.success(isNew ? "Package created" : "Package updated")
      setDirty(false)
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save package"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg">
            {isNew ? "Create Package" : `Edit: ${packageConfig?.name}`}
          </SheetTitle>
          <SheetDescription>
            {isNew
              ? "Configure a new service package"
              : "Modify package configuration. Changes apply to new assignments."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pb-24">
          {/* ============ BASIC INFO ============ */}
          <Section title="Basic Information" defaultOpen={true}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel label="Package Name" />
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Customer Reactivation"
                  className="h-9"
                />
              </div>
              <div>
                <FieldLabel label="Package Key" />
                <select
                  value={form.package_key}
                  onChange={(e) =>
                    update("package_key", e.target.value as PackageKey)
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {PACKAGE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <FieldLabel label="Description" />
              <textarea
                value={form.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                placeholder="What this package delivers…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel label="Price (₦)" />
                <Input
                  type="number"
                  value={form.price_naira}
                  onChange={(e) =>
                    update("price_naira", parseInt(e.target.value) || 0)
                  }
                  className="h-9"
                />
              </div>
              <div>
                <FieldLabel label="Duration (weeks)" />
                <Input
                  type="number"
                  value={form.duration_weeks}
                  onChange={(e) =>
                    update("duration_weeks", parseInt(e.target.value) || 1)
                  }
                  min={1}
                  className="h-9"
                />
              </div>
              <div>
                <FieldLabel label="Tier" />
                <select
                  value={form.tier}
                  onChange={(e) =>
                    update("tier", parseInt(e.target.value) as 1 | 2 | 3)
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value={1}>Tier 1 – Basic</option>
                  <option value={2}>Tier 2 – Pro</option>
                  <option value={3}>Tier 3 – Enterprise</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel label="Report Frequency" />
                <select
                  value={form.report_frequency}
                  onChange={(e) =>
                    update(
                      "report_frequency",
                      e.target.value as ReportFrequency
                    )
                  }
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {REPORT_FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => update("is_active", e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-amber-500"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
          </Section>

          {/* ============ CAMPAIGNS & AUTOMATIONS ============ */}
          <Section
            title="Campaigns & Automations"
            badge={`${form.campaign_slugs.length} campaigns`}
          >
            <div>
              <FieldLabel
                label="Campaign Slugs"
                hint="Which campaign templates are included in this package"
              />
              <TagInput
                values={form.campaign_slugs}
                onChange={(v) => update("campaign_slugs", v)}
                placeholder="Type slug or select…"
                options={availableTemplates.map((t) => t.slug)}
              />
            </div>
            <div>
              <FieldLabel label="Automation Types" />
              <TagInput
                values={form.automation_types}
                onChange={(v) => update("automation_types", v)}
                placeholder="Type or select…"
                options={AUTOMATION_OPTIONS}
              />
            </div>
            <div>
              <FieldLabel label="Flow Types" />
              <TagInput
                values={form.flow_types}
                onChange={(v) => update("flow_types", v)}
                placeholder="Type or select…"
                options={FLOW_OPTIONS}
              />
            </div>
          </Section>

          {/* ============ MILESTONES ============ */}
          <Section
            title="Milestone Template"
            badge={`${form.milestone_template.length} milestones`}
          >
            <div className="space-y-3">
              {form.milestone_template.map((ms, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-amber-500">
                        Week {ms.week}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveMilestone(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMilestone(idx, "down")}
                        disabled={idx === form.milestone_template.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMilestone(idx)}
                        className="p-1 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel label="Week" />
                      <Input
                        type="number"
                        value={ms.week}
                        onChange={(e) =>
                          updateMilestone(
                            idx,
                            "week",
                            parseInt(e.target.value) || 1
                          )
                        }
                        min={1}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <FieldLabel label="Name" />
                      <Input
                        value={ms.name}
                        onChange={(e) =>
                          updateMilestone(idx, "name", e.target.value)
                        }
                        className="h-8 text-xs"
                        placeholder="Milestone name"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="Description" />
                    <textarea
                      value={ms.description}
                      onChange={(e) =>
                        updateMilestone(idx, "description", e.target.value)
                      }
                      rows={2}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs resize-none"
                    />
                  </div>

                  <div>
                    <FieldLabel
                      label="Deliverables"
                      hint="One per line"
                    />
                    <textarea
                      value={ms.deliverables.join("\n")}
                      onChange={(e) =>
                        updateMilestone(
                          idx,
                          "deliverables",
                          e.target.value
                            .split("\n")
                            .filter((s) => s.trim())
                        )
                      }
                      rows={2}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs resize-none font-mono"
                      placeholder="Campaign setup complete\nFirst broadcast sent"
                    />
                  </div>

                  <div>
                    <FieldLabel
                      label="Success Criteria"
                      hint="One per line"
                    />
                    <textarea
                      value={ms.criteria.join("\n")}
                      onChange={(e) =>
                        updateMilestone(
                          idx,
                          "criteria",
                          e.target.value
                            .split("\n")
                            .filter((s) => s.trim())
                        )
                      }
                      rows={2}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs resize-none font-mono"
                      placeholder="Open rate > 40%\nAt least 10 replies"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMilestone}
              className="w-full"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Milestone
            </Button>
          </Section>

          {/* ============ RETAINER OPTIONS ============ */}
          <Section
            title="Retainer Options"
            badge={`${form.retainer_options.length} options`}
          >
            <div className="space-y-3">
              {form.retainer_options.map((ret, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Option {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRetainer(idx)}
                      className="p-1 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel label="Name" />
                      <Input
                        value={ret.name}
                        onChange={(e) =>
                          updateRetainer(idx, "name", e.target.value)
                        }
                        className="h-8 text-xs"
                        placeholder="e.g. Basic Monitoring"
                      />
                    </div>
                    <div>
                      <FieldLabel label="Price (₦)" />
                      <Input
                        type="number"
                        value={ret.price}
                        onChange={(e) =>
                          updateRetainer(
                            idx,
                            "price",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <FieldLabel label="Monitoring Level" />
                      <Input
                        value={ret.monitoring_level}
                        onChange={(e) =>
                          updateRetainer(
                            idx,
                            "monitoring_level",
                            e.target.value
                          )
                        }
                        className="h-8 text-xs"
                        placeholder="e.g. Weekly check-ins"
                      />
                    </div>
                    <div>
                      <FieldLabel label="Intervention Frequency" />
                      <Input
                        value={ret.intervention_frequency}
                        onChange={(e) =>
                          updateRetainer(
                            idx,
                            "intervention_frequency",
                            e.target.value
                          )
                        }
                        className="h-8 text-xs"
                        placeholder="e.g. Monthly"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRetainer}
              className="w-full"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Retainer Option
            </Button>
          </Section>

          {/* ============ TRANSITION RULES ============ */}
          <Section title="Transition Rules">
            <div>
              <FieldLabel
                label="Next Packages"
                hint="Package keys clients can transition to"
              />
              <TagInput
                values={rules.next_packages ?? []}
                onChange={(v) => updateRules({ next_packages: v })}
                placeholder="e.g. pkg2_online_presence"
                options={PACKAGE_KEYS}
              />
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <FieldLabel label="Quantitative Criteria" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addQuantCriterion}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {(rules.quantitative_criteria ?? []).map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={c.metric}
                      onChange={(e) =>
                        updateQuantCriterion(idx, "metric", e.target.value)
                      }
                      placeholder="Metric name"
                      className="h-8 text-xs flex-1"
                    />
                    <select
                      value={c.operator}
                      onChange={(e) =>
                        updateQuantCriterion(
                          idx,
                          "operator",
                          e.target.value as TransitionCriterion["operator"]
                        )
                      }
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs w-16"
                    >
                      <option value=">=">≥</option>
                      <option value=">">{'>'}</option>
                      <option value="<=">≤</option>
                      <option value="=">=</option>
                    </select>
                    <Input
                      type="number"
                      value={c.threshold}
                      onChange={(e) =>
                        updateQuantCriterion(
                          idx,
                          "threshold",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-8 text-xs w-24"
                    />
                    <button
                      type="button"
                      onClick={() => removeQuantCriterion(idx)}
                      className="p-1 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <FieldLabel label="Qualitative Criteria" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addQualCriterion}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {(rules.qualitative_criteria ?? []).map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={c.key}
                      onChange={(e) =>
                        updateQualCriterion(idx, "key", e.target.value)
                      }
                      placeholder="Key"
                      className="h-8 text-xs w-32"
                    />
                    <Input
                      value={c.description}
                      onChange={(e) =>
                        updateQualCriterion(
                          idx,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Description"
                      className="h-8 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeQualCriterion(idx)}
                      className="p-1 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel
                label="Qualitative Minimum"
                hint="Minimum number of qualitative criteria that must be met"
              />
              <Input
                type="number"
                value={rules.qualitative_minimum ?? 0}
                onChange={(e) =>
                  updateRules({
                    qualitative_minimum: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
                className="h-8 text-xs w-24"
              />
            </div>
          </Section>
        </div>

        {/* ============ STICKY FOOTER ============ */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <AlertTriangle className="h-3 w-3" /> Unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {isNew ? "Create" : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
