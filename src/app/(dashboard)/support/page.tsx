"use client"

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SupportStats } from '@/components/support/support-stats'
import { TicketBoard } from '@/components/support/ticket-board'
import { TicketList } from '@/components/support/ticket-list'
import { TicketFiltersBar, type TicketFilters } from '@/components/support/ticket-filters'
import { TicketForm } from '@/components/support/ticket-form'
import { SupportSettings } from '@/components/support/support-settings'
import { Plus, LayoutGrid, List, Settings, RefreshCw, Headphones, MessageSquare, Clock, CheckCircle2, ArrowRight } from 'lucide-react'
import type { SupportTicket, TicketStatus } from '@/types/business-growth'

function EmptyState({ onCreateTicket }: { onCreateTicket: () => void }) {
  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Headphones className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Welcome to Support Desk</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Track and resolve customer support issues in one place. Create tickets from WhatsApp messages,
          phone calls, or walk-ins — then track them through to resolution with SLA monitoring.
        </p>
        <Button className="mt-6" onClick={onCreateTicket}>
          <Plus className="mr-2 h-4 w-4" />
          Create Your First Ticket
        </Button>
      </div>

      {/* How It Works */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            icon: MessageSquare,
            title: "Customer Reports Issue",
            description: "A customer contacts you via WhatsApp, phone, email, or walks in with a problem.",
          },
          {
            icon: Plus,
            title: "Create a Ticket",
            description: "Log the issue as a support ticket with priority level, category, and contact details.",
          },
          {
            icon: Clock,
            title: "Track & Resolve",
            description: "Move tickets through stages: Open → In Progress → Waiting → Resolved. SLA timers keep you accountable.",
          },
          {
            icon: CheckCircle2,
            title: "Close & Learn",
            description: "Mark resolved tickets as closed. Over time, spot patterns and prevent recurring issues.",
          },
        ].map((step, i) => (
          <div key={i} className="relative rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </div>
              <step.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold">{step.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
            {i < 3 && (
              <ArrowRight className="absolute -right-2.5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground/30 md:block" />
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="rounded-lg border bg-amber-500/5 p-4">
        <h3 className="text-sm font-semibold text-amber-600">💡 Tips for Getting Started</h3>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>• <strong>Set up categories first:</strong> Go to Settings tab to create ticket categories like "Billing", "Product Issue", "Delivery"</li>
          <li>• <strong>Configure SLA policies:</strong> Set response and resolution time targets for each priority level</li>
          <li>• <strong>Link to contacts:</strong> When creating tickets, link them to existing contacts for a complete customer history</li>
          <li>• <strong>Use the board view:</strong> Drag tickets between columns to update their status quickly</li>
        </ul>
      </div>
    </div>
  )
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TicketFilters>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('board')
  const [hasAnyTickets, setHasAnyTickets] = useState<boolean | null>(null)

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.priority) params.set('priority', filters.priority)
      if (filters.category_id) params.set('category_id', filters.category_id)
      if (filters.assigned_to) params.set('assigned_to', filters.assigned_to)
      if (filters.search) params.set('search', filters.search)

      const res = await fetch(`/api/support?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load tickets')
      const data = await res.json()
      const ticketList = Array.isArray(data) ? data : data.tickets ?? []
      setTickets(ticketList)
      // Track if account has ever had tickets (only on unfiltered load)
      if (!filters.status && !filters.priority && !filters.category_id && !filters.search) {
        setHasAnyTickets(ticketList.length > 0)
      }
    } catch (err) {
      console.error('Failed to load tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  function handleStatusChange(ticketId: string, newStatus: TicketStatus) {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    )
  }

  const showEmptyState = !loading && hasAnyTickets === false

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Desk</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer support tickets and SLA compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadTickets}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Ticket
          </Button>
        </div>
      </div>

      {showEmptyState ? (
        <EmptyState onCreateTicket={() => setCreateOpen(true)} />
      ) : (
        <>
          <SupportStats />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="board" className="gap-1">
                  <LayoutGrid className="h-4 w-4" /> Board
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-1">
                  <List className="h-4 w-4" /> List
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-1">
                  <Settings className="h-4 w-4" /> Settings
                </TabsTrigger>
              </TabsList>
            </div>

            {activeTab !== 'settings' && (
              <div className="mt-4">
                <TicketFiltersBar filters={filters} onChange={setFilters} />
              </div>
            )}

            <TabsContent value="board" className="mt-4">
              <TicketBoard
                tickets={tickets}
                loading={loading}
                onStatusChange={handleStatusChange}
              />
            </TabsContent>

            <TabsContent value="list" className="mt-4">
              <TicketList tickets={tickets} loading={loading} />
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <SupportSettings />
            </TabsContent>
          </Tabs>
        </>
      )}

      <TicketForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          loadTickets()
          setHasAnyTickets(true)
        }}
      />
    </div>
  )
}
