import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/ecommerce/admin-client';

/**
 * POST /api/admin/whatsapp-disconnect
 * Super-admin only: disconnect a client's WhatsApp connection.
 * Body: { accountId: string, reason?: string }
 *
 * After migration 088, phone_number_id and access_token are nullable,
 * so we set them to NULL instead of placeholder strings.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the caller
    const supabase = await createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify super-admin
    const admin = supabaseAdmin();
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden: Super admin only' }, { status: 403 });
    }

    // 3. Parse request
    const { accountId, reason } = await req.json();
    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    // 4. Get current WhatsApp config for this account
    const { data: config } = await admin
      .from('whatsapp_config')
      .select('id, status, phone_number_id, waba_id, access_token, business_name, display_phone_number')
      .eq('account_id', accountId)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'No WhatsApp config found for this account' }, { status: 404 });
    }

    if (config.status === 'disconnected') {
      return NextResponse.json({ error: 'Already disconnected' }, { status: 400 });
    }

    // 5. Attempt to revoke Meta access token (best-effort)
    let tokenRevoked = false;
    if (config.access_token) {
      try {
        const revokeRes = await fetch(
          `https://graph.facebook.com/v21.0/me/permissions`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${config.access_token}` },
          }
        );
        tokenRevoked = revokeRes.ok;
      } catch {
        tokenRevoked = false;
      }
    }

    // 6. Reset the WhatsApp config — use NULL for nullable fields
    const { error: updateError } = await admin
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
      .eq('id', config.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to disconnect', details: updateError.message },
        { status: 500 }
      );
    }

    // 7. Log the audit event
    const { data: account } = await admin
      .from('accounts')
      .select('name')
      .eq('id', accountId)
      .single();

    console.log(
      `[SUPER-ADMIN DISCONNECT] Admin "${profile.full_name}" disconnected WhatsApp for account "${account?.name || accountId}". ` +
      `Reason: ${reason || 'Not specified'}. Token revoked: ${tokenRevoked}. ` +
      `Previous: phone=${config.display_phone_number}, WABA=${config.waba_id}, business=${config.business_name}`
    );

    return NextResponse.json({
      success: true,
      message: `WhatsApp disconnected for ${account?.name || accountId}`,
      tokenRevoked,
      previousConnection: {
        phone: config.display_phone_number,
        waba: config.waba_id,
        business: config.business_name,
      },
    });
  } catch (err) {
    console.error('[whatsapp-disconnect] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
