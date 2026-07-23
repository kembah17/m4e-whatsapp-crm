"use client"

import { useEffect, useState } from 'react'
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
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Tag, Clock } from 'lucide-react'
import type { TicketCategory, SLAPolicy, TicketPriority } from '@/types/business-growth'

// ─── Category Management ───────────────────────────────────────────

function CategoryManager() {
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TicketCategory | null>(null)
  const [form, setForm] = useState({ name: '', description: '', icon: 'tag', color: '#6366f1' })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      const res = await fetch('/api/support/categories')
      if (res.ok) setCategories(await res.json())
    } catch {
      console.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

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
            No categories yet. Default categories will be created when you create your first ticket.
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

function SLAPolicyManager() {
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

  useEffect(() => {
    loadPolicies()
  }, [])

  async function loadPolicies() {
    try {
      const res = await fetch('/api/support/sla')
      if (res.ok) setPolicies(await res.json())
    } catch {
      console.error('Failed to load SLA policies')
    } finally {
      setLoading(false)
    }
  }

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
            No SLA policies yet. Defaults will be created when you create your first ticket.
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
  return (
    <div className="space-y-6">
      <CategoryManager />
      <SLAPolicyManager />
    </div>
  )
}
