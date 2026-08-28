import type { SupabaseClient } from '@supabase/supabase-js'
import { sendTransactionalEmail } from '@/lib/email/brevo-api'
import { decrypt } from '@/lib/whatsapp/encryption'
import { sendTextMessage } from '@/lib/whatsapp/meta-api'
import { sanitizePhoneForMeta } from '@/lib/whatsapp/phone-utils'
import type { FunnelReportData } from './report-generator'

// ---------------------------------------------------------------------------
// WhatsApp Summary Formatter
// ---------------------------------------------------------------------------

function formatWhatsAppSummary(report: FunnelReportData): string {
  const { scorecard, financials } = report
  const roi = financials.roi_multiple > 0 ? `${financials.roi_multiple}x` : 'N/A'

  const lines = [
    '\ud83d\udcca *Your Funnel Report is Ready!*',
    '',
    `\ud83d\udcb0 Revenue: N${financials.revenue.toLocaleString()}`,
    `\ud83d\udcc8 ROI: ${roi}`,
    `\ud83d\udc65 New Leads: ${scorecard.capture.value}`,
    `\u2705 New Customers: ${scorecard.close.value}`,
    `\u2b50 Reviews & Referrals: ${scorecard.expand.value}`,
    '',
    `\ud83d\udd0d Top Insight: ${report.recommendations[0] ?? 'Check your dashboard for details.'}`,
    '',
    `\ud83d\udcc5 Next report: ${report.next_report_date}`,
    '',
    'View full report in your dashboard \ud83d\udc49',
  ]

  return lines.join('\n').slice(0, 1000)
}

// ---------------------------------------------------------------------------
// Email HTML Template
// ---------------------------------------------------------------------------

function formatEmailHTML(report: FunnelReportData, accountName: string): string {
  const { scorecard, financials } = report

  const stageRow = (label: string, data: { value: number; change_pct: number }) => {
    const arrow = data.change_pct > 0 ? '\u25b2' : data.change_pct < 0 ? '\u25bc' : '\u25cf'
    const color = data.change_pct > 0 ? '#22c55e' : data.change_pct < 0 ? '#ef4444' : '#6b7280'
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${data.value.toLocaleString()}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:${color}">${arrow} ${Math.abs(data.change_pct)}%</td>
    </tr>`
  }

  const listItems = (items: string[]) =>
    items.map(i => `<li style="margin-bottom:6px">${i}</li>`).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:#1e1b4b;padding:24px;text-align:center">
      <h1 style="color:#d4af37;margin:0;font-size:22px">Funnel Performance Report</h1>
      <p style="color:#c7d2fe;margin:8px 0 0;font-size:14px">${accountName}</p>
    </div>

    <div style="padding:24px">
      <h2 style="color:#1e1b4b;font-size:18px;margin:0 0 12px">Executive Summary</h2>
      <p style="color:#374151;line-height:1.6;margin:0 0 24px">${report.executive_summary}</p>

      <h2 style="color:#1e1b4b;font-size:18px;margin:0 0 12px">Funnel Scorecard</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6b7280">Stage</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280">Value</th>
            <th style="padding:8px 12px;text-align:right;font-size:13px;color:#6b7280">Change</th>
          </tr>
        </thead>
        <tbody>
          ${stageRow('Attract (Visitors)', scorecard.attract)}
          ${stageRow('Capture (Leads)', scorecard.capture)}
          ${stageRow('Nurture (Replies)', scorecard.nurture)}
          ${stageRow('Close (Customers)', scorecard.close)}
          ${stageRow('Expand (Reviews)', scorecard.expand)}
        </tbody>
      </table>

      <h2 style="color:#1e1b4b;font-size:18px;margin:0 0 12px">Money In vs Money Out</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr><td style="padding:6px 0;color:#6b7280">Ad Spend</td><td style="text-align:right;font-weight:600">N${financials.ad_spend.toLocaleString()}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Revenue</td><td style="text-align:right;font-weight:600;color:#22c55e">N${financials.revenue.toLocaleString()}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">ROI</td><td style="text-align:right;font-weight:600">${financials.roi_multiple}x</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Cost per Customer</td><td style="text-align:right;font-weight:600">N${financials.cost_per_customer.toLocaleString()}</td></tr>
      </table>

      <h2 style="color:#22c55e;font-size:16px;margin:0 0 8px">What Worked</h2>
      <ul style="color:#374151;line-height:1.6;padding-left:20px;margin:0 0 16px">${listItems(report.what_worked)}</ul>

      <h2 style="color:#f59e0b;font-size:16px;margin:0 0 8px">Needs Attention</h2>
      <ul style="color:#374151;line-height:1.6;padding-left:20px;margin:0 0 16px">${listItems(report.needs_attention)}</ul>

      <h2 style="color:#3b82f6;font-size:16px;margin:0 0 8px">Recommendations</h2>
      <ul style="color:#374151;line-height:1.6;padding-left:20px;margin:0 0 24px">${listItems(report.recommendations)}</ul>

      <p style="color:#6b7280;font-size:13px;text-align:center;margin:24px 0 0">
        Next report: ${report.next_report_date} | Powered by Marketing4Effect
      </p>
    </div>
  </div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Delivery Functions
// ---------------------------------------------------------------------------

async function deliverViaWhatsApp(
  supabase: SupabaseClient,
  accountId: string,
  report: FunnelReportData,
): Promise<void> {
  const { data: waConfig } = await supabase
    .from('whatsapp_config')
    .select('access_token, phone_number_id, owner_phone')
    .eq('account_id', accountId)
    .maybeSingle()

  if (!waConfig?.access_token || !waConfig?.phone_number_id || !waConfig?.owner_phone) {
    console.warn('[report-delivery] WhatsApp config incomplete for account', accountId)
    return
  }

  const accessToken = decrypt(waConfig.access_token)
  const phoneNumberId = waConfig.phone_number_id
  const ownerPhone = sanitizePhoneForMeta(waConfig.owner_phone)

  const summary = formatWhatsAppSummary(report)

  await sendTextMessage({
    accessToken,
    phoneNumberId,
    to: ownerPhone,
    text: summary,
  })
}

async function deliverViaEmail(
  supabase: SupabaseClient,
  accountId: string,
  report: FunnelReportData,
): Promise<void> {
  const { data: emailConfig } = await supabase
    .from('email_config')
    .select('api_key, sender_name, sender_email')
    .eq('account_id', accountId)
    .maybeSingle()

  if (!emailConfig?.api_key || !emailConfig?.sender_email) {
    console.warn('[report-delivery] Email config incomplete for account', accountId)
    return
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('name')
    .eq('id', accountId)
    .single()

  const { data: members } = await supabase
    .from('profiles')
    .select('user_id, account_role')
    .eq('account_id', accountId)
    .eq('account_role', 'owner')
    .limit(1)

  if (!members?.[0]?.user_id) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('user_id', members[0].user_id)
    .single()

  if (!profile?.email) return

  const apiKey = decrypt(emailConfig.api_key)
  const accountName = account?.name ?? 'Your Business'
  const html = formatEmailHTML(report, accountName)

  await sendTransactionalEmail({
    apiKey,
    senderName: emailConfig.sender_name ?? 'Marketing4Effect',
    senderEmail: emailConfig.sender_email,
    toEmail: profile.email,
    toName: profile.full_name ?? undefined,
    subject: `Your Funnel Report is Ready - ${accountName}`,
    htmlContent: html,
  })
}

// ---------------------------------------------------------------------------
// Main Delivery Function
// ---------------------------------------------------------------------------

export async function deliverReport(
  supabase: SupabaseClient,
  reportId: string,
  channels: string[],
): Promise<void> {
  const { data: report, error } = await supabase
    .from('funnel_reports')
    .select('*')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    throw new Error(`Report not found: ${reportId}`)
  }

  const reportData = report.report_data as FunnelReportData
  const accountId = report.account_id as string
  const deliveredVia: string[] = []

  for (const channel of channels) {
    try {
      switch (channel) {
        case 'whatsapp':
          await deliverViaWhatsApp(supabase, accountId, reportData)
          deliveredVia.push('whatsapp')
          break
        case 'email':
          await deliverViaEmail(supabase, accountId, reportData)
          deliveredVia.push('email')
          break
        case 'dashboard':
          deliveredVia.push('dashboard')
          break
        default:
          console.warn(`[report-delivery] Unknown channel: ${channel}`)
      }
    } catch (err) {
      console.error(`[report-delivery] Failed to deliver via ${channel}:`, err)
    }
  }

  await supabase
    .from('funnel_reports')
    .update({
      delivered_via: deliveredVia,
      delivered_at: new Date().toISOString(),
    })
    .eq('id', reportId)
}
