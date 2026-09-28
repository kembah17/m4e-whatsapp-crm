"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Building2,
  Users,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit,
  Loader2,
  Wifi,
  WifiOff,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react'

interface ClientRow {
  id: string
  name: string
  business_name: string
  industry: string
  subscription_tier: string
  subscription_status: string
  client_email: string
  client_phone: string
  assigned_package: string | null
  created_at: string
  contact_count: number
  onboarding_progress: number
  onboarding_total: number
  onboarding_completed: number
  whatsapp_connected: boolean
}

interface Summary {
  total: number
  active: number
  trial: number
  byTier: Record<string, number>
  byStatus: Record<string, number>
}

const TIER_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-blue-500/20 text-blue-400',
  professional: 'bg-purple-500/20 text-purple-400',
  business: 'bg-amber-500/20 text-amber-400',
  enterprise: 'bg-emerald-500/20 text-emerald-400',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400',
  trialing: 'bg-blue-500/20 text-blue-400',
  past_due: 'bg-amber-500/20 text-amber-400',
  cancelled: 'bg-red-500/20 text-red-400',
  suspended: 'bg-red-500/20 text-red-400',
}

export default function ClientManagementPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [expandedTasks, setExpandedTasks] = useState<Record<string, unknown[]>>({})

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (tierFilter) params.set('tier', tierFilter)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/admin/clients?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch clients')

      const data = await res.json()
      setClients(data.clients || [])
      setSummary(data.summary || null)
    } catch (err) {
      toast.error('Failed to load clients')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search, tierFilter, statusFilter])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const toggleExpand = async (clientId: string) => {
    if (expandedRow === clientId) {
      setExpandedRow(null)
      return
    }
    setExpandedRow(clientId)

    if (!expandedTasks[clientId]) {
      try {
        const res = await fetch(`/api/admin/clients/${clientId}/tasks`)
        if (res.ok) {
          const data = await res.json()
          setExpandedTasks((prev) => ({ ...prev, [clientId]: data.tasks || [] }))
        }
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }
  }

  const atRiskCount = clients.filter(
    (c) => c.subscription_status === 'past_due' || c.subscription_status === 'suspended'
  ).length

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Client Manager</h1>
            <p className="text-muted-foreground mt-1">Manage all M4E client accounts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchClients}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => router.push('/admin/clients/new')}>
              <Plus className="mr-1 h-4 w-4" />
              Add New Client
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Clients</p>
                    <p className="text-2xl font-bold text-foreground">{summary.total}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-primary/40" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-emerald-400">{summary.active}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-emerald-400/40" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Trial</p>
                    <p className="text-2xl font-bold text-blue-400">{summary.trial}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-400/40" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">At Risk</p>
                    <p className="text-2xl font-bold text-amber-400">{atRiskCount}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-400/40" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6 border-border bg-card">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email..."
                  className="pl-10 bg-muted border-border"
                />
              </div>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="h-10 rounded-md border border-border bg-muted px-3 text-sm text-foreground"
              >
                <option value="">All Tiers</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-border bg-muted px-3 text-sm text-foreground"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="trialing">Trial</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Client Table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground text-sm font-medium">
              {loading ? 'Loading...' : `${clients.length} clients`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">No clients found</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push('/admin/clients/new')}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add First Client
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Industry</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Contacts</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">WhatsApp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Onboarding</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <>
                        <tr
                          key={client.id}
                          className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => toggleExpand(client.id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {expandedRow === client.id ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {client.business_name || client.name}
                                </p>
                                <p className="text-xs text-muted-foreground">{client.client_email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-foreground capitalize">{client.industry || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={TIER_COLORS[client.subscription_tier] || TIER_COLORS.free}>
                              {client.subscription_tier || 'free'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={STATUS_COLORS[client.subscription_status] || STATUS_COLORS.active}>
                              {client.subscription_status || 'unknown'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm text-foreground">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              {client.contact_count}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {client.whatsapp_connected ? (
                              <Wifi className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Progress value={client.onboarding_progress} className="h-2 w-16" />
                              <span className="text-xs text-muted-foreground">{client.onboarding_progress}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/admin/clients/${client.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/admin/clients/${client.id}?tab=settings`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded row: onboarding tasks */}
                        {expandedRow === client.id && (
                          <tr key={`${client.id}-expanded`}>
                            <td colSpan={8} className="bg-muted/20 px-8 py-4">
                              <h4 className="text-xs font-semibold text-muted-foreground mb-2">Onboarding Tasks</h4>
                              {expandedTasks[client.id] ? (
                                <div className="grid gap-1">
                                  {(expandedTasks[client.id] as Array<{ id: string; task_title: string; status: string; task_category: string }>).map((task) => (
                                    <div key={task.id} className="flex items-center gap-2 text-sm">
                                      {task.status === 'completed' ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                      ) : task.status === 'in_progress' ? (
                                        <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                                      ) : (
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                      )}
                                      <span className={task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}>
                                        {task.task_title}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                                        {task.task_category}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
