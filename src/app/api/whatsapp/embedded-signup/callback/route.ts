import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  completeEmbeddedSignup,
  autoDiscoverWabaAndPhone,
  exchangeCodeForToken,
  getBusinessInfo,
  getPhoneNumbers,
  registerPhoneForCloudAPI,
  subscribeAppToWaba,
} from '@/lib/whatsapp/embedded-signup'
import { encrypt } from '@/lib/whatsapp/encryption'
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
 * Receives the authorization code and optionally WABA/phone details from the
 * frontend after the Facebook SDK popup completes.
 *
 * Two paths:
 *   Path A: waba_id + phone_number_id provided (config_id mode) → use completeEmbeddedSignup()
 *   Path B: waba_id/phone_number_id missing (scope-based OAuth) → exchange code once,
 *           auto-discover WABA/phone, then run remaining steps with the token
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
    const { code, state_token } = body as {
      code?: string
      state_token?: string
    }

    // redirect_uri from the frontend (window.location.origin) — required for Meta OAuth token exchange
    const redirectUri = (body.redirect_uri as string) || new URL(request.url).origin

    // waba_id and phone_number_id are optional — will be auto-discovered if missing
    const frontendWabaId = body.waba_id as string | undefined
    const frontendPhoneNumberId = body.phone_number_id as string | undefined
    const needsAutoDiscovery = !frontendWabaId || !frontendPhoneNumberId

    if (!code || !state_token) {
      return NextResponse.json(
        { error: 'Missing required fields: code, state_token' },
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

    // ================================================================
    // PATH A: Frontend provided waba_id + phone_number_id
    //         Use completeEmbeddedSignup() which handles everything
    // ================================================================
    if (!needsAutoDiscovery) {
      // Check for phone_number_id conflict with another account
      const { data: conflict } = await supabaseAdmin()
        .from('whatsapp_config')
        .select('account_id')
        .eq('phone_number_id', frontendPhoneNumberId)
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

      let result
      try {
        result = await completeEmbeddedSignup({
          code,
          wabaId: frontendWabaId!,
          phoneNumberId: frontendPhoneNumberId!,
          appId,
          appSecret,
          redirectUri,
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

        return NextResponse.json({ error: errorMessage }, { status: 502 })
      }

      // Persist and respond (shared helper below)
      return await persistAndRespond({
        supabase,
        accountId,
        session,
        wabaId: frontendWabaId!,
        result,
        autoDiscovered: false,
      })
    }

    // ================================================================
    // PATH B: Auto-discovery needed (scope-based OAuth, no config_id)
    //         Exchange code ONCE, discover WABA/phone, then run steps
    // ================================================================
    console.log(
      '[Embedded Signup] WABA/Phone not in popup response — starting auto-discovery...',
    )

    // Step 1: Exchange code for token (SINGLE exchange — codes are single-use)
    let accessToken: string
    let tokenExpiresAt: string | null = null
    try {
      const tokenResult = await exchangeCodeForToken({ code, appId, appSecret, redirectUri })
      accessToken = tokenResult.accessToken
      if (tokenResult.expiresIn && tokenResult.expiresIn > 0) {
        tokenExpiresAt = new Date(
          Date.now() + tokenResult.expiresIn * 1000,
        ).toISOString()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token exchange failed'
      console.error('[Embedded Signup] Token exchange failed:', msg)
      await supabase
        .from('embedded_signup_sessions')
        .update({
          status: 'failed',
          error_message: msg,
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.id)
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    // Step 2: Auto-discover WABA and phone number
    let wabaId: string
    let phoneNumberId: string
    try {
      const discovered = await autoDiscoverWabaAndPhone({ accessToken })
      wabaId = discovered.wabaId
      phoneNumberId = discovered.phoneNumberId
      console.log(
        `[Embedded Signup] Auto-discovered WABA: ${wabaId}, Phone: ${phoneNumberId}`,
      )
    } catch (discoveryErr) {
      const discoveryMessage =
        discoveryErr instanceof Error
          ? discoveryErr.message
          : 'Failed to discover WhatsApp Business Account'

      console.error('[Embedded Signup] Auto-discovery failed:', discoveryMessage)
      await supabase
        .from('embedded_signup_sessions')
        .update({
          status: 'failed',
          error_message: `Auto-discovery failed: ${discoveryMessage}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      return NextResponse.json(
        {
          error: discoveryMessage,
          hint: 'The system could not automatically find your WhatsApp Business Account. '
            + 'Ensure your Meta Business account has a WABA with at least one phone number, '
            + 'or use Manual Setup to enter your credentials directly.',
        },
        { status: 422 },
      )
    }

    // Check for phone_number_id conflict
    const { data: conflict } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('account_id')
      .eq('phone_number_id', phoneNumberId)
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

    // Step 3: Get business info
    const businessInfo = await getBusinessInfo({ accessToken, wabaId })

    // Step 4: Get phone info
    const phones = await getPhoneNumbers({ accessToken, wabaId })
    const phoneInfo = phones.find((p) => p.id === phoneNumberId) ?? phones[0]
    if (!phoneInfo) {
      throw new Error('Phone number not found after discovery')
    }

    // Step 5: Register phone for Cloud API
    const registration = await registerPhoneForCloudAPI({
      accessToken,
      phoneNumberId: phoneInfo.id,
    })

    // Step 6: Subscribe app to WABA
    const subscription = await subscribeAppToWaba({ accessToken, wabaId })

    // Step 7: Encrypt token
    const encryptedAccessToken = encrypt(accessToken)

    // Build result object matching EmbeddedSignupResult shape
    const result = {
      success: true as const,
      encryptedAccessToken,
      tokenExpiresAt,
      businessInfo,
      phoneInfo,
      registered: registration.success,
      registrationError: registration.error,
      subscribedApps: subscription.success,
    }

    return await persistAndRespond({
      supabase,
      accountId,
      session,
      wabaId,
      result,
      autoDiscovered: true,
    })
  } catch (err) {
    console.error('Embedded signup callback error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// ================================================================
// Shared helper: persist config to DB and return success response
// ================================================================
async function persistAndRespond({
  supabase,
  accountId,
  session,
  wabaId,
  result,
  autoDiscovered,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  accountId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any
  wabaId: string
  result: {
    encryptedAccessToken: string
    tokenExpiresAt: string | null
    businessInfo: { id: string; name: string }
    phoneInfo: { id: string; displayPhoneNumber: string; verifiedName?: string; qualityRating?: string; messagingLimitTier?: string }
    registered: boolean
    registrationError?: string
    subscribedApps: boolean
  }
  autoDiscovered: boolean
}) {
  const now = new Date().toISOString()
  const configPayload = {
    account_id: accountId,
    phone_number_id: result.phoneInfo.id,
    waba_id: wabaId,
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

  // Upsert config
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
      meta_code: '[redacted]',
      waba_id: wabaId,
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
    auto_discovered: autoDiscovered,
  })
}
