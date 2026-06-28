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
import { Loader2, RefreshCw, TrendingUp, Users, Megaphone, MousePointerClick } from "lucide-react"

interface CTWALead {
  id: string
  contact_id: string | null
  source_url: string | null
  source_type: string | null
  source_id: string | null
  headline: string | null
  body: string | null
  media_type: string | null
  ctwa_clid: string | null
  created_at: string
  contacts?: { name: string | null; phone: string | null } | null
}

interface CTWAStats {
  total: number
  today: number
  bySource: { ad: number; post: number }
}

export function CTWADashboard() {
  const [stats, setStats] = useState<CTWAStats | null>(null)
  const [leads, setLeads] = useState<CTWALead[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (sourceFilter !== "all") params.set("source_type", sourceFilter)
      if (dateFilter) params.set("since", dateFilter)
      params.set("limit", "100")

      const [statsRes, leadsRes] = await Promise.all([
        fetch("/api/ctwa/stats"),
        fetch(`/api/ctwa/leads?${params}`),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setLeads(data.leads ?? [])
      }
    } catch {
      toast.error("Failed to load CTWA data")
    } finally {
      setLoading(false)
    }
  }, [sourceFilter, dateFilter])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{stats?.total ?? "-"}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{stats?.today ?? "-"}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">From Ads</p>
                <p className="text-2xl font-bold">{stats?.bySource.ad ?? "-"}</p>
              </div>
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">From Posts</p>
                <p className="text-2xl font-bold">{stats?.bySource.post ?? "-"}</p>
              </div>
              <MousePointerClick className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Distribution Bar */}
      {stats && stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-6 overflow-hidden rounded-full bg-muted">
              {stats.bySource.ad > 0 && (
                <div
                  className="bg-blue-500 transition-all"
                  style={{ width: `${(stats.bySource.ad / stats.total) * 100}%` }}
                  title={`Ads: ${stats.bySource.ad}`}
                />
              )}
              {stats.bySource.post > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(stats.bySource.post / stats.total) * 100}%` }}
                  title={`Posts: ${stats.bySource.post}`}
                />
              )}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Ads ({stats.bySource.ad})
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Posts ({stats.bySource.post})
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + Leads Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ad Leads</CardTitle>
          <div className="flex gap-2">
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v ?? "all")}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="ad">Ads</SelectItem>
                <SelectItem value="post">Posts</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-[150px] h-8"
            />
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No CTWA leads yet. Leads appear when customers click your WhatsApp ads.
            </p>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {lead.contacts?.name || lead.contacts?.phone || "Unknown"}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {lead.source_type || "unknown"}
                      </Badge>
                    </div>
                    {lead.headline && (
                      <p className="text-sm text-muted-foreground truncate">{lead.headline}</p>
                    )}
                    {lead.source_id && (
                      <p className="text-xs text-muted-foreground">Ad ID: {lead.source_id}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
