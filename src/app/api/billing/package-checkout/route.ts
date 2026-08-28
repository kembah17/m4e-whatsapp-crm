import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { getPaystackBilling } from '@/lib/billing/paystack-billing'
import { getPackagePlan } from '@/lib/billing/plans'
import type { PackageKey } from '@/lib/billing/plans'

/**
 * POST /api/billing/package-checkout
 * Initialize a one-time payment for a package purchase
 * Body: { packageKey, callbackUrl? }
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { packageKey, callbackUrl } = body as {
      packageKey: PackageKey
      callbackUrl?: string
    }

    if (!packageKey) {
      return NextResponse.json({ error: 'packageKey is required' }, { status: 400 })
    }

    const pkg = getPackagePlan(packageKey)
    if (!pkg) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
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

    const paystack = getPaystackBilling()

    // Initialize one-time payment
    const transaction = await paystack.initializePackagePayment({
      email: user.email || '',
      amount: pkg.amountKobo,
      packageKey: pkg.key,
      packageName: pkg.name,
      accountId: profile.account_id,
      callbackUrl: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL || ''}/billing?status=package_success&package=${pkg.key}`,
    })

    // Create pending payment record
    await db.from('m4e_package_payments').insert({
      account_id: profile.account_id,
      package_key: pkg.key,
      package_name: pkg.name,
      amount_kobo: pkg.amountKobo,
      paystack_reference: transaction.reference,
      status: 'pending',
      metadata: { initiated_by: user.id },
    })

    // Log billing event
    await db.from('billing_events').insert({
      account_id: profile.account_id,
      event_type: 'package_checkout_initiated',
      source: 'paystack',
      amount_kobo: pkg.amountKobo,
      paystack_reference: transaction.reference,
      description: `Package checkout initiated for ${pkg.name}`,
      metadata: { package_key: pkg.key },
    })

    return NextResponse.json({
      authorization_url: transaction.authorization_url,
      reference: transaction.reference,
      package_name: pkg.name,
      amount: pkg.amountNaira,
    })
  } catch (err) {
    console.error('[billing/package-checkout] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Package checkout failed' },
      { status: 500 },
    )
  }
}
