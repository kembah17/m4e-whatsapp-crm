import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { getPaystackBilling } from '@/lib/billing/paystack-billing'
import { getSubscriptionPlan, TRIAL_DURATION_DAYS } from '@/lib/billing/plans'
import type { SubscriptionTier, BillingInterval } from '@/lib/billing/plans'

/**
 * POST /api/billing/subscribe
 * Initialize a subscription checkout with Paystack
 * Body: { tier, interval, callbackUrl? }
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tier, interval, callbackUrl } = body as {
      tier: SubscriptionTier
      interval: BillingInterval
      callbackUrl?: string
    }

    if (!tier || !interval) {
      return NextResponse.json({ error: 'tier and interval are required' }, { status: 400 })
    }

    const plan = getSubscriptionPlan(tier, interval)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get account
    const db = supabaseAdmin()
    const { data: profile } = await db
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Get or create Paystack customer
    const paystack = getPaystackBilling()
    let customerCode: string | undefined

    const { data: account } = await db
      .from('accounts')
      .select('paystack_customer_code, billing_email, subscription_status, trial_ends_at')
      .eq('id', profile.account_id)
      .single()

    if (account?.paystack_customer_code) {
      customerCode = account.paystack_customer_code
    } else {
      // Create customer in Paystack
      const customer = await paystack.createCustomer({
        email: user.email || '',
        metadata: { account_id: profile.account_id },
      })
      customerCode = customer.customer_code

      await db
        .from('accounts')
        .update({
          paystack_customer_code: customerCode,
          billing_email: user.email,
        })
        .eq('id', profile.account_id)
    }

    // Check if this is a first-time subscription (eligible for trial)
    const isFirstSubscription = !account?.subscription_status || account.subscription_status === 'active'
    const isTrialEligible = isFirstSubscription && !account?.trial_ends_at

    // Create Paystack plan if not exists
    // For now, use the plan code directly — plans are created via Paystack dashboard or API
    const transaction = await paystack.initializeSubscription({
      email: user.email || '',
      plan: plan.planCode,
      callbackUrl: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL || ''}/billing?status=success`,
      metadata: {
        account_id: profile.account_id,
        tier: plan.tier,
        interval: plan.interval,
        is_trial: isTrialEligible,
      },
    })

    // Log billing event
    await db.from('billing_events').insert({
      account_id: profile.account_id,
      event_type: 'subscription_checkout_initiated',
      source: 'paystack',
      amount_kobo: plan.amountKobo,
      paystack_reference: transaction.reference,
      description: `Checkout initiated for ${plan.name}`,
      metadata: { tier, interval, plan_code: plan.planCode },
    })

    return NextResponse.json({
      authorization_url: transaction.authorization_url,
      reference: transaction.reference,
      plan: plan.name,
      amount: plan.amountNaira,
      trial_eligible: isTrialEligible,
      trial_days: isTrialEligible ? TRIAL_DURATION_DAYS : 0,
    })
  } catch (err) {
    console.error('[billing/subscribe] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Subscription initialization failed' },
      { status: 500 },
    )
  }
}
