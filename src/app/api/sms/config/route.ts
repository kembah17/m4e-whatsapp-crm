import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Resolve the caller's account_id from their profile.
 */
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
 * GET /api/sms/config
 *
 * Returns SMS configuration status for the current account.
 * SMS uses the same Brevo API key as email — this route only
 * manages the sender_id and enabled flag.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json(
        { configured: false, reason: 'no_account', message: 'No account linked.' },
        { status: 200 },
      )
    }

    // Check if email (Brevo) is configured — SMS requires it
    const { data: emailConfig } = await supabase
      .from('email_config')
      .select('status')
      .eq('account_id', accountId)
      .maybeSingle()

    const brevoConnected = emailConfig?.status === 'connected'

    // Get SMS config
    const { data: smsConfig, error: configError } = await supabase
      .from('sms_config')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configError) {
      console.error('Error fetching sms_config:', configError)
      return NextResponse.json(
        { configured: false, reason: 'db_error', message: 'Failed to fetch configuration.' },
        { status: 200 },
      )
    }

    if (!smsConfig) {
      return NextResponse.json({
        configured: false,
        has_config: false,
        brevo_connected: brevoConnected,
        message: brevoConnected
          ? 'No SMS configuration saved yet. Set a Sender ID to get started.'
          : 'Configure Brevo email first — SMS uses the same API key.',
      })
    }

    // Get this month's SMS stats
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const { count: monthlyCount } = await supabase
      .from('sms_log')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .gte('created_at', monthStart.toISOString())

    return NextResponse.json({
      configured: true,
      has_config: true,
      brevo_connected: brevoConnected,
      config: {
        sender_id: smsConfig.sender_id,
        enabled: smsConfig.enabled,
        monthly_cost_cap: smsConfig.monthly_cost_cap,
        monthly_sms_count: monthlyCount ?? smsConfig.monthly_sms_count,
      },
    })
  } catch (error) {
    console.error('Error in SMS config GET:', error)
    return NextResponse.json(
      { configured: false, reason: 'unknown', message: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/sms/config
 *
 * Creates or updates SMS configuration for the current account.
 * Requires Brevo email to be configured first (shared API key).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }

    // Verify Brevo email is configured
    const { data: emailConfig } = await supabase
      .from('email_config')
      .select('status')
      .eq('account_id', accountId)
      .maybeSingle()

    if (emailConfig?.status !== 'connected') {
      return NextResponse.json(
        { error: 'Configure Brevo email first. SMS uses the same API key.' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const { sender_id, enabled, monthly_cost_cap } = body

    if (!sender_id?.trim()) {
      return NextResponse.json(
        { error: 'sender_id is required (up to 11 alphanumeric characters)' },
        { status: 400 },
      )
    }

    // Validate sender_id: alphanumeric, 3-11 chars
    const cleanSenderId = sender_id.trim()
    if (!/^[a-zA-Z0-9]{3,11}$/.test(cleanSenderId)) {
      return NextResponse.json(
        { error: 'Sender ID must be 3-11 alphanumeric characters (e.g. "M4E", "AcmeCorp")' },
        { status: 400 },
      )
    }

    // Check for existing config
    const { data: existing } = await supabase
      .from('sms_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle()

    const row = {
      sender_id: cleanSenderId,
      enabled: enabled ?? false,
      monthly_cost_cap: monthly_cost_cap ?? null,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('sms_config')
        .update(row)
        .eq('account_id', accountId)
      if (updateError) {
        console.error('Error updating sms_config:', updateError)
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase
        .from('sms_config')
        .insert({ account_id: accountId, ...row })
      if (insertError) {
        console.error('Error inserting sms_config:', insertError)
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, sender_id: cleanSenderId })
  } catch (error) {
    console.error('Error in SMS config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/sms/config
 *
 * Removes SMS configuration for the current account.
 */
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }

    const { error: deleteError } = await supabase
      .from('sms_config')
      .delete()
      .eq('account_id', accountId)

    if (deleteError) {
      console.error('Error deleting sms_config:', deleteError)
      return NextResponse.json({ error: 'Failed to delete configuration' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in SMS config DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
