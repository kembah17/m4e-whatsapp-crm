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
 * GET /api/whatsapp/embedded-signup/start
 *
 * Pre-flight check: returns configuration status so the UI can
 * show actionable guidance before the user clicks Connect.
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

    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET
    const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID

    return NextResponse.json({
      ready: Boolean(appId && appSecret),
      has_app_id: Boolean(appId),
      has_app_secret: Boolean(appSecret),
      has_config_id: Boolean(configId),
      // Don't expose actual values — just readiness flags
    })
  } catch (err) {
    console.error('Embedded signup preflight error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
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
    const appSecret = process.env.META_APP_SECRET
    const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID

    if (!appId) {
      return NextResponse.json(
        { error: 'META_APP_ID is not configured on the server. Contact your administrator.' },
        { status: 500 },
      )
    }

    if (!appSecret) {
      return NextResponse.json(
        { error: 'META_APP_SECRET is not configured on the server. The App Secret is required to exchange the authorization code for an access token. Get it from Meta App Dashboard → Settings → Basic → App Secret, then add it as a Vercel environment variable.' },
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
