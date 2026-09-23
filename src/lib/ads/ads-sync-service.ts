// =============================================================================
// Ads Sync Service
// Syncs ad accounts, campaigns, and performance data from Meta to local DB
// =============================================================================

import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  fetchAdAccounts,
  fetchCampaigns,
  fetchInsights,
} from './meta-ads-api'
import type { SyncResult, MetaInsight } from '@/types/ads'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function extractConversions(insight: MetaInsight): number {
  if (!insight.actions) return 0
  let total = 0
  for (const action of insight.actions) {
    if (
      action.action_type === 'offsite_conversion' ||
      action.action_type === 'onsite_conversion' ||
      action.action_type === 'lead' ||
      action.action_type === 'purchase' ||
      action.action_type === 'complete_registration'
    ) {
      total += parseInt(action.value, 10) || 0
    }
  }
  return total
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncAdsData(accountId: string): Promise<SyncResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let accountsSynced = 0
  let campaignsSynced = 0
  let snapshotsSynced = 0

  const admin = getAdmin()

  try {
    // 1. Get access token from whatsapp_config
    const { data: waConfig, error: configErr } = await admin
      .from('whatsapp_config')
      .select('access_token')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configErr || !waConfig?.access_token) {
      return {
        success: false,
        accounts_synced: 0,
        campaigns_synced: 0,
        snapshots_synced: 0,
        errors: ['No access token found for account'],
        duration_ms: Date.now() - startTime,
      }
    }

    const accessToken = decrypt(waConfig.access_token)

    // 2. Fetch and sync ad accounts
    const metaAccounts = await fetchAdAccounts(accessToken)

    for (const metaAccount of metaAccounts) {
      try {
        const { data: adAccount, error: upsertErr } = await admin
          .from('ad_accounts')
          .upsert(
            {
              account_id: accountId,
              meta_ad_account_id: metaAccount.id,
              name: metaAccount.name,
              currency: metaAccount.currency,
              account_status: metaAccount.account_status,
              business_name: metaAccount.business_name || null,
              timezone_name: metaAccount.timezone_name || null,
              is_active: true,
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: 'account_id,meta_ad_account_id' },
          )
          .select('id, meta_ad_account_id')
          .single()

        if (upsertErr || !adAccount) {
          errors.push(
            `Failed to upsert ad account ${metaAccount.id}: ${upsertErr?.message}`,
          )
          continue
        }

        accountsSynced++

        // 3. Fetch and sync campaigns for this ad account
        const metaCampaigns = await fetchCampaigns(
          accessToken,
          metaAccount.id,
        )

        for (const metaCampaign of metaCampaigns) {
          try {
            await admin.from('ad_campaigns').upsert(
              {
                account_id: accountId,
                ad_account_id: adAccount.id,
                meta_campaign_id: metaCampaign.id,
                name: metaCampaign.name,
                objective: metaCampaign.objective || null,
                status: metaCampaign.status,
                daily_budget: metaCampaign.daily_budget
                  ? parseFloat(metaCampaign.daily_budget) / 100
                  : null,
                lifetime_budget: metaCampaign.lifetime_budget
                  ? parseFloat(metaCampaign.lifetime_budget) / 100
                  : null,
                start_time: metaCampaign.start_time || null,
                stop_time: metaCampaign.stop_time || null,
              },
              { onConflict: 'account_id,meta_campaign_id' },
            )
            campaignsSynced++
          } catch (err) {
            errors.push(
              `Failed to sync campaign ${metaCampaign.id}: ${err instanceof Error ? err.message : String(err)}`,
            )
          }
        }

        // 4. Determine sync window
        const { data: lastSnapshot } = await admin
          .from('ad_performance_snapshots')
          .select('snapshot_date')
          .eq('ad_account_id', adAccount.id)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        const now = new Date()
        const sinceDate = lastSnapshot?.snapshot_date
          ? new Date(lastSnapshot.snapshot_date)
          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

        const since = formatDate(sinceDate)
        const until = formatDate(now)

        // 5. Fetch account-level insights with campaign breakdown
        const insights = await fetchInsights(accessToken, metaAccount.id, {
          since,
          until,
          level: 'campaign',
          timeIncrement: 1,
        })

        // Build a map of meta_campaign_id -> local campaign UUID
        const { data: localCampaigns } = await admin
          .from('ad_campaigns')
          .select('id, meta_campaign_id')
          .eq('ad_account_id', adAccount.id)

        const campaignMap = new Map<string, string>()
        for (const lc of localCampaigns || []) {
          campaignMap.set(lc.meta_campaign_id, lc.id)
        }

        // 6. Upsert performance snapshots
        for (const insight of insights) {
          try {
            const impressions = parseInt(insight.impressions, 10) || 0
            const clicks = parseInt(insight.clicks, 10) || 0
            const spend = parseFloat(insight.spend) || 0
            const reach = parseInt(insight.reach, 10) || 0
            const conversions = extractConversions(insight)
            const ctr = parseFloat(insight.ctr) || 0
            const cpc = parseFloat(insight.cpc) || 0
            const cpm = parseFloat(insight.cpm) || 0
            const costPerConversion =
              conversions > 0 ? spend / conversions : 0

            const localCampaignId = insight.campaign_id
              ? campaignMap.get(insight.campaign_id) || null
              : null

            await admin.from('ad_performance_snapshots').upsert(
              {
                account_id: accountId,
                ad_account_id: adAccount.id,
                campaign_id: localCampaignId,
                snapshot_date: insight.date_start,
                impressions,
                clicks,
                spend,
                reach,
                conversions,
                ctr,
                cpc,
                cpm,
                cost_per_conversion: costPerConversion,
                actions: insight.actions
                  ? Object.fromEntries(
                      insight.actions.map((a) => [a.action_type, a.value]),
                    )
                  : {},
              },
              { onConflict: 'account_id,campaign_id,snapshot_date' },
            )
            snapshotsSynced++
          } catch (err) {
            errors.push(
              `Failed to upsert snapshot for ${insight.date_start}: ${err instanceof Error ? err.message : String(err)}`,
            )
          }
        }

        // Also fetch account-level aggregated insights (no campaign breakdown)
        const accountInsights = await fetchInsights(
          accessToken,
          metaAccount.id,
          { since, until, level: 'account', timeIncrement: 1 },
        )

        for (const insight of accountInsights) {
          try {
            const impressions = parseInt(insight.impressions, 10) || 0
            const clicks = parseInt(insight.clicks, 10) || 0
            const spend = parseFloat(insight.spend) || 0
            const reach = parseInt(insight.reach, 10) || 0
            const conversions = extractConversions(insight)
            const ctr = parseFloat(insight.ctr) || 0
            const cpc = parseFloat(insight.cpc) || 0
            const cpm = parseFloat(insight.cpm) || 0
            const costPerConversion =
              conversions > 0 ? spend / conversions : 0

            await admin.from('ad_performance_snapshots').upsert(
              {
                account_id: accountId,
                ad_account_id: adAccount.id,
                campaign_id: null,
                snapshot_date: insight.date_start,
                impressions,
                clicks,
                spend,
                reach,
                conversions,
                ctr,
                cpc,
                cpm,
                cost_per_conversion: costPerConversion,
                actions: insight.actions
                  ? Object.fromEntries(
                      insight.actions.map((a) => [a.action_type, a.value]),
                    )
                  : {},
              },
              { onConflict: 'account_id,campaign_id,snapshot_date' },
            )
            snapshotsSynced++
          } catch (err) {
            errors.push(
              `Failed to upsert account snapshot: ${err instanceof Error ? err.message : String(err)}`,
            )
          }
        }
      } catch (err) {
        errors.push(
          `Failed to sync ad account ${metaAccount.id}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  } catch (err) {
    errors.push(
      `Top-level sync error: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  return {
    success: errors.length === 0,
    accounts_synced: accountsSynced,
    campaigns_synced: campaignsSynced,
    snapshots_synced: snapshotsSynced,
    errors,
    duration_ms: Date.now() - startTime,
  }
}
