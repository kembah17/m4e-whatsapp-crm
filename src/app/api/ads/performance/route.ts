import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getCurrentAccount,
  toErrorResponse,
} from '@/lib/auth/account'
import type { PerformanceSummary, DailyPerformance, CampaignPerformanceRow } from '@/types/ads'

export const runtime = 'nodejs'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getDateRange(range: string, customStart?: string, customEnd?: string) {
  const end = new Date()
  const start = new Date()

  switch (range) {
    case '7d':
      start.setDate(end.getDate() - 7)
      break
    case '14d':
      start.setDate(end.getDate() - 14)
      break
    case '30d':
      start.setDate(end.getDate() - 30)
      break
    case '90d':
      start.setDate(end.getDate() - 90)
      break
    case 'custom':
      if (customStart) start.setTime(new Date(customStart).getTime())
      if (customEnd) end.setTime(new Date(customEnd).getTime())
      break
    default:
      start.setDate(end.getDate() - 30)
  }

  return {
    since: start.toISOString().split('T')[0],
    until: end.toISOString().split('T')[0],
  }
}

// GET /api/ads/performance — aggregated performance data
export async function GET(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount()
    const admin = getAdmin()
    const { searchParams } = new URL(req.url)

    const range = searchParams.get('range') || '30d'
    const customStart = searchParams.get('start') || undefined
    const customEnd = searchParams.get('end') || undefined
    const campaignId = searchParams.get('campaign_id') || undefined
    const adAccountId = searchParams.get('ad_account_id') || undefined

    const { since, until } = getDateRange(range, customStart, customEnd)

    // Build query for account-level snapshots (campaign_id IS NULL)
    // or campaign-level if campaign_id is specified
    let summaryQuery = admin
      .from('ad_performance_snapshots')
      .select('*')
      .eq('account_id', ctx.accountId)
      .gte('snapshot_date', since)
      .lte('snapshot_date', until)

    if (campaignId) {
      summaryQuery = summaryQuery.eq('campaign_id', campaignId)
    } else {
      summaryQuery = summaryQuery.is('campaign_id', null)
    }

    if (adAccountId) {
      summaryQuery = summaryQuery.eq('ad_account_id', adAccountId)
    }

    const { data: snapshots, error: snapErr } = await summaryQuery
      .order('snapshot_date', { ascending: true })

    if (snapErr) {
      return NextResponse.json({ error: snapErr.message }, { status: 500 })
    }

    const rows = snapshots || []

    // Calculate summary
    const summary: PerformanceSummary = {
      total_spend: 0,
      total_impressions: 0,
      total_clicks: 0,
      total_reach: 0,
      total_conversions: 0,
      avg_ctr: 0,
      avg_cpc: 0,
      avg_cpm: 0,
    }

    for (const row of rows) {
      summary.total_spend += Number(row.spend) || 0
      summary.total_impressions += Number(row.impressions) || 0
      summary.total_clicks += Number(row.clicks) || 0
      summary.total_reach += Number(row.reach) || 0
      summary.total_conversions += Number(row.conversions) || 0
    }

    if (summary.total_impressions > 0) {
      summary.avg_ctr =
        (summary.total_clicks / summary.total_impressions) * 100
      summary.avg_cpm =
        (summary.total_spend / summary.total_impressions) * 1000
    }
    if (summary.total_clicks > 0) {
      summary.avg_cpc = summary.total_spend / summary.total_clicks
    }

    // Daily breakdown
    const daily: DailyPerformance[] = rows.map((r) => ({
      date: r.snapshot_date,
      impressions: Number(r.impressions) || 0,
      clicks: Number(r.clicks) || 0,
      spend: Number(r.spend) || 0,
      reach: Number(r.reach) || 0,
      conversions: Number(r.conversions) || 0,
    }))

    // Campaign breakdown (fetch campaign-level snapshots)
    let campaigns: CampaignPerformanceRow[] = []
    if (!campaignId) {
      const { data: campaignSnapshots } = await admin
        .from('ad_performance_snapshots')
        .select('*, ad_campaigns!inner(name, status, objective, meta_campaign_id)')
        .eq('account_id', ctx.accountId)
        .not('campaign_id', 'is', null)
        .gte('snapshot_date', since)
        .lte('snapshot_date', until)

      // Aggregate by campaign
      const campaignMap = new Map<string, CampaignPerformanceRow>()
      for (const snap of campaignSnapshots || []) {
        const cid = snap.campaign_id as string
        const campData = snap.ad_campaigns as { name: string; status: string | null; objective: string | null }
        const existing = campaignMap.get(cid)
        if (existing) {
          existing.impressions += Number(snap.impressions) || 0
          existing.clicks += Number(snap.clicks) || 0
          existing.spend += Number(snap.spend) || 0
          existing.reach += Number(snap.reach) || 0
          existing.conversions += Number(snap.conversions) || 0
        } else {
          campaignMap.set(cid, {
            campaign_id: cid,
            campaign_name: campData?.name || 'Unknown',
            status: campData?.status || null,
            objective: campData?.objective || null,
            impressions: Number(snap.impressions) || 0,
            clicks: Number(snap.clicks) || 0,
            spend: Number(snap.spend) || 0,
            reach: Number(snap.reach) || 0,
            conversions: Number(snap.conversions) || 0,
            ctr: 0,
            cpc: 0,
            cpm: 0,
          })
        }
      }

      // Calculate derived metrics per campaign
      campaigns = Array.from(campaignMap.values()).map((c) => {
        if (c.impressions > 0) {
          c.ctr = (c.clicks / c.impressions) * 100
          c.cpm = (c.spend / c.impressions) * 1000
        }
        if (c.clicks > 0) {
          c.cpc = c.spend / c.clicks
        }
        return c
      })

      campaigns.sort((a, b) => b.spend - a.spend)
    }

    return NextResponse.json({ summary, daily, campaigns })
  } catch (err) {
    return toErrorResponse(err)
  }
}
