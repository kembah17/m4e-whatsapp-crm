/**
 * Brevo Transactional SMS API client.
 *
 * Endpoint: POST https://api.brevo.com/v3/transactionalSMS/sms
 * Auth: api-key header
 * Docs: https://developers.brevo.com/reference/sendtransacsms
 *
 * Uses the SAME API key as Brevo email — one key covers both channels.
 */

export interface SendSmsParams {
  apiKey: string
  /** Sender ID — up to 11 alphanumeric chars (e.g. "M4E" or business name).
   *  Some carriers require pre-registered sender IDs. */
  sender: string
  /** Recipient phone in international format: +234XXXXXXXXXX */
  recipient: string
  /** SMS body text — max 160 chars for single SMS, 153 per part for multipart. */
  content: string
  /** Optional: "transactional" or "marketing". Defaults to "transactional". */
  type?: 'transactional' | 'marketing'
  /** Optional: webhook URL for delivery status callbacks. */
  webhookUrl?: string
  /** Optional: custom tag for analytics grouping. */
  tag?: string
}

export interface SendSmsResult {
  messageId: string
  smsCount: number
  usedCredits: number
  remainingCredits: number
}

export interface SmsAccountInfo {
  /** Remaining SMS credits on the Brevo account. */
  credits: number
  /** Account email for identification. */
  email: string
  companyName: string
}

/**
 * Format a Nigerian phone number to E.164 international format.
 * Handles common Nigerian formats:
 *   0801... → +234801...
 *   234801... → +234801...
 *   +234801... → +234801... (no change)
 */
export function formatNigerianPhone(phone: string): string {
  // Strip all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Remove leading + for processing
  const hasPlus = cleaned.startsWith('+')
  if (hasPlus) cleaned = cleaned.slice(1)

  // Nigerian local format: starts with 0, 11 digits total
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '+234' + cleaned.slice(1)
  }

  // Already has country code 234
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return '+' + cleaned
  }

  // If it has + prefix and looks valid, return as-is
  if (hasPlus && cleaned.length >= 10) {
    return '+' + cleaned
  }

  // Fallback: return with + prefix
  return '+' + cleaned
}

/**
 * Send a transactional SMS via Brevo's SMS API.
 *
 * @throws Error if the API returns a non-2xx status.
 */
export async function sendTransactionalSms(
  params: SendSmsParams,
): Promise<SendSmsResult> {
  const body: Record<string, unknown> = {
    sender: params.sender,
    recipient: params.recipient,
    content: params.content,
    type: params.type ?? 'transactional',
  }
  if (params.webhookUrl) {
    body.webUrl = params.webhookUrl
  }
  if (params.tag) {
    body.tag = params.tag
  }

  const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: {
      'api-key': params.apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'no body')
    throw new Error(`Brevo SMS API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return {
    messageId: data.messageId ?? data.reference ?? 'unknown',
    smsCount: data.smsCount ?? 1,
    usedCredits: data.usedCredits ?? 0,
    remainingCredits: data.remainingCredits ?? 0,
  }
}

/**
 * Check SMS credits available on the Brevo account.
 * GET https://api.brevo.com/v3/account
 *
 * The account endpoint returns plan info including SMS credits.
 */
export async function checkSmsCredits(
  apiKey: string,
): Promise<SmsAccountInfo> {
  const res = await fetch('https://api.brevo.com/v3/account', {
    method: 'GET',
    headers: {
      'api-key': apiKey,
      accept: 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'no body')
    throw new Error(`Brevo API error (${res.status}): ${text}`)
  }

  const data = await res.json()

  // SMS credits are in the plan array under type "sms"
  const smsPlan = data.plan?.find(
    (p: { type: string }) => p.type === 'sms',
  )

  return {
    credits: smsPlan?.credits ?? 0,
    email: data.email ?? '',
    companyName: data.companyName ?? '',
  }
}

/**
 * Send a test SMS to verify the configuration works.
 */
export async function sendTestSms(
  apiKey: string,
  sender: string,
  recipient: string,
): Promise<SendSmsResult> {
  return sendTransactionalSms({
    apiKey,
    sender,
    recipient: formatNigerianPhone(recipient),
    content: `M4E CRM test SMS. Your SMS integration is working! Sent at ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}`,
    type: 'transactional',
    tag: 'test',
  })
}
