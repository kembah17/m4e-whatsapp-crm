'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Filter, ArrowRight, TrendingUp, UserPlus, MessageCircle, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { type NurtureStatus } from '@/lib/automations/ctwa-nurture'

interface CTWAContact {
  id: string
  name: string | null
  phone: string
  ctwa_nurture_status: NurtureStatus | null
  ctwa_ad_source: string | null
  ctwa_first_seen: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Users }> = {
  new: { label: 'New', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: UserPlus },
  welcomed: { label: 'Welcomed', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: MessageCircle },
  engaged: { label: 'Engaged', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: MessageCircle },
  qualified: { label: 'Qualified', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: TrendingUp },
  converted: { label: 'Converted', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
  lost: { label: 'Lost', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: Users },
}

const FUNNEL_STAGES: NurtureStatus[] = ['new', 'welcomed', 'engaged', 'qualified', 'converted']

export function CTWALeadsPanel() {
  const { accountId } = useAuth()
  const [contacts, setContacts] = useState<CTWAContact[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [funnelCounts, setFunnelCounts] = useState<Record<string, number>>({})

  const loadContacts = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('contacts')
      .select('id, name, phone, ctwa_nurture_status, ctwa_ad_source, ctwa_first_seen')
      .eq('account_id', accountId)
      .not('ctwa_nurture_status', 'is', null)
      .order('ctwa_first_seen', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('ctwa_nurture_status', statusFilter)
    }

    const { data, error } = await query
    if (!error && data) {
      setContacts(data as CTWAContact[])

      // Calculate funnel counts from all contacts (not filtered)
      const allQuery = await supabase
        .from('contacts')
        .select('ctwa_nurture_status')
        .eq('account_id', accountId)
        .not('ctwa_nurture_status', 'is', null)

      if (allQuery.data) {
        const counts: Record<string, number> = {}
        for (const row of allQuery.data) {
          const s = row.ctwa_nurture_status as string
          counts[s] = (counts[s] || 0) + 1
        }
        setFunnelCounts(counts)
      }
    }
    setLoading(false)
  }, [accountId, statusFilter])

  useEffect(() => { loadContacts() }, [loadContacts])

  const filtered = search.trim()
    ? contacts.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search)
      )
    : contacts

  const totalFunnel = Object.values(funnelCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* Conversion Funnel */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          CTWA Lead Funnel
        </h3>
        <div className="flex items-end gap-1">
          {FUNNEL_STAGES.map((stage, idx) => {
            const count = funnelCounts[stage] || 0
            const pct = totalFunnel > 0 ? (count / totalFunnel) * 100 : 0
            const config = STATUS_CONFIG[stage]
            const barHeight = Math.max(20, pct * 1.5)

            return (
              <div key={stage} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-foreground">{count}</span>
                <div
                  className={`w-full rounded-t-sm transition-all ${config?.color.split(' ')[0] || 'bg-muted'}`}
                  style={{ height: `${barHeight}px`, opacity: 0.7 + (idx * 0.06) }}
                />
                <span className="text-[10px] text-muted-foreground text-center">
                  {config?.label || stage}
                </span>
                {idx < FUNNEL_STAGES.length - 1 && (
                  <ArrowRight className="absolute h-3 w-3 text-muted-foreground/30" style={{ display: 'none' }} />
                )}
              </div>
            )
          })}
        </div>
        {totalFunnel > 0 && funnelCounts['converted'] ? (
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Conversion rate: {((funnelCounts['converted'] / totalFunnel) * 100).toFixed(1)}%
          </p>
        ) : null}
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            All ({totalFunnel})
          </button>
          {FUNNEL_STAGES.map((stage) => {
            const config = STATUS_CONFIG[stage]
            return (
              <button
                key={stage}
                onClick={() => setStatusFilter(stage)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  statusFilter === stage
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {config?.label} ({funnelCounts[stage] || 0})
              </button>
            )
          })}
        </div>
      </div>

      {/* Leads table */}
      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading CTWA leads...</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            {totalFunnel === 0
              ? 'No CTWA leads yet. Leads will appear here when contacts arrive from Click-to-WhatsApp ads.'
              : 'No leads match your filters.'}
          </p>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Ad Source</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">First Seen</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => {
                const config = STATUS_CONFIG[contact.ctwa_nurture_status || 'new']
                return (
                  <tr key={contact.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {contact.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">
                      {contact.phone}
                    </td>
                    <td className="px-4 py-2.5">
                      {contact.ctwa_ad_source ? (
                        <Badge variant="outline" className="text-[10px]">
                          {contact.ctwa_ad_source}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={`text-[10px] ${config?.color || ''}`}>
                        {config?.label || contact.ctwa_nurture_status || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {contact.ctwa_first_seen
                        ? new Date(contact.ctwa_first_seen).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => window.location.href = `/contacts/${contact.id}`}
                      >
                        View
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
