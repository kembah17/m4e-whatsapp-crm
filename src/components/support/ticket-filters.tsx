"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, X, Filter } from 'lucide-react'
import type { TicketStatus, TicketPriority, TicketCategory } from '@/types/business-growth'

export interface TicketFilters {
  status?: string
  priority?: string
  category_id?: string
  assigned_to?: string
  sla_breached?: string
  search?: string
}

interface TicketFiltersBarProps {
  filters: TicketFilters
  onChange: (filters: TicketFilters) => void
  teamMembers?: Array<{ id: string; full_name: string }>
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_customer', label: 'Waiting on Customer' },
  { value: 'waiting_internal', label: 'Waiting Internal' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_OPTIONS: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-400' },
]

export function TicketFiltersBar({ filters, onChange, teamMembers }: TicketFiltersBarProps) {
  const [categories, setCategories] = useState<TicketCategory[]>([])

  useEffect(() => {
    fetch('/api/support/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error)
  }, [])

  const activeCount = Object.values(filters).filter((v) => v && v !== '').length

  function clearFilters() {
    onChange({})
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tickets..."
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status ?? ''}
        onValueChange={(v) => onChange({ ...filters, status: v || undefined })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Statuses</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority ?? ''}
        onValueChange={(v) => onChange({ ...filters, priority: v || undefined })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Priorities</SelectItem>
          {PRIORITY_OPTIONS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${p.color}`} />
                {p.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category_id ?? ''}
        onValueChange={(v) => onChange({ ...filters, category_id: v || undefined })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {teamMembers && teamMembers.length > 0 && (
        <Select
          value={filters.assigned_to ?? ''}
          onValueChange={(v) => onChange({ ...filters, assigned_to: v || undefined })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Assigned To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Agents</SelectItem>
            {teamMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        variant={filters.sla_breached === 'true' ? 'destructive' : 'outline'}
        size="sm"
        onClick={() =>
          onChange({
            ...filters,
            sla_breached: filters.sla_breached === 'true' ? undefined : 'true',
          })
        }
      >
        SLA Breached
      </Button>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-3 w-3" />
          Clear ({activeCount})
        </Button>
      )}
    </div>
  )
}

export { STATUS_OPTIONS, PRIORITY_OPTIONS }
