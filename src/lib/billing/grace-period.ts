import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

/**
 * Grace Period Timeline:
 * Payment fails → 3-day grace (full access) → 7-day read-only → suspend → archive
 *
 * GRACE_PERIOD_DAYS = 3 (full access, payment retry)
 * READ_ONLY_DAYS = 7 (can view but not create/edit)
 * SUSPEND_AFTER_DAYS = 10 (total, account suspended)
 * ARCHIVE_AFTER_DAYS = 30 (data archived)
 */

export const GRACE_PERIOD_DAYS = 3
export const READ_ONLY_DAYS = 7
export const SUSPEND_AFTER_DAYS = GRACE_PERIOD_DAYS + READ_ONLY_DAYS
export const ARCHIVE_AFTER_DAYS = 30

export type AccountAccessLevel = 'full' | 'read_only' | 'suspended' | 'archived'

export interface AccountBillingStatus {
  accountId: string
  tier: string
  status: string
  accessLevel: AccountAccessLevel
  isTrialing: boolean
  trialEndsAt: string | null
  daysUntilTrialEnd: number | null
  isInGracePeriod: boolean
  gracePeriodEndsAt: string | null
  daysUntilSuspension: number | null
  failedPaymentCount: number
  lastPaymentAt: string | null
  message: string
}

/**
 * Determine the access level for an account based on billing status
 */
export async function getAccountAccessLevel(accountId: string): Promise<AccountBillingStatus> {
  const db = supabaseAdmin()

  const { data: account, error } = await db
    .from('accounts')
    .select('id, subscription_tier, subscription_status, trial_ends_at, grace_period_ends_at, failed_payment_count, last_payment_at, subscription_current_period_end')
    .eq('id', accountId)
    .single()

  if (error || !account) {
    return {
      accountId,
      tier: 'free',
      status: 'unknown',
      accessLevel: 'suspended',
      isTrialing: false,
      trialEndsAt: null,
      daysUntilTrialEnd: null,
      isInGracePeriod: false,
      gracePeriodEndsAt: null,
      daysUntilSuspension: null,
      failedPaymentCount: 0,
      lastPaymentAt: null,
      message: 'Account not found',
    }
  }

  const now = new Date()
  const trialEndsAt = account.trial_ends_at ? new Date(account.trial_ends_at) : null
  const gracePeriodEndsAt = account.grace_period_ends_at ? new Date(account.grace_period_ends_at) : null
  const periodEnd = account.subscription_current_period_end ? new Date(account.subscription_current_period_end) : null

  // Check trial status
  const isTrialing = account.subscription_status === 'trial' && trialEndsAt !== null && trialEndsAt > now
  const daysUntilTrialEnd = isTrialing && trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Determine access level
  let accessLevel: AccountAccessLevel = 'full'
  let message = ''
  let isInGracePeriod = false
  let daysUntilSuspension: number | null = null

  if (account.subscription_status === 'active' || isTrialing) {
    accessLevel = 'full'
    message = isTrialing
      ? `Trial active — ${daysUntilTrialEnd} days remaining`
      : 'Subscription active'
  } else if (account.subscription_status === 'suspended') {
    if (gracePeriodEndsAt && gracePeriodEndsAt > now) {
      // In grace period — check if full access or read-only
      const daysSinceGraceStart = Math.ceil(
        (now.getTime() - (gracePeriodEndsAt.getTime() - SUSPEND_AFTER_DAYS * 24 * 60 * 60 * 1000)) /
        (1000 * 60 * 60 * 24)
      )

      if (daysSinceGraceStart <= GRACE_PERIOD_DAYS) {
        accessLevel = 'full'
        isInGracePeriod = true
        daysUntilSuspension = Math.ceil((gracePeriodEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        message = `Payment failed — ${GRACE_PERIOD_DAYS - daysSinceGraceStart} days to update payment method`
      } else {
        accessLevel = 'read_only'
        isInGracePeriod = true
        daysUntilSuspension = Math.ceil((gracePeriodEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        message = `Account read-only — update payment within ${daysUntilSuspension} days to avoid suspension`
      }
    } else {
      accessLevel = 'suspended'
      message = 'Account suspended — please update your payment method'
    }
  } else if (account.subscription_status === 'cancelled') {
    // Check if still within paid period
    if (periodEnd && periodEnd > now) {
      accessLevel = 'full'
      message = 'Subscription cancelled — access until end of billing period'
    } else {
      accessLevel = 'read_only'
      message = 'Subscription cancelled — upgrade to regain full access'
    }
  } else {
    accessLevel = 'full' // Default for free tier
    message = 'Free tier'
  }

  return {
    accountId,
    tier: account.subscription_tier,
    status: account.subscription_status,
    accessLevel,
    isTrialing,
    trialEndsAt: account.trial_ends_at,
    daysUntilTrialEnd,
    isInGracePeriod,
    gracePeriodEndsAt: account.grace_period_ends_at,
    daysUntilSuspension,
    failedPaymentCount: account.failed_payment_count || 0,
    lastPaymentAt: account.last_payment_at,
    message,
  }
}

/**
 * Start grace period for an account after payment failure
 */
export async function startGracePeriod(accountId: string): Promise<void> {
  const db = supabaseAdmin()
  const gracePeriodEnd = new Date()
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + SUSPEND_AFTER_DAYS)

  await db
    .from('accounts')
    .update({
      subscription_status: 'suspended',
      grace_period_ends_at: gracePeriodEnd.toISOString(),
    })
    .eq('id', accountId)

  // Log billing event
  await db
    .from('billing_events')
    .insert({
      account_id: accountId,
      event_type: 'grace_period_started',
      source: 'system',
      description: `Grace period started — account will be suspended on ${gracePeriodEnd.toISOString()}`,
    })
}

/**
 * Restore full access after successful payment
 */
export async function restoreAccess(accountId: string, tier: string): Promise<void> {
  const db = supabaseAdmin()

  await db
    .from('accounts')
    .update({
      subscription_status: 'active',
      subscription_tier: tier,
      grace_period_ends_at: null,
      failed_payment_count: 0,
    })
    .eq('id', accountId)

  await db
    .from('billing_events')
    .insert({
      account_id: accountId,
      event_type: 'access_restored',
      source: 'system',
      description: 'Full access restored after successful payment',
    })
}
