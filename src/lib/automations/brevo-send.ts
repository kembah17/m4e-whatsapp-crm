import { sendTransactionalEmail } from '@/lib/email/brevo-api'
import { decrypt } from '@/lib/whatsapp/encryption'
import { supabaseAdmin } from './admin-client'

// ------------------------------------------------------------
// Automation-side Brevo email sender.
//
// Mirrors the pattern in meta-send.ts but for email via Brevo.
// No message persistence to the messages table — email is a
// separate channel, not part of the WhatsApp inbox.
// ------------------------------------------------------------

export interface EngineSendEmailArgs {
  /** Account-level tenancy key. */
  accountId: string
  /** Original author of the automation — audit only. */
  userId: string
  /** Contact to send to — email looked up from contacts table. */
  contactId: string
  /** Email subject line. */
  subject: string
  /** HTML body content. */
  htmlContent: string
  /** Optional plain-text fallback. */
  textContent?: string
}

export async function engineSendEmail(
  args: EngineSendEmailArgs,
): Promise<{ messageId: string }> {
  const db = supabaseAdmin()

  // Look up contact’s email, scoped by account_id
  const { data: contact, error: contactErr } = await db
    .from('contacts')
    .select('id, email, name')
    .eq('id', args.contactId)
    .eq('account_id', args.accountId)
    .maybeSingle()

  if (contactErr || !contact) {
    throw new Error('contact not found for this account')
  }
  if (!contact.email?.trim()) {
    throw new Error(`contact ${args.contactId} has no email address`)
  }

  // Look up email_config for this account
  const { data: config, error: configErr } = await db
    .from('email_config')
    .select('*')
    .eq('account_id', args.accountId)
    .single()

  if (configErr || !config) {
    throw new Error('Email (Brevo) not configured for this account')
  }

  if (config.status !== 'connected') {
    throw new Error('Email config is disconnected — verify API key in Settings')
  }

  // Decrypt the stored API key (same encryption as WhatsApp tokens)
  const apiKey = decrypt(config.api_key)

  const { messageId } = await sendTransactionalEmail({
    apiKey,
    senderName: config.sender_name,
    senderEmail: config.sender_email,
    toEmail: contact.email,
    toName: contact.name ?? undefined,
    subject: args.subject,
    htmlContent: args.htmlContent,
    textContent: args.textContent,
  })

  return { messageId }
}
