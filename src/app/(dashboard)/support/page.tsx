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
import { Plus, LayoutGrid, List, Settings, RefreshCw } from 'lucide-react'
import type { SupportTicket, TicketStatus } from '@/types/business-growth'

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TicketFilters>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('board')

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
      setTickets(Array.isArray(data) ? data : data.tickets ?? [])
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

      <TicketForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={loadTickets}
      />
    </div>
  )
}
