import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { aggregateIndustryLearnings } from '@/lib/funnel/learning-engine'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * GET /api/admin/learning?industry=restaurant
 * Returns aggregated learnings for a given industry preset.
 */
export async function GET(request: NextRequest) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = checkRateLimit(`admin-learning:${rlIp}`, RATE_LIMITS.ai)
    if (!rl.success) return rateLimitResponse(rl)

    // Verify user is authenticated
    await getCurrentAccount()

    const { searchParams } = new URL(request.url)
    const industry = searchParams.get('industry')

    if (!industry) {
      return NextResponse.json(
        { error: 'industry parameter is required' },
        { status: 400 },
      )
    }

    const admin = getAdmin()
    const learnings = await aggregateIndustryLearnings(admin, industry)

    // Also get list of available industries
    const { data: industries } = await admin
      .from('funnel_configs')
      .select('industry_preset')
      .eq('is_active', true)

    const uniqueIndustries = [...new Set((industries ?? []).map(i => i.industry_preset))].filter(Boolean)

    return NextResponse.json({
      industry,
      learnings,
      available_industries: uniqueIndustries,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
