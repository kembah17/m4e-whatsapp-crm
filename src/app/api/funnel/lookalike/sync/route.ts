import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentAccount } from '@/lib/auth/account'
import { prepareAudiencePayload, syncToMetaAudience } from '@/lib/funnel/lookalike-sync'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ---------------------------------------------------------------------------
// POST /api/funnel/lookalike/sync
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const account = await getCurrentAccount()
  if (!account) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()

  try {
    const body = await request.json()
    const { segment_name, segment_rules } = body

    if (!segment_name || !segment_rules) {
      return NextResponse.json(
        { error: 'segment_name and segment_rules are required' },
        { status: 400 },
      )
    }

    // 1. Prepare audience payload (hash contacts)
    const payload = await prepareAudiencePayload(admin, account.id, segment_rules)

    if (payload.count === 0) {
      return NextResponse.json(
        { error: 'No contacts matched the segment rules' },
        { status: 400 },
      )
    }

    // 2. Log sync attempt as pending
    const { data: syncLog, error: logError } = await admin
      .from('lookalike_sync_log')
      .insert({
        account_id: account.id,
        segment_name,
        segment_rules,
        contact_count: payload.count,
        hashed_count: payload.hashed_phones.length + payload.hashed_emails.length,
        sync_status: 'pending',
      })
      .select('id')
      .single()

    if (logError) {
      throw new Error(logError.message)
    }

    // 3. Attempt Meta sync (currently stubbed)
    // Get Meta ad account config if available
    const { data: metaConfig } = await admin
      .from('funnel_configs')
      .select('meta_ad_account_id, meta_access_token')
      .eq('account_id', account.id)
      .maybeSingle()

    let syncResult: { audience_id: string; status: string } | null = null

    if (metaConfig?.meta_ad_account_id && metaConfig?.meta_access_token) {
      try {
        syncResult = await syncToMetaAudience(
          metaConfig.meta_ad_account_id,
          metaConfig.meta_access_token,
          `M4E - ${segment_name}`,
          payload,
        )

        // Update log with success
        await admin
          .from('lookalike_sync_log')
          .update({
            sync_status: 'synced',
            meta_audience_id: syncResult.audience_id,
            synced_at: new Date().toISOString(),
          })
          .eq('id', syncLog.id)
      } catch (err) {
        // Update log with error
        await admin
          .from('lookalike_sync_log')
          .update({
            sync_status: 'error',
            error_message: err instanceof Error ? err.message : 'Sync failed',
          })
          .eq('id', syncLog.id)
      }
    } else {
      // No Meta config - mark as pending setup
      await admin
        .from('lookalike_sync_log')
        .update({
          sync_status: 'pending',
          error_message: 'Meta ad account not configured. Audience data prepared and ready for sync.',
        })
        .eq('id', syncLog.id)
    }

    return NextResponse.json({
      success: true,
      sync_id: syncLog.id,
      contacts_matched: payload.count,
      phones_hashed: payload.hashed_phones.length,
      emails_hashed: payload.hashed_emails.length,
      meta_sync: syncResult ?? { status: 'pending_configuration' },
    })
  } catch (err) {
    console.error('[lookalike/sync] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 },
    )
  }
}
