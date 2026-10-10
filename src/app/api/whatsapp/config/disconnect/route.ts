import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import {
  unsubscribeWabaWebhooks,
  revokeMetaToken,
  safeDecryptToken,
  clearWhatsAppConfig,
  logDisconnectAction,
  sendDisconnectNotification,
} from '@/lib/whatsapp/disconnect-security'

/**
 * POST /api/whatsapp/config/disconnect
 * Owner disconnect: authenticated user disconnects their own account's WhatsApp.
 * Body: { reason?: string }
 *
 * Owners can unsubscribe webhooks and revoke tokens but CANNOT deregister the phone.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the caller
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's account_id and profile info from profiles table
    const admin = supabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('account_id, full_name, email')
      .eq('user_id', user.id)
      .single()

    if (!profile?.account_id) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }

    // 3. Fetch whatsapp_config for that account
    const { data: config } = await admin
      .from('whatsapp_config')
      .select('id, status, phone_number_id, waba_id, access_token, business_name, display_phone_number')
      .eq('account_id', profile.account_id)
      .single()

    if (!config) {
      return NextResponse.json(
        { error: 'No WhatsApp configuration found for your account' },
        { status: 404 },
      )
    }

    if (config.status === 'disconnected') {
      return NextResponse.json(
        { error: 'WhatsApp is already disconnected' },
        { status: 400 },
      )
    }

    // 4. Parse request body
    let reason: string | undefined
    try {
      const body = await req.json()
      reason = body.reason
    } catch {
      // No body or invalid JSON — reason is optional
    }

    // 5. Execute disconnect steps (best-effort, track success/failure)
    const actionsTaken: string[] = []
    const actionsFailed: string[] = []

    // Decrypt the access token before using with Meta API
    const accessToken = safeDecryptToken(config.access_token)

    // Step a: Unsubscribe WABA webhooks
    if (config.waba_id && accessToken) {
      const ok = await unsubscribeWabaWebhooks(config.waba_id, accessToken)
      if (ok) {
        actionsTaken.push('WABA webhook unsubscribed')
      } else {
        actionsFailed.push('WABA webhook unsubscribe failed')
      }
    }

    // Step b: Revoke Meta token
    if (accessToken) {
      const ok = await revokeMetaToken(accessToken)
      if (ok) {
        actionsTaken.push('Meta access token revoked')
      } else {
        actionsFailed.push('Meta token revocation failed')
      }
    }

    // Step c: Owners CANNOT deregister phone — skipped intentionally

    // 6. Clear DB fields
    const cleared = await clearWhatsAppConfig(config.id)
    if (cleared) {
      actionsTaken.push('Database fields cleared')
    } else {
      actionsFailed.push('Database field clear failed')
      return NextResponse.json(
        { error: 'Failed to update database' },
        { status: 500 },
      )
    }

    // 7. Get account info for logging/notification
    const { data: account } = await admin
      .from('accounts')
      .select('name')
      .eq('id', profile.account_id)
      .single()

    const accountName = account?.name || profile.account_id

    // 8. Log to disconnect_audit_log
    await logDisconnectAction({
      account_id: profile.account_id,
      disconnected_by: user.id,
      disconnect_type: 'owner',
      reason,
      waba_id: config.waba_id || undefined,
      phone_number_id: config.phone_number_id || undefined,
      actions_taken: actionsTaken,
      actions_failed: actionsFailed,
    })

    // 9. Send email notification
    const accountEmail = profile.email || user.email || ''
    if (accountEmail) {
      await sendDisconnectNotification({
        accountName,
        accountEmail,
        disconnectedByName: profile.full_name || 'Account Owner',
        disconnectType: 'owner',
        reason,
        actionsTaken,
      })
    }

    console.log(
      `[OWNER DISCONNECT] User "${profile.full_name}" disconnected WhatsApp for account "${accountName}". ` +
      `Reason: ${reason || 'Not specified'}. Actions: ${actionsTaken.join(', ')}`,
    )

    return NextResponse.json({
      success: true,
      message: `WhatsApp disconnected for ${accountName}`,
      actionsTaken,
      actionsFailed,
      previousConnection: {
        phone: config.display_phone_number,
        waba: config.waba_id,
        business: config.business_name,
      },
    })
  } catch (err) {
    console.error('[owner-disconnect] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
