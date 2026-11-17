/**
 * Dynamic Segmentation for Reactivation (I2)
 *
 * Extends the static segment system with auto-refreshing segments.
 * Dynamic segments re-evaluate their rules on a schedule and
 * automatically update their contact lists.
 */

import { createClient } from '@supabase/supabase-js'
import type { SegmentGroup } from './segment-engine'
import { evaluateSegmentSimple } from './segment-engine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RefreshInterval = 'hourly' | 'daily' | 'weekly'

export interface DynamicSegment {
  id: string
  account_id: string
  name: string
  description: string | null
  rules: SegmentGroup
  contact_count: number
  last_calculated_at: string | null
  created_at: string
  updated_at: string
  /** Whether this segment auto-refreshes */
  is_dynamic: boolean
  /** How often to refresh the segment */
  refresh_interval: RefreshInterval
  /** When the segment was last refreshed */
  last_refreshed_at: string | null
  /** Automatically add contacts that match rules */
  auto_enroll: boolean
  /** Automatically remove contacts that no longer match */
  auto_remove: boolean
}

export interface DynamicSegmentContact {
  segment_id: string
  contact_id: string
  enrolled_at: string
  removed_at: string | null
  is_active: boolean
}

export interface RefreshResult {
  segmentId: string
  segmentName: string
  previousCount: number
  newCount: number
  added: number
  removed: number
  refreshedAt: string
}

// ---------------------------------------------------------------------------
// Supabase Admin Client
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ---------------------------------------------------------------------------
// Freshness Check
// ---------------------------------------------------------------------------

/** Interval durations in milliseconds */
const INTERVAL_MS: Record<RefreshInterval, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
}

/**
 * Check if a dynamic segment is stale and needs refreshing.
 */
export function isSegmentStale(
  lastRefreshedAt: string | null,
  interval: RefreshInterval,
): boolean {
  if (!lastRefreshedAt) return true
  const lastRefreshed = new Date(lastRefreshedAt).getTime()
  const now = Date.now()
  return (now - lastRefreshed) >= INTERVAL_MS[interval]
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Refresh a single dynamic segment.
 * Re-evaluates rules, updates contact list, and records the refresh.
 */
export async function refreshDynamicSegment(
  segmentId: string,
): Promise<RefreshResult> {
  const db = getSupabaseAdmin()

  // 1. Fetch the segment
  const { data: segment, error: segErr } = await db
    .from('segments')
    .select('*')
    .eq('id', segmentId)
    .single()

  if (segErr || !segment) {
    throw new Error(`Segment ${segmentId} not found: ${segErr?.message}`)
  }

  const dynamicSeg = segment as DynamicSegment
  const previousCount = dynamicSeg.contact_count ?? 0

  // 2. Re-evaluate rules to get current matching contacts
  const result = await evaluateSegmentSimple(
    dynamicSeg.rules,
    dynamicSeg.account_id,
    { limit: 10000, countOnly: false },
  )

  const newContactIds = new Set(result.contactIds)

  // 3. Get currently enrolled contacts (from segment_contacts if table exists)
  //    Fallback: just update the count without tracking individual enrollments
  let added = 0
  let removed = 0

  const { data: existingContacts } = await db
    .from('segment_contacts')
    .select('contact_id, is_active')
    .eq('segment_id', segmentId)

  if (existingContacts) {
    // Table exists — do differential update
    const existingActiveIds = new Set(
      existingContacts
        .filter((c: { is_active: boolean }) => c.is_active)
        .map((c: { contact_id: string }) => c.contact_id)
    )
    const existingAllIds = new Set(
      existingContacts.map((c: { contact_id: string }) => c.contact_id)
    )

    // Contacts to add (in new results but not currently active)
    const toAdd = result.contactIds.filter((id) => !existingActiveIds.has(id))
    if (dynamicSeg.auto_enroll && toAdd.length > 0) {
      const now = new Date().toISOString()
      const upsertRows = toAdd.map((contactId) => ({
        segment_id: segmentId,
        contact_id: contactId,
        enrolled_at: now,
        removed_at: null,
        is_active: true,
      }))

      // Batch upsert in chunks of 500
      for (let i = 0; i < upsertRows.length; i += 500) {
        const chunk = upsertRows.slice(i, i + 500)
        await db
          .from('segment_contacts')
          .upsert(chunk, { onConflict: 'segment_id,contact_id' })
      }
      added = toAdd.length
    }

    // Contacts to remove (currently active but not in new results)
    if (dynamicSeg.auto_remove) {
      const toRemove = [...existingActiveIds].filter((id) => !newContactIds.has(id))
      if (toRemove.length > 0) {
        const now = new Date().toISOString()
        // Batch update in chunks of 500
        for (let i = 0; i < toRemove.length; i += 500) {
          const chunk = toRemove.slice(i, i + 500)
          await db
            .from('segment_contacts')
            .update({ is_active: false, removed_at: now })
            .eq('segment_id', segmentId)
            .in('contact_id', chunk)
        }
        removed = toRemove.length
      }
    }

    // Also add brand new contacts not in the table at all
    if (dynamicSeg.auto_enroll) {
      const brandNew = result.contactIds.filter((id) => !existingAllIds.has(id))
      // These were already handled in toAdd above since existingActiveIds won't have them
      // No additional action needed
      void brandNew
    }
  }

  // 4. Update the segment record
  const refreshedAt = new Date().toISOString()
  await db
    .from('segments')
    .update({
      contact_count: result.count,
      last_calculated_at: refreshedAt,
      last_refreshed_at: refreshedAt,
      updated_at: refreshedAt,
    })
    .eq('id', segmentId)

  console.log(
    `[dynamic-segment] Refreshed "${dynamicSeg.name}": ${previousCount} → ${result.count} (±${added} added, -${removed} removed)`,
  )

  return {
    segmentId,
    segmentName: dynamicSeg.name,
    previousCount,
    newCount: result.count,
    added,
    removed,
    refreshedAt,
  }
}

/**
 * Get contacts for a dynamic segment, auto-refreshing if stale.
 */
export async function getDynamicSegmentContacts(
  segmentId: string,
  limit = 100,
): Promise<{ contactIds: string[]; count: number; wasRefreshed: boolean }> {
  const db = getSupabaseAdmin()

  // Fetch the segment
  const { data: segment, error } = await db
    .from('segments')
    .select('*')
    .eq('id', segmentId)
    .single()

  if (error || !segment) {
    return { contactIds: [], count: 0, wasRefreshed: false }
  }

  const dynamicSeg = segment as DynamicSegment
  let wasRefreshed = false

  // Auto-refresh if dynamic and stale
  if (
    dynamicSeg.is_dynamic &&
    isSegmentStale(dynamicSeg.last_refreshed_at, dynamicSeg.refresh_interval ?? 'daily')
  ) {
    try {
      await refreshDynamicSegment(segmentId)
      wasRefreshed = true
    } catch (err) {
      console.error(`[dynamic-segment] Auto-refresh failed for ${segmentId}:`, err)
    }
  }

  // Get contacts via standard evaluation
  const result = await evaluateSegmentSimple(
    dynamicSeg.rules,
    dynamicSeg.account_id,
    { limit, countOnly: false },
  )

  return {
    contactIds: result.contactIds,
    count: result.count,
    wasRefreshed,
  }
}

/**
 * Process all dynamic segments that are due for refresh.
 * Called by the cron job.
 */
export async function processDynamicSegments(): Promise<RefreshResult[]> {
  const db = getSupabaseAdmin()

  // Fetch all dynamic segments
  const { data: segments, error } = await db
    .from('segments')
    .select('*')
    .eq('is_dynamic', true)
    .order('last_refreshed_at', { ascending: true, nullsFirst: true })

  if (error || !segments || segments.length === 0) {
    console.log('[dynamic-segment] No dynamic segments to process')
    return []
  }

  const results: RefreshResult[] = []

  for (const segment of segments as DynamicSegment[]) {
    const interval = segment.refresh_interval ?? 'daily'

    if (isSegmentStale(segment.last_refreshed_at, interval)) {
      try {
        const result = await refreshDynamicSegment(segment.id)
        results.push(result)
      } catch (err) {
        console.error(
          `[dynamic-segment] Failed to refresh segment "${segment.name}":`,
          err,
        )
      }
    }
  }

  console.log(
    `[dynamic-segment] Processed ${results.length}/${segments.length} dynamic segments`,
  )
  return results
}
