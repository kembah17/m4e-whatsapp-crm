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
 * 1. Try BSUID match (most stable) — with split identity detection
 * 2. Try phone match (current primary)
 * 3. Try username match (future)
 * 4. Create new contact (with retry on unique constraint)
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
      // Conflict detection: check if phone matches a DIFFERENT contact
      if (waId) {
        const { data: byPhone } = await db
          .from('contacts')
          .select('id')
          .eq('account_id', accountId)
          .eq('phone', waId)
          .neq('id', byBsuid.id)
          .maybeSingle()

        if (byPhone) {
          // Split identity detected! Log alert and warning
          console.warn(
            `[username-resolver] Split identity detected: BSUID->${byBsuid.id} but phone->${byPhone.id}`
          )
          try {
            await db.from('system_alerts').insert({
              severity: 'warning',
              category: 'contacts',
              title: 'Split identity detected',
              description: `BSUID matches contact ${byBsuid.id} but phone ${waId} matches contact ${byPhone.id}. Proceeding with BSUID match.`,
              metadata: {
                bsuid_contact_id: byBsuid.id,
                phone_contact_id: byPhone.id,
                bsuid,
                phone: waId,
                account_id: accountId,
              },
            })
          } catch (alertErr) {
            console.error('[username-resolver] Failed to log split identity alert:', alertErr)
          }
          try {
            await db.from('system_logs').insert({
              level: 'warn',
              category: 'contacts',
              message: `Split identity: BSUID contact ${byBsuid.id} vs phone contact ${byPhone.id}`,
              metadata: {
                bsuid_contact_id: byBsuid.id,
                phone_contact_id: byPhone.id,
                bsuid,
                phone: waId,
                account_id: accountId,
              },
              account_id: accountId,
            })
          } catch (logErr) {
            console.error('[username-resolver] Failed to log split identity:', logErr)
          }
        }
      }

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

  // Step 4: Create new contact (with retry on unique constraint violation)
  const insertPayload = {
    account_id: accountId,
    phone: waId || null,
    name: contactName || waId || username || 'Unknown',
    whatsapp_username: username || null,
    bsuid: bsuid || null,
    primary_identifier: bsuid ? 'bsuid' : waId ? 'phone' : 'username',
    primary_channel: 'whatsapp',
    status: 'active',
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: newContact, error } = await db
      .from('contacts')
      .insert(insertPayload)
      .select('id')
      .single()

    if (!error && newContact) {
      return {
        contactId: newContact.id,
        isNew: true,
        reconciled: false,
      }
    }

    // Retry once on unique constraint violation (23505)
    if (error && error.code === '23505' && attempt === 0) {
      console.warn('[username-resolver] Unique constraint hit, retrying resolution...')
      // On retry, try to find the existing contact that caused the conflict
      if (waId) {
        const { data: existing } = await db
          .from('contacts')
          .select('id')
          .eq('account_id', accountId)
          .eq('phone', waId)
          .maybeSingle()
        if (existing) {
          return { contactId: existing.id, isNew: false, reconciled: false }
        }
      }
      continue
    }

    console.error('[username-resolver] Failed to create contact:', error)
    return null
  }

  return null
}
