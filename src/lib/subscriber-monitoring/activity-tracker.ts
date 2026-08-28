import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

// Event categories for tracking
export const EVENT_CATEGORIES = {
  navigation: 'navigation',
  feature_use: 'feature_use',
  data_action: 'data_action',
  communication: 'communication',
  campaign: 'campaign',
  settings: 'settings',
  billing: 'billing',
  support: 'support',
} as const

export type EventCategory = typeof EVENT_CATEGORIES[keyof typeof EVENT_CATEGORIES]

// Feature map for breadth tracking
export const TRACKABLE_FEATURES = [
  'contacts', 'campaigns', 'automations', 'pipelines', 'invoices',
  'broadcasts', 'templates', 'segments', 'whatsapp_flows', 'ai_chatbot',
  'analytics', 'products', 'inventory', 'loyalty', 'referrals',
  'debt_book', 'qr_codes', 'sentiment', 'support_desk', 'data_center',
] as const

export type TrackableFeature = typeof TRACKABLE_FEATURES[number]

// Map page paths to features
const PAGE_FEATURE_MAP: Record<string, TrackableFeature> = {
  '/contacts': 'contacts',
  '/campaigns': 'campaigns',
  '/automations': 'automations',
  '/pipelines': 'pipelines',
  '/invoices': 'invoices',
  '/broadcasts': 'broadcasts',
  '/templates': 'templates',
  '/segments': 'segments',
  '/whatsapp-flows': 'whatsapp_flows',
  '/ai-playground': 'ai_chatbot',
  '/insights': 'analytics',
  '/products': 'products',
  '/inventory': 'inventory',
  '/loyalty': 'loyalty',
  '/referrals': 'referrals',
  '/debt-book': 'debt_book',
  '/qr-codes': 'qr_codes',
  '/sentiment': 'sentiment',
  '/support': 'support_desk',
  '/data-center': 'data_center',
}

export interface ActivityEvent {
  accountId: string
  userId?: string
  eventType: string
  eventCategory: EventCategory
  pagePath?: string
  featureUsed?: string
  metadata?: Record<string, unknown>
  sessionId?: string
}

/**
 * Track a user activity event (fire-and-forget)
 */
export async function trackActivity(event: ActivityEvent): Promise<void> {
  try {
    const db = supabaseAdmin()
    await db.from('activity_events').insert({
      account_id: event.accountId,
      user_id: event.userId || null,
      event_type: event.eventType,
      event_category: event.eventCategory,
      page_path: event.pagePath || null,
      feature_used: event.featureUsed || resolveFeature(event.pagePath),
      metadata: event.metadata || {},
      session_id: event.sessionId || null,
    })
  } catch (err) {
    // Fire-and-forget: log but don't throw
    console.error('[ActivityTracker] Failed to track event:', err)
  }
}

/**
 * Track a page view
 */
export async function trackPageView(
  accountId: string,
  userId: string,
  pagePath: string,
  sessionId?: string
): Promise<void> {
  await trackActivity({
    accountId,
    userId,
    eventType: 'page_view',
    eventCategory: 'navigation',
    pagePath,
    sessionId,
  })
}

/**
 * Track a feature action (create, update, delete)
 */
export async function trackFeatureAction(
  accountId: string,
  userId: string,
  feature: TrackableFeature,
  action: 'create' | 'update' | 'delete' | 'view' | 'export',
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackActivity({
    accountId,
    userId,
    eventType: `${feature}_${action}`,
    eventCategory: 'feature_use',
    featureUsed: feature,
    metadata,
  })
}

/**
 * Track a login event
 */
export async function trackLogin(
  accountId: string,
  userId: string
): Promise<void> {
  await trackActivity({
    accountId,
    userId,
    eventType: 'login',
    eventCategory: 'navigation',
  })
}

/**
 * Track a message sent (WhatsApp, email, SMS)
 */
export async function trackMessageSent(
  accountId: string,
  userId: string,
  channel: 'whatsapp' | 'email' | 'sms',
  metadata?: Record<string, unknown>
): Promise<void> {
  await trackActivity({
    accountId,
    userId,
    eventType: `message_sent_${channel}`,
    eventCategory: 'communication',
    metadata,
  })
}

/**
 * Get activity summary for an account
 */
export async function getActivitySummary(
  accountId: string,
  days: number = 30
): Promise<{
  totalEvents: number
  uniqueFeatures: string[]
  uniquePages: string[]
  loginCount: number
  messagesSent: number
  lastActivity: string | null
  dailyActivity: { date: string; count: number }[]
}> {
  const db = supabaseAdmin()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: events } = await db
    .from('activity_events')
    .select('event_type, event_category, feature_used, page_path, created_at')
    .eq('account_id', accountId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (!events || events.length === 0) {
    return {
      totalEvents: 0,
      uniqueFeatures: [],
      uniquePages: [],
      loginCount: 0,
      messagesSent: 0,
      lastActivity: null,
      dailyActivity: [],
    }
  }

  const features = new Set<string>()
  const pages = new Set<string>()
  let loginCount = 0
  let messagesSent = 0
  const dailyMap = new Map<string, number>()

  for (const e of events) {
    if (e.feature_used) features.add(e.feature_used)
    if (e.page_path) pages.add(e.page_path)
    if (e.event_type === 'login') loginCount++
    if (e.event_type?.startsWith('message_sent_')) messagesSent++

    const day = e.created_at?.substring(0, 10) || ''
    if (day) dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
  }

  return {
    totalEvents: events.length,
    uniqueFeatures: Array.from(features),
    uniquePages: Array.from(pages),
    loginCount,
    messagesSent,
    lastActivity: events[0]?.created_at || null,
    dailyActivity: Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

/**
 * Get days since last login for an account
 */
export async function getDaysSinceLastLogin(accountId: string): Promise<number | null> {
  const db = supabaseAdmin()
  const { data } = await db
    .from('activity_events')
    .select('created_at')
    .eq('account_id', accountId)
    .eq('event_type', 'login')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data?.created_at) return null
  const lastLogin = new Date(data.created_at)
  const now = new Date()
  return Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get features used in last N days
 */
export async function getFeaturesUsed(
  accountId: string,
  days: number = 30
): Promise<string[]> {
  const db = supabaseAdmin()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await db
    .from('activity_events')
    .select('feature_used')
    .eq('account_id', accountId)
    .not('feature_used', 'is', null)
    .gte('created_at', since.toISOString())

  if (!data) return []
  return [...new Set(data.map(e => e.feature_used).filter(Boolean))] as string[]
}

/**
 * Resolve page path to feature name
 */
function resolveFeature(pagePath?: string): string | null {
  if (!pagePath) return null
  // Match exact or prefix
  for (const [path, feature] of Object.entries(PAGE_FEATURE_MAP)) {
    if (pagePath === path || pagePath.startsWith(path + '/')) {
      return feature
    }
  }
  return null
}

/**
 * Cleanup old activity events (called by cron)
 */
export async function cleanupOldEvents(): Promise<number> {
  const db = supabaseAdmin()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const { data } = await db
    .from('activity_events')
    .delete()
    .lt('created_at', cutoff.toISOString())
    .select('id')

  return data?.length || 0
}
