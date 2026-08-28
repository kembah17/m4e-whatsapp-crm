import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { getPaystackBilling } from '@/lib/billing/paystack-billing'
import { startGracePeriod, restoreAccess } from '@/lib/billing/grace-period'
import { TRIAL_DURATION_DAYS } from '@/lib/billing/plans'

/**
 * POST /api/billing/webhook
 * Handles Paystack webhook events for M4E billing
 * Events: charge.success, subscription.create, subscription.not_renew,
 *         subscription.disable, invoice.payment_failed, invoice.update
 */
export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  const signature = request.headers.get('x-paystack-signature') ?? ''

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Verify webhook signature
  const paystack = getPaystackBilling()
  if (!paystack.verifyWebhookSignature(body, signature)) {
    console.error('[billing/webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const db = supabaseAdmin()

  try {
    const payload = JSON.parse(body) as {
      event: string
      data: Record<string, unknown>
    }

    const { event, data } = payload
    const metadata = (data.metadata as Record<string, unknown>) || {}
    const accountId = metadata.account_id as string | undefined
    const paymentType = metadata.payment_type as string | undefined

    console.log(`[billing/webhook] Event: ${event}, Account: ${accountId}, Type: ${paymentType}`)

    switch (event) {
      // ============================================================
      // Successful charge (subscription or package)
      // ============================================================
      case 'charge.success': {
        const reference = String(data.reference || '')
        const amount = Number(data.amount || 0)
        const channel = String(data.channel || '')
        const customer = data.customer as Record<string, unknown> | undefined

        if (paymentType === 'package' && accountId) {
          // Package payment success
          await db
            .from('m4e_package_payments')
            .update({
              status: 'success',
              payment_channel: channel,
              paid_at: new Date().toISOString(),
              paystack_transaction_id: String(data.id || ''),
            })
            .eq('paystack_reference', reference)

          // Log billing event
          await db.from('billing_events').insert({
            account_id: accountId,
            event_type: 'package_payment_success',
            source: 'paystack',
            amount_kobo: amount,
            paystack_reference: reference,
            description: `Package payment successful: ${metadata.package_name || 'Unknown'}`,
            metadata: { channel, package_key: metadata.package_key },
          })

          // Update account last payment
          await db
            .from('accounts')
            .update({
              last_payment_at: new Date().toISOString(),
              last_payment_amount: amount / 100,
            })
            .eq('id', accountId)

        } else if (paymentType === 'subscription' && accountId) {
          // Subscription payment success
          const tier = (metadata.tier as string) || 'starter'
          const interval = (metadata.interval as string) || 'monthly'
          const isTrialEligible = metadata.is_trial === true

          // Calculate period dates
          const now = new Date()
          const periodEnd = new Date(now)
          if (interval === 'annually') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1)
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1)
          }

          // Calculate trial dates if eligible
          let trialEnd: Date | null = null
          if (isTrialEligible) {
            trialEnd = new Date(now)
            trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS)
          }

          // Update account
          await db
            .from('accounts')
            .update({
              subscription_tier: tier,
              subscription_status: isTrialEligible ? 'trial' : 'active',
              billing_interval: interval,
              subscription_started_at: now.toISOString(),
              subscription_current_period_end: periodEnd.toISOString(),
              trial_started_at: isTrialEligible ? now.toISOString() : undefined,
              trial_ends_at: trialEnd ? trialEnd.toISOString() : undefined,
              last_payment_at: now.toISOString(),
              last_payment_amount: amount / 100,
              failed_payment_count: 0,
              grace_period_ends_at: null,
              paystack_customer_code: customer
                ? String(customer.customer_code || '')
                : undefined,
            })
            .eq('id', accountId)

          // Restore access if was in grace period
          await restoreAccess(accountId, tier)

          // Log billing event
          await db.from('billing_events').insert({
            account_id: accountId,
            event_type: isTrialEligible ? 'trial_started' : 'subscription_payment_success',
            source: 'paystack',
            amount_kobo: amount,
            paystack_reference: reference,
            description: isTrialEligible
              ? `Trial started for ${tier} (${interval})`
              : `Subscription payment successful: ${tier} (${interval})`,
            metadata: { tier, interval, channel },
          })
        }
        break
      }

      // ============================================================
      // Subscription created
      // ============================================================
      case 'subscription.create': {
        const subscriptionCode = String(data.subscription_code || '')
        const emailToken = String(data.email_token || '')
        const plan = data.plan as Record<string, unknown> | undefined
        const planCode = plan ? String(plan.plan_code || '') : ''

        if (accountId) {
          // Create subscription record
          await db.from('m4e_subscriptions').insert({
            account_id: accountId,
            paystack_subscription_code: subscriptionCode,
            paystack_email_token: emailToken,
            status: 'active',
            tier: (metadata.tier as string) || 'starter',
            interval: (metadata.interval as string) || 'monthly',
            amount_kobo: Number(data.amount || 0),
            current_period_start: new Date().toISOString(),
            metadata: { plan_code: planCode },
          })

          // Update account with subscription code
          await db
            .from('accounts')
            .update({ paystack_subscription_code: subscriptionCode })
            .eq('id', accountId)

          await db.from('billing_events').insert({
            account_id: accountId,
            event_type: 'subscription_created',
            source: 'paystack',
            description: `Subscription created: ${subscriptionCode}`,
            metadata: { subscription_code: subscriptionCode, plan_code: planCode },
          })
        }
        break
      }

      // ============================================================
      // Subscription cancelled / not renewed
      // ============================================================
      case 'subscription.not_renew':
      case 'subscription.disable': {
        const subCode = String(data.subscription_code || '')

        if (accountId) {
          // Update subscription record
          await db
            .from('m4e_subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancel_reason: event === 'subscription.not_renew' ? 'not_renewed' : 'disabled',
            })
            .eq('paystack_subscription_code', subCode)

          // Update account
          await db
            .from('accounts')
            .update({ subscription_status: 'cancelled' })
            .eq('id', accountId)

          await db.from('billing_events').insert({
            account_id: accountId,
            event_type: 'subscription_cancelled',
            source: 'paystack',
            description: `Subscription ${event === 'subscription.not_renew' ? 'not renewed' : 'disabled'}: ${subCode}`,
          })
        }
        break
      }

      // ============================================================
      // Invoice payment failed
      // ============================================================
      case 'invoice.payment_failed': {
        if (accountId) {
          // Increment failed payment count
          const { data: account } = await db
            .from('accounts')
            .select('failed_payment_count')
            .eq('id', accountId)
            .single()

          const failedCount = (account?.failed_payment_count || 0) + 1

          await db
            .from('accounts')
            .update({ failed_payment_count: failedCount })
            .eq('id', accountId)

          // Start grace period on first failure
          if (failedCount === 1) {
            await startGracePeriod(accountId)
          }

          await db.from('billing_events').insert({
            account_id: accountId,
            event_type: 'payment_failed',
            source: 'paystack',
            description: `Payment failed (attempt ${failedCount})`,
            metadata: { failed_count: failedCount },
          })
        }
        break
      }

      default:
        console.log(`[billing/webhook] Unhandled event: ${event}`)
    }
  } catch (err) {
    console.error('[billing/webhook] Processing error:', err)
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true })
}
