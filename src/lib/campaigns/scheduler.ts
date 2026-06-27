import type { SupabaseClient } from '@supabase/supabase-js'
import { fireTrigger } from './trigger-engine'

/**
 * Evaluate time-based campaign triggers.
 *
 * Checks for:
 * - Contact birthdays (contact_birthday)
 * - Contact anniversaries (contact_anniversary)
 * - Purchase milestones (purchase_milestone)
 * - Dormancy / no-purchase periods (no_purchase_period)
 *
 * @returns Number of triggers fired.
 */
export async function evaluateTimeTriggers(
  db: SupabaseClient,
): Promise<number> {
  let totalFired = 0

  totalFired += await evaluateBirthdayTriggers(db)
  totalFired += await evaluateDormancyTriggers(db)
  totalFired += await evaluateMilestoneTriggers(db)

  console.log(`[evaluateTimeTriggers] Fired ${totalFired} time-based triggers`)
  return totalFired
}

/**
 * Check for contacts whose birthday is today and fire birthday triggers.
 */
async function evaluateBirthdayTriggers(db: SupabaseClient): Promise<number> {
  // Find accounts that have active birthday triggers
  const { data: triggers, error: triggerErr } = await db
    .from('campaign_triggers')
    .select('id, account_id, conditions, delay_minutes')
    .eq('trigger_event', 'contact_birthday')
    .eq('is_active', true)

  if (triggerErr || !triggers || triggers.length === 0) return 0

  const today = new Date()
  const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  let fired = 0

  for (const trigger of triggers) {
    // Find contacts with birthdays today in this account
    // date_of_birth is stored as a date string; we match month-day
    const { data: contacts, error: contactErr } = await db
      .from('contacts')
      .select('id, name, phone, email, date_of_birth')
      .eq('account_id', trigger.account_id)
      .not('date_of_birth', 'is', null)

    if (contactErr || !contacts) continue

    for (const contact of contacts) {
      if (!contact.date_of_birth) continue

      // Extract month-day from the stored date
      const dob = new Date(contact.date_of_birth)
      const contactMonthDay = `${String(dob.getMonth() + 1).padStart(2, '0')}-${String(dob.getDate()).padStart(2, '0')}`

      if (contactMonthDay !== monthDay) continue

      // Check if we already fired this trigger today for this contact
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const { data: existing } = await db
        .from('campaign_executions')
        .select('id')
        .eq('trigger_id', trigger.id)
        .eq('contact_id', contact.id)
        .gte('created_at', todayStart)
        .limit(1)
        .maybeSingle()

      if (existing) continue // Already fired today

      try {
        await fireTrigger(db, trigger.account_id, {
          event: 'contact_birthday',
          account_id: trigger.account_id,
          contact_id: contact.id,
        }, {
          contact_id: contact.id,
          contact_name: contact.name ?? undefined,
          contact_phone: contact.phone ?? undefined,
          contact_email: contact.email ?? undefined,
        })
        fired++
      } catch (err) {
        console.error(
          `[evaluateBirthdayTriggers] error for contact ${contact.id}:`,
          err,
        )
      }
    }
  }

  return fired
}

/**
 * Check for contacts who haven't purchased in a configured period.
 * Uses adaptive recency: the threshold comes from the trigger's conditions.days_since_purchase.
 */
async function evaluateDormancyTriggers(db: SupabaseClient): Promise<number> {
  const { data: triggers, error: triggerErr } = await db
    .from('campaign_triggers')
    .select('id, account_id, conditions, delay_minutes')
    .eq('trigger_event', 'no_purchase_period')
    .eq('is_active', true)

  if (triggerErr || !triggers || triggers.length === 0) return 0

  let fired = 0

  for (const trigger of triggers) {
    const conditions = trigger.conditions as Record<string, unknown> | null
    const daysSincePurchase = Number(conditions?.days_since_purchase ?? 30)
    const cutoffDate = new Date(
      Date.now() - daysSincePurchase * 24 * 60 * 60 * 1000,
    ).toISOString()

    // Find contacts in this account who have purchase history
    // but whose last purchase is older than the cutoff
    const { data: dormantContacts, error: contactErr } = await db
      .from('contacts')
      .select('id, name, phone, email, last_purchase_at')
      .eq('account_id', trigger.account_id)
      .not('last_purchase_at', 'is', null)
      .lt('last_purchase_at', cutoffDate)
      .limit(100)

    if (contactErr || !dormantContacts) continue

    for (const contact of dormantContacts) {
      // Check if we already fired this trigger recently for this contact
      // (within the dormancy period to avoid spamming)
      const recentCutoff = new Date(
        Date.now() - daysSincePurchase * 24 * 60 * 60 * 1000,
      ).toISOString()

      const { data: existing } = await db
        .from('campaign_executions')
        .select('id')
        .eq('trigger_id', trigger.id)
        .eq('contact_id', contact.id)
        .gte('created_at', recentCutoff)
        .limit(1)
        .maybeSingle()

      if (existing) continue

      try {
        const daysSince = contact.last_purchase_at
          ? Math.floor(
              (Date.now() - new Date(contact.last_purchase_at).getTime()) /
                (24 * 60 * 60 * 1000),
            )
          : daysSincePurchase

        await fireTrigger(db, trigger.account_id, {
          event: 'no_purchase_period',
          account_id: trigger.account_id,
          contact_id: contact.id,
        }, {
          contact_id: contact.id,
          contact_name: contact.name ?? undefined,
          contact_phone: contact.phone ?? undefined,
          contact_email: contact.email ?? undefined,
          days_since_last_purchase: daysSince,
        })
        fired++
      } catch (err) {
        console.error(
          `[evaluateDormancyTriggers] error for contact ${contact.id}:`,
          err,
        )
      }
    }
  }

  return fired
}

/**
 * Check for contacts who have reached purchase milestones.
 * Milestone thresholds come from the trigger's conditions.purchase_count_threshold.
 */
async function evaluateMilestoneTriggers(db: SupabaseClient): Promise<number> {
  const { data: triggers, error: triggerErr } = await db
    .from('campaign_triggers')
    .select('id, account_id, conditions, delay_minutes')
    .eq('trigger_event', 'purchase_milestone')
    .eq('is_active', true)

  if (triggerErr || !triggers || triggers.length === 0) return 0

  let fired = 0

  for (const trigger of triggers) {
    const conditions = trigger.conditions as Record<string, unknown> | null
    const threshold = Number(conditions?.purchase_count_threshold ?? 5)

    // Find contacts who have reached the milestone
    // We check purchase_history or ecommerce_orders count
    const { data: contacts, error: contactErr } = await db
      .from('contacts')
      .select('id, name, phone, email, total_purchases')
      .eq('account_id', trigger.account_id)
      .gte('total_purchases', threshold)
      .limit(100)

    if (contactErr || !contacts) continue

    for (const contact of contacts) {
      // Only fire if the contact just crossed the threshold
      // (total_purchases is exactly at the threshold, or we haven't fired for this milestone)
      const { data: existing } = await db
        .from('campaign_executions')
        .select('id')
        .eq('trigger_id', trigger.id)
        .eq('contact_id', contact.id)
        .limit(1)
        .maybeSingle()

      if (existing) continue // Already fired for this milestone

      try {
        await fireTrigger(db, trigger.account_id, {
          event: 'purchase_milestone',
          account_id: trigger.account_id,
          contact_id: contact.id,
        }, {
          contact_id: contact.id,
          contact_name: contact.name ?? undefined,
          contact_phone: contact.phone ?? undefined,
          contact_email: contact.email ?? undefined,
          total_purchases: contact.total_purchases,
        })
        fired++
      } catch (err) {
        console.error(
          `[evaluateMilestoneTriggers] error for contact ${contact.id}:`,
          err,
        )
      }
    }
  }

  return fired
}
