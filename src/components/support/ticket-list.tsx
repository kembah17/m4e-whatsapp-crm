"use client"

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SLATimer } from './sla-timer'
import { Eye, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { SupportTicket, TicketPriority, TicketStatus } from '@/types/business-growth'
import { formatDistanceToNow } from 'date-fns'

interface TicketListProps {
  tickets: SupportTicket[]
  loading?: boolean
}

const priorityConfig: Record<TicketPriority, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500 text-white' },
  high: { label: 'High', color: 'bg-orange-500 text-white' },
  normal: { label: 'Normal', color: 'bg-blue-500 text-white' },
  low: { label: 'Low', color: 'bg-gray-400 text-white' },
}

const statusConfig: Record<TicketStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  open: { label: 'Open', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'default' },
  waiting_customer: { label: 'Waiting Customer', variant: 'secondary' },
  waiting_internal: { label: 'Waiting Internal', variant: 'secondary' },
  escalated: { label: 'Escalated', variant: 'destructive' },
  resolved: { label: 'Resolved', variant: 'outline' },
  closed: { label: 'Closed', variant: 'outline' },
}

export function TicketList({ tickets, loading }: TicketListProps) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">No tickets found</p>
        <p className="text-sm text-muted-foreground">Create a new ticket or adjust your filters</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">#</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/support/${ticket.id}`)}
            >
              <TableCell className="font-mono text-sm">
                {ticket.ticket_number}
              </TableCell>
              <TableCell>
                <div className="max-w-[250px]">
                  <p className="truncate font-medium">{ticket.subject}</p>
                  {ticket.category && (
                    <p className="text-xs text-muted-foreground">{ticket.category.name}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {ticket.contact ? (
                  <div className="text-sm">
                    <p>{ticket.contact.name}</p>
                    <p className="text-xs text-muted-foreground">{ticket.contact.phone}</p>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={priorityConfig[ticket.priority].color}>
                  {priorityConfig[ticket.priority].label}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusConfig[ticket.status].variant}>
                  {statusConfig[ticket.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                {ticket.assigned_profile ? (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{ticket.assigned_profile.full_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                <SLATimer
                  dueAt={ticket.sla_first_response_due}
                  breached={ticket.sla_first_response_breached}
                  compact
                />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export { priorityConfig, statusConfig }
