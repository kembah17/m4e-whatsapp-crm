"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Zap,
  Shield,
  Crown,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  Receipt,
} from 'lucide-react'

interface BillingStatus {
  accountId: string
  tier: string
  status: string
  accessLevel: string
  isTrialing: boolean
  trialEndsAt: string | null
  daysUntilTrialEnd: number | null
  isInGracePeriod: boolean
  gracePeriodEndsAt: string | null
  daysUntilSuspension: number | null
  failedPaymentCount: number
  lastPaymentAt: string | null
  message: string
}

interface Subscription {
  id: string
  tier: string
  interval: string
  status: string
  amount_kobo: number
  current_period_start: string
  current_period_end: string
  trial_start: string | null
  trial_end: string | null
}

interface PackagePayment {
  id: string
  package_key: string
  package_name: string
  amount_kobo: number
  status: string
  paid_at: string | null
  created_at: string
}

interface BillingEvent {
  id: string
  event_type: string
  source: string
  amount_kobo: number | null
  description: string
  created_at: string
}

interface SubscriptionPlan {
  tier: string
  name: string
  interval: string
  amountNaira: number
  features: string[]
}

interface PackagePlan {
  key: string
  name: string
  amountNaira: number
  description: string
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'starter', name: 'Starter', interval: 'monthly', amountNaira: 50000,
    features: ['500 contacts', '2 team members', '1 pipeline', '4 campaigns', '500 broadcasts/mo'],
  },
  {
    tier: 'professional', name: 'Professional', interval: 'monthly', amountNaira: 120000,
    features: ['2,000 contacts', '5 team members', '3 pipelines', '10 campaigns', 'AI Chatbot'],
  },
  {
    tier: 'business', name: 'Business', interval: 'monthly', amountNaira: 250000,
    features: ['Unlimited contacts', 'Unlimited team', 'Unlimited pipelines', '14 campaigns', 'Full AI'],
  },
]

const PACKAGE_PLANS: PackagePlan[] = [
  { key: 'pkg1_reactivation', name: 'Customer Reactivation', amountNaira: 2000000, description: 'Reactivate dormant customers' },
  { key: 'pkg2_online_presence', name: 'Online Presence', amountNaira: 3500000, description: 'Build digital presence' },
  { key: 'pkg3_growth_engine', name: 'Growth Engine', amountNaira: 5000000, description: 'Active lead generation' },
  { key: 'full_programme', name: 'Complete Programme', amountNaira: 9000000, description: 'All packages combined' },
  { key: 'unicorn_programme', name: 'Unicorn Programme', amountNaira: 3000000, description: 'Strategic growth partnership' },
]

function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

const tierIcons: Record<string, typeof Zap> = {
  starter: Zap,
  professional: Shield,
  business: Crown,
  enterprise: Crown,
  free: CreditCard,
}

const tierColors: Record<string, string> = {
  starter: 'text-blue-400',
  professional: 'text-purple-400',
  business: 'text-amber-400',
  enterprise: 'text-amber-400',
  free: 'text-neutral-400',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  trial: 'bg-blue-500/20 text-blue-400',
  suspended: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-neutral-500/20 text-neutral-400',
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [packagePayments, setPackagePayments] = useState<PackagePayment[]>([])
  const [events, setEvents] = useState<BillingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'history'>('overview')

  const fetchBilling = useCallback(async () => {
    try {
      const resp = await fetch('/api/billing/status')
      if (resp.ok) {
        const data = await resp.json()
        setBilling(data.billing)
        setSubscription(data.subscription)
        setPackagePayments(data.packagePayments || [])
        setEvents(data.recentEvents || [])
      }
    } catch (err) {
      console.error('Failed to fetch billing:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBilling() }, [fetchBilling])

  const handleSubscribe = async (tier: string, interval: string) => {
    setActionLoading(`subscribe_${tier}_${interval}`)
    try {
      const resp = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval }),
      })
      const data = await resp.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      }
    } catch (err) {
      console.error('Subscribe error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePackageCheckout = async (packageKey: string) => {
    setActionLoading(`package_${packageKey}`)
    try {
      const resp = await fetch('/api/billing/package-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageKey }),
      })
      const data = await resp.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      }
    } catch (err) {
      console.error('Package checkout error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    setActionLoading('manage')
    try {
      const resp = await fetch('/api/billing/portal')
      const data = await resp.json()
      if (data.manage_url) {
        window.open(data.manage_url, '_blank')
      }
    } catch (err) {
      console.error('Manage error:', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-48" />
          <div className="h-48 bg-neutral-800 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-neutral-800 rounded" />)}
          </div>
        </div>
      </div>
    )
  }

  const currentTier = billing?.tier || 'free'
  const TierIcon = tierIcons[currentTier] || CreditCard

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
          <p className="text-neutral-400 mt-1">Manage your plan, payments, and billing history</p>
        </div>
        <button
          onClick={fetchBilling}
          className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 hover:text-white border border-neutral-700 rounded-lg hover:border-neutral-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Grace Period Warning */}
      {billing?.isInGracePeriod && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-400 font-medium">Payment Issue</p>
            <p className="text-red-300/80 text-sm mt-1">{billing.message}</p>
            <button
              onClick={handleManageSubscription}
              className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
            >
              Update payment method →
            </button>
          </div>
        </div>
      )}

      {/* Trial Banner */}
      {billing?.isTrialing && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-400 font-medium">Free Trial Active</p>
            <p className="text-blue-300/80 text-sm mt-1">
              {billing.daysUntilTrialEnd} days remaining. Your trial ends on{' '}
              {billing.trialEndsAt ? formatDate(billing.trialEndsAt) : 'N/A'}.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-neutral-800 ${tierColors[currentTier]}`}>
              <TierIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white capitalize">{currentTier} Plan</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[billing?.status || 'active']}`}>
                  {billing?.status || 'active'}
                </span>
              </div>
              <p className="text-neutral-400 text-sm mt-1">{billing?.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {subscription && (
              <button
                onClick={handleManageSubscription}
                disabled={actionLoading === 'manage'}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <ExternalLink className="w-4 h-4" />
                {actionLoading === 'manage' ? 'Loading...' : 'Manage Subscription'}
              </button>
            )}
          </div>
        </div>

        {/* Billing details */}
        {billing?.lastPaymentAt && (
          <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">Last Payment</p>
              <p className="text-sm text-white mt-1">{formatDate(billing.lastPaymentAt)}</p>
            </div>
            {subscription?.current_period_end && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Next Billing</p>
                <p className="text-sm text-white mt-1">{formatDate(subscription.current_period_end)}</p>
              </div>
            )}
            {subscription && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Billing Cycle</p>
                <p className="text-sm text-white mt-1 capitalize">{subscription.interval}</p>
              </div>
            )}
            {subscription && (
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-wider">Amount</p>
                <p className="text-sm text-white mt-1">{formatNaira(subscription.amount_kobo / 100)}/{subscription.interval === 'annually' ? 'yr' : 'mo'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-900 p-1 rounded-lg w-fit">
        {(['overview', 'packages', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-md transition-colors capitalize ${
              activeTab === tab
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {tab === 'overview' ? 'Subscription Plans' : tab === 'packages' ? 'Project Packages' : 'Billing History'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUBSCRIPTION_PLANS.map(plan => {
            const isCurrentPlan = currentTier === plan.tier
            const PlanIcon = tierIcons[plan.tier] || Zap
            return (
              <div
                key={plan.tier}
                className={`bg-neutral-900 border rounded-xl p-6 transition-colors ${
                  isCurrentPlan ? 'border-amber-500/50' : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <PlanIcon className={`w-5 h-5 ${tierColors[plan.tier]}`} />
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">{formatNaira(plan.amountNaira)}</span>
                  <span className="text-neutral-400 text-sm">/month</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-neutral-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrentPlan ? (
                  <div className="text-center py-2 text-sm text-amber-400 font-medium">Current Plan</div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSubscribe(plan.tier, 'monthly')}
                      disabled={!!actionLoading}
                      className="w-full py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === `subscribe_${plan.tier}_monthly` ? 'Processing...' : 'Subscribe Monthly'}
                    </button>
                    <button
                      onClick={() => handleSubscribe(plan.tier, 'annually')}
                      disabled={!!actionLoading}
                      className="w-full py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === `subscribe_${plan.tier}_annually` ? 'Processing...' : 'Annual (Save 17%)'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'packages' && (
        <div className="space-y-4">
          <p className="text-neutral-400 text-sm">One-time project packages for comprehensive business growth</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PACKAGE_PLANS.map(pkg => {
              const isPaid = packagePayments.some(p => p.package_key === pkg.key && p.status === 'success')
              return (
                <div key={pkg.key} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">{pkg.name}</h3>
                  </div>
                  <p className="text-neutral-400 text-sm mb-4">{pkg.description}</p>
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-white">{formatNaira(pkg.amountNaira)}</span>
                    {pkg.key === 'unicorn_programme' && (
                      <span className="text-neutral-400 text-xs ml-1">+ 10-20% revenue share</span>
                    )}
                  </div>
                  {isPaid ? (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" /> Purchased
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePackageCheckout(pkg.key)}
                      disabled={!!actionLoading}
                      className="w-full py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      {actionLoading === `package_${pkg.key}` ? 'Processing...' : 'Purchase'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Package Payments */}
          {packagePayments.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-800">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <Receipt className="w-4 h-4" /> Package Payments
                </h3>
              </div>
              <div className="divide-y divide-neutral-800">
                {packagePayments.map(payment => (
                  <div key={payment.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">{payment.package_name}</p>
                      <p className="text-neutral-500 text-xs">
                        {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white text-sm font-medium">
                        {formatNaira(payment.amount_kobo / 100)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        payment.status === 'success' ? 'bg-green-500/20 text-green-400' :
                        payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Billing Events */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Billing Events
              </h3>
            </div>
            {events.length === 0 ? (
              <div className="px-6 py-8 text-center text-neutral-500">
                No billing events yet
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {events.map(event => (
                  <div key={event.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {event.event_type.includes('success') || event.event_type.includes('created') ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : event.event_type.includes('failed') ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-neutral-400" />
                      )}
                      <div>
                        <p className="text-white text-sm">{event.description}</p>
                        <p className="text-neutral-500 text-xs">{formatDate(event.created_at)}</p>
                      </div>
                    </div>
                    {event.amount_kobo && (
                      <span className="text-white text-sm">{formatNaira(event.amount_kobo / 100)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
