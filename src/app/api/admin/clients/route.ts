import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url)
    const tierFilter = searchParams.get('tier')
    const statusFilter = searchParams.get('status')
    const industryFilter = searchParams.get('industry')
    const search = searchParams.get('search')

    // Fetch all accounts with related data
    let query = admin
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (tierFilter) query = query.eq('subscription_tier', tierFilter)
    if (statusFilter) query = query.eq('subscription_status', statusFilter)
    if (industryFilter) query = query.eq('industry', industryFilter)
    if (search) query = query.or(`name.ilike.%${search}%,business_name.ilike.%${search}%,client_email.ilike.%${search}%`)

    const { data: accounts, error: accountsErr } = await query

    if (accountsErr) {
      return NextResponse.json({ error: accountsErr.message }, { status: 500 })
    }

    // Enrich with contact counts and onboarding progress
    const enriched = await Promise.all(
      (accounts || []).map(async (account) => {
        // Contact count
        const { count: contactCount } = await admin
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', account.id)

        // Onboarding progress
        const { data: tasks } = await admin
          .from('client_onboarding_tasks')
          .select('status')
          .eq('account_id', account.id)

        const totalTasks = tasks?.length || 0
        const completedTasks = tasks?.filter((t) => t.status === 'completed').length || 0
        const onboardingProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        // WhatsApp connected?
        const { data: waConfig } = await admin
          .from('whatsapp_config')
          .select('status')
          .eq('account_id', account.id)
          .eq('status', 'connected')
          .maybeSingle()

        return {
          ...account,
          contact_count: contactCount || 0,
          onboarding_progress: onboardingProgress,
          onboarding_total: totalTasks,
          onboarding_completed: completedTasks,
          whatsapp_connected: !!waConfig,
        }
      })
    )

    // Summary stats
    const summary = {
      total: enriched.length,
      byTier: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      active: enriched.filter((a) => a.subscription_status === 'active').length,
      trial: enriched.filter((a) => a.subscription_status === 'trialing').length,
    }

    for (const a of enriched) {
      const tier = a.subscription_tier || 'free'
      summary.byTier[tier] = (summary.byTier[tier] || 0) + 1
      const status = a.subscription_status || 'unknown'
      summary.byStatus[status] = (summary.byStatus[status] || 0) + 1
    }

    return NextResponse.json({ clients: enriched, summary })
  } catch (err) {
    console.error('[admin/clients] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
