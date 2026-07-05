import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { FirecrawlClient } from '@/lib/scraping/firecrawl-client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function supabaseAdmin(): SupabaseClient<any, 'public', any> {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/scraping/firecrawl
 * Admin-only endpoint for triggering web scrapes.
 * Requires FIRECRAWL_API_KEY to be configured.
 * Rate limited: 10/hour, 50/day per account.
 */
export async function POST(request: Request) {
  try {
    // Check if Firecrawl is available
    if (!FirecrawlClient.isAvailable()) {
      return NextResponse.json(
        { error: 'Firecrawl not configured. Set FIRECRAWL_API_KEY environment variable.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { url, urls, action = 'scrape', schema, accountId } = body

    if (!url && !urls?.length) {
      return NextResponse.json(
        { error: 'url or urls required' },
        { status: 400 }
      )
    }

    const db = supabaseAdmin()

    // Rate limiting: check firecrawl_audit_log for recent requests
    if (accountId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const [hourlyRes, dailyRes] = await Promise.all([
        db
          .from('firecrawl_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .gte('created_at', oneHourAgo),
        db
          .from('firecrawl_audit_log')
          .select('*', { count: 'exact', head: true })
          .eq('account_id', accountId)
          .gte('created_at', oneDayAgo),
      ])

      const hourlyCount = hourlyRes.count ?? 0
      const dailyCount = dailyRes.count ?? 0

      if (hourlyCount >= 10) {
        const retryAfter = 3600
        return NextResponse.json(
          { error: 'Hourly scrape limit reached (10/hour). Please try again later.', retry_after_seconds: retryAfter },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      }

      if (dailyCount >= 50) {
        const retryAfter = 86400
        return NextResponse.json(
          { error: 'Daily scrape limit reached (50/day). Please try again tomorrow.', retry_after_seconds: retryAfter },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': '50',
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      }
    }

    const client = new FirecrawlClient()
    let result: { success: boolean; data?: Record<string, unknown>; error?: string }

    if (action === 'extract' && urls && schema) {
      result = await client.extract(urls, schema)
    } else {
      result = await client.scrape(url || urls[0])
    }

    // Audit log
    await db.from('firecrawl_audit_log').insert({
      account_id: accountId || null,
      url: url || urls?.[0] || 'unknown',
      action,
      result_summary: result.success
        ? `Success: ${JSON.stringify(result.data).length} chars`
        : `Error: ${result.error}`,
    }).then(({ error: auditErr }) => { if (auditErr) console.error('[firecrawl] audit log failed:', auditErr) })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 502 }
      )
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[firecrawl] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/scraping/firecrawl
 * Check Firecrawl availability status.
 */
export async function GET() {
  return NextResponse.json({
    available: FirecrawlClient.isAvailable(),
    message: FirecrawlClient.isAvailable()
      ? 'Firecrawl is configured and ready'
      : 'Firecrawl not configured. Set FIRECRAWL_API_KEY.',
  })
}
