import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { getPaystackBilling } from '@/lib/billing/paystack-billing'

/**
 * GET /api/billing/portal
 * Get Paystack subscription management link
 */
export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = supabaseAdmin()
    const { data: profile } = await db
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Get subscription code
    const { data: account } = await db
      .from('accounts')
      .select('paystack_subscription_code')
      .eq('id', profile.account_id)
      .single()

    if (!account?.paystack_subscription_code) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
    }

    const paystack = getPaystackBilling()
    const link = await paystack.getSubscriptionManageLink(account.paystack_subscription_code)

    return NextResponse.json({ manage_url: link })
  } catch (err) {
    console.error('[billing/portal] Error:', err)
    return NextResponse.json(
      { error: 'Failed to get management link' },
      { status: 500 },
    )
  }
}
