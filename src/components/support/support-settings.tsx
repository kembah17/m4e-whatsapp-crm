"use client"

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Tag, Clock, Sparkles, Loader2,
  Store, UtensilsCrossed, Heart, Home, Briefcase,
  GraduationCap, Truck, Building2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { SUPPORT_INDUSTRY_PRESETS } from '@/lib/support/presets'
import type { TicketCategory, SLAPolicy, TicketPriority } from '@/types/business-growth'

// ─── Industry icon map ─────────────────────────────────────────────

const INDUSTRY_ICONS: Record<string, React.ElementType> = {
  retail: Store,
  restaurant: UtensilsCrossed,
  healthcare: Heart,
  real_estate: Home,
  professional_services: Briefcase,
  education: GraduationCap,
  logistics: Truck,
  hospitality: Building2,
}

// ─── Quick Setup (Industry Presets) ────────────────────────────────

function QuickSetup({ onPresetsLoaded }: { onPresetsLoaded: () => void }) {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  // When industry changes, select all categories by default
  function handleSelectIndustry(industry: string) {
    if (selectedIndustry === industry) {
      setSelectedIndustry('')
      setSelectedCategories(new Set())
      return
    }
    setSelectedIndustry(industry)
    const preset = SUPPORT_INDUSTRY_PRESETS.find(p => p.industry === industry)
    if (preset) {
      setSelectedCategories(new Set(preset.categories.map(c => c.name)))
    }
  }

  function toggleCategory(name: string) {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  function toggleAll() {
    const preset = SUPPORT_INDUSTRY_PRESETS.find(p => p.industry === selectedIndustry)
    if (!preset) return
    if (selectedCategories.size === preset.categories.length) {
      setSelectedCategories(new Set())
    } else {
      setSelectedCategories(new Set(preset.categories.map(c => c.name)))
    }
  }

  async function handleLoadPresets() {
    if (!selectedIndustry || selectedCategories.size === 0) return
    setLoading(true)
    try {
      const res = await fetch('/api/support/load-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: selectedIndustry,
          selectedCategories: Array.from(selectedCategories),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load presets')
      toast.success(
        `Created ${data.categories_created} categories` +
        (data.sla_policies_created ? ` and ${data.sla_policies_created} SLA policies` : '') +
        (data.categories_skipped ? ` (${data.categories_skipped} already existed)` : '')
      )
      setSelectedIndustry('')
      setSelectedCategories(new Set())
      onPresetsLoaded()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load presets')
    } finally {
      setLoading(false)
    }
  }

  const activePreset = SUPPORT_INDUSTRY_PRESETS.find(p => p.industry === selectedIndustry)

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#C9A84C]" /> Quick Setup
            </CardTitle>
            <CardDescription>
              Load industry-specific categories and SLA policies for your business type
            </CardDescription>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          {/* Industry grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SUPPORT_INDUSTRY_PRESETS.map((preset) => {
              const Icon = INDUSTRY_ICONS[preset.industry] || Briefcase
              const isSelected = selectedIndustry === preset.industry
              return (
                <button
                  key={preset.industry}
                  onClick={() => handleSelectIndustry(preset.industry)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border bg-muted hover:border-muted-foreground/30'
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div className="text-sm font-medium">{preset.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {preset.categories.length} categories
                  </div>
                </button>
              )
            })}
          </div>

          {/* Category customization panel */}
          {activePreset && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{activePreset.label}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    &mdash; {activePreset.description}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAll}
                  className="text-xs"
                >
                  {selectedCategories.size === activePreset.categories.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <Separator />

              {/* Category checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activePreset.categories.map((cat) => (
                  <label
                    key={cat.name}
                    className={`flex items-center gap-3 rounded-md border p-2.5 cursor-pointer transition-all ${
                      selectedCategories.has(cat.name)
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-background opacity-60'
                    }`}
                  >
                    <Checkbox
                      checked={selectedCategories.has(cat.name)}
                      onCheckedChange={() => toggleCategory(cat.name)}
                    />
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{cat.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {cat.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {/* SLA info */}
              {activePreset.slaAdjustments && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                  <strong>SLA adjustment:</strong>{' '}
                  Response times &times;{activePreset.slaAdjustments.responseMultiplier},{' '}
                  Resolution times &times;{activePreset.slaAdjustments.resolutionMultiplier}
                  {activePreset.slaAdjustments.responseMultiplier < 1 && ' (faster)'}
                  {activePreset.slaAdjustments.responseMultiplier > 1 && ' (more relaxed)'}
                  {' \u2014 applied only if no SLA policies exist yet.'}
                </div>
              )}

              {/* Load button */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleLoadPresets}
                  disabled={loading || selectedCategories.size === 0}
                >
                  {loading
                    ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    : <Sparkles className="h-4 w-4 mr-1" />
                  }
                  Load {selectedCategories.size} {selectedCategories.size === 1 ? 'Category' : 'Categories'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ─── Category Management ───────────────────────────────────────────

function CategoryManager({ refreshSignal }: { refreshSignal: number }) {
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TicketCategory | null>(null)
  const [form, setForm] = useState({ name: '', description: '', icon: 'tag', color: '#6366f1' })

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/support/categories')
      if (res.ok) { const d = await res.json(); setCategories(Array.isArray(d) ? d : (d?.data ?? [])) }
    } catch {
      console.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories, refreshSignal])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '', icon: 'tag', color: '#6366f1' })
    setDialogOpen(true)
  }

  function openEdit(cat: TicketCategory) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description ?? '', icon: cat.icon, color: cat.color })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    try {
      const url = editing ? `/api/support/categories/${editing.id}` : '/api/support/categories'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(editing ? 'Category updated' : 'Category created')
      setDialogOpen(false)
      await loadCategories()
    } catch {
      toast.error('Failed to save category')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return
    try {
      const res = await fetch(`/api/support/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Category deleted')
      await loadCategories()
    } catch {
      toast.error('Failed to delete category')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" /> Ticket Categories
            </CardTitle>
            <CardDescription>Organize tickets by category for better routing</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No categories yet. Use Quick Setup above or add categories manually.
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div>
                    <p className="text-sm font-medium">{cat.name}</p>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                    {cat.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Technical Issue"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// ─── SLA Policy Management ─────────────────────────────────────────

function SLAPolicyManager({ refreshSignal }: { refreshSignal: number }) {
  const [policies, setPolicies] = useState<SLAPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SLAPolicy | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    priority: 'normal' as TicketPriority,
    first_response_minutes: 1440,
    resolution_minutes: 2880,
    escalation_minutes: '',
    is_default: false,
  })

  const loadPolicies = useCallback(async () => {
    try {
      const res = await fetch('/api/support/sla')
      if (res.ok) { const d = await res.json(); setPolicies(Array.isArray(d) ? d : (d?.data ?? [])) }
    } catch {
      console.error('Failed to load SLA policies')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies, refreshSignal])

  function openCreate() {
    setEditing(null)
    setForm({
      name: '',
      description: '',
      priority: 'normal',
      first_response_minutes: 1440,
      resolution_minutes: 2880,
      escalation_minutes: '',
      is_default: false,
    })
    setDialogOpen(true)
  }

  function openEdit(policy: SLAPolicy) {
    setEditing(policy)
    setForm({
      name: policy.name,
      description: policy.description ?? '',
      priority: policy.priority,
      first_response_minutes: policy.first_response_minutes,
      resolution_minutes: policy.resolution_minutes,
      escalation_minutes: policy.escalation_minutes?.toString() ?? '',
      is_default: policy.is_default,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }

    try {
      const url = editing ? `/api/support/sla/${editing.id}` : '/api/support/sla'
      const method = editing ? 'PATCH' : 'POST'
      const body = {
        ...form,
        escalation_minutes: form.escalation_minutes ? parseInt(form.escalation_minutes) : null,
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success(editing ? 'SLA policy updated' : 'SLA policy created')
      setDialogOpen(false)
      await loadPolicies()
    } catch {
      toast.error('Failed to save SLA policy')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this SLA policy?')) return
    try {
      const res = await fetch(`/api/support/sla/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('SLA policy deleted')
      await loadPolicies()
    } catch {
      toast.error('Failed to delete SLA policy')
    }
  }

  function formatMinutes(mins: number): string {
    if (mins < 60) return `${mins}m`
    if (mins < 1440) return `${Math.round(mins / 60)}h`
    return `${Math.round(mins / 1440)}d`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> SLA Policies
            </CardTitle>
            <CardDescription>Define response and resolution time targets by priority</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Add Policy
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : policies.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No SLA policies yet. Use Quick Setup above or add policies manually.
          </p>
        ) : (
          <div className="space-y-2">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{policy.name}</p>
                    {policy.is_default && <Badge variant="outline" className="text-[10px]">Default</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Response: {formatMinutes(policy.first_response_minutes)} |
                    Resolution: {formatMinutes(policy.resolution_minutes)}
                    {policy.escalation_minutes && ` | Escalate: ${formatMinutes(policy.escalation_minutes)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="capitalize">{policy.priority}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(policy)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(policy.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit SLA Policy' : 'New SLA Policy'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Critical SLA"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority Level</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Response (minutes)</Label>
                  <Input
                    type="number"
                    value={form.first_response_minutes}
                    onChange={(e) => setForm({ ...form, first_response_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resolution (minutes)</Label>
                  <Input
                    type="number"
                    value={form.resolution_minutes}
                    onChange={(e) => setForm({ ...form, resolution_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Auto-Escalate After (minutes, optional)</Label>
                <Input
                  type="number"
                  value={form.escalation_minutes}
                  onChange={(e) => setForm({ ...form, escalation_minutes: e.target.value })}
                  placeholder="Leave empty to disable"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_default}
                  onCheckedChange={(v) => setForm({ ...form, is_default: v })}
                />
                <Label>Set as default for this priority level</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// ─── Main Settings Component ───────────────────────────────────────

export function SupportSettings() {
  const [refreshSignal, setRefreshSignal] = useState(0)

  return (
    <div className="space-y-6">
      <QuickSetup onPresetsLoaded={() => setRefreshSignal(s => s + 1)} />
      <CategoryManager refreshSignal={refreshSignal} />
      <SLAPolicyManager refreshSignal={refreshSignal} />
    </div>
  )
}
