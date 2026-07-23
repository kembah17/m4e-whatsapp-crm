"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Headphones,
  AlertTriangle,
  Clock,
  Star,
  TrendingUp,
  Building2,
} from 'lucide-react'

interface AccountSupportStats {
  account_id: string
  account_name: string
  total_tickets: number
  open_tickets: number
  sla_breached: number
  avg_resolution_hours: number | null
  avg_satisfaction: number | null
  critical_open: number
}

export default function AdminSupportPage() {
  const [stats, setStats] = useState<AccountSupportStats[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState({
    total: 0,
    open: 0,
    breached: 0,
    critical: 0,
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/support-stats')
        if (res.ok) {
          const data = await res.json()
          const list: AccountSupportStats[] = Array.isArray(data) ? data : data.accounts ?? []
          setStats(list)
          setTotals({
            total: list.reduce((s, a) => s + a.total_tickets, 0),
            open: list.reduce((s, a) => s + a.open_tickets, 0),
            breached: list.reduce((s, a) => s + a.sla_breached, 0),
            critical: list.reduce((s, a) => s + a.critical_open, 0),
          })
        }
      } catch {
        console.error('Failed to load admin support stats')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Support Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Cross-account support desk performance overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Headphones className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Total Tickets</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{totals.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Open</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{totals.open}</p>
          </CardContent>
        </Card>
        <Card className={totals.breached > 0 ? 'border-red-300' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="text-sm text-muted-foreground">SLA Breached</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{totals.breached}</p>
          </CardContent>
        </Card>
        <Card className={totals.critical > 0 ? 'border-red-300' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-muted-foreground">Critical Open</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{totals.critical}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Account Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Per-Account Breakdown
          </CardTitle>
          <CardDescription>Support performance by business account</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : stats.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No support data available yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Critical</TableHead>
                  <TableHead className="text-right">SLA Breached</TableHead>
                  <TableHead className="text-right">Avg Resolution</TableHead>
                  <TableHead className="text-right">CSAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((account) => (
                  <TableRow key={account.account_id}>
                    <TableCell className="font-medium">
                      {account.account_name}
                    </TableCell>
                    <TableCell className="text-right">{account.total_tickets}</TableCell>
                    <TableCell className="text-right">{account.open_tickets}</TableCell>
                    <TableCell className="text-right">
                      {account.critical_open > 0 ? (
                        <Badge variant="destructive">{account.critical_open}</Badge>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {account.sla_breached > 0 ? (
                        <Badge variant="destructive">{account.sla_breached}</Badge>
                      ) : (
                        '0'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {account.avg_resolution_hours != null
                        ? `${account.avg_resolution_hours}h`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {account.avg_satisfaction != null ? (
                        <div className="flex items-center justify-end gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {account.avg_satisfaction}/5
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
