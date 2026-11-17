"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  MessageSquare,
  ListOrdered,
  Filter,
  BarChart3,
  FileText,
} from "lucide-react"
import type {
  CampaignTemplate,
  CampaignCategory,
  CampaignMessageTemplate,
  CampaignSequenceStep,
  CampaignAudienceFilter,
} from "@/types/campaigns"

interface CampaignTemplateEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: CampaignTemplate | null // null = create mode
  onSaved: () => void
}

const CATEGORIES: { value: CampaignCategory; label: string }[] = [
  { value: "reactivation", label: "Reactivation" },
  { value: "cart_recovery", label: "Cart Recovery" },
  { value: "post_purchase", label: "Post Purchase" },
  { value: "lifecycle", label: "Lifecycle" },
  { value: "engagement", label: "Engagement" },
  { value: "revenue", label: "Revenue" },
  { value: "feedback", label: "Feedback" },
]

const CHANNELS: { value: string; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "auto", label: "Auto (Best Channel)" },
]

const ICONS = [
  "RotateCcw", "ShoppingCart", "Package", "Heart", "Zap", "DollarSign",
  "MessageSquare", "Star", "Gift", "Bell", "TrendingUp", "Users",
  "Calendar", "Award", "Target", "Sparkles",
]

const emptyMessage: CampaignMessageTemplate = { key: "", name: "", body: "", has_discount: false }
const emptyStep: CampaignSequenceStep = { step: 1, delay_minutes: 0, message_key: "" }
const emptyFilter: CampaignAudienceFilter = {}

function makeDefault(): Omit<CampaignTemplate, "id" | "created_at"> {
  return {
    slug: "",
    name: "",
    description: "",
    category: "reactivation",
    icon: "RotateCcw",
    default_channel: "whatsapp",
    message_templates: [{ ...emptyMessage }],
    sequence_steps: [{ ...emptyStep }],
    audience_filter: { ...emptyFilter },
    expected_open_rate: null,
    expected_reply_rate: null,
    expected_conversion_rate: null,
    tier: 1,
    is_active: true,
    sort_order: 0,
    what_it_does: null,
    why_you_need_it: null,
    how_it_works: null,
    best_for: null,
    example_result: null,
  }
}

/* ------------------------------------------------------------------ */
/*  Collapsible Section                                                */
/* ------------------------------------------------------------------ */
function Section({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: typeof MessageSquare
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <Icon className="h-4 w-4 text-amber-500" />
        <span className="flex-1 text-sm font-medium">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <>
          <Separator />
          <div className="p-4 space-y-4">{children}</div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Field helpers                                                      */
/* ------------------------------------------------------------------ */
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
const textareaCls = cn(inputCls, "min-h-[80px] resize-y")
const selectCls = inputCls

/* ------------------------------------------------------------------ */
/*  Main Editor                                                        */
/* ------------------------------------------------------------------ */
export function CampaignTemplateEditor({ open, onOpenChange, template, onSaved }: CampaignTemplateEditorProps) {
  const isEdit = !!template?.id
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, unknown>>({})

  // Initialize form when template changes
  useEffect(() => {
    if (open) {
      if (template) {
        setForm({ ...template })
      } else {
        setForm(makeDefault() as unknown as Record<string, unknown>)
      }
    }
  }, [open, template])

  const update = useCallback((key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Message templates
  const messages = (form.message_templates ?? []) as CampaignMessageTemplate[]
  const setMessages = (msgs: CampaignMessageTemplate[]) => update("message_templates", msgs)

  const addMessage = () => setMessages([...messages, { ...emptyMessage, key: `msg_${messages.length + 1}` }])
  const removeMessage = (idx: number) => setMessages(messages.filter((_, i) => i !== idx))
  const updateMessage = (idx: number, field: keyof CampaignMessageTemplate, value: unknown) => {
    const updated = [...messages]
    updated[idx] = { ...updated[idx], [field]: value }
    setMessages(updated)
  }

  // Sequence steps
  const steps = (form.sequence_steps ?? []) as CampaignSequenceStep[]
  const setSteps = (s: CampaignSequenceStep[]) => update("sequence_steps", s)

  const addStep = () => setSteps([...steps, { ...emptyStep, step: steps.length + 1 }])
  const removeStep = (idx: number) => {
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }))
    setSteps(updated)
  }
  const updateStep = (idx: number, field: keyof CampaignSequenceStep, value: unknown) => {
    const updated = [...steps]
    updated[idx] = { ...updated[idx], [field]: value }
    setSteps(updated)
  }

  // Audience filter
  const filter = (form.audience_filter ?? {}) as CampaignAudienceFilter
  const updateFilter = (field: keyof CampaignAudienceFilter, value: unknown) => {
    update("audience_filter", { ...filter, [field]: value === "" ? undefined : value })
  }

  // Auto-generate slug from name
  const autoSlug = () => {
    const name = (form.name as string) || ""
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
    update("slug", slug)
  }

  // Save
  const handleSave = async () => {
    const name = (form.name as string || "").trim()
    const slug = (form.slug as string || "").trim()
    if (!name) { toast.error("Name is required"); return }
    if (!slug) { toast.error("Slug is required"); return }

    setSaving(true)
    try {
      const payload = { ...form }
      // Remove read-only fields for create
      if (!isEdit) {
        delete payload.id
        delete payload.created_at
      }

      const url = isEdit ? `/api/admin/campaign-templates/${template!.id}` : "/api/admin/campaign-templates"
      const method = isEdit ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to save")
      }

      toast.success(isEdit ? "Template updated" : "Template created")
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Campaign Template" : "Create Campaign Template"}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Editing "${template?.name}"` : "Define a new campaign template for client use."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 pb-24">
          {/* ---- Basic Info ---- */}
          <Section title="Basic Information" icon={FileText} defaultOpen>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input className={inputCls} value={(form.name as string) ?? ""} onChange={(e) => update("name", e.target.value)} onBlur={() => { if (!form.slug) autoSlug() }} placeholder="e.g. Win-Back Campaign" />
              </Field>
              <Field label="Slug" hint="Auto-generated from name. Used as unique identifier.">
                <div className="flex gap-2">
                  <input className={cn(inputCls, "flex-1 font-mono text-xs")} value={(form.slug as string) ?? ""} onChange={(e) => update("slug", e.target.value)} placeholder="win_back_campaign" />
                  <button type="button" onClick={autoSlug} className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Auto</button>
                </div>
              </Field>
            </div>
            <Field label="Description">
              <textarea className={textareaCls} value={(form.description as string) ?? ""} onChange={(e) => update("description", e.target.value)} placeholder="Brief description of what this campaign does..." rows={2} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Category">
                <select className={selectCls} value={(form.category as string) ?? "reactivation"} onChange={(e) => update("category", e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Channel">
                <select className={selectCls} value={(form.default_channel as string) ?? "whatsapp"} onChange={(e) => update("default_channel", e.target.value)}>
                  {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Tier">
                <select className={selectCls} value={String(form.tier ?? 1)} onChange={(e) => update("tier", Number(e.target.value))}>
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                  <option value="3">Tier 3</option>
                </select>
              </Field>
              <Field label="Sort Order">
                <input type="number" className={inputCls} value={String(form.sort_order ?? 0)} onChange={(e) => update("sort_order", Number(e.target.value))} min={0} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Icon">
                <select className={selectCls} value={(form.icon as string) ?? "RotateCcw"} onChange={(e) => update("icon", e.target.value)}>
                  {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" checked={!!form.is_active} onChange={(e) => update("is_active", e.target.checked)} className="h-4 w-4 rounded border-border accent-amber-500" />
                  <span className="text-sm">{form.is_active ? "Active" : "Inactive"}</span>
                </label>
              </Field>
            </div>
          </Section>

          {/* ---- Message Templates ---- */}
          <Section title={`Message Templates (${messages.length})`} icon={MessageSquare}>
            {messages.map((msg, idx) => (
              <div key={idx} className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                    <span className="text-xs font-medium text-muted-foreground">Message {idx + 1}</span>
                  </div>
                  <button type="button" onClick={() => removeMessage(idx)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Key">
                    <input className={cn(inputCls, "font-mono text-xs")} value={msg.key} onChange={(e) => updateMessage(idx, "key", e.target.value)} placeholder="welcome_msg" />
                  </Field>
                  <Field label="Name">
                    <input className={inputCls} value={msg.name} onChange={(e) => updateMessage(idx, "name", e.target.value)} placeholder="Welcome Message" />
                  </Field>
                </div>
                <Field label="Body">
                  <textarea className={textareaCls} value={msg.body} onChange={(e) => updateMessage(idx, "body", e.target.value)} placeholder="Hi {{name}}, we miss you at {{business}}..." rows={3} />
                </Field>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={msg.has_discount} onChange={(e) => updateMessage(idx, "has_discount", e.target.checked)} className="h-4 w-4 rounded border-border accent-amber-500" />
                  <span className="text-xs text-muted-foreground">Includes discount/offer</span>
                </label>
              </div>
            ))}
            <button type="button" onClick={addMessage} className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-amber-500/50 transition-colors w-full justify-center">
              <Plus className="h-3.5 w-3.5" /> Add Message
            </button>
          </Section>

          {/* ---- Sequence Steps ---- */}
          <Section title={`Sequence Steps (${steps.length})`} icon={ListOrdered}>
            {steps.map((step, idx) => (
              <div key={idx} className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Step {step.step}</span>
                  <button type="button" onClick={() => removeStep(idx)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Message Key">
                    <select className={selectCls} value={step.message_key} onChange={(e) => updateStep(idx, "message_key", e.target.value)}>
                      <option value="">Select message...</option>
                      {messages.map((m) => <option key={m.key} value={m.key}>{m.name || m.key}</option>)}
                    </select>
                  </Field>
                  <Field label="Delay (minutes)">
                    <input type="number" className={inputCls} value={step.delay_minutes} onChange={(e) => updateStep(idx, "delay_minutes", Number(e.target.value))} min={0} />
                  </Field>
                  <Field label="Condition (optional)">
                    <input className={inputCls} value={step.condition ?? ""} onChange={(e) => updateStep(idx, "condition", e.target.value || undefined)} placeholder="e.g. no_reply" />
                  </Field>
                </div>
                <Field label="Trigger (optional)">
                  <input className={inputCls} value={step.trigger ?? ""} onChange={(e) => updateStep(idx, "trigger", e.target.value || undefined)} placeholder="e.g. opened_previous" />
                </Field>
              </div>
            ))}
            <button type="button" onClick={addStep} className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-amber-500/50 transition-colors w-full justify-center">
              <Plus className="h-3.5 w-3.5" /> Add Step
            </button>
          </Section>

          {/* ---- Audience Filter ---- */}
          <Section title="Audience Filter" icon={Filter}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Segment">
                <input className={inputCls} value={filter.segment ?? ""} onChange={(e) => updateFilter("segment", e.target.value)} placeholder="e.g. inactive_90d" />
              </Field>
              <Field label="Min Days Inactive">
                <input type="number" className={inputCls} value={filter.min_days_inactive ?? ""} onChange={(e) => updateFilter("min_days_inactive", e.target.value ? Number(e.target.value) : undefined)} min={0} />
              </Field>
              <Field label="Min Purchase Value">
                <input type="number" className={inputCls} value={filter.min_purchase_value ?? ""} onChange={(e) => updateFilter("min_purchase_value", e.target.value ? Number(e.target.value) : undefined)} min={0} />
              </Field>
              <Field label="Min Days Since Purchase">
                <input type="number" className={inputCls} value={filter.min_days_since_purchase ?? ""} onChange={(e) => updateFilter("min_days_since_purchase", e.target.value ? Number(e.target.value) : undefined)} min={0} />
              </Field>
              <Field label="Min Lifetime Value">
                <input type="number" className={inputCls} value={filter.min_lifetime_value ?? ""} onChange={(e) => updateFilter("min_lifetime_value", e.target.value ? Number(e.target.value) : undefined)} min={0} />
              </Field>
              <Field label="Min Purchases">
                <input type="number" className={inputCls} value={filter.min_purchases ?? ""} onChange={(e) => updateFilter("min_purchases", e.target.value ? Number(e.target.value) : undefined)} min={0} />
              </Field>
              <Field label="Min Rating">
                <input type="number" className={inputCls} value={filter.min_rating ?? ""} onChange={(e) => updateFilter("min_rating", e.target.value ? Number(e.target.value) : undefined)} min={0} max={5} step={0.5} />
              </Field>
              <Field label="Date Field">
                <input className={inputCls} value={filter.has_date_field ?? ""} onChange={(e) => updateFilter("has_date_field", e.target.value)} placeholder="e.g. birthday" />
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!filter.has_upsell_products} onChange={(e) => updateFilter("has_upsell_products", e.target.checked || undefined)} className="h-4 w-4 rounded border-border accent-amber-500" />
              <span className="text-sm">Has upsell products</span>
            </label>
          </Section>

          {/* ---- Expected Performance ---- */}
          <Section title="Expected Performance" icon={BarChart3}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Expected Open Rate (%)">
                <input type="number" className={inputCls} value={form.expected_open_rate ?? ""} onChange={(e) => update("expected_open_rate", e.target.value ? Number(e.target.value) : null)} min={0} max={100} step={0.1} placeholder="e.g. 65" />
              </Field>
              <Field label="Expected Reply Rate (%)">
                <input type="number" className={inputCls} value={form.expected_reply_rate ?? ""} onChange={(e) => update("expected_reply_rate", e.target.value ? Number(e.target.value) : null)} min={0} max={100} step={0.1} placeholder="e.g. 25" />
              </Field>
              <Field label="Expected Conversion Rate (%)">
                <input type="number" className={inputCls} value={form.expected_conversion_rate ?? ""} onChange={(e) => update("expected_conversion_rate", e.target.value ? Number(e.target.value) : null)} min={0} max={100} step={0.1} placeholder="e.g. 8" />
              </Field>
            </div>
          </Section>

          {/* ---- Rich Content ---- */}
          <Section title="Rich Content (Client-Facing)" icon={FileText}>
            <Field label="What It Does">
              <textarea className={textareaCls} value={(form.what_it_does as string) ?? ""} onChange={(e) => update("what_it_does", e.target.value || null)} placeholder="Explain what this campaign does in plain language..." rows={2} />
            </Field>
            <Field label="Why You Need It">
              <textarea className={textareaCls} value={(form.why_you_need_it as string) ?? ""} onChange={(e) => update("why_you_need_it", e.target.value || null)} placeholder="Explain the business case for this campaign..." rows={2} />
            </Field>
            <Field label="How It Works">
              <textarea className={textareaCls} value={(form.how_it_works as string) ?? ""} onChange={(e) => update("how_it_works", e.target.value || null)} placeholder="Step-by-step explanation of the campaign flow..." rows={2} />
            </Field>
            <Field label="Best For">
              <textarea className={textareaCls} value={(form.best_for as string) ?? ""} onChange={(e) => update("best_for", e.target.value || null)} placeholder="Describe ideal use cases and business types..." rows={2} />
            </Field>
            <Field label="Example Result">
              <textarea className={textareaCls} value={(form.example_result as string) ?? ""} onChange={(e) => update("example_result", e.target.value || null)} placeholder="e.g. A restaurant recovered 47 inactive customers in 2 weeks..." rows={2} />
            </Field>
          </Section>
        </div>

        {/* ---- Sticky Save Bar ---- */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur p-4 flex items-center justify-between">
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Update Template" : "Create Template"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
