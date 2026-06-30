// ============================================================
// Automation Recommender — tier-based feature recommendations
// ============================================================

export type Tier = 'starter' | 'professional' | 'business'
export type Impact = 'high' | 'medium' | 'low'
export type Effort = 'easy' | 'moderate' | 'advanced'
export type RecommendationCategory = 'messaging' | 'automation' | 'analytics' | 'engagement' | 'ai'

export interface AutomationRecommendation {
  id: string
  title: string
  description: string
  category: RecommendationCategory
  tier: Tier
  impact: Impact
  effort: Effort
  /** Route to navigate to for setup, or null if not yet available */
  setupRoute: string | null
  /** Whether this is currently active for the account */
  isActive?: boolean
}

export const RECOMMENDATIONS: AutomationRecommendation[] = [
  // ---- Starter tier ----
  {
    id: 'rec-welcome',
    title: 'Welcome Message Automation',
    description: 'Automatically greet new contacts with a personalized welcome message when they first reach out.',
    category: 'messaging',
    tier: 'starter',
    impact: 'high',
    effort: 'easy',
    setupRoute: '/automations',
  },
  {
    id: 'rec-hours',
    title: 'Business Hours Auto-Reply',
    description: 'Set up automatic responses outside business hours so customers know when to expect a reply.',
    category: 'messaging',
    tier: 'starter',
    impact: 'high',
    effort: 'easy',
    setupRoute: '/automations',
  },
  {
    id: 'rec-faq',
    title: 'Basic FAQ Bot',
    description: 'Create keyword-triggered responses for your most common questions to reduce response time.',
    category: 'automation',
    tier: 'starter',
    impact: 'medium',
    effort: 'easy',
    setupRoute: '/automations',
  },
  {
    id: 'rec-thankyou',
    title: 'Thank You Message',
    description: 'Send an automatic thank-you after a deal is closed to build customer loyalty.',
    category: 'messaging',
    tier: 'starter',
    impact: 'medium',
    effort: 'easy',
    setupRoute: '/automations',
  },
  {
    id: 'rec-quickreplies',
    title: 'Quick Reply Templates',
    description: 'Set up industry-specific quick replies to speed up agent response times by 60%.',
    category: 'messaging',
    tier: 'starter',
    impact: 'high',
    effort: 'easy',
    setupRoute: '/settings?tab=quick-replies',
  },

  // ---- Professional tier ----
  {
    id: 'rec-winback',
    title: 'Win-Back Campaigns',
    description: 'Automatically reach out to inactive customers with personalized offers to bring them back.',
    category: 'engagement',
    tier: 'professional',
    impact: 'high',
    effort: 'moderate',
    setupRoute: '/campaigns',
  },
  {
    id: 'rec-birthday',
    title: 'Birthday Campaigns',
    description: 'Send automated birthday wishes with special offers to delight customers and drive sales.',
    category: 'engagement',
    tier: 'professional',
    impact: 'medium',
    effort: 'easy',
    setupRoute: '/campaigns',
  },
  {
    id: 'rec-abandoned',
    title: 'Abandoned Cart Recovery',
    description: 'Recover lost sales by automatically messaging customers who left items in their cart.',
    category: 'automation',
    tier: 'professional',
    impact: 'high',
    effort: 'moderate',
    setupRoute: '/campaigns',
  },
  {
    id: 'rec-reviews',
    title: 'Review Collection',
    description: 'Automatically request reviews after successful transactions to build social proof.',
    category: 'engagement',
    tier: 'professional',
    impact: 'medium',
    effort: 'easy',
    setupRoute: '/campaigns',
  },
  {
    id: 'rec-followup',
    title: 'Follow-Up Reminders',
    description: 'Set automatic follow-up reminders for conversations that go quiet after 24/48/72 hours.',
    category: 'automation',
    tier: 'professional',
    impact: 'high',
    effort: 'moderate',
    setupRoute: '/automations',
  },

  // ---- Business tier ----
  {
    id: 'rec-aichatbot',
    title: 'AI Chatbot',
    description: 'Deploy an AI-powered chatbot that handles common inquiries 24/7 with human handoff for complex issues.',
    category: 'ai',
    tier: 'business',
    impact: 'high',
    effort: 'advanced',
    setupRoute: '/chatbot',
  },
  {
    id: 'rec-sentiment',
    title: 'Sentiment Analysis',
    description: 'Automatically detect unhappy customers and escalate negative conversations to senior agents.',
    category: 'ai',
    tier: 'business',
    impact: 'high',
    effort: 'moderate',
    setupRoute: '/sentiment',
  },
  {
    id: 'rec-segmentation',
    title: 'Advanced Segmentation',
    description: 'Use recency scoring and behavioral data to create dynamic customer segments for targeted campaigns.',
    category: 'analytics',
    tier: 'business',
    impact: 'high',
    effort: 'moderate',
    setupRoute: '/settings?tab=recency',
  },
  {
    id: 'rec-ctwa-nurture',
    title: 'CTWA Lead Nurture',
    description: 'Automatically nurture leads from Click-to-WhatsApp ads with a multi-step engagement sequence.',
    category: 'engagement',
    tier: 'business',
    impact: 'high',
    effort: 'moderate',
    setupRoute: '/ad-leads',
  },
  {
    id: 'rec-bulktag',
    title: 'AI Bulk Tagging',
    description: 'Use AI to automatically suggest and apply tags to contacts based on conversation history and behavior.',
    category: 'ai',
    tier: 'business',
    impact: 'medium',
    effort: 'easy',
    setupRoute: '/contacts',
  },
  {
    id: 'rec-predictive',
    title: 'Predictive Analytics',
    description: 'Predict which customers are likely to churn and proactively engage them before they leave.',
    category: 'analytics',
    tier: 'business',
    impact: 'high',
    effort: 'advanced',
    setupRoute: null,
  },
]

const TIER_ORDER: Record<Tier, number> = { starter: 0, professional: 1, business: 2 }
const IMPACT_ORDER: Record<Impact, number> = { high: 0, medium: 1, low: 2 }

/** Get recommendations for an account, sorted by impact */
export function getRecommendations(opts?: {
  currentTier?: Tier
  category?: RecommendationCategory
  limit?: number
  activeIds?: string[]
}): AutomationRecommendation[] {
  let recs = [...RECOMMENDATIONS]

  // Mark active ones
  if (opts?.activeIds) {
    const activeSet = new Set(opts.activeIds)
    recs = recs.map((r) => ({ ...r, isActive: activeSet.has(r.id) }))
  }

  // Filter by category
  if (opts?.category) {
    recs = recs.filter((r) => r.category === opts.category)
  }

  // Sort: inactive first, then by impact, then by tier proximity
  const currentTierOrder = TIER_ORDER[opts?.currentTier || 'starter']
  recs.sort((a, b) => {
    // Active items go to the end
    if (a.isActive !== b.isActive) return a.isActive ? 1 : -1
    // Higher impact first
    if (IMPACT_ORDER[a.impact] !== IMPACT_ORDER[b.impact]) {
      return IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]
    }
    // Closer tier first
    const aDist = Math.abs(TIER_ORDER[a.tier] - currentTierOrder)
    const bDist = Math.abs(TIER_ORDER[b.tier] - currentTierOrder)
    return aDist - bDist
  })

  if (opts?.limit) recs = recs.slice(0, opts.limit)
  return recs
}

/** Check if a recommendation requires a higher tier */
export function requiresUpgrade(rec: AutomationRecommendation, currentTier: Tier): boolean {
  return TIER_ORDER[rec.tier] > TIER_ORDER[currentTier]
}

/** Get progress stats */
export function getProgress(activeIds: string[], currentTier: Tier) {
  const available = RECOMMENDATIONS.filter((r) => TIER_ORDER[r.tier] <= TIER_ORDER[currentTier])
  const active = available.filter((r) => activeIds.includes(r.id))
  return {
    active: active.length,
    total: available.length,
    percentage: available.length > 0 ? Math.round((active.length / available.length) * 100) : 0,
  }
}
