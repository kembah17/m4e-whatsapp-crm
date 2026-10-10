import { NextRequest, NextResponse } from 'next/server'
import { createClient as createBrowserClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import {
  unsubscribeWabaWebhooks,
  revokeMetaToken,
  deregisterPhone,
  safeDecryptToken,
  clearWhatsAppConfig,
  logDisconnectAction,
  sendDisconnectNotification,
} from '@/lib/whatsapp/disconnect-security'

/**
 * POST /api/admin/whatsapp-disconnect
 * Super-admin only: disconnect a client's WhatsApp connection.
 * Body: { accountId: string, reason?: string }
 *
 * Super admins get the full disconnect: webhook unsubscribe, token
 * revocation, AND phone deregistration.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the caller
    const supabase = await createBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify super-admin
    const admin = supabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin, full_name, email')
      .eq('id', user.id)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden: Super admin only' }, { status: 403 })
    }

    // 3. Parse request
    const { accountId, reason } = await req.json()
    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    // 4. Get current WhatsApp config for this account
    const { data: config } = await admin
      .from('whatsapp_config')
      .select('id, status, phone_number_id, waba_id, access_token, business_name, display_phone_number')
      .eq('account_id', accountId)
      .single()

    if (!config) {
      return NextResponse.json({ error: 'No WhatsApp config found for this account' }, { status: 404 })
    }

    if (config.status === 'disconnected') {
      return NextResponse.json({ error: 'Already disconnected' }, { status: 400 })
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

    // Step c: Deregister phone (Super Admin ONLY)
    if (config.phone_number_id && accessToken) {
      const ok = await deregisterPhone(config.phone_number_id, accessToken)
      if (ok) {
        actionsTaken.push('Phone number deregistered')
      } else {
        actionsFailed.push('Phone deregistration failed')
      }
    }

    // 6. Clear DB fields
    const cleared = await clearWhatsAppConfig(config.id)
    if (cleared) {
      actionsTaken.push('Database fields cleared')
    } else {
      actionsFailed.push('Database field clear failed')
      return NextResponse.json(
        { error: 'Failed to disconnect', details: 'Database update failed' },
        { status: 500 },
      )
    }

    // 7. Get account info for logging/notification
    const { data: account } = await admin
      .from('accounts')
      .select('name')
      .eq('id', accountId)
      .single()

    const accountName = account?.name || accountId

    // Find account owner email for notification
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('email')
      .eq('account_id', accountId)
      .limit(1)
      .single()

    // 8. Log to disconnect_audit_log
    await logDisconnectAction({
      account_id: accountId,
      disconnected_by: user.id,
      disconnect_type: 'super_admin',
      reason,
      waba_id: config.waba_id || undefined,
      phone_number_id: config.phone_number_id || undefined,
      actions_taken: actionsTaken,
      actions_failed: actionsFailed,
    })

    // 9. Send email notification
    const accountEmail = ownerProfile?.email || ''
    if (accountEmail) {
      await sendDisconnectNotification({
        accountName,
        accountEmail,
        disconnectedByName: profile.full_name || 'Super Admin',
        disconnectType: 'super_admin',
        reason,
        actionsTaken,
      })
    }

    console.log(
      `[SUPER-ADMIN DISCONNECT] Admin "${profile.full_name}" disconnected WhatsApp for account "${accountName}". ` +
      `Reason: ${reason || 'Not specified'}. Actions: ${actionsTaken.join(', ')}. ` +
      `Previous: phone=${config.display_phone_number}, WABA=${config.waba_id}, business=${config.business_name}`,
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
    console.error('[whatsapp-disconnect] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
