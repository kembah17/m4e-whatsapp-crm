// Package Campaign Orchestrator
// Auto-creates, schedules, and sequences campaigns when a package is assigned
// Resolves slug mismatches between package_configs and campaign_templates

import { type SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Types
// ============================================================

export interface PackageCampaignScheduleRow {
  id: string
  account_id: string
  package_config_id: string
  campaign_template_id: string | null
  package_slug: string
  template_slug: string | null
  campaign_name: string
  sequence_order: number
  scheduled_week: number
  status: 'pending' | 'created' | 'active' | 'completed' | 'skipped' | 'failed'
  campaign_id: string | null
  trigger_id: string | null
  auto_activate: boolean
  activation_delay_hours: number
  notes: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface PackageCampaignStatus {
  account_id: string
  package_config_id: string
  package_name: string
  total_campaigns: number
  pending: number
  created: number
  active: number
  completed: number
  skipped: number
  failed: number
  current_week: number
  schedule: PackageCampaignScheduleRow[]
}

export interface OrchestrationResult {
  success: boolean
  schedules_created: number
  schedule: PackageCampaignScheduleRow[]
  warnings: string[]
}

export interface ActivationResult {
  activated: number
  created: number
  skipped: number
  errors: string[]
}

interface MilestoneTemplate {
  week: number
  name: string
  description?: string
  deliverables?: string[]
  criteria?: string[]
}

interface CampaignTemplateRow {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  default_channel: string
  message_templates: unknown
  sequence_steps: unknown
  audience_filter: unknown
  tier: number
  is_active: boolean
}

// ============================================================
// Default Campaign Week Mappings
// ============================================================
// Maps campaign slugs to their default activation week per package
// These are used when milestone_template parsing does not yield a clear week

const PKG1_WEEK_MAP: Record<string, number> = {
  'win_back': 4,
  'review_collection': 4,
  'birthday_campaign': 6,
  'referral_program': 7,
  'vip_rewards': 6,
  'post_purchase_thank_you': 5,
}

const PKG2_WEEK_MAP: Record<string, number> = {
  'ad-lead-nurture': 3,
  'whatsapp-flow-survey': 4,
}

const PKG3_WEEK_MAP: Record<string, number> = {
  'abandoned_cart': 3,
  'order_status': 3,
  'cod_confirmation': 3,
  'upsell_cross_sell': 5,
  'catalog-browse': 4,
  'sentiment-recovery': 5,
}

const DEFAULT_WEEK_MAPS: Record<string, Record<string, number>> = {
  'pkg1_reactivation': PKG1_WEEK_MAP,
  'pkg2_online_presence': PKG2_WEEK_MAP,
  'pkg3_growth_engine': PKG3_WEEK_MAP,
}

// Event-based campaigns that need triggers instead of scheduled activation
const EVENT_BASED_CAMPAIGNS: Record<string, string> = {
  'birthday_campaign': 'contact_birthday',
  'abandoned_cart': 'cart_abandoned',
  'order_status': 'order_placed',
  'cod_confirmation': 'payment_confirmed',
  'post_purchase_thank_you': 'order_delivered',
  'sentiment-recovery': 'review_requested',
}

// ============================================================
// Slug Resolution
// ============================================================

/**
 * Resolves a package campaign slug to a campaign template slug.
 * 1. Tries direct match in campaign_templates
 * 2. Falls back to campaign_slug_mapping table
 * 3. Returns the original slug if no mapping found
 */
export async function resolveTemplateSlug(
  db: SupabaseClient,
  packageSlug: string,
): Promise<string> {
  // First: check if the slug directly matches a campaign template
  const { data: directMatch } = await db
    .from('campaign_templates')
    .select('slug')
    .eq('slug', packageSlug)
    .limit(1)
    .maybeSingle()

  if (directMatch) return directMatch.slug

  // Second: check the mapping table
  const { data: mapping } = await db
    .from('campaign_slug_mapping')
    .select('template_slug')
    .eq('package_slug', packageSlug)
    .maybeSingle()

  if (mapping) return mapping.template_slug

  // Fallback: return original slug (will fail gracefully later)
  return packageSlug
}

// ============================================================
// Week Determination
// ============================================================

/**
 * Determines which week a campaign should activate based on:
 * 1. Milestone template parsing (looks for campaign-related keywords)
 * 2. Default week maps per package
 * 3. Fallback to middle of package duration
 */
function determineCampaignWeek(
  packageKey: string,
  campaignSlug: string,
  milestoneTemplate: MilestoneTemplate[],
  durationWeeks: number,
): number {
  // Try to find the campaign in milestone deliverables/descriptions
  const slugWords = campaignSlug.replace(/[-_]/g, ' ').toLowerCase().split(' ')

  for (const milestone of milestoneTemplate) {
    const searchText = [
      milestone.name,
      milestone.description ?? '',
      ...(milestone.deliverables ?? []),
    ].join(' ').toLowerCase()

    // Check if milestone mentions this campaign type
    const matchScore = slugWords.filter(word =>
      word.length > 2 && searchText.includes(word)
    ).length

    if (matchScore >= 2 || (matchScore >= 1 && slugWords.length <= 2)) {
      return milestone.week
    }

    // Check for specific keywords
    if (campaignSlug === 'win_back' && (searchText.includes('campaign activation') || searchText.includes('win-back') || searchText.includes('win back'))) {
      return milestone.week
    }
    if (campaignSlug === 'referral_program' && searchText.includes('referral')) {
      return milestone.week
    }
    if (campaignSlug === 'review_collection' && searchText.includes('review')) {
      return milestone.week
    }
    if (campaignSlug === 'birthday_campaign' && (searchText.includes('birthday') || searchText.includes('lifecycle'))) {
      return milestone.week
    }
    if (campaignSlug === 'vip_rewards' && (searchText.includes('vip') || searchText.includes('loyalty') || searchText.includes('lifecycle'))) {
      return milestone.week
    }
  }

  // Fall back to default week maps
  const weekMap = DEFAULT_WEEK_MAPS[packageKey]
  if (weekMap && weekMap[campaignSlug] !== undefined) {
    return weekMap[campaignSlug]
  }

  // Ultimate fallback: schedule at 60% of package duration
  return Math.max(1, Math.ceil(durationWeeks * 0.6))
}

// ============================================================
// Main Orchestration
// ============================================================

/**
 * Main orchestration function called after package assignment.
 * Creates package_campaign_schedule rows for each campaign in the package.
 *
 * @param db - Supabase admin client (service role)
 * @param accountId - The account receiving the package
 * @param packageConfigId - The package config being assigned
 * @returns OrchestrationResult with created schedule rows
 */
export async function orchestratePackageCampaigns(
  db: SupabaseClient,
  accountId: string,
  packageConfigId: string,
): Promise<OrchestrationResult> {
  const warnings: string[] = []

  // 1. Get package config
  const { data: pkg, error: pkgErr } = await db
    .from('package_configs')
    .select('*')
    .eq('id', packageConfigId)
    .single()

  if (pkgErr || !pkg) {
    return { success: false, schedules_created: 0, schedule: [], warnings: ['Package config not found'] }
  }

  const campaignSlugs: string[] = pkg.campaign_slugs ?? []
  const milestoneTemplate: MilestoneTemplate[] = pkg.milestone_template ?? []
  const packageKey: string = pkg.package_key
  const durationWeeks: number = pkg.duration_weeks ?? 8

  if (campaignSlugs.length === 0) {
    return { success: true, schedules_created: 0, schedule: [], warnings: ['Package has no campaign slugs defined'] }
  }

  // 2. Check for existing schedule (prevent duplicates)
  const { data: existing } = await db
    .from('package_campaign_schedule')
    .select('id')
    .eq('account_id', accountId)
    .eq('package_config_id', packageConfigId)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: false, schedules_created: 0, schedule: [], warnings: ['Campaign schedule already exists for this package assignment'] }
  }

  // 3. Resolve all slugs and find templates
  const scheduleRows: Array<{
    account_id: string
    package_config_id: string
    campaign_template_id: string | null
    package_slug: string
    template_slug: string | null
    campaign_name: string
    sequence_order: number
    scheduled_week: number
    status: string
    auto_activate: boolean
    activation_delay_hours: number
    notes: string | null
  }> = []

  for (let i = 0; i < campaignSlugs.length; i++) {
    const packageSlug = campaignSlugs[i]

    // Resolve to template slug
    const templateSlug = await resolveTemplateSlug(db, packageSlug)

    // Find the campaign template
    const { data: template } = await db
      .from('campaign_templates')
      .select('id, slug, name, category')
      .eq('slug', templateSlug)
      .maybeSingle()

    if (!template) {
      warnings.push(`No campaign template found for slug "${packageSlug}" (resolved to "${templateSlug}")`)
    }

    // Determine activation week
    const scheduledWeek = determineCampaignWeek(
      packageKey,
      packageSlug,
      milestoneTemplate,
      durationWeeks,
    )

    // Determine if this is an event-based campaign
    const isEventBased = packageSlug in EVENT_BASED_CAMPAIGNS
    const campaignName = template?.name ?? packageSlug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    scheduleRows.push({
      account_id: accountId,
      package_config_id: packageConfigId,
      campaign_template_id: template?.id ?? null,
      package_slug: packageSlug,
      template_slug: templateSlug,
      campaign_name: campaignName,
      sequence_order: i,
      scheduled_week: scheduledWeek,
      status: 'pending',
      auto_activate: !isEventBased, // Auto-activate scheduled campaigns, not event-based
      activation_delay_hours: 0,
      notes: isEventBased
        ? `Event-based campaign (trigger: ${EVENT_BASED_CAMPAIGNS[packageSlug]}). Will create trigger instead of scheduled campaign.`
        : null,
    })
  }

  // 4. Insert all schedule rows
  const { data: created, error: insertErr } = await db
    .from('package_campaign_schedule')
    .insert(scheduleRows)
    .select()

  if (insertErr) {
    return {
      success: false,
      schedules_created: 0,
      schedule: [],
      warnings: [`Failed to create schedule: ${insertErr.message}`],
    }
  }

  return {
    success: true,
    schedules_created: created?.length ?? 0,
    schedule: (created ?? []) as PackageCampaignScheduleRow[],
    warnings,
  }
}

// ============================================================
// Campaign Activation
// ============================================================

/**
 * Activates scheduled campaigns that are due based on current milestone progress.
 * Called by cron or when a milestone is completed.
 *
 * @param db - Supabase admin client
 * @param accountId - The account to check
 * @param currentWeek - The current milestone week number
 * @returns ActivationResult with counts of activated/created campaigns
 */
export async function activateScheduledCampaigns(
  db: SupabaseClient,
  accountId: string,
  currentWeek: number,
): Promise<ActivationResult> {
  const errors: string[] = []
  let activated = 0
  let created = 0
  let skipped = 0

  // Find pending schedule entries that are due
  const { data: pendingSchedules, error: fetchErr } = await db
    .from('package_campaign_schedule')
    .select('*')
    .eq('account_id', accountId)
    .eq('status', 'pending')
    .lte('scheduled_week', currentWeek)
    .order('sequence_order', { ascending: true })

  if (fetchErr || !pendingSchedules || pendingSchedules.length === 0) {
    return { activated: 0, created: 0, skipped: 0, errors: fetchErr ? [fetchErr.message] : [] }
  }

  for (const schedule of pendingSchedules) {
    try {
      // Skip if no template found
      if (!schedule.campaign_template_id) {
        await db
          .from('package_campaign_schedule')
          .update({
            status: 'skipped',
            error_message: 'No campaign template found for this slug',
          })
          .eq('id', schedule.id)
        skipped++
        continue
      }

      // Get the full campaign template
      const { data: template, error: tplErr } = await db
        .from('campaign_templates')
        .select('*')
        .eq('id', schedule.campaign_template_id)
        .single()

      if (tplErr || !template) {
        await db
          .from('package_campaign_schedule')
          .update({
            status: 'failed',
            error_message: `Template not found: ${tplErr?.message ?? 'unknown'}`,
          })
          .eq('id', schedule.id)
        errors.push(`Template ${schedule.campaign_template_id} not found`)
        continue
      }

      const tpl = template as CampaignTemplateRow
      const isEventBased = schedule.package_slug in EVENT_BASED_CAMPAIGNS

      if (isEventBased) {
        // Create a campaign trigger instead of a scheduled campaign
        const triggerEvent = EVENT_BASED_CAMPAIGNS[schedule.package_slug]

        const { data: trigger, error: trigErr } = await db
          .from('campaign_triggers')
          .insert({
            account_id: accountId,
            campaign_template_id: tpl.id,
            trigger_event: triggerEvent,
            conditions: tpl.audience_filter ?? {},
            delay_minutes: 0,
            is_active: true,
          })
          .select()
          .single()

        if (trigErr) {
          await db
            .from('package_campaign_schedule')
            .update({
              status: 'failed',
              error_message: `Failed to create trigger: ${trigErr.message}`,
            })
            .eq('id', schedule.id)
          errors.push(`Trigger creation failed for ${schedule.package_slug}: ${trigErr.message}`)
          continue
        }

        // Update schedule with trigger reference
        await db
          .from('package_campaign_schedule')
          .update({
            status: 'active',
            trigger_id: trigger.id,
          })
          .eq('id', schedule.id)

        activated++
      } else {
        // Create a campaign instance from the template
        const scheduledAt = schedule.auto_activate
          ? new Date(Date.now() + (schedule.activation_delay_hours ?? 0) * 3600000).toISOString()
          : null

        const { data: campaign, error: campErr } = await db
          .from('campaigns')
          .insert({
            account_id: accountId,
            template_id: tpl.id,
            name: schedule.campaign_name,
            description: tpl.description ?? `Auto-created from package campaign schedule`,
            status: schedule.auto_activate ? 'scheduled' : 'draft',
            channel: tpl.default_channel,
            message_templates: tpl.message_templates,
            sequence_steps: tpl.sequence_steps,
            audience_filter: tpl.audience_filter,
            scheduled_at: scheduledAt,
          })
          .select()
          .single()

        if (campErr) {
          await db
            .from('package_campaign_schedule')
            .update({
              status: 'failed',
              error_message: `Failed to create campaign: ${campErr.message}`,
            })
            .eq('id', schedule.id)
          errors.push(`Campaign creation failed for ${schedule.package_slug}: ${campErr.message}`)
          continue
        }

        // Update schedule with campaign reference
        await db
          .from('package_campaign_schedule')
          .update({
            status: schedule.auto_activate ? 'active' : 'created',
            campaign_id: campaign.id,
          })
          .eq('id', schedule.id)

        created++
        if (schedule.auto_activate) activated++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Error processing schedule ${schedule.id}: ${msg}`)
      await db
        .from('package_campaign_schedule')
        .update({ status: 'failed', error_message: msg })
        .eq('id', schedule.id)
    }
  }

  return { activated, created, skipped, errors }
}

// ============================================================
// Status Query
// ============================================================

/**
 * Returns the full campaign orchestration status for an account.
 */
export async function getPackageCampaignStatus(
  db: SupabaseClient,
  accountId: string,
): Promise<PackageCampaignStatus | null> {
  // Get all schedule entries for this account
  const { data: schedules, error } = await db
    .from('package_campaign_schedule')
    .select('*')
    .eq('account_id', accountId)
    .order('sequence_order', { ascending: true })

  if (error || !schedules || schedules.length === 0) return null

  // Get the package config for naming
  const packageConfigId = schedules[0].package_config_id
  const { data: pkg } = await db
    .from('package_configs')
    .select('name')
    .eq('id', packageConfigId)
    .maybeSingle()

  // Get current milestone week
  const { data: currentMilestone } = await db
    .from('package_milestones')
    .select('week_number')
    .eq('account_id', accountId)
    .eq('package_config_id', packageConfigId)
    .eq('status', 'in_progress')
    .order('week_number', { ascending: true })
    .limit(1)
    .maybeSingle()

  const typedSchedules = schedules as PackageCampaignScheduleRow[]

  return {
    account_id: accountId,
    package_config_id: packageConfigId,
    package_name: pkg?.name ?? 'Unknown Package',
    total_campaigns: typedSchedules.length,
    pending: typedSchedules.filter(s => s.status === 'pending').length,
    created: typedSchedules.filter(s => s.status === 'created').length,
    active: typedSchedules.filter(s => s.status === 'active').length,
    completed: typedSchedules.filter(s => s.status === 'completed').length,
    skipped: typedSchedules.filter(s => s.status === 'skipped').length,
    failed: typedSchedules.filter(s => s.status === 'failed').length,
    current_week: currentMilestone?.week_number ?? 0,
    schedule: typedSchedules,
  }
}

// ============================================================
// Cron Helper: Process All Accounts
// ============================================================

/**
 * Processes all accounts with active packages to activate due campaigns.
 * Called by the campaign triggers cron job.
 */
export async function processPackageCampaignSchedules(
  db: SupabaseClient,
): Promise<{ accounts_processed: number; total_activated: number; total_created: number; errors: string[] }> {
  const allErrors: string[] = []
  let totalActivated = 0
  let totalCreated = 0

  // Find all accounts with pending campaign schedules
  const { data: pendingAccounts, error: fetchErr } = await db
    .from('package_campaign_schedule')
    .select('account_id, package_config_id')
    .eq('status', 'pending')

  if (fetchErr || !pendingAccounts || pendingAccounts.length === 0) {
    return { accounts_processed: 0, total_activated: 0, total_created: 0, errors: fetchErr ? [fetchErr.message] : [] }
  }

  // Deduplicate by account_id + package_config_id
  const uniquePairs = new Map<string, { account_id: string; package_config_id: string }>()
  for (const row of pendingAccounts) {
    const key = `${row.account_id}:${row.package_config_id}`
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, { account_id: row.account_id, package_config_id: row.package_config_id })
    }
  }

  for (const { account_id, package_config_id } of uniquePairs.values()) {
    // Determine current week from milestones
    const { data: currentMilestone } = await db
      .from('package_milestones')
      .select('week_number')
      .eq('account_id', account_id)
      .eq('package_config_id', package_config_id)
      .eq('status', 'in_progress')
      .order('week_number', { ascending: true })
      .limit(1)
      .maybeSingle()

    // Also check completed milestones to get the highest completed week
    const { data: completedMilestones } = await db
      .from('package_milestones')
      .select('week_number')
      .eq('account_id', account_id)
      .eq('package_config_id', package_config_id)
      .eq('status', 'completed')
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const currentWeek = Math.max(
      currentMilestone?.week_number ?? 0,
      completedMilestones?.week_number ?? 0,
    )

    if (currentWeek === 0) continue // No milestones started yet

    const result = await activateScheduledCampaigns(db, account_id, currentWeek)
    totalActivated += result.activated
    totalCreated += result.created
    allErrors.push(...result.errors)
  }

  return {
    accounts_processed: uniquePairs.size,
    total_activated: totalActivated,
    total_created: totalCreated,
    errors: allErrors,
  }
}
