"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Save, FileCode, Loader2 } from "lucide-react"

interface Props {
  flowId: string
  initialJSON: object | null
  onSave: () => void
}

const TEMPLATE_KEYS = [
  { value: "customer_feedback", label: "Customer Feedback" },
  { value: "lead_capture", label: "Lead Capture" },
  { value: "appointment_booking", label: "Appointment Booking" },
  { value: "order_details", label: "Order Details" },
  { value: "survey", label: "Customer Survey" },
]

export function FlowJSONEditor({ flowId, initialJSON, onSave }: Props) {
  const [json, setJson] = useState(initialJSON ? JSON.stringify(initialJSON, null, 2) : "")
  const [saving, setSaving] = useState(false)
  const [valid, setValid] = useState(true)

  const validateJSON = (text: string) => {
    try {
      if (text.trim()) JSON.parse(text)
      setValid(true)
    } catch {
      setValid(false)
    }
    setJson(text)
  }

  const insertTemplate = async (templateKey: string) => {
    try {
      // Dynamic import to avoid bundling all templates
      const { FLOW_TEMPLATES } = await import("@/lib/whatsapp/flow-templates")
      const templateFn = FLOW_TEMPLATES[templateKey]
      if (!templateFn) { toast.error("Template not found"); return }
      const template = templateFn()
      const text = JSON.stringify(template.flow_json, null, 2)
      setJson(text)
      setValid(true)
      toast.info(`Inserted ${template.name} template`)
    } catch {
      toast.error("Failed to load template")
    }
  }

  const saveJSON = async () => {
    if (!valid) { toast.error("Fix JSON errors first"); return }
    setSaving(true)
    try {
      const parsed = json.trim() ? JSON.parse(json) : null
      const res = await fetch(`/api/whatsapp/flows/${flowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow_json: parsed }),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast.success("Flow JSON saved!")
      onSave()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Flow JSON Editor</span>
          {!valid && <Badge variant="destructive" className="text-xs">Invalid JSON</Badge>}
        </div>
        <Select onValueChange={(v: string | null) => { if (v) insertTemplate(v) }}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue placeholder="Insert template..." />
          </SelectTrigger>
          <SelectContent>
            {TEMPLATE_KEYS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <textarea
        className="w-full min-h-[300px] rounded-md border bg-background p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
        value={json}
        onChange={(e) => validateJSON(e.target.value)}
        placeholder='{"version": "6.0", "screens": [...]}'
        spellCheck={false}
      />
      <Button onClick={saveJSON} disabled={saving || !valid} size="sm">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
        Save JSON
      </Button>
    </div>
  )
}
