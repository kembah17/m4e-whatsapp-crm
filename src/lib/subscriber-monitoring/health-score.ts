import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { getActivitySummary, getDaysSinceLastLogin, getFeaturesUsed } from './activity-tracker'
import { TRACKABLE_FEATURES } from './activity-tracker'

// Health score weights (must sum to 100)
const WEIGHTS = {
  login: 25,
  featureBreadth: 20,
  contactEngagement: 20,
  campaignActivity: 15,
  dataFreshness: 10,
  supportSentiment: 10,
} as const

// Thresholds for each component
const THRESHOLDS = {
  login: { healthy: 3, watch: 7, atRisk: 14 }, // days since last login
  featureBreadth: { healthy: 60, watch: 30, atRisk: 15 }, // % of features used
  contactEngagement: { healthy: 10, watch: 5, atRisk: 2 }, // % messages/contacts
  campaignActivity: { healthy: 1, watch: 0, atRisk: 0 }, // active campaigns
  dataFreshness: { healthy: 14, watch: 30, atRisk: 60 }, // days since last update
  supportSentiment: { healthy: 0, watch: 1, atRisk: 3 }, // open negative tickets
}

export type RiskLevel = 'healthy' | 'watch' | 'at_risk' | 'critical'
export type Trend = 'improving' | 'stable' | 'declining'

export interface HealthScore {
  overallScore: number
  riskLevel: RiskLevel
  trend: Trend
  components: {
    login: number
    featureBreadth: number
    contactEngagement: number
    campaignActivity: number
    dataFreshness: number
    supportSentiment: number
  }
  metrics: {
    daysSinceLogin: number | null
    featuresUsed30d: number
    totalFeaturesAvailable: number
    messagesSent30d: number
    contactsTotal: number
    activeCampaigns: number
    daysSinceDataUpdate: number | null
    openTickets: number
  }
}

/**
 * Calculate health score for a single account
 */
export async function calculateHealthScore(accountId: string): Promise<HealthScore> {
  const db = supabaseAdmin()

  // Gather all metrics in parallel
  const [
    daysSinceLogin,
    featuresUsed,
    activitySummary,
    contactCount,
    campaignCount,
    dataFreshness,
    ticketCount,
    tierData,
  ] = await Promise.all([
    getDaysSinceLastLogin(accountId),
    getFeaturesUsed(accountId, 30),
    getActivitySummary(accountId, 30),
    getContactCount(db, accountId),
    getActiveCampaignCount(db, accountId),
    getDaysSinceLastDataUpdate(db, accountId),
    getOpenTicketCount(db, accountId),
    getAccountTier(db, accountId),
  ])

  const totalFeatures = getTierFeatureCount(tierData?.subscription_tier || 'starter')
  const featureBreadthPct = totalFeatures > 0 ? (featuresUsed.length / totalFeatures) * 100 : 0
  const engagementPct = contactCount > 0 ? (activitySummary.messagesSent / contactCount) * 100 : 0

  // Calculate component scores (0-100 each)
  const loginScore = scoreLogin(daysSinceLogin)
  const featureScore = scoreFeatureBreadth(featureBreadthPct)
  const engagementScore = scoreEngagement(engagementPct)
  const campaignScore = scoreCampaignActivity(campaignCount)
  const freshnessScore = scoreDataFreshness(dataFreshness)
  const sentimentScore = scoreSupportSentiment(ticketCount)

  // Weighted overall score
  const overallScore = Math.round(
    (loginScore * WEIGHTS.login +
      featureScore * WEIGHTS.featureBreadth +
      engagementScore * WEIGHTS.contactEngagement +
      campaignScore * WEIGHTS.campaignActivity +
      freshnessScore * WEIGHTS.dataFreshness +
      sentimentScore * WEIGHTS.supportSentiment) / 100
  )

  // Determine risk level
  const riskLevel = getRiskLevel(overallScore)

  // Get trend by comparing with previous score
  const trend = await calculateTrend(db, accountId, overallScore)

  return {
    overallScore,
    riskLevel,
    trend,
    components: {
      login: loginScore,
      featureBreadth: featureScore,
      contactEngagement: engagementScore,
      campaignActivity: campaignScore,
      dataFreshness: freshnessScore,
      supportSentiment: sentimentScore,
    },
    metrics: {
      daysSinceLogin,
      featuresUsed30d: featuresUsed.length,
      totalFeaturesAvailable: totalFeatures,
      messagesSent30d: activitySummary.messagesSent,
      contactsTotal: contactCount,
      activeCampaigns: campaignCount,
      daysSinceDataUpdate: dataFreshness,
      openTickets: ticketCount,
    },
  }
}

/**
 * Calculate and store health scores for ALL active accounts
 */
export async function calculateAllHealthScores(): Promise<{
  processed: number
  errors: number
  scores: { accountId: string; score: number; risk: RiskLevel }[]
}> {
  const db = supabaseAdmin()

  // Get all active accounts (not suspended/archived)
  const { data: accounts } = await db
    .from('accounts')
    .select('id')
    .not('subscription_status', 'in', '("suspended","archived")')

  if (!accounts || accounts.length === 0) {
    return { processed: 0, errors: 0, scores: [] }
  }

  const results: { accountId: string; score: number; risk: RiskLevel }[] = []
  let errors = 0

  for (const account of accounts) {
    try {
      const score = await calculateHealthScore(account.id)

      // Store the score
      await db.from('account_health_scores').insert({
        account_id: account.id,
        overall_score: score.overallScore,
        login_score: score.components.login,
        feature_breadth_score: score.components.featureBreadth,
        contact_engagement_score: score.components.contactEngagement,
        campaign_activity_score: score.components.campaignActivity,
        data_freshness_score: score.components.dataFreshness,
        support_sentiment_score: score.components.supportSentiment,
        risk_level: score.riskLevel,
        trend: score.trend,
        days_since_login: score.metrics.daysSinceLogin,
        features_used_30d: score.metrics.featuresUsed30d,
        total_features_available: score.metrics.totalFeaturesAvailable,
        messages_sent_30d: score.metrics.messagesSent30d,
        contacts_total: score.metrics.contactsTotal,
        active_campaigns: score.metrics.activeCampaigns,
        days_since_data_update: score.metrics.daysSinceDataUpdate,
        open_tickets: score.metrics.openTickets,
      })

      results.push({
        accountId: account.id,
        score: score.overallScore,
        risk: score.riskLevel,
      })
    } catch (err) {
      console.error(`[HealthScore] Error scoring account ${account.id}:`, err)
      errors++
    }
  }

  return { processed: results.length, errors, scores: results }
}

/**
 * Get health score history for an account
 */
export async function getHealthScoreHistory(
  accountId: string,
  days: number = 30
): Promise<{ date: string; score: number; risk: string }[]> {
  const db = supabaseAdmin()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await db
    .from('account_health_scores')
    .select('overall_score, risk_level, scored_at')
    .eq('account_id', accountId)
    .gte('scored_at', since.toISOString())
    .order('scored_at', { ascending: true })

  return (data || []).map(d => ({
    date: d.scored_at,
    score: d.overall_score,
    risk: d.risk_level,
  }))
}

// ============================================================
// Scoring functions (each returns 0-100)
// ============================================================

function scoreLogin(daysSince: number | null): number {
  if (daysSince === null) return 0 // Never logged in
  if (daysSince <= THRESHOLDS.login.healthy) return 100
  if (daysSince <= THRESHOLDS.login.watch) return 70
  if (daysSince <= THRESHOLDS.login.atRisk) return 40
  return 10
}

function scoreFeatureBreadth(pct: number): number {
  if (pct >= THRESHOLDS.featureBreadth.healthy) return 100
  if (pct >= THRESHOLDS.featureBreadth.watch) return 65
  if (pct >= THRESHOLDS.featureBreadth.atRisk) return 35
  return 10
}

function scoreEngagement(pct: number): number {
  if (pct >= THRESHOLDS.contactEngagement.healthy) return 100
  if (pct >= THRESHOLDS.contactEngagement.watch) return 65
  if (pct >= THRESHOLDS.contactEngagement.atRisk) return 35
  return 10
}

function scoreCampaignActivity(count: number): number {
  if (count >= 2) return 100
  if (count >= THRESHOLDS.campaignActivity.healthy) return 75
  return 20
}

function scoreDataFreshness(daysSince: number | null): number {
  if (daysSince === null) return 0
  if (daysSince <= THRESHOLDS.dataFreshness.healthy) return 100
  if (daysSince <= THRESHOLDS.dataFreshness.watch) return 60
  if (daysSince <= THRESHOLDS.dataFreshness.atRisk) return 30
  return 10
}

function scoreSupportSentiment(openTickets: number): number {
  if (openTickets <= THRESHOLDS.supportSentiment.healthy) return 100
  if (openTickets <= THRESHOLDS.supportSentiment.watch) return 65
  if (openTickets <= THRESHOLDS.supportSentiment.atRisk) return 35
  return 10
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'healthy'
  if (score >= 50) return 'watch'
  if (score >= 25) return 'at_risk'
  return 'critical'
}

async function calculateTrend(
  db: ReturnType<typeof supabaseAdmin>,
  accountId: string,
  currentScore: number
): Promise<Trend> {
  const { data } = await db
    .from('account_health_scores')
    .select('overall_score')
    .eq('account_id', accountId)
    .order('scored_at', { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return 'stable'
  const prevScore = data[0].overall_score
  const diff = currentScore - prevScore

  if (diff >= 5) return 'improving'
  if (diff <= -5) return 'declining'
  return 'stable'
}

// ============================================================
// Data fetching helpers
// ============================================================

async function getContactCount(
  db: ReturnType<typeof supabaseAdmin>,
  accountId: string
): Promise<number> {
  const { count } = await db
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
  return count || 0
}

async function getActiveCampaignCount(
  db: ReturnType<typeof supabaseAdmin>,
  accountId: string
): Promise<number> {
  const { count } = await db
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('status', 'active')
  return count || 0
}

async function getDaysSinceLastDataUpdate(
  db: ReturnType<typeof supabaseAdmin>,
  accountId: string
): Promise<number | null> {
  const { data } = await db
    .from('contacts')
    .select('updated_at')
    .eq('account_id', accountId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!data?.updated_at) return null
  const lastUpdate = new Date(data.updated_at)
  const now = new Date()
  return Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
}

async function getOpenTicketCount(
  db: ReturnType<typeof supabaseAdmin>,
  accountId: string
): Promise<number> {
  const { count } = await db
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .in('status', ['open', 'in_progress'])
  return count || 0
}

async function getAccountTier(
  db: ReturnType<typeof supabaseAdmin>,
  accountId: string
): Promise<{ subscription_tier: string } | null> {
  const { data } = await db
    .from('accounts')
    .select('subscription_tier')
    .eq('id', accountId)
    .single()
  return data
}

function getTierFeatureCount(tier: string): number {
  // Based on tier-gating system
  const featureCounts: Record<string, number> = {
    free: 5,
    starter: 10,
    professional: 15,
    business: 20,
    enterprise: 20,
  }
  return featureCounts[tier] || 10
}
