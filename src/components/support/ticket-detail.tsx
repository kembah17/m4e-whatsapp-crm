"use client"

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { SLATimer } from './sla-timer'
import { priorityConfig, statusConfig } from './ticket-list'
import { toast } from 'sonner'
import {
  ArrowLeft,
  User,
  Phone,
  MessageSquare,
  Send,
  Lock,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  Clock,
  Tag,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import type {
  SupportTicket,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from '@/types/business-growth'

interface TicketDetailProps {
  ticketId: string
}

export function TicketDetail({ ticketId }: TicketDetailProps) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sendViaWhatsApp, setSendViaWhatsApp] = useState(false)
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string }>>([])

  useEffect(() => {
    loadTicket()
    loadMessages()
    fetch('/api/team')
      .then((r) => r.json())
      .then((data) => setTeamMembers(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [ticketId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadTicket() {
    try {
      const res = await fetch(`/api/support/${ticketId}`)
      if (!res.ok) throw new Error('Failed to load ticket')
      setTicket(await res.json())
    } catch {
      toast.error('Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages() {
    try {
      const res = await fetch(`/api/support/${ticketId}/messages`)
      if (!res.ok) throw new Error('Failed to load messages')
      setMessages(await res.json())
    } catch {
      console.error('Failed to load messages')
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return

    setSending(true)
    try {
      const res = await fetch(`/api/support/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyText.trim(),
          is_internal: isInternal,
          send_via_whatsapp: sendViaWhatsApp && !isInternal,
          message_type: isInternal ? 'internal_note' : 'reply',
        }),
      })
      if (!res.ok) throw new Error('Failed to send message')
      setReplyText('')
      await loadMessages()
      await loadTicket()
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function handleAssign(assigneeId: string) {
    try {
      const res = await fetch(`/api/support/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: assigneeId }),
      })
      if (!res.ok) throw new Error('Failed to assign')
      toast.success('Ticket assigned')
      await loadTicket()
      await loadMessages()
    } catch {
      toast.error('Failed to assign ticket')
    }
  }

  async function handleEscalate() {
    const reason = prompt('Escalation reason:')
    if (!reason) return
    try {
      const res = await fetch(`/api/support/${ticketId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error('Failed to escalate')
      toast.success('Ticket escalated')
      await loadTicket()
      await loadMessages()
    } catch {
      toast.error('Failed to escalate ticket')
    }
  }

  async function handleResolve() {
    try {
      const res = await fetch(`/api/support/${ticketId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: 'Resolved by agent' }),
      })
      if (!res.ok) throw new Error('Failed to resolve')
      toast.success('Ticket resolved')
      await loadTicket()
      await loadMessages()
    } catch {
      toast.error('Failed to resolve ticket')
    }
  }

  async function handleClose() {
    try {
      const res = await fetch(`/api/support/${ticketId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to close')
      toast.success('Ticket closed')
      await loadTicket()
      await loadMessages()
    } catch {
      toast.error('Failed to close ticket')
    }
  }

  async function handlePriorityChange(priority: TicketPriority) {
    try {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      })
      if (!res.ok) throw new Error('Failed to update priority')
      toast.success('Priority updated')
      await loadTicket()
    } catch {
      toast.error('Failed to update priority')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium">Ticket not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/support')}>
          Back to Support
        </Button>
      </div>
    )
  }

  const isOpen = !['resolved', 'closed'].includes(ticket.status)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/support')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {ticket.ticket_number}
            </span>
            <Badge variant={statusConfig[ticket.status].variant}>
              {statusConfig[ticket.status].label}
            </Badge>
            <Badge className={priorityConfig[ticket.priority].color}>
              {priorityConfig[ticket.priority].label}
            </Badge>
            {ticket.source !== 'manual' && (
              <Badge variant="outline" className="text-xs">
                {ticket.source.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold mt-1">{ticket.subject}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main content - Messages */}
        <div className="lg:col-span-2 space-y-4">
          {ticket.description && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {ticket.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Message Thread */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversation ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No messages yet
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-3 text-sm ${
                        msg.is_internal
                          ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
                          : msg.sender_type === 'system'
                          ? 'bg-muted/50 text-center text-xs text-muted-foreground'
                          : msg.sender_type === 'customer'
                          ? 'bg-blue-50 dark:bg-blue-950/20'
                          : 'bg-muted'
                      }`}
                    >
                      {msg.sender_type !== 'system' && (
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {msg.is_internal && <Lock className="h-3 w-3 text-yellow-600" />}
                            <span className="font-medium text-xs">
                              {msg.sender?.full_name ?? msg.sender_type}
                            </span>
                            {msg.is_internal && (
                              <Badge variant="outline" className="text-[10px] py-0">
                                Internal Note
                              </Badge>
                            )}
                            {msg.sent_via_whatsapp && (
                              <Badge variant="outline" className="text-[10px] py-0 text-green-600">
                                WhatsApp
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              {isOpen && (
                <>
                  <Separator className="my-4" />
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={isInternal ? 'Write an internal note...' : 'Type your reply...'}
                      rows={3}
                      className={isInternal ? 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/10' : ''}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="internal"
                            checked={isInternal}
                            onCheckedChange={setIsInternal}
                          />
                          <Label htmlFor="internal" className="text-xs flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Internal Note
                          </Label>
                        </div>
                        {!isInternal && ticket.contact && (
                          <div className="flex items-center gap-2">
                            <Switch
                              id="whatsapp"
                              checked={sendViaWhatsApp}
                              onCheckedChange={setSendViaWhatsApp}
                            />
                            <Label htmlFor="whatsapp" className="text-xs">
                              Send via WhatsApp
                            </Label>
                          </div>
                        )}
                      </div>
                      <Button type="submit" size="sm" disabled={sending || !replyText.trim()}>
                        <Send className="h-4 w-4 mr-1" />
                        {sending ? 'Sending...' : isInternal ? 'Add Note' : 'Send Reply'}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* SLA */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">SLA Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SLATimer
                dueAt={ticket.sla_first_response_due}
                breached={ticket.sla_first_response_breached}
                label="First Response"
              />
              <SLATimer
                dueAt={ticket.sla_resolution_due}
                breached={ticket.sla_resolution_breached}
                label="Resolution"
              />
            </CardContent>
          </Card>

          {/* Contact */}
          {ticket.contact && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{ticket.contact.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{ticket.contact.phone}</span>
                </div>
                {ticket.conversation_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => router.push(`/inbox?conversation=${ticket.conversation_id}`)}
                  >
                    View Conversation
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select
                  value={ticket.priority}
                  onValueChange={(v) => handlePriorityChange(v as TicketPriority)}
                  disabled={!isOpen}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Assigned To</Label>
                <Select
                  value={ticket.assigned_to ?? ''}
                  onValueChange={handleAssign}
                  disabled={!isOpen}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {ticket.category && (
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Tag className="h-3 w-3" />
                    <span className="text-sm">{ticket.category.name}</span>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="text-sm mt-1">
                  {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>

              {ticket.resolved_at && (
                <div>
                  <Label className="text-xs text-muted-foreground">Resolved</Label>
                  <p className="text-sm mt-1">
                    {format(new Date(ticket.resolved_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              )}

              {ticket.ai_suggested_category && (
                <div>
                  <Label className="text-xs text-muted-foreground">AI Suggestion</Label>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Category: {ticket.ai_suggested_category} |
                    Priority: {ticket.ai_suggested_priority} |
                    Confidence: {ticket.ai_confidence ? `${Math.round(ticket.ai_confidence * 100)}%` : '-'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {isOpen && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleEscalate}
                >
                  <ArrowUpCircle className="h-4 w-4 text-orange-500" />
                  Escalate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-green-600 hover:text-green-700"
                  onClick={handleResolve}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Resolve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleClose}
                >
                  <XCircle className="h-4 w-4" />
                  Close
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
