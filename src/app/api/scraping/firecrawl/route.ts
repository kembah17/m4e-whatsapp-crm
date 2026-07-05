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

    const client = new FirecrawlClient()
    const db = supabaseAdmin()
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
