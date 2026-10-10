import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { decrypt } from '@/lib/whatsapp/encryption'

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0'

// ── Meta API helpers (best-effort: log failure but don't block) ──

/**
 * Unsubscribe the WABA from receiving webhooks for this app.
 * DELETE https://graph.facebook.com/v21.0/{wabaId}/subscribed_apps
 */
export async function unsubscribeWabaWebhooks(
  wabaId: string,
  accessToken: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${META_GRAPH_URL}/${wabaId}/subscribed_apps`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const body = await res.text()
      console.warn(`[disconnect] WABA unsubscribe failed (${res.status}):`, body)
    }
    return res.ok
  } catch (err) {
    console.error('[disconnect] WABA unsubscribe error:', err)
    return false
  }
}

/**
 * Revoke the Meta access token (removes all permissions).
 * DELETE https://graph.facebook.com/v21.0/me/permissions
 */
export async function revokeMetaToken(
  accessToken: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${META_GRAPH_URL}/me/permissions`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const body = await res.text()
      console.warn(`[disconnect] Token revocation failed (${res.status}):`, body)
    }
    return res.ok
  } catch (err) {
    console.error('[disconnect] Token revocation error:', err)
    return false
  }
}

/**
 * Deregister the phone number from the WhatsApp Business API.
 * POST https://graph.facebook.com/v21.0/{phoneId}/deregister
 * Super Admin ONLY — owners cannot deregister phones.
 */
export async function deregisterPhone(
  phoneId: string,
  accessToken: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${META_GRAPH_URL}/${phoneId}/deregister`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      const body = await res.text()
      console.warn(`[disconnect] Phone deregister failed (${res.status}):`, body)
    }
    return res.ok
  } catch (err) {
    console.error('[disconnect] Phone deregister error:', err)
    return false
  }
}

// ── Decrypt helper ──

/**
 * Safely decrypt an encrypted access token from the DB.
 * Returns null if the token is null/empty or decryption fails.
 */
export function safeDecryptToken(encryptedToken: string | null): string | null {
  if (!encryptedToken) return null
  try {
    return decrypt(encryptedToken)
  } catch (err) {
    console.warn('[disconnect] Token decryption failed:', err)
    return null
  }
}

// ── Audit logging ──

export interface DisconnectAuditEntry {
  account_id: string
  disconnected_by: string
  disconnect_type: 'owner' | 'super_admin'
  reason?: string
  waba_id?: string
  phone_number_id?: string
  actions_taken: string[]
  actions_failed: string[]
}

/**
 * Insert a row into disconnect_audit_log.
 * Uses service-role client so RLS INSERT policy applies.
 */
export async function logDisconnectAction(
  entry: DisconnectAuditEntry,
): Promise<void> {
  const admin = supabaseAdmin()
  const { error } = await admin.from('disconnect_audit_log').insert({
    account_id: entry.account_id,
    disconnected_by: entry.disconnected_by,
    disconnect_type: entry.disconnect_type,
    reason: entry.reason || null,
    waba_id: entry.waba_id || null,
    phone_number_id: entry.phone_number_id || null,
    actions_taken: entry.actions_taken,
    actions_failed: entry.actions_failed,
  })
  if (error) {
    console.error('[disconnect] Failed to write audit log:', error)
  }
}

// ── Email notification ──

export async function sendDisconnectNotification(params: {
  accountName: string
  accountEmail: string
  disconnectedByName: string
  disconnectType: 'owner' | 'super_admin'
  reason?: string
  actionsTaken: string[]
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.warn('[disconnect] BREVO_API_KEY not set — skipping email notification')
    return
  }

  const typeLabel = params.disconnectType === 'super_admin' ? 'Super Admin' : 'Account Owner'
  const actionsHtml = params.actionsTaken.length > 0
    ? `<ul>${params.actionsTaken.map((a) => `<li>${a}</li>`).join('')}</ul>`
    : '<p>No actions were taken.</p>'

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e1b4b; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #d4940a; margin: 0; font-size: 20px;">WhatsApp Connection Disconnected</h1>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>The WhatsApp Business connection for <strong>${params.accountName}</strong> has been disconnected.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 140px;">Disconnected by</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${params.disconnectedByName} (${typeLabel})</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">When</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date().toLocaleString('en-NG', { dateStyle: 'full', timeStyle: 'short' })}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Reason</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${params.reason || 'Not specified'}</td>
          </tr>
        </table>
        <h3 style="margin: 16px 0 8px;">Actions Taken</h3>
        ${actionsHtml}
        <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">To reconnect, visit the WhatsApp settings page in your BGE dashboard and use Embedded Signup or Manual Setup.</p>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: 'info@marketing4effect.com', name: 'Marketing Effect' },
        to: [{ email: params.accountEmail }],
        subject: `WhatsApp Connection Disconnected - ${params.accountName}`,
        htmlContent,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.warn(`[disconnect] Brevo email failed (${res.status}):`, body)
    }
  } catch (err) {
    console.error('[disconnect] Email notification error:', err)
  }
}

// ── DB field reset helper ──

/**
 * Clear all WhatsApp connection fields in the DB.
 * Returns true if successful.
 */
export async function clearWhatsAppConfig(configId: string): Promise<boolean> {
  const admin = supabaseAdmin()
  const { error } = await admin
    .from('whatsapp_config')
    .update({
      status: 'disconnected',
      phone_number_id: null,
      waba_id: null,
      business_name: null,
      display_phone_number: null,
      connected_at: null,
      meta_business_id: null,
      phone_verified: false,
      registered_at: null,
      subscribed_apps_at: null,
      access_token: null,
      token_expires_at: null,
      quality_rating: null,
      messaging_limit: null,
      last_registration_error: null,
    })
    .eq('id', configId)

  if (error) {
    console.error('[disconnect] Failed to clear whatsapp_config:', error)
    return false
  }
  return true
}
