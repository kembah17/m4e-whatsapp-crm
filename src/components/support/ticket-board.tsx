"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SLATimer } from './sla-timer'
import { priorityConfig, statusConfig } from './ticket-list'
import { useRouter } from 'next/navigation'
import { User, MessageSquare, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import type { SupportTicket, TicketStatus } from '@/types/business-growth'
import { formatDistanceToNow } from 'date-fns'

interface TicketBoardProps {
  tickets: SupportTicket[]
  loading?: boolean
  onStatusChange?: (ticketId: string, newStatus: TicketStatus) => void
}

const BOARD_COLUMNS: { status: TicketStatus; label: string; color: string }[] = [
  { status: 'open', label: 'Open', color: 'border-t-blue-500' },
  { status: 'in_progress', label: 'In Progress', color: 'border-t-indigo-500' },
  { status: 'waiting_customer', label: 'Waiting', color: 'border-t-yellow-500' },
  { status: 'escalated', label: 'Escalated', color: 'border-t-red-500' },
  { status: 'resolved', label: 'Resolved', color: 'border-t-green-500' },
]

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const router = useRouter()

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('ticketId', ticket.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => router.push(`/support/${ticket.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-muted-foreground">
              {ticket.ticket_number}
            </p>
            <p className="text-sm font-medium truncate">{ticket.subject}</p>
          </div>
          <Badge className={`shrink-0 text-[10px] ${priorityConfig[ticket.priority].color}`}>
            {priorityConfig[ticket.priority].label}
          </Badge>
        </div>

        {ticket.contact && (
          <p className="text-xs text-muted-foreground truncate">
            {ticket.contact.name}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ticket.assigned_profile ? (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                  {ticket.assigned_profile.full_name}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Unassigned</span>
            )}
          </div>

          <SLATimer
            dueAt={ticket.sla_first_response_due}
            breached={ticket.sla_first_response_breached}
            compact
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
          {ticket.message_count != null && ticket.message_count > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {ticket.message_count}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function TicketBoard({ tickets, loading, onStatusChange }: TicketBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  async function handleDrop(e: React.DragEvent, newStatus: TicketStatus) {
    e.preventDefault()
    setDragOverColumn(null)
    const ticketId = e.dataTransfer.getData('ticketId')
    if (!ticketId) return

    const ticket = tickets.find((t) => t.id === ticketId)
    if (!ticket || ticket.status === newStatus) return

    try {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      toast.success(`Ticket moved to ${statusConfig[newStatus].label}`)
      onStatusChange?.(ticketId, newStatus)
    } catch {
      toast.error('Failed to update ticket status')
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {BOARD_COLUMNS.map((col) => (
          <div key={col.status} className="space-y-3">
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {BOARD_COLUMNS.map((col) => {
        const columnTickets = tickets.filter((t) => t.status === col.status)
        const isDragOver = dragOverColumn === col.status

        return (
          <div
            key={col.status}
            className={`flex flex-col rounded-lg border-t-4 bg-muted/30 ${col.color} ${
              isDragOver ? 'ring-2 ring-primary/50' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverColumn(col.status)
            }}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="flex items-center justify-between p-3 pb-2">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {columnTickets.length}
              </Badge>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-2 pt-0" style={{ maxHeight: '70vh' }}>
              {columnTickets.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                  No tickets
                </div>
              ) : (
                columnTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
