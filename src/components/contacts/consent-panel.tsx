"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ShieldCheck,
  ShieldOff,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

interface ConsentRecord {
  id: string
  consent_type: string
  status: 'granted' | 'withdrawn' | 'expired'
  source: string
  granted_at: string
  withdrawn_at: string | null
  expires_at: string | null
  evidence: string | null
}

interface ConsentPanelProps {
  contactId: string
}

const CONSENT_TYPES = [
  { value: 'whatsapp_marketing', label: 'WhatsApp Marketing' },
  { value: 'whatsapp_transactional', label: 'WhatsApp Transactional' },
  { value: 'email_marketing', label: 'Email Marketing' },
  { value: 'sms_marketing', label: 'SMS Marketing' },
  { value: 'data_processing', label: 'Data Processing' },
  { value: 'ndpr_explicit', label: 'NDPR Explicit Consent' },
] as const

const CONSENT_SOURCES = [
  { value: 'manual_entry', label: 'Manual Entry' },
  { value: 'import', label: 'Import' },
  { value: 'whatsapp_optin', label: 'WhatsApp Opt-in' },
  { value: 'web_form', label: 'Web Form' },
  { value: 'flow_completion', label: 'Flow Completion' },
  { value: 'api', label: 'API' },
] as const

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  granted: { icon: CheckCircle2, color: 'bg-emerald-500/20 text-emerald-400', label: 'Granted' },
  withdrawn: { icon: XCircle, color: 'bg-red-500/20 text-red-400', label: 'Withdrawn' },
  expired: { icon: AlertTriangle, color: 'bg-amber-500/20 text-amber-400', label: 'Expired' },
}

export function ConsentPanel({ contactId }: ConsentPanelProps) {
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newType, setNewType] = useState('whatsapp_marketing')
  const [newSource, setNewSource] = useState('manual_entry')
  const [newEvidence, setNewEvidence] = useState('')

  const fetchConsents = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/consents`)
      if (!res.ok) throw new Error('Failed to fetch consents')
      const data = await res.json()
      setConsents(data.consents || [])
    } catch (err) {
      console.error('Failed to load consents:', err)
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => {
    fetchConsents()
  }, [fetchConsents])

  const grantConsent = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType: newType,
          source: newSource,
          action: 'grant',
          evidence: newEvidence || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to record consent')
      toast.success('Consent recorded')
      setShowAdd(false)
      setNewEvidence('')
      fetchConsents()
    } catch (err) {
      toast.error('Failed to record consent')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const withdrawConsentAction = async (consentType: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType,
          action: 'withdraw',
        }),
      })
      if (!res.ok) throw new Error('Failed to withdraw consent')
      toast.success('Consent withdrawn')
      fetchConsents()
    } catch (err) {
      toast.error('Failed to withdraw consent')
      console.error(err)
    }
  }

  const activeConsents = consents.filter((c) => c.status === 'granted')
  const historicalConsents = consents.filter((c) => c.status !== 'granted')

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Consent and Compliance
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Record Consent
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add consent form */}
        {showAdd && (
          <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Consent Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground"
                >
                  {CONSENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Source</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground"
                >
                  {CONSENT_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Evidence (optional)</label>
              <input
                value={newEvidence}
                onChange={(e) => setNewEvidence(e.target.value)}
                placeholder="e.g. Verbal consent during onboarding call"
                className="mt-1 flex h-9 w-full rounded-md border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={grantConsent} disabled={submitting}>
                {submitting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1 h-3.5 w-3.5" />}
                Record
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : consents.length === 0 ? (
          <div className="py-6 text-center">
            <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No consent records</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active consents */}
            {activeConsents.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Active Consents</h4>
                <div className="space-y-1.5">
                  {activeConsents.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.granted
                    const Icon = cfg.icon
                    const typeLabel = CONSENT_TYPES.find((t) => t.value === c.consent_type)?.label || c.consent_type
                    return (
                      <div key={c.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-emerald-400 shrink-0" />
                          <div>
                            <p className="text-sm text-foreground">{typeLabel}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1 py-0">{c.source}</Badge>
                              <span className="text-[10px] text-muted-foreground">
                                <Clock className="inline h-2.5 w-2.5 mr-0.5" />
                                {new Date(c.granted_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 text-xs"
                          onClick={() => withdrawConsentAction(c.consent_type)}
                        >
                          Withdraw
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Historical consents */}
            {historicalConsents.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">History</h4>
                <div className="space-y-1">
                  {historicalConsents.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.withdrawn
                    const Icon = cfg.icon
                    const typeLabel = CONSENT_TYPES.find((t) => t.value === c.consent_type)?.label || c.consent_type
                    return (
                      <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs">{typeLabel}</span>
                        <Badge className={`text-[10px] px-1 py-0 ${cfg.color}`}>{cfg.label}</Badge>
                        <span className="text-[10px]">
                          {c.withdrawn_at ? new Date(c.withdrawn_at).toLocaleDateString() : new Date(c.granted_at).toLocaleDateString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
