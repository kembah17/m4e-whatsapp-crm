import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin/owner roles
    const role = account.account_role || account.role
    if (!['owner', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = supabaseAdmin()
    const { searchParams } = new URL(req.url)
    const riskFilter = searchParams.get('risk')
    const tierFilter = searchParams.get('tier')
    const sortBy = searchParams.get('sort') || 'health_score'
    const order = searchParams.get('order') || 'asc'

    // Fetch all accounts with their latest health scores
    const { data: accounts, error: accountsError } = await db
      .from('accounts')
      .select('id, business_name, subscription_tier, subscription_status, created_at, industry, business_size, onboarding_completed')
      .order('created_at', { ascending: false })

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ subscribers: [], summary: { total: 0, healthy: 0, watch: 0, at_risk: 0, critical: 0, unscored: 0, mrr: 0 } })
    }

    // Fetch latest health scores for all accounts
    const accountIds = accounts.map(a => a.id)
    const { data: healthScores } = await db
      .from('account_health_scores')
      .select('account_id, overall_score, risk_level, trend, component_scores, calculated_at')
      .in('account_id', accountIds)
      .order('calculated_at', { ascending: false })

    // Get latest score per account
    const latestScores: Record<string, typeof healthScores extends (infer T)[] | null ? T : never> = {}
    if (healthScores) {
      for (const score of healthScores) {
        if (!latestScores[score.account_id]) {
          latestScores[score.account_id] = score
        }
      }
    }

    // Fetch recent interventions count per account
    const { data: interventions } = await db
      .from('subscriber_interventions')
      .select('account_id, status')
      .in('account_id', accountIds)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const interventionCounts: Record<string, { total: number; pending: number }> = {}
    if (interventions) {
      for (const i of interventions) {
        if (!interventionCounts[i.account_id]) {
          interventionCounts[i.account_id] = { total: 0, pending: 0 }
        }
        interventionCounts[i.account_id].total++
        if (i.status === 'pending' || i.status === 'sent') {
          interventionCounts[i.account_id].pending++
        }
      }
    }

    // Fetch contact counts per account
    const { data: contactCounts } = await db
      .from('contacts')
      .select('account_id')
      .in('account_id', accountIds)

    const contactCountMap: Record<string, number> = {}
    if (contactCounts) {
      for (const c of contactCounts) {
        contactCountMap[c.account_id] = (contactCountMap[c.account_id] || 0) + 1
      }
    }

    // Tier pricing for MRR calculation
    const tierPricing: Record<string, number> = {
      starter: 50000,
      professional: 120000,
      business: 250000,
      enterprise: 500000,
    }

    // Build subscriber list
    let subscribers = accounts.map(account => {
      const score = latestScores[account.id]
      const interventionData = interventionCounts[account.id] || { total: 0, pending: 0 }
      const contacts = contactCountMap[account.id] || 0
      const mrr = tierPricing[account.subscription_tier?.toLowerCase()] || 0

      return {
        accountId: account.id,
        businessName: account.business_name || 'Unnamed Business',
        tier: account.subscription_tier || 'starter',
        status: account.subscription_status || 'active',
        industry: account.industry || 'Unknown',
        businessSize: account.business_size || 'Unknown',
        onboardingComplete: account.onboarding_completed || false,
        createdAt: account.created_at,
        contacts,
        mrr,
        healthScore: score?.overall_score ?? null,
        riskLevel: score?.risk_level ?? 'unscored',
        trend: score?.trend ?? 'stable',
        lastScored: score?.calculated_at ?? null,
        componentScores: score?.component_scores ?? null,
        interventions: interventionData,
      }
    })

    // Apply filters
    if (riskFilter) {
      subscribers = subscribers.filter(s => s.riskLevel === riskFilter)
    }
    if (tierFilter) {
      subscribers = subscribers.filter(s => s.tier.toLowerCase() === tierFilter.toLowerCase())
    }

    // Sort
    subscribers.sort((a, b) => {
      let aVal: number, bVal: number
      switch (sortBy) {
        case 'health_score':
          aVal = a.healthScore ?? -1
          bVal = b.healthScore ?? -1
          break
        case 'mrr':
          aVal = a.mrr
          bVal = b.mrr
          break
        case 'contacts':
          aVal = a.contacts
          bVal = b.contacts
          break
        case 'created':
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        default:
          aVal = a.healthScore ?? -1
          bVal = b.healthScore ?? -1
      }
      return order === 'asc' ? aVal - bVal : bVal - aVal
    })

    // Summary stats
    const summary = {
      total: subscribers.length,
      healthy: subscribers.filter(s => s.riskLevel === 'healthy').length,
      watch: subscribers.filter(s => s.riskLevel === 'watch').length,
      at_risk: subscribers.filter(s => s.riskLevel === 'at_risk').length,
      critical: subscribers.filter(s => s.riskLevel === 'critical').length,
      unscored: subscribers.filter(s => s.riskLevel === 'unscored').length,
      mrr: subscribers.reduce((sum, s) => sum + s.mrr, 0),
      avgHealthScore: subscribers.filter(s => s.healthScore !== null).length > 0
        ? Math.round(subscribers.filter(s => s.healthScore !== null).reduce((sum, s) => sum + (s.healthScore || 0), 0) / subscribers.filter(s => s.healthScore !== null).length)
        : 0,
      totalContacts: subscribers.reduce((sum, s) => sum + s.contacts, 0),
      pendingInterventions: subscribers.reduce((sum, s) => sum + s.interventions.pending, 0),
    }

    return NextResponse.json({ subscribers, summary })
  } catch (error) {
    console.error('[Admin Subscribers API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
