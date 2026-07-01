import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTransactionalSms, formatNigerianPhone, sendTestSms } from '@/lib/sms/brevo-sms'
import { decrypt } from '@/lib/whatsapp/encryption'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

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
 * POST /api/sms/send
 *
 * Send an SMS to a contact or phone number.
 *
 * Body:
 *   - contact_id?: string  — look up phone from contacts table
 *   - phone?: string       — direct phone number (used if no contact_id)
 *   - content: string      — SMS body text
 *   - test?: boolean       — if true, sends a test SMS
 */
export async function POST(request: Request) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`smsSend:${rlIp}`, RATE_LIMITS.smsSend);
    if (!rl.success) return rateLimitResponse(rl);

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
    const { contact_id, phone, content, test } = body

    // Get SMS config
    const { data: smsConfig } = await supabase
      .from('sms_config')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    if (!smsConfig || !smsConfig.enabled) {
      return NextResponse.json(
        { error: 'SMS is not configured or not enabled for this account.' },
        { status: 400 },
      )
    }

    // Get Brevo API key from email_config (shared key)
    const { data: emailConfig } = await supabase
      .from('email_config')
      .select('api_key, status')
      .eq('account_id', accountId)
      .maybeSingle()

    if (!emailConfig || emailConfig.status !== 'connected') {
      return NextResponse.json(
        { error: 'Brevo API key not configured. Set up Email first in Settings.' },
        { status: 400 },
      )
    }

    const apiKey = decrypt(emailConfig.api_key)

    // Handle test SMS
    if (test) {
      const recipientPhone = phone
      if (!recipientPhone) {
        return NextResponse.json(
          { error: 'Phone number required for test SMS.' },
          { status: 400 },
        )
      }

      try {
        const result = await sendTestSms(apiKey, smsConfig.sender_id, recipientPhone)

        // Log the test SMS
        await supabase.from('sms_log').insert({
          account_id: accountId,
          brevo_message_id: result.messageId,
          recipient_phone: formatNigerianPhone(recipientPhone!),
          content: 'M4E CRM test SMS',
          sms_count: result.smsCount,
          status: 'sent',
          source: 'test',
        })

        return NextResponse.json({
          success: true,
          message_id: result.messageId,
          sms_count: result.smsCount,
          remaining_credits: result.remainingCredits,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json(
          { error: `Test SMS failed: ${message}` },
          { status: 400 },
        )
      }
    }

    // Regular SMS send
    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'SMS content is required.' },
        { status: 400 },
      )
    }

    // Resolve recipient phone
    let recipientPhone: string | null = null
    let contactId: string | null = null

    if (contact_id) {
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, phone')
        .eq('id', contact_id)
        .eq('account_id', accountId)
        .maybeSingle()

      if (!contact) {
        return NextResponse.json(
          { error: 'Contact not found.' },
          { status: 404 },
        )
      }
      if (!contact.phone?.trim()) {
        return NextResponse.json(
          { error: 'Contact has no phone number.' },
          { status: 400 },
        )
      }
      recipientPhone = contact.phone ?? ""
      contactId = contact.id
    } else if (phone) {
      recipientPhone = phone
    } else {
      return NextResponse.json(
        { error: 'Either contact_id or phone is required.' },
        { status: 400 },
      )
    }

    // Check monthly cost cap
    if (smsConfig.monthly_cost_cap !== null) {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('sms_log')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .gte('created_at', monthStart.toISOString())

      // Rough estimate: each SMS costs ~₦4 / $0.01
      // This is a simple count-based cap for now
      if ((count ?? 0) >= smsConfig.monthly_cost_cap) {
        return NextResponse.json(
          { error: 'Monthly SMS cap reached. Increase the cap in Settings → SMS.' },
          { status: 429 },
        )
      }
    }

    try {
      const result = await sendTransactionalSms({
        apiKey,
        sender: smsConfig.sender_id,
        recipient: formatNigerianPhone(recipientPhone!),
        content: content.trim(),
        type: 'transactional',
      })

      // Log the SMS
      await supabase.from('sms_log').insert({
        account_id: accountId,
        contact_id: contactId,
        brevo_message_id: result.messageId,
        recipient_phone: formatNigerianPhone(recipientPhone!),
        content: content.trim().slice(0, 320),
        sms_count: result.smsCount,
        status: 'sent',
        source: 'manual',
      })

      return NextResponse.json({
        success: true,
        message_id: result.messageId,
        sms_count: result.smsCount,
        remaining_credits: result.remainingCredits,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'

      // Log the failure
      await supabase.from('sms_log').insert({
        account_id: accountId,
        contact_id: contactId,
        recipient_phone: formatNigerianPhone(recipientPhone!),
        content: content.trim().slice(0, 320),
        status: 'failed',
        error_message: message,
        source: 'manual',
      }).then(() => {}) // Best-effort logging, don't fail the response

      return NextResponse.json(
        { error: `SMS send failed: ${message}` },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error('Error in SMS send POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
