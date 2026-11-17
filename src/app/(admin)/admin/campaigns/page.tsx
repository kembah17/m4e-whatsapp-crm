"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { AdminCampaignTable } from "@/components/admin/admin-campaign-table"
import { CampaignTemplateEditor } from "@/components/admin/campaign-template-editor"
import {
  Activity,
  LayoutTemplate,
  RefreshCw,
  Plus,
  Pencil,
  Copy,
  Trash2,
  Loader2,
  ChevronRight,
  MessageSquare,
  ListOrdered,
} from "lucide-react"
import type { CampaignTemplate } from "@/types/campaigns"

type Tab = "monitor" | "templates"

const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "monitor", label: "Campaign Monitor", icon: Activity },
  { id: "templates", label: "Campaign Templates", icon: LayoutTemplate },
]

const categoryColors: Record<string, string> = {
  reactivation: "bg-orange-500/10 text-orange-500",
  cart_recovery: "bg-red-500/10 text-red-500",
  post_purchase: "bg-emerald-500/10 text-emerald-500",
  lifecycle: "bg-blue-500/10 text-blue-500",
  engagement: "bg-purple-500/10 text-purple-500",
  revenue: "bg-amber-500/10 text-amber-500",
  feedback: "bg-cyan-500/10 text-cyan-500",
}

/* ------------------------------------------------------------------ */
/*  Campaign Templates Tab                                             */
/* ------------------------------------------------------------------ */
function CampaignTemplatesTab() {
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTpl, setEditingTpl] = useState<CampaignTemplate | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/campaign-templates")
      const json = await res.json()
      setTemplates(json.templates ?? [])
    } catch (err) {
      console.error("Failed to fetch templates:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleCreate = () => {
    setEditingTpl(null)
    setEditorOpen(true)
  }

  const handleEdit = (tpl: CampaignTemplate) => {
    setEditingTpl(tpl)
    setEditorOpen(true)
  }

  const handleClone = (tpl: CampaignTemplate) => {
    const cloned: CampaignTemplate = {
      ...tpl,
      id: "",
      name: `${tpl.name} (Copy)`,
      slug: `${tpl.slug}_copy`,
      is_active: false,
    }
    setEditingTpl(null)
    setTimeout(() => {
      setEditingTpl(cloned)
      setEditorOpen(true)
    }, 50)
  }

  const handleDelete = async (tpl: CampaignTemplate) => {
    if (!confirm(`Delete "${tpl.name}"? This cannot be undone.`)) return
    setDeletingId(tpl.id)
    try {
      const res = await fetch(`/api/admin/campaign-templates/${tpl.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success(`"${tpl.name}" deleted`)
      fetchTemplates()
    } catch {
      toast.error("Failed to delete template")
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (tpl: CampaignTemplate) => {
    try {
      const res = await fetch(`/api/admin/campaign-templates/${tpl.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !tpl.is_active }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success(`"${tpl.name}" ${!tpl.is_active ? "activated" : "deactivated"}`)
      fetchTemplates()
    } catch {
      toast.error("Failed to update template status")
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {templates.length} template{templates.length !== 1 ? "s" : ""} configured
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={fetchTemplates} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-400 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Create Template
            </button>
          </div>
        </div>

        {!templates.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No campaign templates found. Create your first template to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</th>
                  <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Channel</th>
                  <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tier</th>
                  <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Messages</th>
                  <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Steps</th>
                  <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <>
                    <tr key={tpl.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div>
                          <span className="font-medium text-foreground">{tpl.name}</span>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tpl.description}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", categoryColors[tpl.category] || "bg-gray-500/10 text-gray-400")}>
                          {tpl.category.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground">
                          {tpl.default_channel}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-500">
                          Tier {tpl.tier}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{tpl.message_templates?.length ?? 0}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <ListOrdered className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{tpl.sequence_steps?.length ?? 0}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleToggleActive(tpl)}
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity",
                            tpl.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                          )}
                          title={`Click to ${tpl.is_active ? "deactivate" : "activate"}`}
                        >
                          {tpl.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(tpl)} className="p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleClone(tpl)} className="p-1.5 rounded-md text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors" title="Clone">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(tpl)} disabled={deletingId === tpl.id} className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40" title="Delete">
                            {deletingId === tpl.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Details">
                            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expandedId === tpl.id && "rotate-90")} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === tpl.id && (
                      <tr key={`${tpl.id}-detail`}>
                        <td colSpan={8} className="bg-muted/10 p-4">
                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Slug</h4>
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tpl.slug}</code>
                              <h4 className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Expected Performance</h4>
                              <div className="space-y-1 text-xs">
                                <p>Open: <span className="font-medium">{tpl.expected_open_rate ?? "—"}%</span></p>
                                <p>Reply: <span className="font-medium">{tpl.expected_reply_rate ?? "—"}%</span></p>
                                <p>Conversion: <span className="font-medium">{tpl.expected_conversion_rate ?? "—"}%</span></p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Messages</h4>
                              <div className="space-y-1">
                                {(tpl.message_templates ?? []).map((m, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className="font-mono text-muted-foreground">{m.key}</span>
                                    <span>{m.name}</span>
                                    {m.has_discount && <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-amber-500 text-[10px]">discount</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Sequence</h4>
                              <div className="space-y-1">
                                {(tpl.sequence_steps ?? []).map((s, i) => (
                                  <div key={i} className="text-xs">
                                    <span className="font-medium">Step {s.step}:</span>{" "}
                                    <span className="font-mono text-muted-foreground">{s.message_key}</span>{" "}
                                    <span className="text-muted-foreground">(+{s.delay_minutes}min)</span>
                                    {s.condition && <span className="ml-1 text-blue-400">if {s.condition}</span>}
                                  </div>
                                ))}
                              </div>
                              <h4 className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Audience Filter</h4>
                              <div className="text-xs text-muted-foreground">
                                {Object.entries(tpl.audience_filter ?? {}).filter(([, v]) => v != null).map(([k, v]) => (
                                  <span key={k} className="mr-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 mb-1">
                                    {k}: {String(v)}
                                  </span>
                                ))}
                                {Object.keys(tpl.audience_filter ?? {}).length === 0 && "No filters"}
                              </div>
                            </div>
                          </div>
                          {(tpl.what_it_does || tpl.why_you_need_it || tpl.how_it_works) && (
                            <div className="mt-4 pt-4 border-t border-border/50 grid gap-4 md:grid-cols-3">
                              {tpl.what_it_does && (
                                <div>
                                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">What It Does</h4>
                                  <p className="text-xs text-foreground">{tpl.what_it_does}</p>
                                </div>
                              )}
                              {tpl.why_you_need_it && (
                                <div>
                                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Why You Need It</h4>
                                  <p className="text-xs text-foreground">{tpl.why_you_need_it}</p>
                                </div>
                              )}
                              {tpl.best_for && (
                                <div>
                                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Best For</h4>
                                  <p className="text-xs text-foreground">{tpl.best_for}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CampaignTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTpl}
        onSaved={fetchTemplates}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function AdminCampaignsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("monitor")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Campaign Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor active campaigns and manage campaign templates.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-background text-amber-500 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "monitor" && <AdminCampaignTable />}
      {activeTab === "templates" && <CampaignTemplatesTab />}
    </div>
  )
}
