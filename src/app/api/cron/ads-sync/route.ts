import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { syncAdsData } from '@/lib/ads/ads-sync-service'

export const runtime = 'nodejs'
export const maxDuration = 300

// GET /api/cron/ads-sync — daily sync of ads data for all accounts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()

  // Find all accounts that have at least one active ad account
  const { data: adAccounts, error } = await db
    .from('ad_accounts')
    .select('account_id')
    .eq('is_active', true)

  if (error) {
    console.error('[cron/ads-sync] Failed to fetch ad accounts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Deduplicate account IDs
  const accountIds = [...new Set((adAccounts || []).map((a) => a.account_id))]

  console.log(
    `[cron/ads-sync] Syncing ads data for ${accountIds.length} account(s)`,
  )

  const results: Array<{
    accountId: string
    success: boolean
    accounts_synced?: number
    campaigns_synced?: number
    snapshots_synced?: number
    error?: string
  }> = []

  for (const accountId of accountIds) {
    try {
      const result = await syncAdsData(accountId)
      results.push({
        accountId,
        success: result.success,
        accounts_synced: result.accounts_synced,
        campaigns_synced: result.campaigns_synced,
        snapshots_synced: result.snapshots_synced,
      })
      console.log(
        `[cron/ads-sync] Account ${accountId}: ` +
          `${result.accounts_synced} accounts, ` +
          `${result.campaigns_synced} campaigns, ` +
          `${result.snapshots_synced} snapshots ` +
          `(${result.duration_ms}ms)`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ accountId, success: false, error: msg })
      console.error(`[cron/ads-sync] Account ${accountId} failed:`, msg)
    }
  }

  // Log to system_logs
  try {
    await db.from('system_logs').insert({
      level: 'info',
      category: 'cron:ads-sync',
      message: `Ads sync completed for ${accountIds.length} accounts`,
      metadata: { results },
    })
  } catch {
    console.log('[cron/ads-sync] Could not write to system_logs')
  }

  return NextResponse.json({
    message: 'Ads sync complete',
    synced: accountIds.length,
    results,
  })
}
