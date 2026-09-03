import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      console.error('[Embedded Signup] Missing env vars:', { hasUrl: !!url, hasKey: !!key })
      throw new Error('Server misconfiguration: missing Supabase admin credentials')
    }
    _adminClient = createAdminClient(url, key)
  }
  return _adminClient
}

/**
 * POST /api/whatsapp/embedded-signup/callback
 *
 * Receives either an access_token (direct from JS SDK) or an authorization code
 * from the frontend after the Facebook SDK popup completes.
 *
 * Preferred flow (direct token):
 *   Frontend calls FB.login() without response_type:'code' → gets accessToken
 *   → sends access_token to this endpoint → server uses it directly
 *
 * Legacy flow (code exchange):
 *   Frontend sends code → server exchanges for token → uses token
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
    const { state_token } = body as { state_token?: string }
    const frontendAccessToken = body.access_token as string | undefined
    const frontendCode = body.code as string | undefined
    const frontendWabaId = body.waba_id as string | undefined
    const frontendPhoneNumberId = body.phone_number_id as string | undefined

    if (!state_token) {
      return NextResponse.json(
        { error: 'Missing required field: state_token' },
        { status: 400 },
      )
    }

    // Must have either access_token or code
    if (!frontendAccessToken && !frontendCode) {
      return NextResponse.json(
        { error: 'Missing required field: access_token or code' },
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

    // ================================================================
    // STEP 1: Obtain access token
    // Either use the direct token from JS SDK, or exchange a code
    // ================================================================
    let accessToken: string
    let tokenExpiresAt: string | null = null

    if (frontendAccessToken) {
      // Direct token flow (preferred) — no code exchange needed
      console.log('[Embedded Signup] Using direct access token from JS SDK')
      accessToken = frontendAccessToken
      // JS SDK tokens are short-lived (~1-2 hours), set approximate expiry
      tokenExpiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
    } else {
      // Legacy code exchange flow
      console.log('[Embedded Signup] Exchanging authorization code for token')
      const appId = process.env.META_APP_ID
      const appSecret = process.env.META_APP_SECRET
      if (!appId || !appSecret) {
        return NextResponse.json(
          { error: 'META_APP_ID or META_APP_SECRET not configured' },
          { status: 500 },
        )
      }
      try {
        const tokenResult = await exchangeCodeForToken({
          code: frontendCode!,
          appId,
          appSecret,
          redirectUri: '',
        })
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
    }

    // ================================================================
    // STEP 2: Discover WABA and phone number
    // Use frontend-provided IDs if available, otherwise auto-discover
    // ================================================================
    let wabaId: string
    let phoneNumberId: string

    if (frontendWabaId && frontendPhoneNumberId) {
      console.log('[Embedded Signup] Using frontend-provided WABA/Phone IDs')
      wabaId = frontendWabaId
      phoneNumberId = frontendPhoneNumberId
    } else {
      console.log('[Embedded Signup] Auto-discovering WABA and phone number...')
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
    }

    // ================================================================
    // STEP 3: Check for phone number conflict with another account
    // ================================================================
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

    // ================================================================
    // STEP 4: Get business info
    // ================================================================
    const businessInfo = await getBusinessInfo({ accessToken, wabaId })

    // ================================================================
    // STEP 5: Get phone info
    // ================================================================
    const phones = await getPhoneNumbers({ accessToken, wabaId })
    const phoneInfo = phones.find((p) => p.id === phoneNumberId) ?? phones[0]
    if (!phoneInfo) {
      throw new Error('Phone number not found after discovery')
    }

    // ================================================================
    // STEP 6: Register phone for Cloud API
    // ================================================================
    const registration = await registerPhoneForCloudAPI({
      accessToken,
      phoneNumberId: phoneInfo.id,
    })

    // ================================================================
    // STEP 7: Subscribe app to WABA
    // ================================================================
    const subscription = await subscribeAppToWaba({ accessToken, wabaId })

    // ================================================================
    // STEP 8: Encrypt token and build result
    // ================================================================
    const encryptedAccessToken = encrypt(accessToken)

    const result = {
      encryptedAccessToken,
      tokenExpiresAt,
      businessInfo,
      phoneInfo,
      registered: registration.success,
      registrationError: registration.error,
      subscribedApps: subscription.success,
    }

    // ================================================================
    // STEP 9: Persist to database and respond
    // ================================================================
    return await persistAndRespond({
      supabase,
      accountId,
      session,
      wabaId,
      result,
      autoDiscovered: !frontendWabaId || !frontendPhoneNumberId,
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
    registered_at: result.registered ? now : null,
    subscribed_apps_at: result.subscribedApps ? now : null,
    last_registration_error: result.registrationError ?? null,
    status: 'connected' as const,
    connected_at: now,
    updated_at: now,
  }

  // Upsert config using admin client to bypass RLS
  console.log('[Embedded Signup] Persisting config for account:', accountId)
  console.log('[Embedded Signup] Config payload keys:', Object.keys(configPayload))
  let admin
  try {
    admin = supabaseAdmin()
  } catch (adminErr) {
    console.error('[Embedded Signup] Admin client creation failed:', adminErr)
    return NextResponse.json(
      { error: `Server configuration error: ${adminErr instanceof Error ? adminErr.message : 'unknown'}` },
      { status: 500 },
    )
  }
  const { data: existingConfig, error: selectError } = await admin
    .from('whatsapp_config')
    .select('id')
    .eq('account_id', accountId)
    .maybeSingle()

  if (selectError) {
    console.error('[Embedded Signup] Failed to check existing config:', selectError)
  }
  console.log('[Embedded Signup] Existing config:', existingConfig ? 'found (UPDATE path)' : 'not found (INSERT path)')

  if (existingConfig) {
    const { error: updateError } = await admin
      .from('whatsapp_config')
      .update(configPayload)
      .eq('account_id', accountId)

    if (updateError) {
      console.error('Failed to update whatsapp_config:', updateError)
      return NextResponse.json(
        { error: `Config saved to Meta but failed to persist locally: ${updateError.message}` },
        { status: 500 },
      )
    }
  } else {
    // For insert, we also need user_id
    const { data: profile } = await admin
      .from('profiles')
      .select('user_id')
      .eq('account_id', accountId)
      .limit(1)
      .single()

    const { error: insertError } = await admin
      .from('whatsapp_config')
      .insert({ ...configPayload, user_id: profile?.user_id })

    if (insertError) {
      console.error('Failed to insert whatsapp_config:', insertError)
      return NextResponse.json(
        { error: `Config saved to Meta but failed to persist locally: ${insertError.message}` },
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
