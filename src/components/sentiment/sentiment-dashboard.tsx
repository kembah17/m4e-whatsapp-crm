"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SentimentBadge } from "./sentiment-badge"
import { Loader2, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react"

interface SentimentStats {
  distribution: { positive: number; neutral: number; negative: number; urgent: number }
  total: number
  avgScore: number
  flagged: Array<{
    conversation_id: string
    sentiment: string
    score: number
    analyzed_at: string
    contact_id: string
  }>
}

export function SentimentDashboard() {
  const [stats, setStats] = useState<SentimentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (dateFilter) params.set("since", dateFilter)
      const res = await fetch(`/api/sentiment/stats?${params}`)
      if (res.ok) setStats(await res.json())
    } catch {
      toast.error("Failed to load sentiment data")
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const dist = stats?.distribution || { positive: 0, neutral: 0, negative: 0, urgent: 0 }
  const total = stats?.total || 0

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Analyzed</p>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">\ud83d\udfe2 Positive</p>
            <p className="text-2xl font-bold text-green-500">{dist.positive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">\ud83d\udfe1 Neutral</p>
            <p className="text-2xl font-bold text-yellow-500">{dist.neutral}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">\ud83d\udd34 Negative</p>
            <p className="text-2xl font-bold text-red-500">{dist.negative}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">\ud83d\udea8 Urgent</p>
            <p className="text-2xl font-bold text-red-600">{dist.urgent}</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Bar */}
      {total > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Sentiment Distribution
            </CardTitle>
            <div className="flex gap-2">
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
            <div className="flex h-8 overflow-hidden rounded-full bg-muted">
              {dist.positive > 0 && (
                <div
                  className="bg-green-500 transition-all flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(dist.positive / total) * 100}%` }}
                >
                  {Math.round((dist.positive / total) * 100)}%
                </div>
              )}
              {dist.neutral > 0 && (
                <div
                  className="bg-yellow-500 transition-all flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(dist.neutral / total) * 100}%` }}
                >
                  {Math.round((dist.neutral / total) * 100)}%
                </div>
              )}
              {dist.negative > 0 && (
                <div
                  className="bg-red-500 transition-all flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(dist.negative / total) * 100}%` }}
                >
                  {Math.round((dist.negative / total) * 100)}%
                </div>
              )}
              {dist.urgent > 0 && (
                <div
                  className="bg-red-700 transition-all flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${(dist.urgent / total) * 100}%` }}
                >
                  {Math.round((dist.urgent / total) * 100)}%
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Positive ({dist.positive})
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-yellow-500" /> Neutral ({dist.neutral})
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Negative ({dist.negative})
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-700" /> Urgent ({dist.urgent})
              </span>
            </div>
            {stats?.avgScore !== undefined && (
              <p className="mt-2 text-sm text-muted-foreground">
                Average sentiment score: <span className="font-medium text-foreground">{stats.avgScore}</span>
                <span className="text-xs"> (-1 = very negative, +1 = very positive)</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Flagged Conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Flagged Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!stats?.flagged?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No flagged conversations. Negative and urgent messages will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.flagged.map((f, i) => (
                <div key={`${f.conversation_id}-${i}`} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <SentimentBadge sentiment={f.sentiment} />
                    <div>
                      <p className="text-sm font-medium">Conversation</p>
                      <p className="text-xs text-muted-foreground">
                        Score: {f.score} · {new Date(f.analyzed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
