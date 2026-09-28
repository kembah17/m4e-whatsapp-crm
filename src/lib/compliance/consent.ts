// ============================================================
// Consent Management Library
// NDPR-compliant consent tracking for contacts.
// ============================================================

import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export type ConsentType =
  | 'whatsapp_marketing'
  | 'whatsapp_transactional'
  | 'email_marketing'
  | 'sms_marketing'
  | 'data_processing'
  | 'ndpr_explicit'

export type ConsentSource =
  | 'import'
  | 'flow_completion'
  | 'manual_entry'
  | 'whatsapp_optin'
  | 'web_form'
  | 'api'

export type ConsentStatus = 'granted' | 'withdrawn' | 'expired'

export interface ContactConsent {
  id: string
  account_id: string
  contact_id: string
  consent_type: ConsentType
  status: ConsentStatus
  source: ConsentSource
  granted_at: string
  withdrawn_at: string | null
  expires_at: string | null
  ip_address: string | null
  evidence: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ── Record Consent ──────────────────────────────────────────

export async function recordConsent(params: {
  accountId: string
  contactId: string
  consentType: ConsentType
  source: ConsentSource
  evidence?: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}): Promise<{ id: string }> {
  const db = supabaseAdmin()

  // Withdraw any existing active consent of the same type first
  await db
    .from('contact_consents')
    .update({
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString(),
    })
    .eq('account_id', params.accountId)
    .eq('contact_id', params.contactId)
    .eq('consent_type', params.consentType)
    .eq('status', 'granted')

  // Insert new consent record
  const { data, error } = await db
    .from('contact_consents')
    .insert({
      account_id: params.accountId,
      contact_id: params.contactId,
      consent_type: params.consentType,
      status: 'granted',
      source: params.source,
      granted_at: new Date().toISOString(),
      ip_address: params.ipAddress || null,
      evidence: params.evidence || null,
      metadata: params.metadata || {},
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to record consent: ${error?.message || 'Unknown error'}`)
  }

  return { id: data.id }
}

// ── Withdraw Consent ────────────────────────────────────────

export async function withdrawConsent(params: {
  accountId: string
  contactId: string
  consentType: ConsentType
}): Promise<void> {
  const db = supabaseAdmin()

  const { error } = await db
    .from('contact_consents')
    .update({
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString(),
    })
    .eq('account_id', params.accountId)
    .eq('contact_id', params.contactId)
    .eq('consent_type', params.consentType)
    .eq('status', 'granted')

  if (error) {
    throw new Error(`Failed to withdraw consent: ${error.message}`)
  }
}

// ── Check Consent ───────────────────────────────────────────

export async function hasConsent(params: {
  accountId: string
  contactId: string
  consentType: ConsentType
}): Promise<boolean> {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('contact_consents')
    .select('id')
    .eq('account_id', params.accountId)
    .eq('contact_id', params.contactId)
    .eq('consent_type', params.consentType)
    .eq('status', 'granted')
    .maybeSingle()

  if (error) {
    console.error('[consent] hasConsent check failed:', error)
    return false
  }

  return !!data
}

// ── Get Contact Consents ────────────────────────────────────

export async function getContactConsents(params: {
  accountId: string
  contactId: string
}): Promise<ContactConsent[]> {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('contact_consents')
    .select('*')
    .eq('account_id', params.accountId)
    .eq('contact_id', params.contactId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get consents: ${error.message}`)
  }

  return (data || []) as ContactConsent[]
}

// ── Bulk Record Consent ─────────────────────────────────────

export async function bulkRecordConsent(params: {
  accountId: string
  contactIds: string[]
  consentType: ConsentType
  source: ConsentSource
  evidence?: string
}): Promise<{ recorded: number }> {
  const db = supabaseAdmin()

  const rows = params.contactIds.map((contactId) => ({
    account_id: params.accountId,
    contact_id: contactId,
    consent_type: params.consentType,
    status: 'granted' as const,
    source: params.source,
    granted_at: new Date().toISOString(),
    evidence: params.evidence || null,
    metadata: {},
  }))

  // Insert in batches of 500
  let recorded = 0
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await db
      .from('contact_consents')
      .insert(batch)

    if (error) {
      console.error(`[consent] Bulk insert batch ${i} failed:`, error)
    } else {
      recorded += batch.length
    }
  }

  return { recorded }
}
