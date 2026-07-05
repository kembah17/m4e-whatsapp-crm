// ============================================================
// Import Session Manager
//
// Manages import sessions stored in the import_sessions table.
// States: collecting → previewing → confirmed → cancelled → expired
// Uses supabase admin client (service role) like the webhook does.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedContact } from '@/lib/import/ocr-processor';

// ── Admin Client (singleton, same pattern as webhook) ───────

let _adminClient: SupabaseClient | null = null;
function supabaseAdmin(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminClient;
}

// ── Types ────────────────────────────────────────────────────

export type ImportSessionStatus =
  | 'collecting'
  | 'previewing'
  | 'confirmed'
  | 'cancelled'
  | 'expired';

export interface ImportSession {
  id: string;
  account_id: string;
  conversation_id: string | null;
  contact_id: string | null;
  channel: string;
  status: ImportSessionStatus;
  collected_contacts: ExtractedContact[];
  validation_summary: ValidationSummary | null;
  source_types: string[];
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ValidationSummary {
  total: number;
  valid: number;
  duplicates: number;
  invalid: number;
  byConfidence: {
    high: number;   // >= 0.8
    medium: number; // >= 0.5
    low: number;    // < 0.5
  };
}

// ── Session Functions ───────────────────────────────────────

/**
 * Find an active (non-expired, non-cancelled, non-confirmed) import session
 * for the given account and conversation.
 */
export async function getActiveSession(
  accountId: string,
  conversationId: string
): Promise<ImportSession | null> {
  const { data, error } = await supabaseAdmin()
    .from('import_sessions')
    .select('*')
    .eq('account_id', accountId)
    .eq('conversation_id', conversationId)
    .in('status', ['collecting', 'previewing'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[import-session] getActiveSession error:', error);
    return null;
  }

  return data as ImportSession | null;
}

/**
 * Create a new import session.
 */
export async function createSession(
  accountId: string,
  conversationId: string,
  contactId: string,
  channel: string = 'whatsapp'
): Promise<ImportSession | null> {
  const { data, error } = await supabaseAdmin()
    .from('import_sessions')
    .insert({
      account_id: accountId,
      conversation_id: conversationId,
      contact_id: contactId,
      channel,
      status: 'collecting',
      collected_contacts: [],
      source_types: [],
    })
    .select()
    .single();

  if (error) {
    console.error('[import-session] createSession error:', error);
    return null;
  }

  return data as ImportSession;
}

/**
 * Append contacts to an existing session.
 */
export async function addContacts(
  sessionId: string,
  contacts: ExtractedContact[],
  sourceType: string
): Promise<{ total: number } | null> {
  // Fetch current session
  const { data: session, error: fetchErr } = await supabaseAdmin()
    .from('import_sessions')
    .select('collected_contacts, source_types')
    .eq('id', sessionId)
    .single();

  if (fetchErr || !session) {
    console.error('[import-session] addContacts fetch error:', fetchErr);
    return null;
  }

  const existing: ExtractedContact[] = session.collected_contacts || [];
  const merged = [...existing, ...contacts];
  const sources: string[] = session.source_types || [];
  if (!sources.includes(sourceType)) {
    sources.push(sourceType);
  }

  const { error: updateErr } = await supabaseAdmin()
    .from('import_sessions')
    .update({
      collected_contacts: merged,
      source_types: sources,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (updateErr) {
    console.error('[import-session] addContacts update error:', updateErr);
    return null;
  }

  return { total: merged.length };
}

/**
 * Generate a validation summary for the session.
 */
export async function generatePreview(
  sessionId: string
): Promise<ValidationSummary | null> {
  const { data: session, error } = await supabaseAdmin()
    .from('import_sessions')
    .select('collected_contacts')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    console.error('[import-session] generatePreview error:', error);
    return null;
  }

  const contacts: ExtractedContact[] = session.collected_contacts || [];

  // Deduplicate by phone
  const phoneSet = new Set<string>();
  let duplicates = 0;
  let valid = 0;
  let invalid = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const c of contacts) {
    // Count confidence buckets
    if (c.confidence >= 0.8) high++;
    else if (c.confidence >= 0.5) medium++;
    else low++;

    // Check validity
    if (!c.phone && !c.email) {
      invalid++;
      continue;
    }

    // Check duplicates by phone
    if (c.phone) {
      if (phoneSet.has(c.phone)) {
        duplicates++;
        continue;
      }
      phoneSet.add(c.phone);
    }

    valid++;
  }

  const summary: ValidationSummary = {
    total: contacts.length,
    valid,
    duplicates,
    invalid,
    byConfidence: { high, medium, low },
  };

  // Update session with summary and move to previewing
  await supabaseAdmin()
    .from('import_sessions')
    .update({
      validation_summary: summary,
      status: 'previewing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  return summary;
}

/**
 * Mark session as confirmed.
 */
export async function confirmSession(
  sessionId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin()
    .from('import_sessions')
    .update({
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('[import-session] confirmSession error:', error);
    return false;
  }
  return true;
}

/**
 * Mark session as cancelled.
 */
export async function cancelSession(
  sessionId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin()
    .from('import_sessions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('[import-session] cancelSession error:', error);
    return false;
  }
  return true;
}

/**
 * Expire all stale sessions past their expires_at.
 */
export async function expireStale(): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from('import_sessions')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .in('status', ['collecting', 'previewing'])
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('[import-session] expireStale error:', error);
    return 0;
  }

  return data?.length || 0;
}
