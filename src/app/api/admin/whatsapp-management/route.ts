import { NextRequest, NextResponse } from 'next/server';
import { createClient as createBrowserClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/ecommerce/admin-client';

/**
 * GET /api/admin/whatsapp-management
 * Super-admin only: list all WhatsApp configs with account info and summary stats.
 *
 * Query params:
 *   status  - filter by connection status ('connected' | 'disconnected')
 *   search  - search by business name or phone number
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden: Super admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    // Fetch all WhatsApp configs
    let query = admin
      .from('whatsapp_config')
      .select(
        `id, account_id, phone_number_id, waba_id, status,
         business_name, display_phone_number, quality_rating,
         messaging_limit, phone_verified, setup_method,
         connected_at, registered_at, subscribed_apps_at,
         token_expires_at, last_registration_error,
         created_at, updated_at`
      )
      .order('created_at', { ascending: false });

    if (statusFilter && (statusFilter === 'connected' || statusFilter === 'disconnected')) {
      query = query.eq('status', statusFilter);
    }

    const { data: configs, error: configsError } = await query;

    if (configsError) {
      return NextResponse.json({ error: configsError.message }, { status: 500 });
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json({
        configs: [],
        summary: {
          total: 0,
          connected: 0,
          disconnected: 0,
          verified: 0,
          unverified: 0,
          embeddedSignup: 0,
          manual: 0,
          tokenExpiringSoon: 0,
          registrationErrors: 0,
        },
      });
    }

    // Fetch account names for all configs
    const accountIds = configs.map((c) => c.account_id).filter(Boolean);
    const { data: accounts } = await admin
      .from('accounts')
      .select('id, name, business_name, subscription_tier, subscription_status')
      .in('id', accountIds);

    const accountMap: Record<string, typeof accounts extends (infer T)[] | null ? T : never> = {};
    if (accounts) {
      for (const a of accounts) {
        accountMap[a.id] = a;
      }
    }

    // Enrich configs with account info
    let enriched = configs.map((config) => {
      const account = accountMap[config.account_id];
      return {
        ...config,
        account_name: account?.name || account?.business_name || 'Unknown',
        subscription_tier: account?.subscription_tier || null,
        subscription_status: account?.subscription_status || null,
      };
    });

    // Apply search filter (client-side since we need account names)
    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(
        (c) =>
          c.account_name.toLowerCase().includes(q) ||
          (c.business_name && c.business_name.toLowerCase().includes(q)) ||
          (c.display_phone_number && c.display_phone_number.includes(q)) ||
          (c.phone_number_id && c.phone_number_id.includes(q))
      );
    }

    // Calculate summary from ALL configs (before search filter)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const summary = {
      total: configs.length,
      connected: configs.filter((c) => c.status === 'connected').length,
      disconnected: configs.filter((c) => c.status === 'disconnected').length,
      verified: configs.filter((c) => c.phone_verified).length,
      unverified: configs.filter((c) => !c.phone_verified && c.status === 'connected').length,
      embeddedSignup: configs.filter((c) => c.setup_method === 'embedded_signup').length,
      manual: configs.filter((c) => c.setup_method === 'manual' || !c.setup_method).length,
      tokenExpiringSoon: configs.filter(
        (c) => c.token_expires_at && new Date(c.token_expires_at) <= sevenDaysFromNow
      ).length,
      registrationErrors: configs.filter((c) => c.last_registration_error).length,
    };

    return NextResponse.json({ configs: enriched, summary });
  } catch (err) {
    console.error('[whatsapp-management GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/whatsapp-management
 * Super-admin only: update specific fields on a WhatsApp config.
 * Body: { configId: string, updates: Record<string, unknown> }
 *
 * Allowed fields: quality_rating, messaging_limit, status, last_registration_error
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden: Super admin only' }, { status: 403 });
    }

    const { configId, updates } = await req.json();
    if (!configId) {
      return NextResponse.json({ error: 'configId is required' }, { status: 400 });
    }

    // Whitelist allowed fields to prevent arbitrary updates
    const ALLOWED_FIELDS = [
      'quality_rating',
      'messaging_limit',
      'status',
      'last_registration_error',
    ];

    const safeUpdates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update. Allowed: ' + ALLOWED_FIELDS.join(', ') },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    safeUpdates.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await admin
      .from('whatsapp_config')
      .update(safeUpdates)
      .eq('id', configId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(
      `[SUPER-ADMIN WHATSAPP] Admin "${profile.full_name}" updated config ${configId}: ${JSON.stringify(safeUpdates)}`
    );

    return NextResponse.json({ success: true, config: updated });
  } catch (err) {
    console.error('[whatsapp-management PATCH] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
