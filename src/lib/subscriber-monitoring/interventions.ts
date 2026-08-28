import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { RiskLevel } from './health-score'

// Intervention types and their triggers
export const INTERVENTION_RULES = [
  {
    type: 'welcome_checkin',
    trigger: 'new_subscriber',
    description: 'Welcome check-in 3 days after signup',
    channel: 'email' as const,
    delayDays: 3,
    cooldownDays: 0, // One-time
    template: 'welcome_checkin',
  },
  {
    type: 'onboarding_nudge',
    trigger: 'incomplete_onboarding',
    description: 'Nudge to complete onboarding after 7 days',
    channel: 'email' as const,
    delayDays: 7,
    cooldownDays: 7,
    template: 'onboarding_nudge',
  },
  {
    type: 'engagement_drop',
    trigger: 'health_score_declining',
    description: 'Outreach when health score drops below 50',
    channel: 'email' as const,
    delayDays: 0,
    cooldownDays: 14,
    template: 'engagement_drop',
  },
  {
    type: 'feature_discovery',
    trigger: 'low_feature_breadth',
    description: 'Suggest unused features when breadth is below 30%',
    channel: 'in_app' as const,
    delayDays: 0,
    cooldownDays: 7,
    template: 'feature_discovery',
  },
  {
    type: 'win_back',
    trigger: 'no_login_14_days',
    description: 'Win-back email after 14 days of no login',
    channel: 'email' as const,
    delayDays: 0,
    cooldownDays: 14,
    template: 'win_back',
  },
  {
    type: 'trial_expiry_warning',
    trigger: 'trial_ending_soon',
    description: 'Warning 3 days before trial expires',
    channel: 'email' as const,
    delayDays: 0,
    cooldownDays: 0,
    template: 'trial_expiry',
  },
  {
    type: 'trial_expired',
    trigger: 'trial_ended',
    description: 'Follow-up after trial expires',
    channel: 'email' as const,
    delayDays: 1,
    cooldownDays: 0,
    template: 'trial_expired',
  },
  {
    type: 'payment_failed',
    trigger: 'payment_failure',
    description: 'Notify about failed payment',
    channel: 'email' as const,
    delayDays: 0,
    cooldownDays: 3,
    template: 'payment_failed',
  },
  {
    type: 'upsell_opportunity',
    trigger: 'approaching_limits',
    description: 'Suggest upgrade when approaching tier limits',
    channel: 'in_app' as const,
    delayDays: 0,
    cooldownDays: 30,
    template: 'upsell',
  },
  {
    type: 'success_celebration',
    trigger: 'milestone_reached',
    description: 'Celebrate when user reaches a milestone',
    channel: 'in_app' as const,
    delayDays: 0,
    cooldownDays: 0,
    template: 'celebration',
  },
] as const

export type InterventionType = typeof INTERVENTION_RULES[number]['type']

// Email templates for interventions
export const INTERVENTION_TEMPLATES: Record<string, {
  subject: string
  body: string
}> = {
  welcome_checkin: {
    subject: 'How is your Business Growth Engine setup going?',
    body: `Hi {{name}},

Welcome to M4E! You signed up {{days_ago}} days ago and we want to make sure you are getting the most from your Business Growth Engine.

{{onboarding_status}}

Need help? Reply to this email or visit our support desk.

Best regards,
The M4E Team`,
  },
  onboarding_nudge: {
    subject: 'You are {{percent}}% through setup — let us help you finish',
    body: `Hi {{name}},

You have completed {{completed}} of {{total}} setup steps. Here is what is next:

{{next_step}}

Most businesses see results within 2 weeks of completing setup.

Best regards,
The M4E Team`,
  },
  engagement_drop: {
    subject: 'We noticed you have been less active — everything okay?',
    body: `Hi {{name}},

We noticed your platform activity has dropped recently. Is there anything we can help with?

Here are some quick wins to get back on track:
{{suggestions}}

Reply to this email if you need any assistance.

Best regards,
The M4E Team`,
  },
  feature_discovery: {
    subject: 'Did you know your plan includes these features?',
    body: `Hi {{name}},

You are currently using {{used_count}} of {{total_count}} features available on your {{tier}} plan. Here are some you might find useful:

{{unused_features}}

Best regards,
The M4E Team`,
  },
  win_back: {
    subject: 'We miss you! Your customers might too',
    body: `Hi {{name}},

It has been {{days}} days since you last logged in. While you have been away:

{{activity_summary}}

Log in now to check on your business: {{login_url}}

Best regards,
The M4E Team`,
  },
  trial_expiry: {
    subject: 'Your free trial ends in {{days}} days',
    body: `Hi {{name}},

Your M4E Business Growth Engine trial ends in {{days}} days. Here is what you have accomplished so far:

{{trial_summary}}

To keep your data and continue growing, choose a plan: {{pricing_url}}

Best regards,
The M4E Team`,
  },
  trial_expired: {
    subject: 'Your trial has ended — but your data is safe',
    body: `Hi {{name}},

Your M4E trial ended yesterday. Your data is safe and waiting for you.

Subscribe now to pick up where you left off: {{pricing_url}}

Best regards,
The M4E Team`,
  },
  payment_failed: {
    subject: 'Action needed: Your payment did not go through',
    body: `Hi {{name}},

We were unable to process your payment of {{amount}}. Your account will remain active for {{grace_days}} more days.

Please update your payment method: {{billing_url}}

Best regards,
The M4E Team`,
  },
  upsell: {
    subject: 'You are approaching your {{resource}} limit',
    body: `Hi {{name}},

Great news — your business is growing! You are at {{usage_pct}}% of your {{resource}} limit on the {{tier}} plan.

Upgrade to {{next_tier}} for more capacity: {{upgrade_url}}

Best regards,
The M4E Team`,
  },
  celebration: {
    subject: 'Congratulations! You just hit a milestone',
    body: `Hi {{name}},

{{milestone_message}}

Keep up the great work!

Best regards,
The M4E Team`,
  },
}

/**
 * Check if an intervention should be sent (respects cooldown)
 */
export async function shouldSendIntervention(
  accountId: string,
  interventionType: string,
  cooldownDays: number
): Promise<boolean> {
  if (cooldownDays === 0) {
    // One-time intervention: check if ever sent
    const db = supabaseAdmin()
    const { count } = await db
      .from('subscriber_interventions')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('intervention_type', interventionType)
      .in('status', ['sent', 'delivered', 'opened', 'acted'])
    return (count || 0) === 0
  }

  // Check cooldown period
  const db = supabaseAdmin()
  const cooldownDate = new Date()
  cooldownDate.setDate(cooldownDate.getDate() - cooldownDays)

  const { count } = await db
    .from('subscriber_interventions')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('intervention_type', interventionType)
    .gte('created_at', cooldownDate.toISOString())

  return (count || 0) === 0
}

/**
 * Create an intervention record
 */
export async function createIntervention(
  accountId: string,
  type: string,
  triggerReason: string,
  channel: 'email' | 'whatsapp' | 'in_app' | 'sms',
  healthScore?: number,
  scheduledFor?: Date
): Promise<string> {
  const db = supabaseAdmin()
  const template = INTERVENTION_TEMPLATES[type]

  const { data } = await db
    .from('subscriber_interventions')
    .insert({
      account_id: accountId,
      intervention_type: type,
      trigger_reason: triggerReason,
      channel,
      status: scheduledFor ? 'pending' : 'pending',
      message_template: type,
      message_content: template ? JSON.stringify(template) : null,
      health_score_at_trigger: healthScore || null,
      scheduled_for: scheduledFor?.toISOString() || new Date().toISOString(),
    })
    .select('id')
    .single()

  return data?.id || ''
}

/**
 * Process all pending interventions and evaluate triggers
 */
export async function evaluateInterventions(): Promise<{
  evaluated: number
  triggered: number
  errors: number
}> {
  const db = supabaseAdmin()
  let triggered = 0
  let errors = 0

  // Get all active accounts with their latest health scores
  const { data: accounts } = await db
    .from('accounts')
    .select(`
      id,
      business_name,
      subscription_status,
      subscription_tier,
      trial_ends_at,
      created_at
    `)
    .not('subscription_status', 'in', '("suspended","archived")')

  if (!accounts) return { evaluated: 0, triggered: 0, errors: 0 }

  for (const account of accounts) {
    try {
      // Get latest health score
      const { data: healthData } = await db
        .from('account_health_scores')
        .select('overall_score, risk_level, days_since_login, features_used_30d, total_features_available')
        .eq('account_id', account.id)
        .order('scored_at', { ascending: false })
        .limit(1)
        .single()

      const score = healthData?.overall_score || 0
      const risk = healthData?.risk_level || 'critical'

      // Check each intervention rule
      for (const rule of INTERVENTION_RULES) {
        const shouldTrigger = await checkTrigger(account, healthData, rule)
        if (!shouldTrigger) continue

        const canSend = await shouldSendIntervention(
          account.id,
          rule.type,
          rule.cooldownDays
        )
        if (!canSend) continue

        await createIntervention(
          account.id,
          rule.type,
          rule.trigger,
          rule.channel,
          score
        )
        triggered++
      }
    } catch (err) {
      console.error(`[Interventions] Error evaluating account ${account.id}:`, err)
      errors++
    }
  }

  return { evaluated: accounts.length, triggered, errors }
}

/**
 * Check if a specific trigger condition is met
 */
async function checkTrigger(
  account: Record<string, unknown>,
  healthData: Record<string, unknown> | null,
  rule: typeof INTERVENTION_RULES[number]
): Promise<boolean> {
  const now = new Date()

  switch (rule.trigger) {
    case 'new_subscriber': {
      const created = new Date(account.created_at as string)
      const daysSince = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      return daysSince >= rule.delayDays && daysSince <= rule.delayDays + 1
    }

    case 'incomplete_onboarding': {
      const created = new Date(account.created_at as string)
      const daysSince = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      return daysSince >= rule.delayDays
    }

    case 'health_score_declining':
      return (healthData?.overall_score as number || 100) < 50

    case 'low_feature_breadth': {
      const used = healthData?.features_used_30d as number || 0
      const total = healthData?.total_features_available as number || 1
      return total > 0 && (used / total) * 100 < 30
    }

    case 'no_login_14_days':
      return (healthData?.days_since_login as number || 0) >= 14

    case 'trial_ending_soon': {
      const trialEnd = account.trial_ends_at ? new Date(account.trial_ends_at as string) : null
      if (!trialEnd) return false
      const daysUntil = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil > 0 && daysUntil <= 3
    }

    case 'trial_ended': {
      const trialEnd = account.trial_ends_at ? new Date(account.trial_ends_at as string) : null
      if (!trialEnd) return false
      const daysSinceEnd = Math.floor((now.getTime() - trialEnd.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceEnd >= 1 && daysSinceEnd <= 2
    }

    case 'payment_failure':
      return account.subscription_status === 'suspended'

    case 'approaching_limits':
      // This would check tier limits - simplified for now
      return false

    case 'milestone_reached':
      // This would check for specific milestones - simplified for now
      return false

    default:
      return false
  }
}
