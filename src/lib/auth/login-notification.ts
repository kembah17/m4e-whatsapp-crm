import { sendTransactionalEmail } from '@/lib/email/brevo-api'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

const BREVO_API_KEY = process.env.BREVO_API_KEY || ''

interface LoginMetadata {
  ip?: string
  userAgent?: string
  timestamp: string
}

/**
 * Send a login notification email to the user.
 * Only sends if the user has login_notifications enabled in their profile.
 */
export async function sendLoginNotification(
  userId: string,
  metadata: LoginMetadata
): Promise<void> {
  if (!BREVO_API_KEY) {
    console.warn('[login-notification] BREVO_API_KEY not set, skipping')
    return
  }

  const db = supabaseAdmin()

  // Check if user has login notifications enabled
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('login_notifications')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError || !profile) {
    console.warn('[login-notification] Could not fetch profile:', profileError?.message)
    return
  }

  // Default to false if not set
  if (!profile.login_notifications) return

  // Get user email from auth
  const { data: { user }, error: userError } = await db.auth.admin.getUserById(userId)

  if (userError || !user?.email) {
    console.warn('[login-notification] Could not fetch user email:', userError?.message)
    return
  }

  const deviceInfo = parseUserAgent(metadata.userAgent || 'Unknown')
  const loginTime = new Date(metadata.timestamp).toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'full',
    timeStyle: 'short',
  })

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e1b4b; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #d4af37; margin: 0; font-size: 20px;">Business Growth Engine</h1>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1e1b4b; margin: 0 0 16px;">New Login Detected</h2>
        <p style="color: #374151; line-height: 1.6;">A new login to your Business Growth Engine account was detected:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 120px;">Time</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${loginTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">IP Address</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${metadata.ip || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; color: #374151;">Device</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151;">${deviceInfo}</td>
          </tr>
        </table>
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>Not you?</strong> If you did not log in, please change your password immediately and enable two-factor authentication in your <a href="https://crm.marketing4effect.com/settings?tab=security" style="color: #92400e;">security settings</a>.
          </p>
        </div>
      </div>
      <div style="background: #f9fafb; padding: 16px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">You received this email because login notifications are enabled for your account. You can disable them in <a href="https://crm.marketing4effect.com/settings?tab=security" style="color: #9ca3af;">Settings &gt; Login &amp; Security</a>.</p>
      </div>
    </div>
  `

  try {
    await sendTransactionalEmail({
      apiKey: BREVO_API_KEY,
      senderName: 'Business Growth Engine',
      senderEmail: 'noreply@marketing4effect.com',
      toEmail: user.email,
      toName: user.user_metadata?.full_name || undefined,
      subject: 'New login to your Business Growth Engine account',
      htmlContent,
      textContent: `New login detected on your BGE account at ${loginTime} from IP ${metadata.ip || 'Unknown'} (${deviceInfo}). If this was not you, change your password immediately.`,
    })
  } catch (err) {
    console.error('[login-notification] Failed to send email:', err)
  }
}

function parseUserAgent(ua: string): string {
  if (ua.includes('Chrome')) return 'Chrome Browser'
  if (ua.includes('Firefox')) return 'Firefox Browser'
  if (ua.includes('Safari')) return 'Safari Browser'
  if (ua.includes('Edge')) return 'Edge Browser'
  if (ua.includes('Mobile')) return 'Mobile Device'
  if (ua === 'Unknown') return 'Unknown Device'
  return ua.slice(0, 60)
}
