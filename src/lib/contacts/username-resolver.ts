import { createClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: SupabaseClient<any, "public", any> | null = null
function supabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

export interface ContactOutcome {
  contactId: string
  isNew: boolean
  reconciled: boolean // true if we added a new identifier to existing contact
}

/**
 * Multi-Identifier Contact Resolution Algorithm
 *
 * When a message arrives, Meta may include:
 * - wa_id (phone number) — always present today
 * - bsuid — new stable identifier (when available)
 * - username — if user has set one (when available)
 *
 * Resolution order:
 * 1. Try BSUID match (most stable)
 * 2. Try phone match (current primary)
 * 3. Try username match (future)
 * 4. Create new contact
 *
 * Reconciliation: when we find a phone match but the message
 * also carries a BSUID/username we haven't seen, UPDATE the
 * contact to add the new identifier.
 */
export async function resolveContactMultiId(input: {
  accountId: string
  configOwnerUserId: string
  waId: string // phone from Meta
  bsuid?: string
  username?: string
  contactName: string
}): Promise<ContactOutcome | null> {
  const db = supabaseAdmin()
  const { accountId, waId, bsuid, username, contactName } = input

  // Step 1: Try BSUID match (most stable identifier)
  if (bsuid) {
    const { data: byBsuid } = await db
      .from('contacts')
      .select('id, phone, whatsapp_username, bsuid')
      .eq('account_id', accountId)
      .eq('bsuid', bsuid)
      .maybeSingle()

    if (byBsuid) {
      // Reconcile: add phone/username if missing
      const updates: Record<string, unknown> = {}
      if (!byBsuid.phone && waId) updates.phone = waId
      if (!byBsuid.whatsapp_username && username) updates.whatsapp_username = username
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        await db.from('contacts').update(updates).eq('id', byBsuid.id)
      }
      return {
        contactId: byBsuid.id,
        isNew: false,
        reconciled: Object.keys(updates).length > 0,
      }
    }
  }

  // Step 2: Try phone match (current primary method)
  if (waId) {
    const { data: byPhone } = await db
      .from('contacts')
      .select('id, bsuid, whatsapp_username')
      .eq('account_id', accountId)
      .eq('phone', waId)
      .maybeSingle()

    if (byPhone) {
      // Reconcile: add bsuid/username if missing
      const updates: Record<string, unknown> = {}
      if (!byPhone.bsuid && bsuid) updates.bsuid = bsuid
      if (!byPhone.whatsapp_username && username) updates.whatsapp_username = username
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        await db.from('contacts').update(updates).eq('id', byPhone.id)
      }
      return {
        contactId: byPhone.id,
        isNew: false,
        reconciled: Object.keys(updates).length > 0,
      }
    }
  }

  // Step 3: Try username match (future)
  if (username) {
    const { data: byUsername } = await db
      .from('contacts')
      .select('id, phone, bsuid')
      .eq('account_id', accountId)
      .eq('whatsapp_username', username)
      .maybeSingle()

    if (byUsername) {
      const updates: Record<string, unknown> = {}
      if (!byUsername.phone && waId) updates.phone = waId
      if (!byUsername.bsuid && bsuid) updates.bsuid = bsuid
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        await db.from('contacts').update(updates).eq('id', byUsername.id)
      }
      return {
        contactId: byUsername.id,
        isNew: false,
        reconciled: Object.keys(updates).length > 0,
      }
    }
  }

  // Step 4: Create new contact
  const { data: newContact, error } = await db
    .from('contacts')
    .insert({
      account_id: accountId,
      phone: waId || null,
      name: contactName || waId || username || 'Unknown',
      whatsapp_username: username || null,
      bsuid: bsuid || null,
      primary_identifier: bsuid ? 'bsuid' : waId ? 'phone' : 'username',
      primary_channel: 'whatsapp',
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !newContact) {
    console.error('[username-resolver] Failed to create contact:', error)
    return null
  }

  return {
    contactId: newContact.id,
    isNew: true,
    reconciled: false,
  }
}
