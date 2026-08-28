import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  PackageConfig,
  PackageMilestone,
  MilestoneTemplate,
  MilestoneStatus,
  DeliverableItem,
  CriterionItem,
} from '@/types/packages'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AccountPackageSummary {
  account_id: string
  business_name: string
  subscription_tier: string
  industry: string
  created_at: string
  active_package: {
    package_config_id: string
    package_key: string
    package_name: string
    price_naira: number
    duration_weeks: number
    total_milestones: number
    completed: number
    in_progress: number
    pending: number
    blocked: number
    skipped: number
    progress_percent: number
    current_week: number
    current_milestone: string | null
    started_at: string | null
    last_activity: string | null
    estimated_end: string | null
  } | null
  campaign_stats: { total: number; active: number; draft: number }
  automation_stats: { total: number; active: number }
  contact_count: number
}

/* ------------------------------------------------------------------ */
/*  GET /api/packages/management                                       */
/*  Lists all accounts with comprehensive package status                */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    const db = supabaseAdmin()

    // Get all accounts
    const { data: accounts, error: accErr } = await db
      .from('accounts')
      .select('id, name, subscription_tier, industry, created_at')
      .order('created_at', { ascending: false })
    if (accErr) throw accErr

    // Get all milestones
    const { data: milestones, error: msErr } = await db
      .from('package_milestones')
      .select('*')
      .order('week_number', { ascending: true })
    if (msErr) throw msErr

    // Get package configs
    const { data: packages, error: pkgErr } = await db
      .from('package_configs')
      .select('*')
      .order('tier', { ascending: true })
    if (pkgErr) throw pkgErr

    // Get campaign counts per account
    const { data: campaigns } = await db
      .from('campaigns')
      .select('account_id, status')

    // Get automation counts per account
    const { data: automations } = await db
      .from('automations')
      .select('account_id, is_active')

    // Get contact counts per account
    const { data: contacts } = await db
      .from('contacts')
      .select('account_id')

    const pkgMap = new Map((packages ?? []).map(p => [p.id, p]))

    // Build campaign stats per account
    const campaignStats = new Map<string, { total: number; active: number; draft: number }>()
    for (const c of campaigns ?? []) {
      const s = campaignStats.get(c.account_id) ?? { total: 0, active: 0, draft: 0 }
      s.total++
      if (c.status === 'active') s.active++
      if (c.status === 'draft') s.draft++
      campaignStats.set(c.account_id, s)
    }

    // Build automation stats per account
    const autoStats = new Map<string, { total: number; active: number }>()
    for (const a of automations ?? []) {
      const s = autoStats.get(a.account_id) ?? { total: 0, active: 0 }
      s.total++
      if (a.is_active) s.active++
      autoStats.set(a.account_id, s)
    }

    // Build contact counts per account
    const contactCounts = new Map<string, number>()
    for (const c of contacts ?? []) {
      contactCounts.set(c.account_id, (contactCounts.get(c.account_id) ?? 0) + 1)
    }

    // Build summary per account
    const summaries: AccountPackageSummary[] = (accounts ?? []).map(acct => {
      const acctMilestones = (milestones ?? []).filter(m => m.account_id === acct.id)
      const base = {
        account_id: acct.id,
        business_name: acct.name ?? acct.id.slice(0, 8),
        subscription_tier: acct.subscription_tier ?? 'free',
        industry: acct.industry ?? 'unknown',
        created_at: acct.created_at,
        campaign_stats: campaignStats.get(acct.id) ?? { total: 0, active: 0, draft: 0 },
        automation_stats: autoStats.get(acct.id) ?? { total: 0, active: 0 },
        contact_count: contactCounts.get(acct.id) ?? 0,
      }

      if (acctMilestones.length === 0) {
        return { ...base, active_package: null }
      }

      // Group by package_config_id, take the one with most milestones
      const byPkg = new Map<string, typeof acctMilestones>()
      for (const m of acctMilestones) {
        const key = m.package_config_id
        if (!byPkg.has(key)) byPkg.set(key, [])
        byPkg.get(key)!.push(m)
      }

      let activePkgId = ''
      let activeMilestones: typeof acctMilestones = []
      for (const [pkgId, ms] of byPkg) {
        if (ms.length > activeMilestones.length) {
          activePkgId = pkgId
          activeMilestones = ms
        }
      }

      const pkg = pkgMap.get(activePkgId)
      const completed = activeMilestones.filter(m => m.status === 'completed').length
      const inProgress = activeMilestones.filter(m => m.status === 'in_progress').length
      const pending = activeMilestones.filter(m => m.status === 'pending').length
      const blocked = activeMilestones.filter(m => m.status === 'blocked').length
      const skipped = activeMilestones.filter(m => m.status === 'skipped').length
      const total = activeMilestones.length

      // Find current milestone (first in_progress, or first pending)
      const current = activeMilestones.find(m => m.status === 'in_progress')
        ?? activeMilestones.find(m => m.status === 'pending')

      // Calculate dates
      const startDates = activeMilestones
        .map(m => m.started_at)
        .filter(Boolean)
        .sort()
      const updateDates = activeMilestones
        .map(m => m.updated_at ?? m.completed_at)
        .filter(Boolean)
        .sort()
        .reverse()

      const startedAt = startDates[0] ?? null
      let estimatedEnd: string | null = null
      if (startedAt && pkg) {
        const start = new Date(startedAt)
        start.setDate(start.getDate() + pkg.duration_weeks * 7)
        estimatedEnd = start.toISOString()
      }

      return {
        ...base,
        active_package: {
          package_config_id: activePkgId,
          package_key: pkg?.package_key ?? 'unknown',
          package_name: pkg?.name ?? 'Unknown Package',
          price_naira: pkg?.price_naira ?? 0,
          duration_weeks: pkg?.duration_weeks ?? 0,
          total_milestones: total,
          completed,
          in_progress: inProgress,
          pending,
          blocked,
          skipped,
          progress_percent: total > 0 ? Math.round((completed / total) * 100) : 0,
          current_week: current?.week_number ?? 0,
          current_milestone: current?.name ?? null,
          started_at: startedAt,
          last_activity: updateDates[0] ?? null,
          estimated_end: estimatedEnd,
        },
      }
    })

    return NextResponse.json({
      accounts: summaries,
      packages: packages as PackageConfig[],
      stats: {
        total_accounts: summaries.length,
        with_package: summaries.filter(s => s.active_package).length,
        without_package: summaries.filter(s => !s.active_package).length,
        total_milestones: (milestones ?? []).length,
        completed_milestones: (milestones ?? []).filter(m => m.status === 'completed').length,
      },
    })
  } catch (err) {
    console.error('[packages/management GET] error:', err)
    return NextResponse.json({ error: 'Failed to load management data' }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/packages/management                                      */
/*  Actions: assign, update_milestone, start_milestone, complete,       */
/*           add_note, transition, record_metric                        */
/* ------------------------------------------------------------------ */
export async function POST(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const body = await request.json()
    const { action } = body

    switch (action) {
      /* ---- Assign package to account ---- */
      case 'assign_package': {
        const { account_id, package_config_id } = body
        if (!account_id || !package_config_id) {
          return NextResponse.json({ error: 'account_id and package_config_id required' }, { status: 400 })
        }

        // Get package config with milestone template
        const { data: pkg, error: pkgErr } = await db
          .from('package_configs')
          .select('*')
          .eq('id', package_config_id)
          .single()
        if (pkgErr || !pkg) {
          return NextResponse.json({ error: 'Package not found' }, { status: 404 })
        }

        // Check if already assigned
        const { data: existing } = await db
          .from('package_milestones')
          .select('id')
          .eq('account_id', account_id)
          .eq('package_config_id', package_config_id)
          .limit(1)
        if (existing && existing.length > 0) {
          return NextResponse.json({ error: 'Package already assigned to this account' }, { status: 409 })
        }

        // Create milestones from template
        const template = (pkg.milestone_template ?? []) as MilestoneTemplate[]
        if (template.length === 0) {
          // For Complete/Unicorn packages that have no milestones, combine from sub-packages
          return NextResponse.json({
            error: 'This package has no milestone template. Use individual package assignments for Complete/Unicorn programmes.',
          }, { status: 400 })
        }

        const milestoneRows = template.map((t: MilestoneTemplate, idx: number) => ({
          account_id,
          package_config_id,
          milestone_key: `${pkg.package_key}_week_${t.week}`,
          name: t.name,
          description: t.description ?? null,
          week_number: t.week,
          status: idx === 0 ? 'in_progress' : 'pending' as MilestoneStatus,
          started_at: idx === 0 ? new Date().toISOString() : null,
          planned_hours: 0,
          actual_hours: 0,
          deliverables: (t.deliverables ?? []).map((d: string) => ({
            name: d,
            status: 'pending' as const,
          })),
          criteria: (t.criteria ?? []).map((c: string) => ({
            name: c,
            met: false,
          })),
        }))

        const { data: created, error: createErr } = await db
          .from('package_milestones')
          .insert(milestoneRows)
          .select()
        if (createErr) throw createErr

        // Update account subscription tier based on package
        const tierMap: Record<string, string> = {
          pkg1_reactivation: 'starter',
          pkg2_online_presence: 'professional',
          pkg3_growth_engine: 'enterprise',
        }
        const newTier = tierMap[pkg.package_key]
        if (newTier) {
          await db
            .from('accounts')
            .update({ subscription_tier: newTier })
            .eq('id', account_id)
        }

        return NextResponse.json({
          success: true,
          milestones_created: created?.length ?? 0,
          package: pkg.name,
        }, { status: 201 })
      }

      /* ---- Update milestone status ---- */
      case 'update_milestone': {
        const { milestone_id, status, notes, deliverables, criteria, actual_hours } = body
        if (!milestone_id) {
          return NextResponse.json({ error: 'milestone_id required' }, { status: 400 })
        }

        const updates: Record<string, unknown> = {}
        if (status) {
          updates.status = status
          if (status === 'in_progress' && !body.started_at) {
            updates.started_at = new Date().toISOString()
          }
          if (status === 'completed') {
            updates.completed_at = new Date().toISOString()
          }
        }
        if (notes !== undefined) updates.notes = notes
        if (deliverables) updates.deliverables = deliverables
        if (criteria) updates.criteria = criteria
        if (actual_hours !== undefined) updates.actual_hours = actual_hours

        const { data, error } = await db
          .from('package_milestones')
          .update(updates)
          .eq('id', milestone_id)
          .select()
          .single()
        if (error) throw error

        // If completed, auto-start next milestone
        if (status === 'completed' && data) {
          const { data: nextMilestone } = await db
            .from('package_milestones')
            .select('id')
            .eq('account_id', data.account_id)
            .eq('package_config_id', data.package_config_id)
            .eq('status', 'pending')
            .order('week_number', { ascending: true })
            .limit(1)
            .single()

          if (nextMilestone) {
            await db
              .from('package_milestones')
              .update({ status: 'in_progress', started_at: new Date().toISOString() })
              .eq('id', nextMilestone.id)
          }
        }

        return NextResponse.json({ success: true, milestone: data })
      }

      /* ---- Update single deliverable ---- */
      case 'update_deliverable': {
        const { milestone_id, deliverable_index, deliverable_status, deliverable_url } = body
        if (!milestone_id || deliverable_index === undefined) {
          return NextResponse.json({ error: 'milestone_id and deliverable_index required' }, { status: 400 })
        }

        const { data: ms, error: msErr } = await db
          .from('package_milestones')
          .select('deliverables')
          .eq('id', milestone_id)
          .single()
        if (msErr || !ms) throw msErr ?? new Error('Milestone not found')

        const delivs = [...(ms.deliverables as DeliverableItem[])]
        if (deliverable_index >= delivs.length) {
          return NextResponse.json({ error: 'Invalid deliverable index' }, { status: 400 })
        }
        if (deliverable_status) delivs[deliverable_index].status = deliverable_status
        if (deliverable_url) delivs[deliverable_index].url = deliverable_url

        const { error } = await db
          .from('package_milestones')
          .update({ deliverables: delivs })
          .eq('id', milestone_id)
        if (error) throw error

        return NextResponse.json({ success: true })
      }

      /* ---- Update single criterion ---- */
      case 'update_criterion': {
        const { milestone_id, criterion_index, met, value } = body
        if (!milestone_id || criterion_index === undefined) {
          return NextResponse.json({ error: 'milestone_id and criterion_index required' }, { status: 400 })
        }

        const { data: ms, error: msErr } = await db
          .from('package_milestones')
          .select('criteria')
          .eq('id', milestone_id)
          .single()
        if (msErr || !ms) throw msErr ?? new Error('Milestone not found')

        const crits = [...(ms.criteria as CriterionItem[])]
        if (criterion_index >= crits.length) {
          return NextResponse.json({ error: 'Invalid criterion index' }, { status: 400 })
        }
        if (met !== undefined) crits[criterion_index].met = met
        if (value !== undefined) crits[criterion_index].value = value

        const { error } = await db
          .from('package_milestones')
          .update({ criteria: crits })
          .eq('id', milestone_id)
        if (error) throw error

        return NextResponse.json({ success: true })
      }

      /* ---- Record execution metric ---- */
      case 'record_metric': {
        const { account_id, package_config_id, metric_type, metric_key, metric_value, metric_unit, period_start, period_end } = body
        if (!account_id || !metric_type || !metric_key || metric_value === undefined) {
          return NextResponse.json({ error: 'Missing required metric fields' }, { status: 400 })
        }

        const { data, error } = await db
          .from('execution_metrics')
          .insert({
            account_id,
            package_config_id: package_config_id ?? null,
            metric_type,
            metric_key,
            metric_value,
            metric_unit: metric_unit ?? null,
            period_start: period_start ?? new Date().toISOString(),
            period_end: period_end ?? new Date().toISOString(),
            metadata: body.metadata ?? {},
          })
          .select()
          .single()
        if (error) throw error

        return NextResponse.json({ success: true, metric: data }, { status: 201 })
      }

      /* ---- Record transition ---- */
      case 'record_transition': {
        const {
          account_id, from_package_id, to_package_id,
          transition_type, recommendation, recommendation_text,
          decision, notes: transNotes,
        } = body
        if (!account_id || !transition_type) {
          return NextResponse.json({ error: 'account_id and transition_type required' }, { status: 400 })
        }

        const { data, error } = await db
          .from('package_transitions')
          .insert({
            account_id,
            from_package_id: from_package_id ?? null,
            to_package_id: to_package_id ?? null,
            transition_type,
            recommendation: recommendation ?? 'recommend',
            quantitative_scores: body.quantitative_scores ?? {},
            qualitative_scores: body.qualitative_scores ?? {},
            recommendation_text: recommendation_text ?? null,
            decision: decision ?? null,
            decided_at: decision ? new Date().toISOString() : null,
            notes: transNotes ?? null,
          })
          .select()
          .single()
        if (error) throw error

        return NextResponse.json({ success: true, transition: data }, { status: 201 })
      }

      /* ---- Remove package assignment ---- */
      case 'remove_package': {
        const { account_id, package_config_id: removePkgId } = body
        if (!account_id || !removePkgId) {
          return NextResponse.json({ error: 'account_id and package_config_id required' }, { status: 400 })
        }

        const { error } = await db
          .from('package_milestones')
          .delete()
          .eq('account_id', account_id)
          .eq('package_config_id', removePkgId)
        if (error) throw error

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[packages/management POST] error:', err)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
