// ============================================================
// CTWA Lead Nurture — multi-step engagement sequence
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
