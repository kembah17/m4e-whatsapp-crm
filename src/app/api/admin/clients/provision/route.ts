import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { provisionClient } from '@/lib/admin/client-provisioning'
import type { SubscriptionTier, PackageKey } from '@/lib/billing/plans'

export async function POST(req: NextRequest) {
  try {
    // Auth: super admin only
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = supabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden: Super admin only' }, { status: 403 })
    }

    const body = await req.json()

    // Validate required fields
    const required = ['businessName', 'ownerName', 'ownerEmail', 'industry', 'subscriptionTier', 'cacStatus']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const result = await provisionClient({
      businessName: body.businessName,
      ownerName: body.ownerName,
      ownerEmail: body.ownerEmail,
      ownerPhone: body.ownerPhone || undefined,
      industry: body.industry,
      businessSize: body.businessSize || undefined,
      subscriptionTier: body.subscriptionTier as SubscriptionTier,
      packageKey: body.packageKey as PackageKey | undefined,
      industryBundleId: body.industryBundleId || undefined,
      cacStatus: body.cacStatus,
      cacDocumentUrl: body.cacDocumentUrl || undefined,
      clientAddress: body.clientAddress || undefined,
      sendWelcomeEmail: body.sendWelcomeEmail !== false,
      temporaryPassword: body.temporaryPassword || undefined,
    }, user.id)

    return NextResponse.json({
      success: true,
      accountId: result.accountId,
      userId: result.userId,
      temporaryPassword: result.temporaryPassword,
    }, { status: 201 })
  } catch (err) {
    console.error('[admin/clients/provision] Error:', err)
    const message = err instanceof Error ? err.message : 'Provisioning failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
