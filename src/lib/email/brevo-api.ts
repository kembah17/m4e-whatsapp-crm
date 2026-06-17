/**
 * Brevo (formerly Sendinblue) transactional email API client.
 *
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 * Auth: api-key header
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 */

export interface SendEmailParams {
  apiKey: string
  senderName: string
  senderEmail: string
  toEmail: string
  toName?: string
  subject: string
  htmlContent: string
  textContent?: string
}

export interface SendEmailResult {
  messageId: string
}

export interface BrevoAccountInfo {
  email: string
  firstName: string
  lastName: string
  companyName: string
}

/**
 * Send a transactional email via Brevo’s SMTP API.
 *
 * @throws Error if the API returns a non-2xx status.
 */
export async function sendTransactionalEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const body: Record<string, unknown> = {
    sender: { name: params.senderName, email: params.senderEmail },
    to: [{ email: params.toEmail, ...(params.toName ? { name: params.toName } : {}) }],
    subject: params.subject,
    htmlContent: params.htmlContent,
  }
  if (params.textContent) {
    body.textContent = params.textContent
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
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
    throw new Error(`Brevo API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return { messageId: data.messageId ?? data.message_id ?? 'unknown' }
}

/**
 * Verify a Brevo API key by fetching the account info.
 * GET https://api.brevo.com/v3/account
 *
 * @throws Error if the key is invalid or the API is unreachable.
 */
export async function verifyBrevoApiKey(
  apiKey: string,
): Promise<BrevoAccountInfo> {
  const res = await fetch('https://api.brevo.com/v3/account', {
    method: 'GET',
    headers: {
      'api-key': apiKey,
      accept: 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'no body')
    throw new Error(`Brevo API key verification failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return {
    email: data.email ?? '',
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    companyName: data.companyName ?? '',
  }
}
