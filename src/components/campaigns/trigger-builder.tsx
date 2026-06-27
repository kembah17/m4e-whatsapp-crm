"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Zap,
  Save,
} from "lucide-react"

interface CampaignTemplate {
  id: string
  name: string
  category: string
}

interface TriggerData {
  id?: string
  trigger_event: string
  campaign_template_id: string | null
  conditions: Record<string, unknown>
  delay_minutes: number
  is_active: boolean
}

interface TriggerBuilderProps {
  open: boolean
  onClose: () => void
  editTrigger?: TriggerData | null
}

const TRIGGER_EVENTS = [
  { value: "order_placed", label: "Order Placed", group: "Orders" },
  { value: "order_shipped", label: "Order Shipped", group: "Orders" },
  { value: "order_delivered", label: "Order Delivered", group: "Orders" },
  { value: "order_cancelled", label: "Order Cancelled", group: "Orders" },
  { value: "payment_confirmed", label: "Payment Confirmed", group: "Payments" },
  { value: "payment_failed", label: "Payment Failed", group: "Payments" },
  { value: "cart_abandoned", label: "Cart Abandoned", group: "Carts" },
  { value: "contact_birthday", label: "Contact Birthday", group: "Time-Based" },
  { value: "contact_anniversary", label: "Contact Anniversary", group: "Time-Based" },
  { value: "purchase_milestone", label: "Purchase Milestone", group: "Engagement" },
  { value: "no_purchase_period", label: "No Purchase Period", group: "Engagement" },
  { value: "review_requested", label: "Review Requested", group: "Engagement" },
  { value: "referral_made", label: "Referral Made", group: "Engagement" },
  { value: "manual", label: "Manual Trigger", group: "Other" },
] as const

export function TriggerBuilder({ open, onClose, editTrigger }: TriggerBuilderProps) {
  const [triggerEvent, setTriggerEvent] = useState(editTrigger?.trigger_event ?? "")
  const [templateId, setTemplateId] = useState(editTrigger?.campaign_template_id ?? "")
  const [delayMinutes, setDelayMinutes] = useState(editTrigger?.delay_minutes ?? 0)
  const [isActive, setIsActive] = useState(editTrigger?.is_active ?? true)
  const [conditionsJson, setConditionsJson] = useState(
    editTrigger?.conditions ? JSON.stringify(editTrigger.conditions, null, 2) : "{}"
  )
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns/templates")
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch {
      // Templates may not be available yet
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchTemplates()
  }, [open, fetchTemplates])

  useEffect(() => {
    if (editTrigger) {
      setTriggerEvent(editTrigger.trigger_event)
      setTemplateId(editTrigger.campaign_template_id ?? "")
      setDelayMinutes(editTrigger.delay_minutes)
      setIsActive(editTrigger.is_active)
      setConditionsJson(
        editTrigger.conditions ? JSON.stringify(editTrigger.conditions, null, 2) : "{}"
      )
    }
  }, [editTrigger])

  const handleSave = async () => {
    if (!triggerEvent) {
      toast.error("Please select a trigger event")
      return
    }

    let conditions: Record<string, unknown> = {}
    try {
      conditions = JSON.parse(conditionsJson)
    } catch {
      toast.error("Invalid JSON in conditions")
      return
    }

    setSaving(true)
    try {
      const url = editTrigger?.id
        ? `/api/campaigns/triggers/${editTrigger.id}`
        : "/api/campaigns/triggers"
      const method = editTrigger?.id ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger_event: triggerEvent,
          campaign_template_id: templateId || null,
          conditions,
          delay_minutes: delayMinutes,
          is_active: isActive,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to save trigger")
      }

      toast.success(editTrigger?.id ? "Trigger updated" : "Trigger created")
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save trigger")
    } finally {
      setSaving(false)
    }
  }

  // Group events for display
  const groupedEvents = TRIGGER_EVENTS.reduce(
    (acc, evt) => {
      if (!acc[evt.group]) acc[evt.group] = []
      acc[evt.group].push(evt)
      return acc
    },
    {} as Record<string, typeof TRIGGER_EVENTS[number][]>,
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {editTrigger?.id ? "Edit Trigger" : "Create Campaign Trigger"}
          </DialogTitle>
          <DialogDescription>
            Automatically send campaigns when specific events occur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trigger Event */}
          <div className="space-y-2">
            <Label>Trigger Event *</Label>
            <Select value={triggerEvent} onValueChange={(v) => setTriggerEvent(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedEvents).map(([group, events]) => (
                  <div key={group}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group}
                    </div>
                    {events.map((evt) => (
                      <SelectItem key={evt.value} value={evt.value}>
                        {evt.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Template */}
          <div className="space-y-2">
            <Label>Campaign Template</Label>
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading templates...
              </div>
            ) : (
              <Select value={templateId} onValueChange={(v) => setTemplateId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Delay */}
          <div className="space-y-2">
            <Label>Delay (minutes)</Label>
            <Input
              type="number"
              min={0}
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value, 10) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Wait this many minutes after the event before sending. 0 = immediate.
            </p>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <Label>Conditions (JSON)</Label>
            <Textarea
              value={conditionsJson}
              onChange={(e) => setConditionsJson(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder='{"min_order_value": 5000, "product_category": "electronics"}'
            />
            <p className="text-xs text-muted-foreground">
              Optional conditions to filter when this trigger fires.
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Enable or disable this trigger</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editTrigger?.id ? "Update" : "Create"} Trigger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
