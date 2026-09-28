import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

async function verifySuperAdmin(): Promise<{ userId: string } | NextResponse> {
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
  return { userId: user.id }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifySuperAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const admin = supabaseAdmin()

    // Fetch account
    const { data: account, error: accountErr } = await admin
      .from('accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (accountErr || !account) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Fetch owner profile
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('user_id, full_name, email, account_role')
      .eq('account_id', id)
      .eq('account_role', 'owner')
      .maybeSingle()

    // Fetch onboarding tasks
    const { data: tasks } = await admin
      .from('client_onboarding_tasks')
      .select('*')
      .eq('account_id', id)
      .order('sort_order', { ascending: true })

    // Fetch provisioning log
    const { data: logs } = await admin
      .from('client_provisioning_log')
      .select('*')
      .eq('account_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Contact count
    const { count: contactCount } = await admin
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', id)

    // WhatsApp status
    const { data: waConfig } = await admin
      .from('whatsapp_config')
      .select('status, phone_number_id, connected_at')
      .eq('account_id', id)
      .maybeSingle()

    // Onboarding progress
    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter((t) => t.status === 'completed').length || 0
    const onboardingProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return NextResponse.json({
      client: {
        ...account,
        owner: ownerProfile || null,
        contact_count: contactCount || 0,
        whatsapp: waConfig || null,
        onboarding_progress: onboardingProgress,
        onboarding_total: totalTasks,
        onboarding_completed: completedTasks,
      },
      tasks: tasks || [],
      logs: logs || [],
    })
  } catch (err) {
    console.error('[admin/clients/[id]] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifySuperAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params
    const body = await req.json()
    const admin = supabaseAdmin()

    // Allowed update fields
    const allowedFields = [
      'name', 'business_name', 'subscription_tier', 'subscription_status',
      'industry', 'business_size', 'cac_status', 'cac_document_url',
      'client_phone', 'client_email', 'client_address',
      'assigned_package', 'package_start_date',
    ]

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const { data: updated, error: updateErr } = await admin
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Log the change
    await admin.from('client_provisioning_log').insert({
      account_id: id,
      action: 'client_updated',
      performed_by: auth.userId,
      details: { updated_fields: Object.keys(updates).filter((k) => k !== 'updated_at') },
    })

    return NextResponse.json({ client: updated })
  } catch (err) {
    console.error('[admin/clients/[id]] PUT error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
