// ============================================================
// CTWA Lead Nurture — multi-step engagement sequence
// with 72-hour free messaging window optimization (W7)
// ============================================================

import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

// ============================================================
// Types
// ============================================================

export type NurtureStatus =
  | 'new'
  | 'welcomed'
  | 'engaged'
  | 'qualified'
  | 'converted'
  | 'lost'

export interface NurtureStep {
  id: string
  name: string
  description: string
  delayHours: number
  messageTemplate: string
  fromStatus: NurtureStatus
  toStatus: NurtureStatus
}

export interface FreeWindowStatus {
  isInWindow: boolean
  hoursRemaining: number
  messagesRemaining: number
}

// ============================================================
// Constants
// ============================================================

/** Click-to-WhatsApp ads get a 72-hour free messaging window */
export const FREE_WINDOW_HOURS = 72

// ============================================================
// Standard Nurture Sequence (original timing)
// ============================================================

/** The default CTWA nurture sequence */
export const CTWA_NURTURE_SEQUENCE: NurtureStep[] = [
  {
    id: 'step-1-welcome',
    name: 'Welcome Message',
    description: 'Immediate welcome after ad click with personalized greeting',
    delayHours: 0,
    messageTemplate:
      'Hi {{name}}! Thanks for reaching out through our ad. How can we help you today?',
    fromStatus: 'new',
    toStatus: 'welcomed',
  },
  {
    id: 'step-2-followup',
    name: 'First Follow-Up',
    description: 'Check in if no response within 4 hours',
    delayHours: 4,
    messageTemplate:
      'Hi {{name}}, just checking in! Did you have any questions about what you saw in our ad? We\'d love to help.',
    fromStatus: 'welcomed',
    toStatus: 'welcomed',
  },
  {
    id: 'step-3-value',
    name: 'Value Proposition',
    description: 'Share key benefits and social proof after 24 hours',
    delayHours: 24,
    messageTemplate:
      'Hi {{name}}! Here\'s what our customers love about us:\n\n1. {{benefit_1}}\n2. {{benefit_2}}\n3. {{benefit_3}}\n\nWould you like to learn more?',
    fromStatus: 'welcomed',
    toStatus: 'engaged',
  },
  {
    id: 'step-4-offer',
    name: 'Special Offer',
    description: 'Present a limited-time offer after 48 hours',
    delayHours: 48,
    messageTemplate:
      'Hi {{name}}! As a thank you for connecting with us, we have a special offer just for you: {{offer_details}}. Interested?',
    fromStatus: 'engaged',
    toStatus: 'qualified',
  },
  {
    id: 'step-5-close',
    name: 'Closing Attempt',
    description: 'Final engagement attempt after 72 hours',
    delayHours: 72,
    messageTemplate:
      'Hi {{name}}, we don\'t want you to miss out! Our offer expires soon. Reply YES to get started or let us know if you have any questions.',
    fromStatus: 'qualified',
    toStatus: 'qualified',
  },
]

// ============================================================
// Free Window Optimized Sequence (W7)
// Front-loads all critical messages within the 72-hour free window
// ============================================================

/**
 * Compressed nurture sequence optimized for the 72-hour CTWA free window.
 * All messages are sent within the free window to maximize engagement
 * at zero messaging cost.
 */
export const CTWA_FREE_WINDOW_SEQUENCE: NurtureStep[] = [
  {
    id: 'fw-step-1-welcome',
    name: 'Welcome Message',
    description: 'Immediate welcome after ad click (same as standard)',
    delayHours: 0,
    messageTemplate:
      'Hi {{name}}! Thanks for reaching out through our ad. How can we help you today?',
    fromStatus: 'new',
    toStatus: 'welcomed',
  },
  {
    id: 'fw-step-2-followup',
    name: 'Quick Follow-Up',
    description: 'Faster follow-up at 2h (vs 4h standard) to capitalize on interest',
    delayHours: 2,
    messageTemplate:
      'Hi {{name}}, just checking in! Did you have any questions about what you saw in our ad? We\'d love to help.',
    fromStatus: 'welcomed',
    toStatus: 'welcomed',
  },
  {
    id: 'fw-step-3-value',
    name: 'Value Proposition',
    description: 'Share benefits at 8h (vs 24h standard) — still within first day',
    delayHours: 8,
    messageTemplate:
      'Hi {{name}}! Here\'s what our customers love about us:\n\n1. {{benefit_1}}\n2. {{benefit_2}}\n3. {{benefit_3}}\n\nWould you like to learn more?',
    fromStatus: 'welcomed',
    toStatus: 'engaged',
  },
  {
    id: 'fw-step-4-offer',
    name: 'Special Offer',
    description: 'Present offer at 24h (vs 48h standard) — day 2 of free window',
    delayHours: 24,
    messageTemplate:
      'Hi {{name}}! As a thank you for connecting with us, we have a special offer just for you: {{offer_details}}. Interested?',
    fromStatus: 'engaged',
    toStatus: 'qualified',
  },
  {
    id: 'fw-step-5-close',
    name: 'Closing Attempt',
    description: 'Close at 48h (vs 72h standard) — day 3, still within free window',
    delayHours: 48,
    messageTemplate:
      'Hi {{name}}, we don\'t want you to miss out! Our offer expires soon. Reply YES to get started or let us know if you have any questions.',
    fromStatus: 'qualified',
    toStatus: 'qualified',
  },
  {
    id: 'fw-step-6-last-chance',
    name: 'Last Chance (Free Window)',
    description: 'Final free-window message at 70h — 2 hours before window closes',
    delayHours: 70,
    messageTemplate:
      'Hi {{name}}, this is our last message before your special access expires! 🕐\n\nWe\'d really love to help you with {{offer_details}}.\n\nReply now to lock in your offer, or let us know if you have any questions. We\'re here for you!',
    fromStatus: 'qualified',
    toStatus: 'qualified',
  },
]

// ============================================================
// Free Window Helpers
// ============================================================

/**
 * Check if a contact is within the 72-hour CTWA free messaging window.
 *
 * @param ctwaFirstSeen - ISO timestamp of when the contact first arrived via CTWA
 * @returns true if within the free window
 */
export function isWithinFreeWindow(ctwaFirstSeen: string | null): boolean {
  if (!ctwaFirstSeen) return false
  const firstSeenMs = new Date(ctwaFirstSeen).getTime()
  const nowMs = Date.now()
  const elapsedHours = (nowMs - firstSeenMs) / (1000 * 60 * 60)
  return elapsedHours < FREE_WINDOW_HOURS
}

/**
 * Get the active nurture sequence for a contact.
 * Returns the compressed free-window sequence if the contact is within
 * the 72-hour CTWA free window, otherwise returns the standard sequence.
 *
 * @param ctwaFirstSeen - ISO timestamp of when the contact first arrived via CTWA
 * @returns The appropriate nurture sequence
 */
export function getActiveSequence(ctwaFirstSeen: string | null): NurtureStep[] {
  if (isWithinFreeWindow(ctwaFirstSeen)) {
    return CTWA_FREE_WINDOW_SEQUENCE
  }
  return CTWA_NURTURE_SEQUENCE
}

/**
 * Get the free window status for a CTWA contact.
 * Returns whether the contact is in the free window, hours remaining,
 * and how many sequence messages are still pending.
 *
 * @param ctwaFirstSeen - ISO timestamp of when the contact first arrived via CTWA
 * @param currentStepIndex - The index of the last completed step (0-based), -1 if none
 * @returns Free window status object
 */
export function getFreeWindowStatus(
  ctwaFirstSeen: string | null,
  currentStepIndex = -1,
): FreeWindowStatus {
  if (!ctwaFirstSeen) {
    return { isInWindow: false, hoursRemaining: 0, messagesRemaining: 0 }
  }

  const firstSeenMs = new Date(ctwaFirstSeen).getTime()
  const nowMs = Date.now()
  const elapsedHours = (nowMs - firstSeenMs) / (1000 * 60 * 60)
  const isInWindow = elapsedHours < FREE_WINDOW_HOURS
  const hoursRemaining = isInWindow
    ? Math.max(0, Math.round((FREE_WINDOW_HOURS - elapsedHours) * 10) / 10)
    : 0

  // Count remaining messages in the active sequence
  const sequence = isInWindow ? CTWA_FREE_WINDOW_SEQUENCE : CTWA_NURTURE_SEQUENCE
  const completedSteps = currentStepIndex + 1
  const messagesRemaining = Math.max(0, sequence.length - completedSteps)

  return { isInWindow, hoursRemaining, messagesRemaining }
}

// ============================================================
// Existing CTWA Nurture Functions (preserved)
// ============================================================

/** Get the current nurture status for a contact */
export async function getCTWANurtureStatus(
  contactId: string
): Promise<{ status: NurtureStatus | null; adSource: string | null; firstSeen: string | null }> {
  const { data, error } = await supabaseAdmin()
    .from('contacts')
    .select('ctwa_nurture_status, ctwa_ad_source, ctwa_first_seen')
    .eq('id', contactId)
    .single()

  if (error || !data) {
    return { status: null, adSource: null, firstSeen: null }
  }

  return {
    status: data.ctwa_nurture_status as NurtureStatus | null,
    adSource: data.ctwa_ad_source,
    firstSeen: data.ctwa_first_seen,
  }
}

/** Start the CTWA nurture sequence for a contact */
export async function triggerCTWANurture(
  contactId: string,
  adSource: string
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('contacts')
    .update({
      ctwa_nurture_status: 'new',
      ctwa_ad_source: adSource,
      ctwa_first_seen: new Date().toISOString(),
    })
    .eq('id', contactId)
    // Only set if not already in a nurture sequence
    .is('ctwa_nurture_status', null)

  if (error) {
    console.error('[ctwa-nurture] trigger failed:', error)
  }
}

/** Update the nurture status for a contact */
export async function updateNurtureStatus(
  contactId: string,
  status: NurtureStatus
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('contacts')
    .update({ ctwa_nurture_status: status })
    .eq('id', contactId)

  if (error) {
    console.error('[ctwa-nurture] status update failed:', error)
  }
}

/** Get all contacts in a specific nurture status for an account */
export async function getContactsByNurtureStatus(
  accountId: string,
  status?: NurtureStatus
) {
  let query = supabaseAdmin()
    .from('contacts')
    .select('id, name, phone, ctwa_nurture_status, ctwa_ad_source, ctwa_first_seen')
    .eq('account_id', accountId)
    .not('ctwa_nurture_status', 'is', null)
    .order('ctwa_first_seen', { ascending: false })

  if (status) {
    query = query.eq('ctwa_nurture_status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/** Get nurture funnel stats for an account */
export async function getNurtureFunnelStats(accountId: string) {
  const { data, error } = await supabaseAdmin()
    .from('contacts')
    .select('ctwa_nurture_status')
    .eq('account_id', accountId)
    .not('ctwa_nurture_status', 'is', null)

  if (error) throw error

  const counts: Record<NurtureStatus, number> = {
    new: 0,
    welcomed: 0,
    engaged: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
  }

  for (const row of data || []) {
    const s = row.ctwa_nurture_status as NurtureStatus
    if (s in counts) counts[s]++
  }

  return counts
}
