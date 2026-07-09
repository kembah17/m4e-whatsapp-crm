import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { applyPresetUpdate } from '@/lib/funnel/learning-engine'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * POST /api/admin/learning/apply
 * Apply a learning recommendation to an industry preset.
 * Super admin only.
 * Body: { industry_preset: string, parameter: string, new_value: string }
 */
export async function POST(request: NextRequest) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = checkRateLimit(`admin-learning:${rlIp}`, RATE_LIMITS.ai)
    if (!rl.success) return rateLimitResponse(rl)

    const { userId } = await getCurrentAccount()

    // Verify super admin status
    const admin = getAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin')
      .eq('id', userId)
      .single()

    if (!profile?.is_super_admin) {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { industry_preset, parameter, new_value } = body as {
      industry_preset: string
      parameter: string
      new_value: string
    }

    if (!industry_preset || !parameter || new_value === undefined) {
      return NextResponse.json(
        { error: 'industry_preset, parameter, and new_value are required' },
        { status: 400 },
      )
    }

    await applyPresetUpdate(admin, industry_preset, parameter, new_value, userId)

    return NextResponse.json({
      success: true,
      message: `Applied ${parameter} = "${new_value}" to all ${industry_preset} clients`,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
