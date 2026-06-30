import type { SupabaseClient } from '@supabase/supabase-js'
import { estimateBroadcastCost } from '@/lib/whatsapp/cost-calculator'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CampaignReport {
  campaign_id: string
  campaign_name: string
  template_name: string
  started_at: string
  completed_at: string
  total_recipients: number
  sent: number
  delivered: number
  read: number
  replied: number
  failed: number
  delivery_rate: number
  read_rate: number
  reply_rate: number
  estimated_cost_ngn: number
  estimated_cost_usd: number
  errors: Array<{ phone: string; error: string; timestamp: string }>
  hourly_breakdown: Array<{ hour: string; sent: number; delivered: number; read: number }>
}

interface CampaignStatsRPC {
  total: number
  queued: number
  sent: number
  delivered: number
  read: number
  replied: number
  failed: number
  hourly: Array<{ hour: string; sent: number; delivered: number; read_count: number }> | null
}

// ---------------------------------------------------------------------------
// Report Generator
// ---------------------------------------------------------------------------

export async function generateCampaignReport(
  campaignId: string,
  supabase: SupabaseClient
): Promise<CampaignReport> {
  // 1. Fetch campaign with template join
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*, campaign_templates(name, category)')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? 'Campaign not found')
  }

  // 2. Call the get_campaign_stats RPC
  const { data: stats, error: statsError } = await supabase
    .rpc('get_campaign_stats', { p_campaign_id: campaignId })

  if (statsError) {
    throw new Error(`Failed to fetch stats: ${statsError.message}`)
  }

  const s: CampaignStatsRPC = stats ?? {
    total: 0, queued: 0, sent: 0, delivered: 0,
    read: 0, replied: 0, failed: 0, hourly: null,
  }

  // 3. Fetch error details
  const { data: errorRows } = await supabase
    .from('campaign_message_log')
    .select('phone, error_message, created_at')
    .eq('campaign_id', campaignId)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(100)

  const errors = (errorRows ?? []).map((row) => ({
    phone: row.phone ?? 'Unknown',
    error: row.error_message ?? 'Unknown error',
    timestamp: row.created_at ?? '',
  }))

  // 4. Calculate costs
  const templateCategory = campaign.campaign_templates?.category ?? 'marketing'
  const costEstimate = estimateBroadcastCost(s.sent, templateCategory)

  // 5. Format hourly breakdown
  const hourly = (s.hourly ?? []).map((h) => ({
    hour: h.hour,
    sent: h.sent ?? 0,
    delivered: h.delivered ?? 0,
    read: h.read_count ?? 0,
  }))

  // 6. Calculate rates
  const deliveryRate = s.sent > 0 ? s.delivered / s.sent : 0
  const readRate = s.delivered > 0 ? s.read / s.delivered : 0
  const replyRate = s.delivered > 0 ? s.replied / s.delivered : 0

  return {
    campaign_id: campaignId,
    campaign_name: campaign.name ?? 'Untitled Campaign',
    template_name: campaign.campaign_templates?.name ?? 'Custom',
    started_at: campaign.started_at ?? campaign.created_at ?? '',
    completed_at: campaign.completed_at ?? '',
    total_recipients: s.total,
    sent: s.sent,
    delivered: s.delivered,
    read: s.read,
    replied: s.replied,
    failed: s.failed,
    delivery_rate: deliveryRate,
    read_rate: readRate,
    reply_rate: replyRate,
    estimated_cost_ngn: costEstimate.cost_ngn,
    estimated_cost_usd: costEstimate.cost_usd,
    errors,
    hourly_breakdown: hourly,
  }
}

// ---------------------------------------------------------------------------
// CSV Formatter
// ---------------------------------------------------------------------------

export function formatReportAsCSV(report: CampaignReport): string {
  const lines: string[] = []

  // Summary section
  lines.push('Campaign Report Summary')
  lines.push(`Campaign Name,"${escapeCsv(report.campaign_name)}"`)
  lines.push(`Template,"${escapeCsv(report.template_name)}"`)
  lines.push(`Started,"${report.started_at}"`)
  lines.push(`Completed,"${report.completed_at}"`)
  lines.push(`Total Recipients,${report.total_recipients}`)
  lines.push(`Sent,${report.sent}`)
  lines.push(`Delivered,${report.delivered}`)
  lines.push(`Read,${report.read}`)
  lines.push(`Replied,${report.replied}`)
  lines.push(`Failed,${report.failed}`)
  lines.push(`Delivery Rate,${(report.delivery_rate * 100).toFixed(1)}%`)
  lines.push(`Read Rate,${(report.read_rate * 100).toFixed(1)}%`)
  lines.push(`Reply Rate,${(report.reply_rate * 100).toFixed(1)}%`)
  lines.push(`Estimated Cost (NGN),${report.estimated_cost_ngn.toFixed(2)}`)
  lines.push(`Estimated Cost (USD),${report.estimated_cost_usd.toFixed(2)}`)
  lines.push('')

  // Hourly breakdown
  lines.push('Hourly Breakdown')
  lines.push('Hour,Sent,Delivered,Read')
  for (const h of report.hourly_breakdown) {
    lines.push(`"${h.hour}",${h.sent},${h.delivered},${h.read}`)
  }
  lines.push('')

  // Error log
  lines.push('Error Log')
  lines.push('Phone,Error,Timestamp')
  for (const e of report.errors) {
    lines.push(`"${escapeCsv(e.phone)}","${escapeCsv(e.error)}","${e.timestamp}"`)
  }

  return lines.join('\n')
}

function escapeCsv(value: string): string {
  return value.replace(/"/g, '""')
}

// ---------------------------------------------------------------------------
// Markdown Formatter
// ---------------------------------------------------------------------------

export function formatReportAsMarkdown(report: CampaignReport): string {
  const lines: string[] = []

  lines.push(`# Campaign Report: ${report.campaign_name}`)
  lines.push('')
  lines.push(`**Template:** ${report.template_name}`)
  lines.push(`**Started:** ${report.started_at ? formatDateMd(report.started_at) : 'N/A'}`)
  lines.push(`**Completed:** ${report.completed_at ? formatDateMd(report.completed_at) : 'In Progress'}`)
  lines.push('')

  // Performance summary
  lines.push('## Performance Summary')
  lines.push('')
  lines.push('| Metric | Count | Rate |')
  lines.push('|--------|------:|-----:|')
  lines.push(`| Total Recipients | ${report.total_recipients} | - |`)
  lines.push(`| Sent | ${report.sent} | - |`)
  lines.push(`| Delivered | ${report.delivered} | ${(report.delivery_rate * 100).toFixed(1)}% |`)
  lines.push(`| Read | ${report.read} | ${(report.read_rate * 100).toFixed(1)}% |`)
  lines.push(`| Replied | ${report.replied} | ${(report.reply_rate * 100).toFixed(1)}% |`)
  lines.push(`| Failed | ${report.failed} | - |`)
  lines.push('')

  // Cost breakdown
  lines.push('## Cost Breakdown')
  lines.push('')
  lines.push(`- **Estimated Cost (NGN):** \u20A6${report.estimated_cost_ngn.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`)
  lines.push(`- **Estimated Cost (USD):** $${report.estimated_cost_usd.toFixed(2)}`)
  lines.push('')

  // Hourly breakdown
  if (report.hourly_breakdown.length > 0) {
    lines.push('## Hourly Breakdown')
    lines.push('')
    lines.push('| Hour | Sent | Delivered | Read |')
    lines.push('|------|-----:|----------:|-----:|')
    for (const h of report.hourly_breakdown) {
      lines.push(`| ${formatDateMd(h.hour)} | ${h.sent} | ${h.delivered} | ${h.read} |`)
    }
    lines.push('')
  }

  // Error log
  if (report.errors.length > 0) {
    lines.push('## Error Log')
    lines.push('')
    lines.push(`${report.errors.length} error(s) recorded.`)
    lines.push('')
    lines.push('| Phone | Error | Time |')
    lines.push('|-------|-------|------|')
    for (const e of report.errors.slice(0, 50)) {
      lines.push(`| ${e.phone} | ${e.error} | ${formatDateMd(e.timestamp)} |`)
    }
    if (report.errors.length > 50) {
      lines.push('')
      lines.push(`_...and ${report.errors.length - 50} more errors._`)
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('_Report generated by Marketing4Effect CRM_')

  return lines.join('\n')
}

function formatDateMd(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}
