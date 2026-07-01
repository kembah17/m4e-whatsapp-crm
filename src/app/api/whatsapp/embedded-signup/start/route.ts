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
 * POST /api/whatsapp/embedded-signup/start
 *
 * Creates a new embedded_signup_session with a random state_token.
 * Returns the state_token, app_id, and config_id needed by the
 * frontend to launch the Facebook SDK popup.
 */
export async function POST(request: Request) {
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

    const appId = process.env.META_APP_ID
    const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID

    if (!appId) {
      return NextResponse.json(
        { error: 'META_APP_ID is not configured on the server' },
        { status: 500 },
      )
    }

    // Generate a cryptographically random state token for CSRF protection
    const stateToken = crypto.randomUUID()

    // Expire any pending sessions for this account before creating a new one
    await supabase
      .from('embedded_signup_sessions')
      .update({ status: 'expired' })
      .eq('account_id', accountId)
      .eq('status', 'pending')

    // Create a new session
    const { error: insertError } = await supabase
      .from('embedded_signup_sessions')
      .insert({
        account_id: accountId,
        state_token: stateToken,
        status: 'pending',
      })

    if (insertError) {
      console.error('Failed to create embedded signup session:', insertError)
      return NextResponse.json(
        { error: 'Failed to create signup session' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      state_token: stateToken,
      app_id: appId,
      config_id: configId ?? null,
    })
  } catch (err) {
    console.error('Embedded signup start error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
