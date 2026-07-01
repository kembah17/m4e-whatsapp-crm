import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.account_id) return null
  return data.account_id as string
}

/**
 * GET /api/whatsapp/embedded-signup/status
 *
 * Returns the most recent embedded signup session for the current
 * account. Used by the frontend to poll/check completion status.
 */
export async function GET(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`auth:${clientIp}`, RATE_LIMITS.auth);
    if (!rl.success) return rateLimitResponse(rl);

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json(
        { error: 'No account found for this user' },
        { status: 403 },
      )
    }

    // Get the most recent session
    const { data: session, error: sessionError } = await supabase
      .from('embedded_signup_sessions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError) {
      console.error('Failed to fetch signup session:', sessionError)
      return NextResponse.json(
        { error: 'Failed to fetch session status' },
        { status: 500 },
      )
    }

    if (!session) {
      return NextResponse.json({
        has_session: false,
        status: null,
      })
    }

    // Also check if there's an active whatsapp_config with embedded_signup method
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select(
        'setup_method, business_name, display_phone_number, embedded_signup_completed_at, phone_verified',
      )
      .eq('account_id', accountId)
      .maybeSingle()

    return NextResponse.json({
      has_session: true,
      session: {
        id: session.id,
        status: session.status,
        waba_id: session.waba_id,
        phone_number_id: session.phone_number_id,
        meta_business_id: session.meta_business_id,
        error_message: session.error_message,
        created_at: session.created_at,
        completed_at: session.completed_at,
      },
      config: config
        ? {
            setup_method: config.setup_method,
            business_name: config.business_name,
            display_phone_number: config.display_phone_number,
            embedded_signup_completed_at:
              config.embedded_signup_completed_at,
            phone_verified: config.phone_verified,
          }
        : null,
    })
  } catch (err) {
    console.error('Embedded signup status error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
