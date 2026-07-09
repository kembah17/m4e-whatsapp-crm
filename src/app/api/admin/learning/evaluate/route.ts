import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { evaluateChangeOutcomes } from '@/lib/funnel/learning-engine'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * POST /api/admin/learning/evaluate
 * Trigger outcome evaluation for a specific change.
 * Body: { change_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = checkRateLimit(`admin-learning:${rlIp}`, RATE_LIMITS.ai)
    if (!rl.success) return rateLimitResponse(rl)

    await getCurrentAccount()

    const body = await request.json()
    const { change_id } = body as { change_id: string }

    if (!change_id) {
      return NextResponse.json(
        { error: 'change_id is required' },
        { status: 400 },
      )
    }

    const admin = getAdmin()
    const outcome = await evaluateChangeOutcomes(admin, change_id)

    return NextResponse.json({
      change_id,
      ...outcome,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
