import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSegmentContacts } from '@/lib/segments/segment-engine'
import { decrypt } from '@/lib/whatsapp/encryption'

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
// Sync to Meta Custom Audiences API
// TODO: Activate when Meta Business verification is complete
// ---------------------------------------------------------------------------

export async function syncToMetaAudience(
  adAccountId: string,
  accessToken: string,
  audienceName: string,
  payload: { hashed_phones: string[]; hashed_emails: string[] },
): Promise<{ audience_id: string; status: string }> {
  // Meta Marketing API endpoint for Custom Audiences
  // POST https://graph.facebook.com/v21.0/act_{ad_account_id}/customaudiences
  //
  // Request body:
  // {
  //   name: audienceName,
  //   subtype: 'CUSTOM',
  //   description: 'M4E CRM customer segment',
  //   customer_file_source: 'USER_PROVIDED_ONLY',
  //   access_token: accessToken
  // }
  //
  // Then upload users:
  // POST https://graph.facebook.com/v21.0/{audience_id}/users
  // {
  //   payload: {
  //     schema: ['PHONE', 'EMAIL'],
  //     data: [
  //       [hashed_phone, hashed_email],
  //       ...
  //     ]
  //   },
  //   access_token: accessToken
  // }

  const _endpoint = `https://graph.facebook.com/v21.0/act_${adAccountId}/customaudiences`
  void _endpoint // suppress unused warning
  void accessToken
  void audienceName

  // TODO: Implement actual API call when Meta Business verification is complete
  // For now, return mock data
  console.log(
    `[lookalike-sync] STUB: Would create audience "${audienceName}" ` +
    `with ${payload.hashed_phones.length} phones and ${payload.hashed_emails.length} emails ` +
    `for ad account ${adAccountId}`,
  )

  return {
    audience_id: `mock_audience_${Date.now()}`,
    status: 'pending_verification',
  }
}

// ---------------------------------------------------------------------------
// Create Lookalike Audience from Custom Audience
// TODO: Activate when Meta Business verification is complete
// ---------------------------------------------------------------------------

export async function createLookalikeAudience(
  adAccountId: string,
  accessToken: string,
  sourceAudienceId: string,
  country: string,
  ratio: number, // 0.01 to 0.10
): Promise<{ lookalike_id: string; estimated_reach: number }> {
  // Meta Marketing API endpoint for Lookalike Audiences
  // POST https://graph.facebook.com/v21.0/act_{ad_account_id}/customaudiences
  //
  // Request body:
  // {
  //   name: `Lookalike - ${sourceAudienceId} - ${country} ${ratio * 100}%`,
  //   subtype: 'LOOKALIKE',
  //   origin_audience_id: sourceAudienceId,
  //   lookalike_spec: JSON.stringify({
  //     type: 'similarity',
  //     country: country,
  //     ratio: ratio,
  //   }),
  //   access_token: accessToken
  // }

  const _endpoint = `https://graph.facebook.com/v21.0/act_${adAccountId}/customaudiences`
  void _endpoint
  void accessToken
  void sourceAudienceId
  void country

  // TODO: Implement actual API call when Meta Business verification is complete
  console.log(
    `[lookalike-sync] STUB: Would create lookalike from ${sourceAudienceId} ` +
    `in ${country} at ${ratio * 100}% ratio`,
  )

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

  return {
    lookalike_id: `mock_lookalike_${Date.now()}`,
    estimated_reach: estimatedReach,
  }
}
