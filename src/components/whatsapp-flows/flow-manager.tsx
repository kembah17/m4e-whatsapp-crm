"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Send, Upload, Loader2, RefreshCw } from "lucide-react"
import { FlowJSONEditor } from "./flow-json-editor"

interface Flow {
  id: string
  name: string
  status: string
  meta_flow_id: string | null
  template_name: string | null
  flow_json: object | null
  created_at: string
  updated_at: string
}

const TEMPLATE_OPTIONS = [
  { value: "customer_feedback", label: "Customer Feedback" },
  { value: "lead_capture", label: "Lead Capture" },
  { value: "appointment_booking", label: "Appointment Booking" },
  { value: "order_details", label: "Order Details" },
  { value: "survey", label: "Customer Survey" },
]

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  PUBLISHED: "bg-green-500/10 text-green-500 border-green-500/30",
  DEPRECATED: "bg-gray-500/10 text-gray-400 border-gray-500/30",
  BLOCKED: "bg-red-500/10 text-red-500 border-red-500/30",
  THROTTLED: "bg-orange-500/10 text-orange-500 border-orange-500/30",
}

export function FlowManager() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [editingFlow, setEditingFlow] = useState<Flow | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendPhone, setSendPhone] = useState("")

  const fetchFlows = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/flows")
      if (!res.ok) throw new Error("Failed to fetch flows")
      const data = await res.json()
      setFlows(data.flows ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFlows() }, [fetchFlows])

  const createFlow = async () => {
    if (!newName) { toast.error("Flow name is required"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/whatsapp/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          template_name: selectedTemplate || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to create flow")
      toast.success("Flow created!")
      setNewName("")
      setSelectedTemplate("")
      fetchFlows()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed")
    } finally {
      setCreating(false)
    }
  }

  const deleteFlow = async (id: string) => {
    if (!confirm("Delete this flow?")) return
    try {
      const res = await fetch(`/api/whatsapp/flows/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Flow deleted")
      fetchFlows()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  const publishFlow = async (id: string) => {
    try {
      const res = await fetch(`/api/whatsapp/flows/${id}/publish`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Publish failed")
      }
      toast.success("Flow published!")
      fetchFlows()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed")
    }
  }

  const sendFlow = async (id: string) => {
    if (!sendPhone) { toast.error("Enter a phone number"); return }
    setSendingId(id)
    try {
      const res = await fetch(`/api/whatsapp/flows/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: sendPhone }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Send failed")
      }
      toast.success("Flow sent!")
      setSendPhone("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed")
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Flow name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedTemplate} onValueChange={(v: string | null) => setSelectedTemplate(v ?? "")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="From template..." />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={createFlow} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Flow List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Flows</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchFlows}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : flows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No flows yet. Create one from a template above.
            </p>
          ) : (
            <div className="space-y-3">
              {flows.map((flow) => (
                <div key={flow.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{flow.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {flow.template_name && `Template: ${flow.template_name} · `}
                        {flow.meta_flow_id ? `Meta ID: ${flow.meta_flow_id}` : 'Not synced to Meta'}
                      </p>
                    </div>
                    <Badge variant="outline" className={STATUS_COLORS[flow.status] || ""}>
                      {flow.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingFlow(editingFlow?.id === flow.id ? null : flow)}>
                      {editingFlow?.id === flow.id ? 'Close Editor' : 'Edit JSON'}
                    </Button>
                    {flow.status === 'DRAFT' && flow.meta_flow_id && (
                      <Button variant="outline" size="sm" onClick={() => publishFlow(flow.id)}>
                        <Upload className="h-4 w-4 mr-1" /> Publish
                      </Button>
                    )}
                    {flow.status === 'PUBLISHED' && (
                      <div className="flex gap-1">
                        <Input
                          placeholder="Phone..."
                          value={sendingId === flow.id ? sendPhone : ""}
                          onChange={(e) => { setSendingId(flow.id); setSendPhone(e.target.value) }}
                          className="w-[160px] h-8"
                        />
                        <Button variant="outline" size="sm" onClick={() => sendFlow(flow.id)} disabled={sendingId === flow.id && !sendPhone}>
                          <Send className="h-4 w-4 mr-1" /> Send
                        </Button>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteFlow(flow.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {editingFlow?.id === flow.id && (
                    <FlowJSONEditor
                      flowId={flow.id}
                      initialJSON={flow.flow_json}
                      onSave={() => fetchFlows()}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
