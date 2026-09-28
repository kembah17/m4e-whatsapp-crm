"use client"

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  Clock,
  TrendingUp,
  Wifi,
  WifiOff,
  Users,
  Save,
  Loader2,
  FileText,
  Activity,
  Settings,
  ClipboardList,
  SkipForward,
  Play,
  RotateCcw,
} from 'lucide-react'

interface ClientDetail {
  id: string
  name: string
  business_name: string
  industry: string
  business_size: string
  subscription_tier: string
  subscription_status: string
  client_email: string
  client_phone: string
  client_address: string
  assigned_package: string | null
  package_start_date: string | null
  cac_status: string
  cac_document_url: string | null
  provisioned_at: string | null
  created_at: string
  contact_count: number
  onboarding_progress: number
  onboarding_total: number
  onboarding_completed: number
  whatsapp: { status: string; phone_number_id: string; connected_at: string } | null
  owner: { user_id: string; full_name: string; email: string; account_role: string } | null
}

interface OnboardingTask {
  id: string
  task_key: string
  task_title: string
  task_category: string
  status: string
  completed_at: string | null
  notes: string | null
  sort_order: number
}

interface LogEntry {
  id: string
  action: string
  performed_by: string | null
  details: Record<string, unknown>
  created_at: string
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: Building2 },
  { key: 'onboarding', label: 'Onboarding', icon: ClipboardList },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'settings', label: 'Settings', icon: Settings },
] as const

const TIER_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-blue-500/20 text-blue-400',
  professional: 'bg-purple-500/20 text-purple-400',
  business: 'bg-amber-500/20 text-amber-400',
  enterprise: 'bg-emerald-500/20 text-emerald-400',
}

const CATEGORY_COLORS: Record<string, string> = {
  setup: 'bg-blue-500/20 text-blue-400',
  data: 'bg-purple-500/20 text-purple-400',
  whatsapp: 'bg-emerald-500/20 text-emerald-400',
  training: 'bg-amber-500/20 text-amber-400',
  launch: 'bg-red-500/20 text-red-400',
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = params.id as string

  const initialTab = searchParams.get('tab') || 'overview'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [tasks, setTasks] = useState<OnboardingTask[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])

  // Settings form state
  const [editForm, setEditForm] = useState({
    business_name: '',
    industry: '',
    business_size: '',
    subscription_tier: '',
    subscription_status: '',
    client_phone: '',
    client_email: '',
    client_address: '',
    assigned_package: '',
  })

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`)
      if (!res.ok) throw new Error('Failed to fetch client')
      const data = await res.json()
      setClient(data.client)
      setTasks(data.tasks || [])
      setLogs(data.logs || [])
      setEditForm({
        business_name: data.client.business_name || '',
        industry: data.client.industry || '',
        business_size: data.client.business_size || '',
        subscription_tier: data.client.subscription_tier || 'free',
        subscription_status: data.client.subscription_status || 'active',
        client_phone: data.client.client_phone || '',
        client_email: data.client.client_email || '',
        client_address: data.client.client_address || '',
        assigned_package: data.client.assigned_package || '',
      })
    } catch (err) {
      toast.error('Failed to load client details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status }),
      })
      if (!res.ok) throw new Error('Failed to update task')
      toast.success('Task updated')
      fetchClient()
    } catch (err) {
      toast.error('Failed to update task')
      console.error(err)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Client updated')
      fetchClient()
    } catch (err) {
      toast.error('Failed to save changes')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Client not found</p>
        <Button variant="outline" onClick={() => router.push('/admin/clients')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Clients
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/clients')} className="mb-3">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Clients
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{client.business_name || client.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge className={TIER_COLORS[client.subscription_tier] || TIER_COLORS.free}>
                  {client.subscription_tier}
                </Badge>
                <Badge variant="outline">{client.subscription_status}</Badge>
                {client.whatsapp ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    <Wifi className="mr-1 h-3 w-3" /> WhatsApp Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    <WifiOff className="mr-1 h-3 w-3" /> WhatsApp Not Connected
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Onboarding</p>
              <div className="flex items-center gap-2">
                <Progress value={client.onboarding_progress} className="h-2 w-24" />
                <span className="text-sm font-medium text-foreground">{client.onboarding_progress}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground text-sm">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Business:</span>
                  <span className="text-foreground">{client.business_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Industry:</span>
                  <span className="text-foreground capitalize">{client.industry || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Size:</span>
                  <span className="text-foreground">{client.business_size || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Address:</span>
                  <span className="text-foreground">{client.client_address || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">CAC Status:</span>
                  <Badge variant="outline">{client.cac_status}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground text-sm">Owner Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Name:</span>
                  <span className="text-foreground">{client.owner?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground">{client.client_email || client.owner?.email || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="text-foreground">{client.client_phone || 'Not provided'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground text-sm">Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tier</span>
                  <Badge className={TIER_COLORS[client.subscription_tier] || TIER_COLORS.free}>
                    {client.subscription_tier}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{client.subscription_status}</Badge>
                </div>
                {client.assigned_package && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Package</span>
                    <span className="text-foreground">{client.assigned_package}</span>
                  </div>
                )}
                {client.package_start_date && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Package Start</span>
                    <span className="text-foreground">{new Date(client.package_start_date).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-foreground text-sm">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Contacts</span>
                  <span className="text-foreground font-medium">{client.contact_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Onboarding</span>
                  <span className="text-foreground">{client.onboarding_completed}/{client.onboarding_total} tasks</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Provisioned</span>
                  <span className="text-foreground">
                    {client.provisioned_at ? new Date(client.provisioned_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground">{new Date(client.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Onboarding Tab */}
        {activeTab === 'onboarding' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Onboarding Tasks</CardTitle>
              <CardDescription>
                {client.onboarding_completed} of {client.onboarding_total} tasks completed
              </CardDescription>
              <Progress value={client.onboarding_progress} className="h-2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      ) : task.status === 'in_progress' ? (
                        <TrendingUp className="h-5 w-5 text-blue-400 shrink-0" />
                      ) : task.status === 'skipped' ? (
                        <SkipForward className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${
                          task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'
                        }`}>
                          {task.task_title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[task.task_category] || 'bg-muted text-muted-foreground'}`}>
                            {task.task_category}
                          </Badge>
                          {task.completed_at && (
                            <span className="text-[10px] text-muted-foreground">
                              Completed {new Date(task.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {task.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateTaskStatus(task.id, 'in_progress')}
                            title="Start"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateTaskStatus(task.id, 'skipped')}
                            title="Skip"
                          >
                            <SkipForward className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {task.status === 'in_progress' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          title="Complete"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        </Button>
                      )}
                      {(task.status === 'completed' || task.status === 'skipped') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateTaskStatus(task.id, 'pending')}
                          title="Reset"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Provisioning Log</CardTitle>
              <CardDescription>Recent actions and changes for this client</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No activity recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
                      <Activity className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{log.action.replace(/_/g, ' ')}</p>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Client Settings</CardTitle>
              <CardDescription>Edit business details, subscription, and package</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Business Name</Label>
                  <Input
                    value={editForm.business_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, business_name: e.target.value }))}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Industry</Label>
                  <Input
                    value={editForm.industry}
                    onChange={(e) => setEditForm((p) => ({ ...p, industry: e.target.value }))}
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Subscription Tier</Label>
                  <select
                    value={editForm.subscription_tier}
                    onChange={(e) => setEditForm((p) => ({ ...p, subscription_tier: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="business">Business</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Subscription Status</Label>
                  <select
                    value={editForm.subscription_status}
                    onChange={(e) => setEditForm((p) => ({ ...p, subscription_status: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trial</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Email</Label>
                  <Input
                    value={editForm.client_email}
                    onChange={(e) => setEditForm((p) => ({ ...p, client_email: e.target.value }))}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Phone</Label>
                  <Input
                    value={editForm.client_phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, client_phone: e.target.value }))}
                    className="bg-muted border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Address</Label>
                <Input
                  value={editForm.client_address}
                  onChange={(e) => setEditForm((p) => ({ ...p, client_address: e.target.value }))}
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Assigned Package</Label>
                <select
                  value={editForm.assigned_package}
                  onChange={(e) => setEditForm((p) => ({ ...p, assigned_package: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
                >
                  <option value="">No Package</option>
                  <option value="pkg1_reactivation">Package 1: Reactivation</option>
                  <option value="pkg2_online_presence">Package 2: Online Presence</option>
                  <option value="pkg3_growth_engine">Package 3: Growth Engine</option>
                  <option value="full_programme">Full Programme</option>
                  <option value="unicorn_programme">Unicorn Programme</option>
                </select>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
