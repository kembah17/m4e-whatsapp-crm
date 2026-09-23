// =============================================================================
// Meta Marketing API Client
// Fetches ad accounts, campaigns, and performance insights from Meta
// =============================================================================

import type {
  MetaAdAccount,
  MetaCampaign,
  MetaInsight,
  MetaApiResponse,
  InsightOptions,
} from '@/types/ads'

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

// ---------------------------------------------------------------------------
// Rate-limit aware fetch wrapper
// ---------------------------------------------------------------------------

interface MetaFetchOptions {
  accessToken: string
  url: string
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
}

async function metaFetch<T>(opts: MetaFetchOptions): Promise<T> {
  const { accessToken, url, method = 'GET', body } = opts

  const separator = url.includes('?') ? '&' : '?'
  const fullUrl = `${url}${separator}access_token=${accessToken}`

  const fetchOpts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body && method === 'POST') {
    fetchOpts.body = JSON.stringify(body)
  }

  const res = await fetch(fullUrl, fetchOpts)

  // Check rate limiting headers
  const usageHeader = res.headers.get('x-business-use-case-usage')
  if (usageHeader) {
    try {
      const usage = JSON.parse(usageHeader)
      const values = Object.values(usage) as Array<
        Array<{ call_count: number; total_cputime: number; total_time: number }>
      >
      for (const entries of values) {
        for (const entry of entries) {
          if (
            entry.call_count > 80 ||
            entry.total_cputime > 80 ||
            entry.total_time > 80
          ) {
            console.warn(
              '[meta-ads-api] Approaching rate limit, backing off 30s',
              entry,
            )
            await new Promise((r) => setTimeout(r, 30_000))
          }
        }
      }
    } catch {
      // Ignore parse errors on usage header
    }
  }

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(
      `Meta API error ${res.status}: ${errorBody}`,
    )
  }

  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Paginated fetch — follows cursor-based pagination
// ---------------------------------------------------------------------------

async function fetchAllPages<T>(
  accessToken: string,
  initialUrl: string,
): Promise<T[]> {
  const results: T[] = []
  let url: string | undefined = initialUrl

  while (url) {
    const response = await metaFetch<MetaApiResponse<T>>({ accessToken, url })
    results.push(...response.data)

    url = response.paging?.next
    // Strip access_token from next URL since metaFetch adds it
    if (url) {
      const parsed = new URL(url)
      parsed.searchParams.delete('access_token')
      url = parsed.toString()
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Fetch all ad accounts accessible by the given token.
 */
export async function fetchAdAccounts(
  accessToken: string,
): Promise<MetaAdAccount[]> {
  const fields = 'id,name,currency,account_status,business_name,timezone_name'
  const url = `${META_API_BASE}/me/adaccounts?fields=${fields}&limit=100`
  return fetchAllPages<MetaAdAccount>(accessToken, url)
}

/**
 * Fetch all campaigns for a given ad account.
 */
export async function fetchCampaigns(
  accessToken: string,
  adAccountId: string,
): Promise<MetaCampaign[]> {
  const fields =
    'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time'
  const url = `${META_API_BASE}/${adAccountId}/campaigns?fields=${fields}&limit=200`
  return fetchAllPages<MetaCampaign>(accessToken, url)
}

/**
 * Fetch account-level insights (aggregated across all campaigns).
 */
export async function fetchInsights(
  accessToken: string,
  adAccountId: string,
  options: InsightOptions,
): Promise<MetaInsight[]> {
  const fields =
    'impressions,clicks,spend,reach,ctr,cpc,cpm,actions,date_start,date_stop'
  const timeRange = JSON.stringify({
    since: options.since,
    until: options.until,
  })
  const level = options.level || 'account'
  const increment = options.timeIncrement || 1

  const url =
    `${META_API_BASE}/${adAccountId}/insights` +
    `?fields=${fields}` +
    `&time_range=${encodeURIComponent(timeRange)}` +
    `&time_increment=${increment}` +
    `&level=${level}` +
    `&limit=500`

  return fetchAllPages<MetaInsight>(accessToken, url)
}

/**
 * Fetch campaign-level insights with daily breakdown.
 */
export async function fetchCampaignInsights(
  accessToken: string,
  campaignId: string,
  options: InsightOptions,
): Promise<MetaInsight[]> {
  const fields =
    'impressions,clicks,spend,reach,ctr,cpc,cpm,actions,date_start,date_stop,campaign_id,campaign_name'
  const timeRange = JSON.stringify({
    since: options.since,
    until: options.until,
  })
  const increment = options.timeIncrement || 1

  const url =
    `${META_API_BASE}/${campaignId}/insights` +
    `?fields=${fields}` +
    `&time_range=${encodeURIComponent(timeRange)}` +
    `&time_increment=${increment}` +
    `&limit=500`

  return fetchAllPages<MetaInsight>(accessToken, url)
}
