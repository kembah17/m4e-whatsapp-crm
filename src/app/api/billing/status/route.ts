import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { getAccountAccessLevel } from '@/lib/billing/grace-period'

/**
 * GET /api/billing/status
 * Get current billing status for the authenticated user
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

    // Get billing status
    const billingStatus = await getAccountAccessLevel(profile.account_id)

    // Get active subscription
    const { data: subscription } = await db
      .from('m4e_subscriptions')
      .select('*')
      .eq('account_id', profile.account_id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get package payments
    const { data: packagePayments } = await db
      .from('m4e_package_payments')
      .select('*')
      .eq('account_id', profile.account_id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get recent billing events
    const { data: recentEvents } = await db
      .from('billing_events')
      .select('*')
      .eq('account_id', profile.account_id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      billing: billingStatus,
      subscription: subscription || null,
      packagePayments: packagePayments || [],
      recentEvents: recentEvents || [],
    })
  } catch (err) {
    console.error('[billing/status] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch billing status' },
      { status: 500 },
    )
  }
}
