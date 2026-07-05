"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Shield,
  TrendingUp,
  XCircle,
} from "lucide-react"

interface WarmupState {
  id: string
  phone_number_id: string
  current_tier: number
  conversations_today: number
  quality_rating: string
  is_auto_throttled: boolean
  marketing_paused: boolean
  tier_started_at: string
  updated_at: string
}

interface TemplateBlockRate {
  id: string
  template_name: string
  total_sent: number
  total_blocked: number
  block_rate: number
  is_auto_disabled: boolean
  disabled_at: string | null
}

interface FrequencyStats {
  total_marketing_sent_7d: number
  contacts_at_cap: number
}

const TIER_LIMITS: Record<number, number> = {
  1: 250,
  2: 1000,
  3: 10000,
  4: 100000,
  5: Infinity,
}

const TIER_NAMES: Record<number, string> = {
  1: "Tier 1 (250/day)",
  2: "Tier 2 (1K/day)",
  3: "Tier 3 (10K/day)",
  4: "Tier 4 (100K/day)",
  5: "Unlimited",
}

function QualityBadge({ rating }: { rating: string }) {
  if (rating === "GREEN")
    return (
      <Badge className="bg-green-600 text-white">
        <CheckCircle2 className="mr-1 h-3 w-3" /> GREEN
      </Badge>
    )
  if (rating === "YELLOW")
    return (
      <Badge className="bg-yellow-500 text-black">
        <AlertTriangle className="mr-1 h-3 w-3" /> YELLOW
      </Badge>
    )
  if (rating === "RED")
    return (
      <Badge className="bg-red-600 text-white">
        <XCircle className="mr-1 h-3 w-3" /> RED
      </Badge>
    )
  return <Badge variant="outline">{rating}</Badge>
}

export function BanAvoidanceDashboard({ accountId }: { accountId: string }) {
  const [warmupStates, setWarmupStates] = useState<WarmupState[]>([])
  const [blockRates, setBlockRates] = useState<TemplateBlockRate[]>([])
  const [freqStats, setFreqStats] = useState<FrequencyStats>({
    total_marketing_sent_7d: 0,
    contacts_at_cap: 0,
  })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load warmup states
      const { data: warmup } = await supabase
        .from("number_warmup_state")
        .select("*")
        .eq("account_id", accountId)
        .order("updated_at", { ascending: false })
      setWarmupStates(warmup ?? [])

      // Load template block rates
      const { data: blocks } = await supabase
        .from("template_block_rates")
        .select("*")
        .eq("account_id", accountId)
        .order("block_rate", { ascending: false })
      setBlockRates(blocks ?? [])

      // Load marketing frequency stats
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString()
      const { count: totalMarketing } = await supabase
        .from("marketing_frequency_log")
        .select("*", { count: "exact", head: true })
        .eq("account_id", accountId)
        .gte("sent_at", sevenDaysAgo)

      // Count contacts at frequency cap (2+ marketing messages in 7 days)
      const { data: freqData } = await supabase
        .from("marketing_frequency_log")
        .select("contact_id")
        .eq("account_id", accountId)
        .gte("sent_at", sevenDaysAgo)

      const contactCounts = new Map<string, number>()
      for (const row of freqData ?? []) {
        contactCounts.set(
          row.contact_id,
          (contactCounts.get(row.contact_id) ?? 0) + 1
        )
      }
      const atCap = Array.from(contactCounts.values()).filter(
        (c) => c >= 2
      ).length

      setFreqStats({
        total_marketing_sent_7d: totalMarketing ?? 0,
        contacts_at_cap: atCap,
      })
    } catch (err) {
      console.error("Failed to load ban avoidance data:", err)
    } finally {
      setLoading(false)
    }
  }, [accountId, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const disabledTemplates = blockRates.filter((b) => b.is_auto_disabled)
  const highRiskTemplates = blockRates.filter(
    (b) => !b.is_auto_disabled && b.block_rate > 0.01
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Ban Avoidance Engine
          </h2>
          <p className="text-muted-foreground">
            Monitor and enforce Meta&apos;s WhatsApp Business Platform rules
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Phone Numbers
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warmupStates.length}</div>
            <p className="text-xs text-muted-foreground">Active numbers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Marketing (7d)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {freqStats.total_marketing_sent_7d}
            </div>
            <p className="text-xs text-muted-foreground">
              {freqStats.contacts_at_cap} contacts at cap
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Disabled Templates
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {disabledTemplates.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {highRiskTemplates.length} at risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quality Status
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-1">
              {warmupStates.length === 0 ? (
                <span className="text-sm text-muted-foreground">No data</span>
              ) : (
                warmupStates.map((w) => (
                  <QualityBadge key={w.id} rating={w.quality_rating} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warm-up State per Phone Number */}
      <Card>
        <CardHeader>
          <CardTitle>Number Warm-up Status</CardTitle>
          <CardDescription>
            Current tier, daily usage, and quality rating per phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
          {warmupStates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No phone numbers registered yet. Send your first message to
              initialize.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number ID</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Today&apos;s Sends</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Throttled</TableHead>
                  <TableHead>Marketing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warmupStates.map((w) => {
                  const limit = TIER_LIMITS[w.current_tier] ?? 250
                  const pct =
                    limit === Infinity
                      ? 0
                      : Math.round((w.conversations_today / limit) * 100)
                  return (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs">
                        {w.phone_number_id}
                      </TableCell>
                      <TableCell>{TIER_NAMES[w.current_tier]}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                pct > 80
                                  ? "bg-red-500"
                                  : pct > 50
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs">
                            {w.conversations_today}/
                            {limit === Infinity ? "∞" : limit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <QualityBadge rating={w.quality_rating} />
                      </TableCell>
                      <TableCell>
                        {w.is_auto_throttled ? (
                          <Badge variant="destructive">Throttled</Badge>
                        ) : (
                          <Badge variant="outline">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {w.marketing_paused ? (
                          <Badge variant="destructive">Paused</Badge>
                        ) : (
                          <Badge className="bg-green-600 text-white">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Template Block Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Template Block Rates</CardTitle>
          <CardDescription>
            Templates auto-disabled when block rate exceeds 1.5% with 1000+
            sends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blockRates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No template send data yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Blocked</TableHead>
                  <TableHead>Block Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockRates.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-sm">
                      {b.template_name}
                    </TableCell>
                    <TableCell>{b.total_sent.toLocaleString()}</TableCell>
                    <TableCell>{b.total_blocked.toLocaleString()}</TableCell>
                    <TableCell>
                      <span
                        className={`font-medium ${
                          b.block_rate > 0.015
                            ? "text-red-500"
                            : b.block_rate > 0.01
                              ? "text-yellow-500"
                              : "text-green-500"
                        }`}
                      >
                        {(b.block_rate * 100).toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {b.is_auto_disabled ? (
                        <Badge variant="destructive">Disabled</Badge>
                      ) : b.block_rate > 0.01 ? (
                        <Badge className="bg-yellow-500 text-black">
                          At Risk
                        </Badge>
                      ) : (
                        <Badge variant="outline">OK</Badge>
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
