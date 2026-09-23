import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSegmentContacts } from '@/lib/segments/segment-engine'
import { decrypt } from '@/lib/whatsapp/encryption'

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

// ---------------------------------------------------------------------------
// SHA-256 hashing for Meta Custom Audience upload
// ---------------------------------------------------------------------------

export function hashForMeta(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

// ---------------------------------------------------------------------------
// Prepare segment contacts for Meta upload
// ---------------------------------------------------------------------------

export async function prepareAudiencePayload(
  supabase: SupabaseClient,
  accountId: string,
  segmentRules: Record<string, unknown>,
): Promise<{ hashed_phones: string[]; hashed_emails: string[]; count: number }> {
  // Use segment engine to get matching contacts
  const contacts = await getSegmentContacts(supabase, accountId, segmentRules)

  const hashedPhones: string[] = []
  const hashedEmails: string[] = []

  for (const contact of contacts) {
    // Phone numbers may be encrypted
    if (contact.phone) {
      try {
        const phone = contact.phone.includes(':') ? decrypt(contact.phone) : contact.phone
        // Normalize: remove spaces, dashes, ensure E.164 without +
        const normalized = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '')
        if (normalized.length >= 10) {
          hashedPhones.push(hashForMeta(normalized))
        }
      } catch {
        // Skip contacts with decryption errors
      }
    }

    // Email may be encrypted
    if (contact.email) {
      try {
        const email = contact.email.includes(':') ? decrypt(contact.email) : contact.email
        if (email.includes('@')) {
          hashedEmails.push(hashForMeta(email))
        }
      } catch {
        // Skip contacts with decryption errors
      }
    }
  }

  return {
    hashed_phones: hashedPhones,
    hashed_emails: hashedEmails,
    count: contacts.length,
  }
}

// ---------------------------------------------------------------------------
// Meta API helper with retry logic
// ---------------------------------------------------------------------------

async function metaPost<T>(
  url: string,
  accessToken: string,
  body: Record<string, unknown>,
  retries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: accessToken }),
    })

    if (res.ok) {
      return res.json() as Promise<T>
    }

    const errorBody = await res.text()

    // Retry on rate limiting (code 32) or transient errors (code 2)
    if (attempt < retries) {
      try {
        const parsed = JSON.parse(errorBody)
        const code = parsed?.error?.code
        if (code === 32 || code === 2) {
          const backoff = (attempt + 1) * 5000
          console.warn(
            `[lookalike-sync] Meta API rate limited (code ${code}), retrying in ${backoff}ms`,
          )
          await new Promise((r) => setTimeout(r, backoff))
          continue
        }
      } catch {
        // Not JSON, fall through to throw
      }
    }

    throw new Error(`Meta API error ${res.status}: ${errorBody}`)
  }

  throw new Error('Exhausted retries')
}

// ---------------------------------------------------------------------------
// Sync to Meta Custom Audiences API
// ---------------------------------------------------------------------------

export async function syncToMetaAudience(
  adAccountId: string,
  accessToken: string,
  audienceName: string,
  payload: { hashed_phones: string[]; hashed_emails: string[] },
): Promise<{ audience_id: string; status: string }> {
  // Step 1: Create Custom Audience
  const createUrl = `${META_API_BASE}/act_${adAccountId}/customaudiences`

  const createResult = await metaPost<{ id: string }>(createUrl, accessToken, {
    name: audienceName,
    subtype: 'CUSTOM',
    description: 'M4E Business Growth Engine customer segment',
    customer_file_source: 'USER_PROVIDED_ONLY',
  })

  const audienceId = createResult.id

  // Step 2: Upload hashed user data
  // Build data rows: each row is [phone_hash, email_hash]
  // We need to combine phones and emails into rows
  const maxRows = Math.max(payload.hashed_phones.length, payload.hashed_emails.length)
  const dataRows: string[][] = []

  for (let i = 0; i < maxRows; i++) {
    dataRows.push([
      payload.hashed_phones[i] || '',
      payload.hashed_emails[i] || '',
    ])
  }

  if (dataRows.length > 0) {
    // Upload in batches of 10,000 (Meta limit)
    const BATCH_SIZE = 10_000
    for (let offset = 0; offset < dataRows.length; offset += BATCH_SIZE) {
      const batch = dataRows.slice(offset, offset + BATCH_SIZE)
      const uploadUrl = `${META_API_BASE}/${audienceId}/users`

      await metaPost(uploadUrl, accessToken, {
        payload: {
          schema: ['PHONE', 'EMAIL'],
          data: batch,
        },
      })

      console.log(
        `[lookalike-sync] Uploaded batch ${Math.floor(offset / BATCH_SIZE) + 1} ` +
        `(${batch.length} rows) to audience ${audienceId}`,
      )
    }
  }

  console.log(
    `[lookalike-sync] Created audience "${audienceName}" (${audienceId}) ` +
    `with ${payload.hashed_phones.length} phones and ${payload.hashed_emails.length} emails`,
  )

  return {
    audience_id: audienceId,
    status: 'synced',
  }
}

// ---------------------------------------------------------------------------
// Create Lookalike Audience from Custom Audience
// ---------------------------------------------------------------------------

export async function createLookalikeAudience(
  adAccountId: string,
  accessToken: string,
  sourceAudienceId: string,
  country: string,
  ratio: number, // 0.01 to 0.10
): Promise<{ lookalike_id: string; estimated_reach: number }> {
  const createUrl = `${META_API_BASE}/act_${adAccountId}/customaudiences`

  const lookalikeSpec = JSON.stringify({
    type: 'similarity',
    country: country.toUpperCase(),
    ratio,
  })

  const result = await metaPost<{ id: string }>(createUrl, accessToken, {
    name: `Lookalike - ${sourceAudienceId} - ${country.toUpperCase()} ${Math.round(ratio * 100)}%`,
    subtype: 'LOOKALIKE',
    origin_audience_id: sourceAudienceId,
    lookalike_spec: lookalikeSpec,
  })

  // Estimate reach based on ratio and country population
  const countryPopulations: Record<string, number> = {
    NG: 220_000_000,
    GH: 33_000_000,
    KE: 55_000_000,
    ZA: 60_000_000,
    US: 330_000_000,
    GB: 67_000_000,
  }

  const population = countryPopulations[country.toUpperCase()] ?? 50_000_000
  // Facebook typically reaches ~40% of population, lookalike is a fraction of that
  const facebookReach = population * 0.4
  const estimatedReach = Math.round(facebookReach * ratio)

  console.log(
    `[lookalike-sync] Created lookalike ${result.id} from ${sourceAudienceId} ` +
    `in ${country.toUpperCase()} at ${Math.round(ratio * 100)}% ratio ` +
    `(estimated reach: ${estimatedReach.toLocaleString()})`,
  )

  return {
    lookalike_id: result.id,
    estimated_reach: estimatedReach,
  }
}
