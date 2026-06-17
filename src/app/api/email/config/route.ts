import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'
import { verifyBrevoApiKey } from '@/lib/email/brevo-api'

/**
 * Resolve the caller’s account_id from their profile.
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
 * GET /api/email/config
 *
 * Returns connection status + saved config metadata (no secrets).
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
        { connected: false, reason: 'no_account', message: 'No account linked.' },
        { status: 200 },
      )
    }

    const { data: config, error: configError } = await supabase
      .from('email_config')
      .select('api_key, sender_name, sender_email, status')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configError) {
      console.error('Error fetching email_config:', configError)
      return NextResponse.json(
        { connected: false, reason: 'db_error', message: 'Failed to fetch configuration.' },
        { status: 200 },
      )
    }

    if (!config) {
      return NextResponse.json(
        {
          connected: false,
          reason: 'no_config',
          has_config: false,
          message: 'No email configuration saved yet.',
        },
        { status: 200 },
      )
    }

    // Try to decrypt the stored API key
    let apiKey: string
    try {
      apiKey = decrypt(config.api_key)
    } catch (err) {
      console.error('[email/config GET] API key decryption failed:', err)
      return NextResponse.json(
        {
          connected: false,
          reason: 'key_corrupted',
          has_config: true,
          config: { sender_name: config.sender_name, sender_email: config.sender_email },
          message: 'Stored API key cannot be decrypted. Reset and re-enter.',
        },
        { status: 200 },
      )
    }

    // Verify with Brevo
    try {
      const account = await verifyBrevoApiKey(apiKey)
      return NextResponse.json({
        connected: true,
        has_config: true,
        account_name: account.companyName || `${account.firstName} ${account.lastName}`.trim(),
        config: { sender_name: config.sender_name, sender_email: config.sender_email },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Brevo API error'
      console.error('[email/config GET] Brevo verification failed:', message)
      return NextResponse.json(
        {
          connected: false,
          reason: 'brevo_api_error',
          has_config: true,
          config: { sender_name: config.sender_name, sender_email: config.sender_email },
          message: `Brevo API rejected the key: ${message}`,
        },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error('Error in email config GET:', error)
    return NextResponse.json(
      { connected: false, reason: 'unknown', message: 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/email/config
 *
 * Saves or updates the Brevo email config. Verifies the API key first.
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

    const body = await request.json()
    const { api_key, sender_name, sender_email } = body

    if (!api_key || !sender_name || !sender_email) {
      return NextResponse.json(
        { error: 'api_key, sender_name, and sender_email are required' },
        { status: 400 },
      )
    }

    // Verify API key with Brevo before saving
    let account
    try {
      account = await verifyBrevoApiKey(api_key)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json(
        { error: `Brevo API key verification failed: ${message}` },
        { status: 400 },
      )
    }

    // Encrypt the API key
    let encryptedKey: string
    try {
      encryptedKey = encrypt(api_key)
    } catch (err) {
      console.error('Encryption failed:', err)
      return NextResponse.json(
        { error: 'Failed to encrypt API key. Check ENCRYPTION_KEY env var.' },
        { status: 500 },
      )
    }

    // Check for existing config
    const { data: existing } = await supabase
      .from('email_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle()

    const baseRow = {
      api_key: encryptedKey,
      sender_name: sender_name.trim(),
      sender_email: sender_email.trim(),
      status: 'connected' as const,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('email_config')
        .update(baseRow)
        .eq('account_id', accountId)
      if (updateError) {
        console.error('Error updating email_config:', updateError)
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase
        .from('email_config')
        .insert({
          account_id: accountId,
          user_id: user.id,
          ...baseRow,
        })
      if (insertError) {
        console.error('Error inserting email_config:', insertError)
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      account_name: account.companyName || `${account.firstName} ${account.lastName}`.trim(),
    })
  } catch (error) {
    console.error('Error in email config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/email/config
 *
 * Removes the email configuration for the current account.
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
      .from('email_config')
      .delete()
      .eq('account_id', accountId)

    if (deleteError) {
      console.error('Error deleting email_config:', deleteError)
      return NextResponse.json({ error: 'Failed to delete configuration' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in email config DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
