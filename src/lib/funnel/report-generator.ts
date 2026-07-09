import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FunnelReportData {
  executive_summary: string
  scorecard: {
    attract: { value: number; label: string; change_pct: number }
    capture: { value: number; label: string; change_pct: number }
    nurture: { value: number; label: string; change_pct: number }
    close: { value: number; label: string; change_pct: number }
    expand: { value: number; label: string; change_pct: number }
  }
  financials: {
    ad_spend: number
    revenue: number
    roi_multiple: number
    cost_per_customer: number
    avg_order_value: number
  }
  what_worked: string[]
  needs_attention: string[]
  recommendations: string[]
  lookalike_update: {
    customers_synced: number
    audience_reach: number
    lookalike_leads: number
    lookalike_pct: number
  } | null
  next_report_date: string
}

interface StageMetrics {
  stage: string
  contacts_entered: number
  contacts_converted: number
  contacts_dropped: number
  revenue_attributed_ngn: number
  cost_ngn: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcChangePct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function getNextReportDate(frequency: string): string {
  const now = new Date()
  switch (frequency) {
    case 'weekly': {
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7
      const next = new Date(now)
      next.setDate(now.getDate() + daysUntilMonday)
      return next.toISOString().split('T')[0]
    }
    case 'biweekly': {
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7
      const next = new Date(now)
      next.setDate(now.getDate() + daysUntilMonday + 7)
      return next.toISOString().split('T')[0]
    }
    case 'monthly': {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      return next.toISOString().split('T')[0]
    }
    default:
      return new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]
  }
}

async function aggregateStageMetrics(
  supabase: SupabaseClient,
  accountId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<Record<string, StageMetrics>> {
  const { data, error } = await supabase
    .from('funnel_stage_metrics')
    .select('stage, contacts_entered, contacts_converted, contacts_dropped, revenue_attributed_ngn, cost_ngn')
    .eq('account_id', accountId)
    .gte('period_start', periodStart.toISOString())
    .lte('period_end', periodEnd.toISOString())

  if (error) throw new Error(`Failed to fetch stage metrics: ${error.message}`)

  const result: Record<string, StageMetrics> = {}
  const stages = ['attract', 'capture', 'nurture', 'close', 'expand']
  for (const s of stages) {
    result[s] = { stage: s, contacts_entered: 0, contacts_converted: 0, contacts_dropped: 0, revenue_attributed_ngn: 0, cost_ngn: 0 }
  }

  for (const row of data ?? []) {
    const s = row.stage as string
    if (result[s]) {
      result[s].contacts_entered += row.contacts_entered ?? 0
      result[s].contacts_converted += row.contacts_converted ?? 0
      result[s].contacts_dropped += row.contacts_dropped ?? 0
      result[s].revenue_attributed_ngn += row.revenue_attributed_ngn ?? 0
      result[s].cost_ngn += row.cost_ngn ?? 0
    }
  }
  return result
}

async function getContactStats(
  supabase: SupabaseClient,
  accountId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{ newContacts: number; messagesReplied: number; dealsWon: number }> {
  const startISO = periodStart.toISOString()
  const endISO = periodEnd.toISOString()

  const { count: newContacts } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  const { count: messagesReplied } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('direction', 'inbound')
    .gte('created_at', startISO)
    .lte('created_at', endISO)

  // Deals won = contacts with status changed to 'customer' in period
  const { count: dealsWon } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('status', 'customer')
    .gte('updated_at', startISO)
    .lte('updated_at', endISO)

  return {
    newContacts: newContacts ?? 0,
    messagesReplied: messagesReplied ?? 0,
    dealsWon: dealsWon ?? 0,
  }
}

async function getLookalikeStats(
  supabase: SupabaseClient,
  accountId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<FunnelReportData['lookalike_update']> {
  const { data } = await supabase
    .from('lookalike_sync_log')
    .select('contact_count, meta_audience_id, estimated_reach')
    .eq('account_id', accountId)
    .eq('sync_status', 'ready')
    .gte('synced_at', periodStart.toISOString())
    .lte('synced_at', periodEnd.toISOString())

  if (!data || data.length === 0) return null

  const totalSynced = data.reduce((sum, r) => sum + (r.contact_count ?? 0), 0)
  const totalReach = data.reduce((sum, r) => sum + (r.estimated_reach ?? 0), 0)

  return {
    customers_synced: totalSynced,
    audience_reach: totalReach,
    lookalike_leads: 0, // Populated from Meta API when available
    lookalike_pct: totalReach > 0 ? Math.round((totalSynced / totalReach) * 100) : 0,
  }
}

// ---------------------------------------------------------------------------
// AI Recommendations via OpenRouter
// ---------------------------------------------------------------------------

interface AIRecommendationInput {
  industry: string
  currentMetrics: Record<string, StageMetrics>
  previousMetrics: Record<string, StageMetrics>
  contactStats: { newContacts: number; messagesReplied: number; dealsWon: number }
  financials: FunnelReportData['financials']
}

async function generateAIRecommendations(
  input: AIRecommendationInput,
): Promise<{
  executive_summary: string
  what_worked: string[]
  needs_attention: string[]
  recommendations: string[]
}> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return {
      executive_summary: 'Report generated without AI analysis. Configure OPENROUTER_API_KEY for AI-powered insights.',
      what_worked: ['Data collection is active across all funnel stages.'],
      needs_attention: ['AI analysis unavailable — configure API key for detailed insights.'],
      recommendations: ['Set up OpenRouter API key for AI-powered report recommendations.'],
    }
  }

  const prompt = `You are a marketing analyst for a Nigerian business (${input.industry} industry).
Analyze these funnel metrics and provide actionable insights.

Current Period Metrics:
${JSON.stringify(input.currentMetrics, null, 2)}

Previous Period Metrics:
${JSON.stringify(input.previousMetrics, null, 2)}

Contact Stats: ${input.contactStats.newContacts} new contacts, ${input.contactStats.messagesReplied} replies, ${input.contactStats.dealsWon} deals won

Financials: Ad spend N${input.financials.ad_spend.toLocaleString()}, Revenue N${input.financials.revenue.toLocaleString()}, ROI ${input.financials.roi_multiple}x

Respond in JSON format:
{
  "executive_summary": "2-3 sentence overview in plain English, mention key numbers",
  "what_worked": ["3-5 specific things that went well"],
  "needs_attention": ["2-4 areas that need improvement"],
  "recommendations": ["3-5 specific, actionable next steps"]
}

Keep language simple and friendly. Use Naira (N) for money. No jargon.`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      console.error('[funnel-report] OpenRouter error:', res.status)
      throw new Error('AI API error')
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content)

    return {
      executive_summary: parsed.executive_summary ?? 'Report generated successfully.',
      what_worked: Array.isArray(parsed.what_worked) ? parsed.what_worked : [],
      needs_attention: Array.isArray(parsed.needs_attention) ? parsed.needs_attention : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    }
  } catch (err) {
    console.error('[funnel-report] AI recommendation error:', err)
    return {
      executive_summary: 'Report generated. AI analysis was unavailable for this period.',
      what_worked: ['Funnel data is being tracked across all stages.'],
      needs_attention: ['Review metrics manually for this period.'],
      recommendations: ['Continue monitoring funnel performance.'],
    }
  }
}

// ---------------------------------------------------------------------------
// Main Report Generator
// ---------------------------------------------------------------------------

export async function generateFunnelReport(
  supabase: SupabaseClient,
  accountId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<FunnelReportData> {
  // 1. Get funnel config for industry context
  const { data: config } = await supabase
    .from('funnel_configs')
    .select('industry_preset, report_frequency')
    .eq('account_id', accountId)
    .maybeSingle()

  const industry = config?.industry_preset ?? 'general'
  const frequency = config?.report_frequency ?? 'weekly'

  // 2. Calculate previous period (same duration, immediately before)
  const periodDuration = periodEnd.getTime() - periodStart.getTime()
  const prevStart = new Date(periodStart.getTime() - periodDuration)
  const prevEnd = new Date(periodStart.getTime() - 1)

  // 3. Fetch metrics for both periods
  const [currentMetrics, previousMetrics] = await Promise.all([
    aggregateStageMetrics(supabase, accountId, periodStart, periodEnd),
    aggregateStageMetrics(supabase, accountId, prevStart, prevEnd),
  ])

  // 4. Fetch contact stats
  const contactStats = await getContactStats(supabase, accountId, periodStart, periodEnd)

  // 5. Calculate financials
  const totalAdSpend = Object.values(currentMetrics).reduce((s, m) => s + m.cost_ngn, 0)
  const totalRevenue = Object.values(currentMetrics).reduce((s, m) => s + m.revenue_attributed_ngn, 0)
  const customersWon = currentMetrics.close?.contacts_converted ?? 0

  const financials: FunnelReportData['financials'] = {
    ad_spend: totalAdSpend,
    revenue: totalRevenue,
    roi_multiple: totalAdSpend > 0 ? Math.round((totalRevenue / totalAdSpend) * 10) / 10 : 0,
    cost_per_customer: customersWon > 0 ? Math.round(totalAdSpend / customersWon) : 0,
    avg_order_value: customersWon > 0 ? Math.round(totalRevenue / customersWon) : 0,
  }

  // 6. Build scorecard
  const scorecard = {
    attract: {
      value: currentMetrics.attract?.contacts_entered ?? 0,
      label: 'Visitors',
      change_pct: calcChangePct(
        currentMetrics.attract?.contacts_entered ?? 0,
        previousMetrics.attract?.contacts_entered ?? 0,
      ),
    },
    capture: {
      value: currentMetrics.capture?.contacts_converted ?? 0,
      label: 'New Leads',
      change_pct: calcChangePct(
        currentMetrics.capture?.contacts_converted ?? 0,
        previousMetrics.capture?.contacts_converted ?? 0,
      ),
    },
    nurture: {
      value: contactStats.messagesReplied,
      label: 'Replies',
      change_pct: calcChangePct(
        currentMetrics.nurture?.contacts_converted ?? 0,
        previousMetrics.nurture?.contacts_converted ?? 0,
      ),
    },
    close: {
      value: contactStats.dealsWon,
      label: 'Customers',
      change_pct: calcChangePct(
        currentMetrics.close?.contacts_converted ?? 0,
        previousMetrics.close?.contacts_converted ?? 0,
      ),
    },
    expand: {
      value: currentMetrics.expand?.contacts_converted ?? 0,
      label: 'Reviews & Referrals',
      change_pct: calcChangePct(
        currentMetrics.expand?.contacts_converted ?? 0,
        previousMetrics.expand?.contacts_converted ?? 0,
      ),
    },
  }

  // 7. Get lookalike stats
  const lookalikeUpdate = await getLookalikeStats(supabase, accountId, periodStart, periodEnd)

  // 8. Generate AI recommendations
  const aiInsights = await generateAIRecommendations({
    industry,
    currentMetrics,
    previousMetrics,
    contactStats,
    financials,
  })

  return {
    executive_summary: aiInsights.executive_summary,
    scorecard,
    financials,
    what_worked: aiInsights.what_worked,
    needs_attention: aiInsights.needs_attention,
    recommendations: aiInsights.recommendations,
    lookalike_update: lookalikeUpdate,
    next_report_date: getNextReportDate(frequency),
  }
}
