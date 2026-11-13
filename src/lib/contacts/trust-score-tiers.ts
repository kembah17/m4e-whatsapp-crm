// Trust Score Eligibility Engine
// Tier-based classification with actionable recommendations

export type TrustTier = 'champion' | 'growing' | 'developing' | 'new_at_risk'

export interface TrustTierInfo {
  tier: TrustTier
  label: string
  emoji: string
  minScore: number
  maxScore: number
  color: string        // Tailwind text color
  bgColor: string      // Tailwind bg + border
  badgeColor: string   // For Badge component
  description: string
}

export interface EligibilityRecommendation {
  id: string
  category: 'credit' | 'referral' | 'rewards' | 'engagement' | 'risk'
  title: string
  description: string
  tier: TrustTier      // Minimum tier required
  automatable: boolean  // Can Agent Zero automate this?
  automationDescription?: string
  icon: string          // Lucide icon name
  priority: 'high' | 'medium' | 'low'
}

// ============================================================
// Tier Definitions
// ============================================================

export const TRUST_TIERS: TrustTierInfo[] = [
  {
    tier: 'champion',
    label: 'Champion',
    emoji: '🏆',
    minScore: 85,
    maxScore: 100,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30',
    badgeColor: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
    description: 'Top-tier customer. Reliable, high-value, and brand advocate.',
  },
  {
    tier: 'growing',
    label: 'Growing',
    emoji: '📈',
    minScore: 60,
    maxScore: 84,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    badgeColor: 'border-blue-500/50 text-blue-400 bg-blue-500/10',
    description: 'Positive trajectory. Building trust through consistent engagement.',
  },
  {
    tier: 'developing',
    label: 'Developing',
    emoji: '🌱',
    minScore: 35,
    maxScore: 59,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    badgeColor: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
    description: 'Early relationship. Needs nurturing and consistent follow-up.',
  },
  {
    tier: 'new_at_risk',
    label: 'New / At Risk',
    emoji: '⚠️',
    minScore: 0,
    maxScore: 34,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30',
    badgeColor: 'border-red-500/50 text-red-400 bg-red-500/10',
    description: 'New contact or declining trust. Requires attention and re-engagement.',
  },
]

// ============================================================
// Eligibility Recommendations
// ============================================================

export const ELIGIBILITY_RECOMMENDATIONS: EligibilityRecommendation[] = [
  // Credit Eligibility
  {
    id: 'credit_full',
    category: 'credit',
    title: 'Full Credit Terms',
    description: 'Eligible for full credit/invoice terms (Net 30-60). Low default risk.',
    tier: 'champion',
    automatable: true,
    automationDescription: 'Auto-approve credit applications and set credit limits based on order history.',
    icon: 'CreditCard',
    priority: 'high',
  },
  {
    id: 'credit_limited',
    category: 'credit',
    title: 'Limited Credit',
    description: 'Eligible for limited credit terms (Net 15). Monitor payment patterns.',
    tier: 'growing',
    automatable: true,
    automationDescription: 'Auto-approve small credit amounts with payment reminders.',
    icon: 'CreditCard',
    priority: 'medium',
  },
  {
    id: 'credit_prepay',
    category: 'credit',
    title: 'Prepayment Only',
    description: 'Not yet eligible for credit. Require prepayment or cash on delivery.',
    tier: 'developing',
    automatable: false,
    icon: 'Banknote',
    priority: 'low',
  },
  // Referral Eligibility
  {
    id: 'referral_ambassador',
    category: 'referral',
    title: 'Brand Ambassador',
    description: 'Ideal candidate for referral program. High advocacy potential.',
    tier: 'champion',
    automatable: true,
    automationDescription: 'Auto-enroll in referral program and send ambassador kit via WhatsApp.',
    icon: 'Megaphone',
    priority: 'high',
  },
  {
    id: 'referral_program',
    category: 'referral',
    title: 'Referral Program',
    description: 'Good candidate for standard referral incentives.',
    tier: 'growing',
    automatable: true,
    automationDescription: 'Send referral link and track conversions automatically.',
    icon: 'Users',
    priority: 'medium',
  },
  {
    id: 'referral_testimonial',
    category: 'referral',
    title: 'Testimonial Request',
    description: 'Request a review or testimonial to build social proof.',
    tier: 'growing',
    automatable: true,
    automationDescription: 'Send satisfaction-gated review request via WhatsApp.',
    icon: 'MessageSquareQuote',
    priority: 'medium',
  },
  // Rewards Eligibility
  {
    id: 'rewards_vip',
    category: 'rewards',
    title: 'VIP Rewards',
    description: 'Eligible for VIP tier: exclusive discounts, early access, priority support.',
    tier: 'champion',
    automatable: true,
    automationDescription: 'Auto-upgrade loyalty tier and send VIP welcome message.',
    icon: 'Crown',
    priority: 'high',
  },
  {
    id: 'rewards_loyalty',
    category: 'rewards',
    title: 'Loyalty Points',
    description: 'Eligible for loyalty point accumulation and standard rewards.',
    tier: 'growing',
    automatable: true,
    automationDescription: 'Auto-credit loyalty points on purchases.',
    icon: 'Star',
    priority: 'medium',
  },
  {
    id: 'rewards_welcome',
    category: 'rewards',
    title: 'Welcome Offer',
    description: 'Send a welcome discount to encourage first/repeat purchase.',
    tier: 'developing',
    automatable: true,
    automationDescription: 'Auto-send welcome offer template via WhatsApp.',
    icon: 'Gift',
    priority: 'medium',
  },
  // Engagement Actions
  {
    id: 'engage_upsell',
    category: 'engagement',
    title: 'Upsell Opportunity',
    description: 'High receptivity to premium products/services. Recommend upgrades.',
    tier: 'champion',
    automatable: true,
    automationDescription: 'Send personalized product recommendations via WhatsApp.',
    icon: 'TrendingUp',
    priority: 'medium',
  },
  {
    id: 'engage_nurture',
    category: 'engagement',
    title: 'Nurture Sequence',
    description: 'Enroll in educational content sequence to build relationship.',
    tier: 'developing',
    automatable: true,
    automationDescription: 'Auto-enroll in drip campaign with value-first content.',
    icon: 'BookOpen',
    priority: 'medium',
  },
  // Risk Actions
  {
    id: 'risk_reactivation',
    category: 'risk',
    title: 'Reactivation Campaign',
    description: 'At risk of churning. Send win-back offer immediately.',
    tier: 'new_at_risk',
    automatable: true,
    automationDescription: 'Auto-trigger reactivation template with special offer.',
    icon: 'AlertTriangle',
    priority: 'high',
  },
  {
    id: 'risk_review',
    category: 'risk',
    title: 'Manual Review',
    description: 'Flag for manual review. Check for disputes, complaints, or payment issues.',
    tier: 'new_at_risk',
    automatable: false,
    icon: 'Eye',
    priority: 'high',
  },
]

// ============================================================
// Helper Functions
// ============================================================

export function getTrustTier(score: number | null | undefined): TrustTierInfo {
  if (score == null) return TRUST_TIERS[3] // Default to new_at_risk
  for (const tier of TRUST_TIERS) {
    if (score >= tier.minScore && score <= tier.maxScore) return tier
  }
  return TRUST_TIERS[3]
}

export function getEligibleRecommendations(
  score: number | null | undefined
): EligibilityRecommendation[] {
  const tier = getTrustTier(score)
  const tierOrder: TrustTier[] = ['champion', 'growing', 'developing', 'new_at_risk']
  const tierIndex = tierOrder.indexOf(tier.tier)

  return ELIGIBILITY_RECOMMENDATIONS.filter((rec) => {
    const recTierIndex = tierOrder.indexOf(rec.tier)
    return recTierIndex >= tierIndex // Show recommendations for this tier and below
  })
}

export function getTopRecommendations(
  score: number | null | undefined,
  limit = 4
): EligibilityRecommendation[] {
  const eligible = getEligibleRecommendations(score)
  // Sort by priority (high first), then by automatable (automatable first)
  return eligible
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pDiff !== 0) return pDiff
      return (b.automatable ? 1 : 0) - (a.automatable ? 1 : 0)
    })
    .slice(0, limit)
}

export function getTierDistributionColors(): Record<TrustTier, string> {
  return {
    champion: '#10b981',  // emerald-500
    growing: '#3b82f6',   // blue-500
    developing: '#f59e0b', // amber-500
    new_at_risk: '#ef4444', // red-500
  }
}
