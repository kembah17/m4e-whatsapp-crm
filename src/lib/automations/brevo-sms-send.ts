import { sendTransactionalSms, formatNigerianPhone } from '@/lib/sms/brevo-sms'
import { decrypt } from '@/lib/whatsapp/encryption'
import { supabaseAdmin } from './admin-client'

// ------------------------------------------------------------
// Automation-side Brevo SMS sender.
//
// Mirrors the pattern in brevo-send.ts but for SMS via Brevo.
// Uses the SAME Brevo API key stored in email_config — Brevo
// uses one key for both email and SMS channels.
// ------------------------------------------------------------

export interface EngineSendSmsArgs {
  /** Account-level tenancy key. */
  accountId: string
  /** Original author of the automation — audit only. */
  userId: string
  /** Contact to send to — phone looked up from contacts table. */
  contactId: string
  /** SMS body text. */
  content: string
  /** Optional tag for analytics grouping. */
  tag?: string
}

export async function engineSendSms(
  args: EngineSendSmsArgs,
): Promise<{ messageId: string }> {
  const db = supabaseAdmin()

  // Look up contact's phone, scoped by account_id
  const { data: contact, error: contactErr } = await db
    .from('contacts')
    .select('id, phone, name')
    .eq('id', args.contactId)
    .eq('account_id', args.accountId)
    .maybeSingle()

  if (contactErr || !contact) {
    throw new Error('contact not found for this account')
  }
  if (!contact.phone?.trim()) {
    throw new Error(`contact ${args.contactId} has no phone number`)
  }

  // Look up sms_config for this account
  const { data: smsConfig, error: smsConfigErr } = await db
    .from('sms_config')
    .select('*')
    .eq('account_id', args.accountId)
    .maybeSingle()

  if (smsConfigErr || !smsConfig || !smsConfig.enabled) {
    throw new Error('SMS not configured or disabled for this account')
  }

  // SMS uses the same Brevo API key as email — look up from email_config
  const { data: emailConfig, error: emailConfigErr } = await db
    .from('email_config')
    .select('api_key, status')
    .eq('account_id', args.accountId)
    .single()

  if (emailConfigErr || !emailConfig) {
    throw new Error('Brevo API key not configured — set up Email first in Settings')
  }

  if (emailConfig.status !== 'connected') {
    throw new Error('Brevo API key is disconnected — verify in Settings → Email')
  }

  // Decrypt the stored API key (same encryption as WhatsApp tokens)
  const apiKey = decrypt(emailConfig.api_key)

  const { messageId } = await sendTransactionalSms({
    apiKey,
    sender: smsConfig.sender_id,
    recipient: formatNigerianPhone(contact.phone),
    content: args.content,
    type: 'transactional',
    tag: args.tag,
  })

  return { messageId }
}
