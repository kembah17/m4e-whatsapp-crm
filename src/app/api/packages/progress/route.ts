import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Get user's account_id from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single()

    if (!profile?.account_id) {
      return NextResponse.json({ error: 'No account found' }, { status: 404 })
    }

    const accountId = profile.account_id

    // Get account details including subscription info
    const { data: account } = await supabase
      .from('accounts')
      .select('id, business_name, subscription_tier, industry, created_at')
      .eq('id', accountId)
      .single()

    // Get all milestones for this account (across all packages)
    const { data: milestones } = await supabase
      .from('package_milestones')
      .select(`
        id, milestone_key, name, description, week_number, status,
        started_at, completed_at, planned_hours, actual_hours,
        deliverables, criteria, notes, package_config_id,
        created_at, updated_at
      `)
      .eq('account_id', accountId)
      .order('week_number', { ascending: true })

    // Get package configs for context
    const { data: packageConfigs } = await supabase
      .from('package_configs')
      .select('id, package_key, name, description, price_naira, duration_weeks, tier, milestone_template, retainer_options')
      .eq('is_active', true)
      .order('tier', { ascending: true })

    // Get transition recommendations for this account
    const { data: transitions } = await supabase
      .from('package_transitions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get execution metrics for this account (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: metrics } = await supabase
      .from('execution_metrics')
      .select('*')
      .eq('account_id', accountId)
      .gte('period_start', ninetyDaysAgo)
      .order('period_start', { ascending: false })

    // Get client outcomes
    const { data: outcomes } = await supabase
      .from('client_outcomes')
      .select('*')
      .eq('account_id', accountId)
      .order('measured_at', { ascending: false })
      .limit(20)

    // Determine active package from milestones
    const activePackageIds = [...new Set((milestones ?? []).map(m => m.package_config_id))]
    const activePackages = (packageConfigs ?? []).filter(p => activePackageIds.includes(p.id))

    // Calculate progress per package
    const packageProgress = activePackages.map(pkg => {
      const pkgMilestones = (milestones ?? []).filter(m => m.package_config_id === pkg.id)
      const completed = pkgMilestones.filter(m => m.status === 'completed').length
      const inProgress = pkgMilestones.filter(m => m.status === 'in_progress').length
      const total = pkgMilestones.length
      const currentMilestone = pkgMilestones.find(m => m.status === 'in_progress') ?? pkgMilestones.find(m => m.status === 'pending')
      const nextMilestones = pkgMilestones.filter(m => m.status === 'pending').slice(0, 3)

      return {
        package: pkg,
        milestones: pkgMilestones,
        completed,
        inProgress,
        total,
        progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        currentMilestone,
        nextMilestones,
      }
    })

    return NextResponse.json({
      account,
      packageProgress,
      allPackages: packageConfigs ?? [],
      transitions: transitions ?? [],
      metrics: metrics ?? [],
      outcomes: outcomes ?? [],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load package progress'
    console.error('[packages/progress GET] error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
