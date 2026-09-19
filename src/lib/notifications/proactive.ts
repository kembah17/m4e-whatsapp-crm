import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { generateInsights } from '@/lib/ai/business-insights'
import { sendTransactionalEmail } from '@/lib/email/brevo-api'
import type { BusinessInsight } from '@/types/business-growth'

interface ProactiveAlertResult {
  sent: number
  insights: number
}

/**
 * Generate insights and email critical/high-priority ones to the account owner.
 */
export async function sendProactiveAlerts(
  accountId: string
): Promise<ProactiveAlertResult> {
  // 1. Generate fresh insights
  const insights = await generateInsights(accountId)

  // 2. Filter for critical and high priority
  const urgent = insights.filter(
    (i: BusinessInsight) => i.priority === 'critical' || i.priority === 'high'
  )

  if (urgent.length === 0) {
    return { sent: 0, insights: insights.length }
  }

  // 3. Get account owner email
  const db = supabaseAdmin()
  const { data: members } = await db
    .from('account_members')
    .select('user_id, role')
    .eq('account_id', accountId)
    .eq('role', 'owner')
    .limit(1)

  if (!members || members.length === 0) {
    return { sent: 0, insights: insights.length }
  }

  const { data: profile } = await db
    .from('profiles')
    .select('email, full_name')
    .eq('user_id', members[0].user_id)
    .single()

  if (!profile?.email) {
    return { sent: 0, insights: insights.length }
  }

  // 4. Build email HTML
  const insightRows = urgent
    .map(
      (i: BusinessInsight) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #eee">
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${
            i.priority === 'critical' ? '#fee2e2;color:#991b1b' : '#fff7ed;color:#9a3412'
          }">${i.priority.toUpperCase()}</span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #eee">
          <strong>${i.title}</strong><br/>
          <span style="color:#666;font-size:13px">${i.description}</span>
          ${i.suggested_action ? `<br/><span style="color:#2563eb;font-size:13px">→ ${i.suggested_action}</span>` : ''}
        </td>
      </tr>`
    )
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e1b4b;padding:24px;border-radius:8px 8px 0 0">
        <h1 style="color:#d4af37;margin:0;font-size:20px">Business Growth Engine</h1>
        <p style="color:#c4b5fd;margin:4px 0 0;font-size:14px">Proactive Alert</p>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p>Hi ${profile.full_name || 'there'},</p>
        <p>We detected <strong>${urgent.length}</strong> important insight${urgent.length !== 1 ? 's' : ''} that need${urgent.length === 1 ? 's' : ''} your attention:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 16px;text-align:left;font-size:12px;color:#6b7280">Priority</th>
              <th style="padding:8px 16px;text-align:left;font-size:12px;color:#6b7280">Insight</th>
            </tr>
          </thead>
          <tbody>${insightRows}</tbody>
        </table>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://crm.marketing4effect.com'}/insights"
           style="display:inline-block;padding:10px 24px;background:#1e1b4b;color:#d4af37;text-decoration:none;border-radius:6px;font-weight:600;margin-top:8px">
          View All Insights
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          This is an automated alert from your Business Growth Engine.
        </p>
      </div>
    </div>
  `

  // 5. Send email via Brevo
  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) {
    console.error('[proactive-alerts] BREVO_API_KEY not configured')
    return { sent: 0, insights: insights.length }
  }

  try {
    await sendTransactionalEmail({
      apiKey: brevoKey,
      senderName: 'Business Growth Engine',
      senderEmail: 'noreply@marketing4effect.com',
      toEmail: profile.email,
      toName: profile.full_name || undefined,
      subject: `[BGE Alert] ${urgent.length} insight${urgent.length !== 1 ? 's' : ''} need${urgent.length === 1 ? 's' : ''} your attention`,
      htmlContent: html,
    })
    return { sent: 1, insights: insights.length }
  } catch (err) {
    console.error('[proactive-alerts] email send failed:', err)
    return { sent: 0, insights: insights.length }
  }
}
