import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

/** Helper: resolve the authenticated user's account_id from profiles. */
async function getAccountId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.account_id as string | null
}

/**
 * GET /api/onboarding
 * Returns the current onboarding state for the authenticated user's account.
 */
export async function GET(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`auth:${clientIp}`, RATE_LIMITS.auth);
    if (!rl.success) return rateLimitResponse(rl);

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await getAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'No account found' }, { status: 404 })

    const { data, error } = await supabase
      .from('accounts')
      .select('onboarding_completed, onboarding_step, onboarding_data, industry, business_size, country')
      .eq('id', accountId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)

  } catch (error) {
    console.error('[ONBOARDING_GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onboarding
 * Saves step progress. Accepts { step: number, data: object }.
 * Merges `data` into the account's onboarding_data JSONB and updates onboarding_step.
 */
export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`auth:${clientIp}`, RATE_LIMITS.auth);
    if (!rl.success) return rateLimitResponse(rl);

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await getAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'No account found' }, { status: 404 })

    const body = await request.json()
    const { step, data: stepData } = body as { step: number; data: Record<string, unknown> }

    if (typeof step !== 'number' || step < 0 || step > 5) {
      return NextResponse.json({ error: 'Invalid step number' }, { status: 400 })
    }

    // Fetch current onboarding_data to merge
    const { data: current } = await supabase
      .from('accounts')
      .select('onboarding_data')
      .eq('id', accountId)
      .single()

    const existingData = (current?.onboarding_data as Record<string, unknown>) ?? {}
    const mergedData = { ...existingData, ...stepData }

    // Build update payload — also set top-level columns when provided
    const updatePayload: Record<string, unknown> = {
      onboarding_step: step,
      onboarding_data: mergedData,
    }
    if (stepData?.industry) updatePayload.industry = stepData.industry
    if (stepData?.business_size) updatePayload.business_size = stepData.business_size
    if (stepData?.country) updatePayload.country = stepData.country

    const { error } = await supabase
      .from('accounts')
      .update(updatePayload)
      .eq('id', accountId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, step, data: mergedData })

  } catch (error) {
    console.error('[ONBOARDING_POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/onboarding
 * Marks onboarding as complete. Sets onboarding_completed = true and
 * applies industry defaults.
 */
export async function PUT(request: Request) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`auth:${clientIp}`, RATE_LIMITS.auth);
    if (!rl.success) return rateLimitResponse(rl);

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = await getAccountId(supabase, user.id)
    if (!accountId) return NextResponse.json({ error: 'No account found' }, { status: 404 })

    // Fetch current data to apply industry defaults
    const { data: account } = await supabase
      .from('accounts')
      .select('onboarding_data, industry')
      .eq('id', accountId)
      .single()

    const onboardingData = (account?.onboarding_data as Record<string, unknown>) ?? {}

    // Apply default business hours if not already set
    if (!onboardingData.business_hours) {
      onboardingData.business_hours = {
        monday: { open: '09:00', close: '17:00', enabled: true },
        tuesday: { open: '09:00', close: '17:00', enabled: true },
        wednesday: { open: '09:00', close: '17:00', enabled: true },
        thursday: { open: '09:00', close: '17:00', enabled: true },
        friday: { open: '09:00', close: '17:00', enabled: true },
        saturday: { open: '09:00', close: '13:00', enabled: false },
        sunday: { open: '00:00', close: '00:00', enabled: false },
      }
    }

    const { error } = await supabase
      .from('accounts')
      .update({
        onboarding_completed: true,
        onboarding_step: 5,
        onboarding_data: onboardingData,
      })
      .eq('id', accountId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, onboarding_completed: true })

  } catch (error) {
    console.error('[ONBOARDING_PUT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
