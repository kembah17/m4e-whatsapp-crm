"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  Zap,
  Plus,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TriggerBuilder } from "./trigger-builder"

interface Trigger {
  id: string
  trigger_event: string
  campaign_template_id: string | null
  conditions: Record<string, unknown>
  delay_minutes: number
  is_active: boolean
  execution_count: number
  last_executed_at: string | null
  created_at: string
  campaign_templates?: { name: string } | null
}

const EVENT_LABELS: Record<string, string> = {
  order_placed: "Order Placed",
  order_shipped: "Order Shipped",
  order_delivered: "Order Delivered",
  order_cancelled: "Order Cancelled",
  payment_confirmed: "Payment Confirmed",
  payment_failed: "Payment Failed",
  cart_abandoned: "Cart Abandoned",
  contact_birthday: "Contact Birthday",
  contact_anniversary: "Contact Anniversary",
  purchase_milestone: "Purchase Milestone",
  no_purchase_period: "No Purchase Period",
  review_requested: "Review Requested",
  referral_made: "Referral Made",
  manual: "Manual",
}

const EVENT_COLORS: Record<string, string> = {
  order_placed: "bg-blue-50 text-blue-700 border-blue-200",
  order_shipped: "bg-purple-50 text-purple-700 border-purple-200",
  order_delivered: "bg-green-50 text-green-700 border-green-200",
  order_cancelled: "bg-red-50 text-red-700 border-red-200",
  payment_confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  payment_failed: "bg-red-50 text-red-700 border-red-200",
  cart_abandoned: "bg-orange-50 text-orange-700 border-orange-200",
  contact_birthday: "bg-pink-50 text-pink-700 border-pink-200",
  contact_anniversary: "bg-pink-50 text-pink-700 border-pink-200",
  purchase_milestone: "bg-amber-50 text-amber-700 border-amber-200",
  no_purchase_period: "bg-gray-50 text-gray-700 border-gray-200",
  review_requested: "bg-indigo-50 text-indigo-700 border-indigo-200",
  referral_made: "bg-teal-50 text-teal-700 border-teal-200",
  manual: "bg-gray-50 text-gray-700 border-gray-200",
}

export function TriggerList() {
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editTrigger, setEditTrigger] = useState<Trigger | null>(null)

  const fetchTriggers = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns/triggers")
      if (!res.ok) throw new Error("Failed to fetch triggers")
      const data = await res.json()
      setTriggers(data.triggers ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load triggers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTriggers()
  }, [fetchTriggers])

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this trigger?")) return
    try {
      const res = await fetch(`/api/campaigns/triggers/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete trigger")
      toast.success("Trigger deleted")
      fetchTriggers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  const handleEdit = (trigger: Trigger) => {
    setEditTrigger(trigger)
    setShowBuilder(true)
  }

  const handleCloseBuilder = () => {
    setShowBuilder(false)
    setEditTrigger(null)
    fetchTriggers()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Campaign Triggers</h3>
          <p className="text-sm text-muted-foreground">
            Automatically send campaigns when events occur.
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Trigger
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : triggers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium">No triggers configured</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create triggers to automatically send campaigns based on events.
            </p>
            <Button onClick={() => setShowBuilder(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create First Trigger
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Delay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggers.map((trigger) => (
                  <TableRow key={trigger.id}>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          EVENT_COLORS[trigger.trigger_event] ?? "",
                        )}
                      >
                        {EVENT_LABELS[trigger.trigger_event] ?? trigger.trigger_event}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {trigger.campaign_templates?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {Object.keys(trigger.conditions).length > 0 ? (
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {Object.keys(trigger.conditions).length} condition{Object.keys(trigger.conditions).length !== 1 ? "s" : ""}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {trigger.delay_minutes > 0 ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {trigger.delay_minutes}m
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Immediate</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={trigger.is_active ? "default" : "secondary"}>
                        {trigger.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {trigger.execution_count}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {trigger.last_executed_at
                        ? new Date(trigger.last_executed_at).toLocaleString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(trigger)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(trigger.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {showBuilder && (
        <TriggerBuilder
          open={showBuilder}
          onClose={handleCloseBuilder}
          editTrigger={editTrigger}
        />
      )}
    </div>
  )
}
