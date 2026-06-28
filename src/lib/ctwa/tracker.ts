/**
 * Click-to-WhatsApp Ad lead tracking.
 *
 * Uses the lazy supabaseAdmin() pattern (same as webhook route)
 * so it works in server-side non-auth contexts.
 */

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

interface CTWAReferral {
  source_url: string
  source_type: 'ad' | 'post'
  source_id: string
  headline: string
  body: string
  media_type?: 'image' | 'video'
  image_url?: string
  video_url?: string
  thumbnail_url?: string
  ctwa_clid?: string
}

interface TrackCTWAOpts {
  accountId: string
  contactId: string
  conversationId: string
  referral: CTWAReferral
}

/** Track a CTWA ad lead. Fire-and-forget from webhook. */
export async function trackCTWALead({ accountId, contactId, conversationId, referral }: TrackCTWAOpts) {
  const { error } = await supabaseAdmin().from('ctwa_leads').insert({
    account_id: accountId,
    contact_id: contactId,
    conversation_id: conversationId,
    source_url: referral.source_url,
    source_type: referral.source_type,
    source_id: referral.source_id,
    headline: referral.headline,
    body: referral.body,
    media_type: referral.media_type || null,
    image_url: referral.image_url || null,
    ctwa_clid: referral.ctwa_clid || null,
  })

  if (error) {
    console.error('[ctwa] insert failed:', error)
  }
}

/** Get CTWA lead stats for an account. */
export async function getCTWAStats(accountId: string) {
  const sb = supabaseAdmin()

  const [totalRes, todayRes, sourceRes] = await Promise.all([
    sb.from('ctwa_leads').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
    sb.from('ctwa_leads').select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    sb.from('ctwa_leads').select('source_type').eq('account_id', accountId),
  ])

  const adCount = (sourceRes.data || []).filter((r: { source_type: string }) => r.source_type === 'ad').length
  const postCount = (sourceRes.data || []).filter((r: { source_type: string }) => r.source_type === 'post').length

  return {
    total: totalRes.count || 0,
    today: todayRes.count || 0,
    bySource: { ad: adCount, post: postCount },
  }
}

/** Get CTWA leads with optional filters. */
export async function getCTWALeads(accountId: string, opts?: {
  limit?: number
  offset?: number
  sourceType?: string
  since?: string
}) {
  let query = supabaseAdmin()
    .from('ctwa_leads')
    .select('*, contacts(name, phone)')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (opts?.sourceType) query = query.eq('source_type', opts.sourceType)
  if (opts?.since) query = query.gte('created_at', opts.since)
  if (opts?.limit) query = query.limit(opts.limit)
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit || 50) - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { leads: data || [], count }
}
