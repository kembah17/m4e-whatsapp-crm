import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { completeEmbeddedSignup } from '@/lib/whatsapp/embedded-signup'
import { createClient as createAdminClient } from '@supabase/supabase-js'
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

// Lazy-initialised service-role client for cross-account conflict checks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _adminClient
}

/**
 * POST /api/whatsapp/embedded-signup/callback
 *
 * Receives the authorization code and WABA/phone details from the
 * frontend after the Facebook SDK popup completes. Validates the
 * state_token, then orchestrates the full token exchange, phone
 * registration, and config persistence.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { code, state_token, waba_id, phone_number_id } = body as {
      code?: string
      state_token?: string
      waba_id?: string
      phone_number_id?: string
    }

    if (!code || !state_token) {
      return NextResponse.json(
        { error: 'Missing required fields: code, state_token' },
        { status: 400 },
      )
    }

    if (!waba_id || !phone_number_id) {
      return NextResponse.json(
        { error: 'Missing required fields: waba_id, phone_number_id' },
        { status: 400 },
      )
    }

    // Validate state_token against session (CSRF protection)
    const { data: session, error: sessionError } = await supabase
      .from('embedded_signup_sessions')
      .select('*')
      .eq('state_token', state_token)
      .eq('account_id', accountId)
      .eq('status', 'pending')
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid or expired signup session' },
        { status: 400 },
      )
    }

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('embedded_signup_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id)

      return NextResponse.json(
        { error: 'Signup session has expired. Please try again.' },
        { status: 400 },
      )
    }

    // Check env vars
    const appId = process.env.META_APP_ID
    const appSecret = process.env.META_APP_SECRET

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: 'META_APP_ID or META_APP_SECRET not configured' },
        { status: 500 },
      )
    }

    // Check for phone_number_id conflict with another account
    const { data: conflict } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('account_id')
      .eq('phone_number_id', phone_number_id)
      .neq('account_id', accountId)
      .maybeSingle()

    if (conflict) {
      await supabase
        .from('embedded_signup_sessions')
        .update({
          status: 'failed',
          error_message: 'Phone number already claimed by another account',
        })
        .eq('id', session.id)

      return NextResponse.json(
        { error: 'This phone number is already connected to another account' },
        { status: 409 },
      )
    }

    // Run the full embedded signup orchestration
    let result
    try {
      result = await completeEmbeddedSignup({
        code,
        wabaId: waba_id,
        phoneNumberId: phone_number_id,
        appId,
        appSecret,
      })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Embedded signup failed'

      await supabase
        .from('embedded_signup_sessions')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      return NextResponse.json(
        { error: errorMessage },
        { status: 502 },
      )
    }

    // Persist config to whatsapp_config (upsert)
    const now = new Date().toISOString()
    const configPayload = {
      account_id: accountId,
      phone_number_id: result.phoneInfo.id,
      waba_id: waba_id,
      access_token: result.encryptedAccessToken,
      setup_method: 'embedded_signup' as const,
      meta_business_id: result.businessInfo.id,
      business_name: result.businessInfo.name,
      display_phone_number: result.phoneInfo.displayPhoneNumber,
      quality_rating: result.phoneInfo.qualityRating ?? null,
      messaging_limit: result.phoneInfo.messagingLimitTier ?? null,
      embedded_signup_completed_at: now,
      token_expires_at: result.tokenExpiresAt,
      phone_verified: true,
      is_registered: result.registered,
      registered_at: result.registered ? now : null,
      last_registration_error: result.registrationError ?? null,
      updated_at: now,
    }

    // Check if config already exists for this account
    const { data: existingConfig } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle()

    if (existingConfig) {
      const { error: updateError } = await supabase
        .from('whatsapp_config')
        .update(configPayload)
        .eq('account_id', accountId)

      if (updateError) {
        console.error('Failed to update whatsapp_config:', updateError)
        return NextResponse.json(
          { error: 'Config saved to Meta but failed to persist locally' },
          { status: 500 },
        )
      }
    } else {
      const { error: insertError } = await supabase
        .from('whatsapp_config')
        .insert(configPayload)

      if (insertError) {
        console.error('Failed to insert whatsapp_config:', insertError)
        return NextResponse.json(
          { error: 'Config saved to Meta but failed to persist locally' },
          { status: 500 },
        )
      }
    }

    // Update session as completed
    await supabase
      .from('embedded_signup_sessions')
      .update({
        status: 'completed',
        meta_code: code,
        waba_id: waba_id,
        phone_number_id: result.phoneInfo.id,
        meta_business_id: result.businessInfo.id,
        completed_at: now,
      })
      .eq('id', session.id)

    return NextResponse.json({
      success: true,
      business_name: result.businessInfo.name,
      phone_number: result.phoneInfo.displayPhoneNumber,
      phone_number_id: result.phoneInfo.id,
      verified_name: result.phoneInfo.verifiedName,
      registered: result.registered,
      registration_error: result.registrationError,
      subscribed_apps: result.subscribedApps,
    })
  } catch (err) {
    console.error('Embedded signup callback error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
