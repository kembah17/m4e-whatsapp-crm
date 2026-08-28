// M4E Billing Plans
// Subscription tiers and package pricing

export type BillingInterval = 'monthly' | 'annually'
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'business' | 'enterprise'
export type PackageKey = 'pkg1_reactivation' | 'pkg2_online_presence' | 'pkg3_growth_engine' | 'full_programme' | 'unicorn_programme'

export interface SubscriptionPlan {
  tier: SubscriptionTier
  name: string
  interval: BillingInterval
  amountKobo: number
  amountNaira: number
  planCode: string
  features: string[]
}

export interface PackagePlan {
  key: PackageKey
  name: string
  amountKobo: number
  amountNaira: number
  description: string
  durationWeeks: number
}

// ============================================================
// Subscription Plans
// ============================================================
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  // Monthly plans
  {
    tier: 'starter',
    name: 'Starter Monthly',
    interval: 'monthly',
    amountKobo: 5_000_000, // ₦50,000
    amountNaira: 50_000,
    planCode: 'PLN_7mqau443r72w43s',
    features: [
      'Up to 500 contacts',
      '2 team members',
      '1 pipeline',
      '4 campaigns',
      '500 broadcasts/month',
      '20 invoices/month',
    ],
  },
  {
    tier: 'professional',
    name: 'Professional Monthly',
    interval: 'monthly',
    amountKobo: 12_000_000, // ₦120,000
    amountNaira: 120_000,
    planCode: 'PLN_nl2ntxoj6ofrtvg',
    features: [
      'Up to 2,000 contacts',
      '5 team members',
      '3 pipelines',
      '10 campaigns',
      '2,000 broadcasts/month',
      '100 invoices/month',
      '3 WhatsApp Flows',
      'AI Chatbot (100 msgs/month)',
    ],
  },
  {
    tier: 'business',
    name: 'Business Monthly',
    interval: 'monthly',
    amountKobo: 25_000_000, // ₦250,000
    amountNaira: 250_000,
    planCode: 'PLN_qxo2noiylntv80o',
    features: [
      'Unlimited contacts',
      'Unlimited team members',
      'Unlimited pipelines',
      '14 campaigns',
      '10,000 broadcasts/month',
      '500 invoices/month',
      'Unlimited WhatsApp Flows',
      'Unlimited AI Chatbot',
    ],
  },
  // Annual plans (2 months free = 10 months price)
  {
    tier: 'starter',
    name: 'Starter Annual',
    interval: 'annually',
    amountKobo: 50_000_000, // ₦500,000 (save ₦100,000)
    amountNaira: 500_000,
    planCode: 'PLN_4u2awqqx1v2f3xz',
    features: [
      'Everything in Starter Monthly',
      'Save ₦100,000/year (2 months free)',
    ],
  },
  {
    tier: 'professional',
    name: 'Professional Annual',
    interval: 'annually',
    amountKobo: 120_000_000, // ₦1,200,000 (save ₦240,000)
    amountNaira: 1_200_000,
    planCode: 'PLN_rujw8hvhsbhgat3',
    features: [
      'Everything in Professional Monthly',
      'Save ₦240,000/year (2 months free)',
    ],
  },
  {
    tier: 'business',
    name: 'Business Annual',
    interval: 'annually',
    amountKobo: 250_000_000, // ₦2,500,000 (save ₦500,000)
    amountNaira: 2_500_000,
    planCode: 'PLN_yifej6vkv53w1dp',
    features: [
      'Everything in Business Monthly',
      'Save ₦500,000/year (2 months free)',
    ],
  },
]

// ============================================================
// Package Plans (one-time payments)
// ============================================================
export const PACKAGE_PLANS: PackagePlan[] = [
  {
    key: 'pkg1_reactivation',
    name: 'Customer Reactivation',
    amountKobo: 200_000_000, // ₦2,000,000
    amountNaira: 2_000_000,
    description: 'Reactivate dormant customers using WhatsApp, email, and SMS campaigns',
    durationWeeks: 8,
  },
  {
    key: 'pkg2_online_presence',
    name: 'Online Presence',
    amountKobo: 350_000_000, // ₦3,500,000
    amountNaira: 3_500_000,
    description: 'Build professional digital presence with website, SEO, and social media',
    durationWeeks: 10,
  },
  {
    key: 'pkg3_growth_engine',
    name: 'Growth Engine',
    amountKobo: 500_000_000, // ₦5,000,000
    amountNaira: 5_000_000,
    description: 'Active lead generation with paid ads, funnels, and conversion optimisation',
    durationWeeks: 12,
  },
  {
    key: 'full_programme',
    name: 'Complete Programme',
    amountKobo: 900_000_000, // ₦9,000,000
    amountNaira: 9_000_000,
    description: 'All three packages combined for comprehensive business growth',
    durationWeeks: 16,
  },
  {
    key: 'unicorn_programme',
    name: 'Unicorn Programme',
    amountKobo: 300_000_000, // ₦3,000,000 base fee
    amountNaira: 3_000_000,
    description: 'Strategic growth partnership with performance-based pricing (+ 10-20% revenue share)',
    durationWeeks: 16,
  },
]

// ============================================================
// Helper functions
// ============================================================
export function getSubscriptionPlan(tier: SubscriptionTier, interval: BillingInterval): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(p => p.tier === tier && p.interval === interval)
}

export function getPackagePlan(key: PackageKey): PackagePlan | undefined {
  return PACKAGE_PLANS.find(p => p.key === key)
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Trial configuration
export const TRIAL_DURATION_DAYS = 45
export const GRACE_PERIOD_DAYS = 3
export const READ_ONLY_DAYS = 7
export const SUSPEND_AFTER_DAYS = GRACE_PERIOD_DAYS + READ_ONLY_DAYS // 10 days total
