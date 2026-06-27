"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  FileText,
  MessageSquare,
  Mail,
  Smartphone,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Execution {
  id: string
  status: string
  scheduled_for: string
  sent_at: string | null
  channel: string
  error_message: string | null
  created_at: string
  contacts?: { id: string; name: string | null; phone: string | null } | null
  campaign_triggers?: { trigger_event: string } | null
  campaigns?: { name: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-50 text-yellow-700 border-yellow-200",
  sending: "bg-blue-50 text-blue-700 border-blue-200",
  sent: "bg-green-50 text-green-700 border-green-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-50 text-gray-700 border-gray-200",
}

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  email: Mail,
  sms: Smartphone,
}

export function ExecutionLog() {
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExecutions = useCallback(async () => {
    try {
      // Fetch from campaign executions via triggers cron endpoint or a dedicated endpoint
      // For now, we show a placeholder that will be populated by the trigger engine
      const res = await fetch("/api/campaigns/triggers?include_executions=true")
      if (!res.ok) throw new Error("Failed to fetch executions")
      const data = await res.json()
      setExecutions(data.executions ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load executions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExecutions()
  }, [fetchExecutions])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Execution Log</h3>
        <p className="text-sm text-muted-foreground">
          History of automated campaign executions.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : executions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium">No executions yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Campaign executions will appear here when triggers fire.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((exec) => {
                  const ChannelIcon = CHANNEL_ICONS[exec.channel] ?? MessageSquare
                  return (
                    <TableRow key={exec.id}>
                      <TableCell className="text-sm">
                        {exec.contacts?.name ?? exec.contacts?.phone ?? "Unknown"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {exec.campaigns?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs capitalize">{exec.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("capitalize text-xs", STATUS_COLORS[exec.status] ?? "")}
                        >
                          {exec.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(exec.scheduled_for).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {exec.sent_at ? new Date(exec.sent_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        {exec.error_message ? (
                          <span className="text-xs text-destructive" title={exec.error_message}>
                            {exec.error_message.slice(0, 50)}{exec.error_message.length > 50 ? "..." : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
