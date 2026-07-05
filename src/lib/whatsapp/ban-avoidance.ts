import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ------------------------------------------------------------
// Ban Avoidance Engine — hard-coded enforcement of Meta's rules
// Called by: send/route.ts, broadcast/route.ts,
//            automations/meta-send.ts, flows/meta-send.ts
// ------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: SupabaseClient<any, 'public', any> | null = null
function supabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _admin
}

/** Tier limits (business-initiated conversations per 24h). */
const TIER_LIMITS: Record<number, number> = {
  1: 250,
  2: 1000,
  3: 10000,
  4: 100000,
  5: Infinity,
}

export interface SendCheckResult {
  allowed: boolean
  reason?: string
  /** Which of Meta's rules blocked the send. */
  rule?: string
}

export interface SendCheckInput {
  accountId: string
  contactId: string
  /** The business phone_number_id from whatsapp_config. */
  phoneNumberId: string
  templateCategory?: string | null
  templateName?: string | null
  isTemplate: boolean
}

/**
 * Master gate — call before EVERY outbound message.
 * Returns `{ allowed: true }` or `{ allowed: false, reason, rule }`.
 */
export async function canSendMessage(
  input: SendCheckInput,
): Promise<SendCheckResult> {
  const db = supabaseAdmin()

  // ── Rule 2: 24-hour window enforcement ──────────────────────
  const { data: conv } = await db
    .from('conversations')
    .select('id')
    .eq('account_id', input.accountId)
    .eq('contact_id', input.contactId)
    .maybeSingle()

  if (conv) {
    const { data: lastMsg } = await db
      .from('messages')
      .select('created_at')
      .eq('conversation_id', conv.id)
      .eq('sender_type', 'customer')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const hoursSinceInbound = lastMsg
      ? (Date.now() - new Date(lastMsg.created_at).getTime()) / (1000 * 60 * 60)
      : Infinity

    if (hoursSinceInbound > 24 && !input.isTemplate) {
      return {
        allowed: false,
        reason: 'Template required outside 24-hour service window',
        rule: 'rule_2_24h_window',
      }
    }
  } else if (!input.isTemplate) {
    return {
      allowed: false,
      reason: 'Template required for first contact',
      rule: 'rule_2_24h_window',
    }
  }

  // ── Rule 4: Marketing frequency cap (max 2 per contact per 7 days) ──
  if (input.templateCategory === 'marketing') {
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString()
    const { count } = await db
      .from('marketing_frequency_log')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', input.accountId)
      .eq('contact_id', input.contactId)
      .gte('sent_at', sevenDaysAgo)

    if ((count ?? 0) >= 2) {
      return {
        allowed: false,
        reason: 'Marketing frequency cap exceeded (max 2/week)',
        rule: 'rule_4_frequency_cap',
      }
    }
  }

  // ── Rule 5: Number warm-up tier check ───────────────────────
  const warmup = await getOrCreateWarmupState(
    input.accountId,
    input.phoneNumberId,
  )

  // Reset daily counter if needed
  const today = new Date().toISOString().split('T')[0]
  if (warmup.conversations_today_reset_at !== today) {
    await db
      .from('number_warmup_state')
      .update({
        conversations_today: 0,
        conversations_today_reset_at: today,
      })
      .eq('id', warmup.id)
    warmup.conversations_today = 0
  }

  const tierLimit = TIER_LIMITS[warmup.current_tier] ?? 250
  if (warmup.conversations_today >= tierLimit) {
    return {
      allowed: false,
      reason: `Daily tier limit reached (Tier ${warmup.current_tier}: ${tierLimit}/day)`,
      rule: 'rule_5_warmup_tier',
    }
  }

  // ── Rule 6: Quality rating check ────────────────────────────
  if (warmup.quality_rating === 'RED') {
    if (input.templateCategory === 'marketing') {
      return {
        allowed: false,
        reason: 'Marketing paused: quality rating is RED',
        rule: 'rule_6_quality_red',
      }
    }
  }
  if (warmup.quality_rating === 'YELLOW' && warmup.is_auto_throttled) {
    if (warmup.conversations_today >= Math.floor(tierLimit / 2)) {
      return {
        allowed: false,
        reason: 'Throttled: quality rating is YELLOW',
        rule: 'rule_6_quality_yellow',
      }
    }
  }

  // ── Rule 8: Template block rate check ───────────────────────
  if (input.templateName) {
    const { data: blockRate } = await db
      .from('template_block_rates')
      .select('block_rate, is_auto_disabled')
      .eq('account_id', input.accountId)
      .eq('template_name', input.templateName)
      .maybeSingle()

    if (blockRate?.is_auto_disabled) {
      return {
        allowed: false,
        reason: `Template "${input.templateName}" auto-disabled due to high block rate`,
        rule: 'rule_8_template_blocked',
      }
    }
    if (blockRate && blockRate.block_rate > 0.015) {
      return {
        allowed: false,
        reason: `Template block rate too high (${(blockRate.block_rate * 100).toFixed(1)}%)`,
        rule: 'rule_8_template_blocked',
      }
    }
  }

  return { allowed: true }
}

/**
 * Record a successful send for frequency tracking and warm-up counting.
 * Call AFTER a message is successfully sent to Meta.
 */
export async function recordSend(input: {
  accountId: string
  contactId: string
  phoneNumberId: string
  templateName?: string | null
  templateCategory?: string | null
}): Promise<void> {
  const db = supabaseAdmin()

  // Increment warm-up counter
  await db
    .rpc('increment_warmup_counter', {
      p_account_id: input.accountId,
      p_phone_number_id: input.phoneNumberId,
    })
    .then(({ error }) => {
      if (error) console.error('[ban-avoidance] warmup increment failed:', error)
    })

  // Log marketing frequency
  if (input.templateCategory === 'marketing') {
    await db
      .from('marketing_frequency_log')
      .insert({
        account_id: input.accountId,
        contact_id: input.contactId,
        template_name: input.templateName ?? undefined,
        template_category: input.templateCategory,
      })
      .then(({ error }) => {
        if (error)
          console.error('[ban-avoidance] frequency log failed:', error)
      })
  }

  // Increment template send count
  if (input.templateName) {
    await db
      .rpc('increment_template_send', {
        p_account_id: input.accountId,
        p_template_name: input.templateName,
      })
      .then(({ error }) => {
        if (error)
          console.error('[ban-avoidance] template send increment failed:', error)
      })
  }
}

/**
 * Process quality rating webhook from Meta.
 */
export async function handleQualityRatingUpdate(input: {
  accountId: string
  phoneNumberId: string
  qualityRating: 'GREEN' | 'YELLOW' | 'RED'
}): Promise<void> {
  const db = supabaseAdmin()
  const now = new Date().toISOString()

  const updates: Record<string, unknown> = {
    quality_rating: input.qualityRating,
    quality_rating_updated_at: now,
    updated_at: now,
  }

  if (input.qualityRating === 'YELLOW') {
    updates.is_auto_throttled = true
  }
  if (input.qualityRating === 'RED') {
    updates.marketing_paused = true
    updates.is_auto_throttled = true
  }
  if (input.qualityRating === 'GREEN') {
    updates.is_auto_throttled = false
    updates.marketing_paused = false
  }

  await db
    .from('number_warmup_state')
    .update(updates)
    .eq('account_id', input.accountId)
    .eq('phone_number_id', input.phoneNumberId)

  // Create system alert
  const severity =
    input.qualityRating === 'RED'
      ? 'critical'
      : input.qualityRating === 'YELLOW'
        ? 'warning'
        : 'info'

  await db.from('system_alerts').insert({
    severity,
    category: 'whatsapp',
    title: `Quality rating changed to ${input.qualityRating}`,
    description:
      input.qualityRating === 'RED'
        ? `Phone ${input.phoneNumberId} quality is RED. Marketing messages paused.`
        : input.qualityRating === 'YELLOW'
          ? `Phone ${input.phoneNumberId} quality is YELLOW. Sending throttled to 50%.`
          : `Phone ${input.phoneNumberId} quality is GREEN. Normal operations resumed.`,
    metadata: {
      phoneNumberId: input.phoneNumberId,
      qualityRating: input.qualityRating,
    },
  })
}

// ── Helpers ─────────────────────────────────────────────────

async function getOrCreateWarmupState(
  accountId: string,
  phoneNumberId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const db = supabaseAdmin()
  const { data } = await db
    .from('number_warmup_state')
    .select('*')
    .eq('account_id', accountId)
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle()

  if (data) return data

  const { data: created } = await db
    .from('number_warmup_state')
    .insert({ account_id: accountId, phone_number_id: phoneNumberId })
    .select()
    .single()

  return created
}
