"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Check,
  Copy,
  Loader2,
  Sparkles,
  Shield,
  FileText,
  Package,
  Crown,
  Rocket,
  Zap,
  Star,
  Send,
} from 'lucide-react'

const INDUSTRIES = [
  'Retail',
  'Real Estate',
  'Restaurant',
  'Healthcare',
  'Agriculture',
  'Manufacturing',
  'Hotels & Hospitality',
  'Professional Services',
  'Logistics',
  'Education',
] as const

const BUSINESS_SIZES = [
  { value: 'micro', label: 'Micro (1-9 employees)' },
  { value: 'small', label: 'Small (10-49 employees)' },
  { value: 'medium', label: 'Medium (50-199 employees)' },
  { value: 'large', label: 'Large (200+ employees)' },
] as const

const TIERS = [
  { value: 'starter', label: 'Starter', price: '50,000', icon: Zap, color: 'text-blue-400' },
  { value: 'professional', label: 'Professional', price: '150,000', icon: Star, color: 'text-purple-400' },
  { value: 'business', label: 'Business', price: '300,000', icon: Crown, color: 'text-amber-400' },
  { value: 'enterprise', label: 'Enterprise', price: 'Custom', icon: Rocket, color: 'text-emerald-400' },
] as const

const PACKAGES = [
  { value: 'pkg1_reactivation', label: 'Package 1: Reactivation', price: '2,300,000', weeks: 12 },
  { value: 'pkg2_online_presence', label: 'Package 2: Online Presence', price: '3,200,000', weeks: 16 },
  { value: 'pkg3_growth_engine', label: 'Package 3: Growth Engine', price: '4,500,000', weeks: 20 },
  { value: 'full_programme', label: 'Full Programme', price: '8,500,000', weeks: 36 },
  { value: 'unicorn_programme', label: 'Unicorn Programme', price: '3,500,000', weeks: 8 },
] as const

const CAC_OPTIONS = [
  { value: 'provided', label: 'CAC Document Provided', description: 'Client has provided their CAC registration document' },
  { value: 'alternative_docs', label: 'Alternative Documentation', description: 'Client provided alternative business documentation (BN, tax ID, etc.)' },
  { value: 'm4e_provisioned', label: 'M4E Provisioned', description: 'M4E is handling the business registration on behalf of the client' },
] as const

const STEPS = [
  { label: 'Business Details', description: 'Basic information' },
  { label: 'Subscription', description: 'Tier and package' },
  { label: 'Industry Setup', description: 'Bundle selection' },
  { label: 'Review', description: 'Confirm and provision' },
  { label: 'Complete', description: 'Credentials ready' },
]

interface FormData {
  businessName: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  clientAddress: string
  industry: string
  businessSize: string
  subscriptionTier: string
  packageKey: string
  cacStatus: string
  cacDocumentUrl: string
  industryBundleId: string
  sendWelcomeEmail: boolean
}

interface ProvisionResult {
  accountId: string
  userId: string
  temporaryPassword: string
}

export default function NewClientWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ProvisionResult | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    businessName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    clientAddress: '',
    industry: '',
    businessSize: '',
    subscriptionTier: 'starter',
    packageKey: '',
    cacStatus: 'provided',
    cacDocumentUrl: '',
    industryBundleId: '',
    sendWelcomeEmail: true,
  })

  const updateForm = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return !!(form.businessName && form.ownerName && form.ownerEmail && form.industry)
      case 1:
        return !!(form.subscriptionTier && form.cacStatus)
      case 2:
        return true // Bundle is optional
      case 3:
        return true
      default:
        return false
    }
  }

  const handleProvision = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clients/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: form.businessName,
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          ownerPhone: form.ownerPhone || undefined,
          industry: form.industry,
          businessSize: form.businessSize || undefined,
          subscriptionTier: form.subscriptionTier,
          packageKey: form.packageKey || undefined,
          industryBundleId: form.industryBundleId || undefined,
          cacStatus: form.cacStatus,
          cacDocumentUrl: form.cacDocumentUrl || undefined,
          clientAddress: form.clientAddress || undefined,
          sendWelcomeEmail: form.sendWelcomeEmail,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Provisioning failed')
      }

      const data = await res.json()
      setResult(data)
      setStep(4)
      toast.success('Client provisioned successfully!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Provisioning failed')
    } finally {
      setLoading(false)
    }
  }

  const progressPercent = Math.round(((step + 1) / STEPS.length) * 100)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Provision New Client</h1>
          <p className="text-muted-foreground mt-1">Set up a new client account in the Business Growth Engine</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    i < step
                      ? 'bg-primary text-primary-foreground'
                      : i === step
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`hidden text-xs sm:block ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step 0: Business Details */}
        {step === 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Building2 className="h-5 w-5 text-primary" />
                Business Details
              </CardTitle>
              <CardDescription>Enter the client business and owner information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Business Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={form.businessName}
                      onChange={(e) => updateForm('businessName', e.target.value)}
                      placeholder="Acme Nigeria Ltd"
                      className="pl-10 bg-muted border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Owner Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={form.ownerName}
                      onChange={(e) => updateForm('ownerName', e.target.value)}
                      placeholder="John Doe"
                      className="pl-10 bg-muted border-border"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Owner Email <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={form.ownerEmail}
                      onChange={(e) => updateForm('ownerEmail', e.target.value)}
                      placeholder="john@acme.ng"
                      className="pl-10 bg-muted border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Owner Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={form.ownerPhone}
                      onChange={(e) => updateForm('ownerPhone', e.target.value)}
                      placeholder="+234 801 234 5678"
                      className="pl-10 bg-muted border-border"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Business Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={form.clientAddress}
                    onChange={(e) => updateForm('clientAddress', e.target.value)}
                    placeholder="123 Business Street, Lagos"
                    className="pl-10 bg-muted border-border"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Industry <span className="text-destructive">*</span></Label>
                  <select
                    value={form.industry}
                    onChange={(e) => updateForm('industry', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind.toLowerCase().replace(/[^a-z]/g, '_')}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Business Size</Label>
                  <select
                    value={form.businessSize}
                    onChange={(e) => updateForm('businessSize', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">Select size...</option>
                    {BUSINESS_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Subscription & Package */}
        {step === 1 && (
          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Crown className="h-5 w-5 text-amber-400" />
                  Subscription Tier
                </CardTitle>
                <CardDescription>Select the subscription tier for this client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {TIERS.map((tier) => {
                    const Icon = tier.icon
                    return (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => updateForm('subscriptionTier', tier.value)}
                        className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                          form.subscriptionTier === tier.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-muted hover:border-primary/50'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${tier.color}`} />
                        <div>
                          <p className="font-medium text-foreground">{tier.label}</p>
                          <p className="text-xs text-muted-foreground">N{tier.price}/mo</p>
                        </div>
                        {form.subscriptionTier === tier.value && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Package className="h-5 w-5 text-primary" />
                  Package (Optional)
                </CardTitle>
                <CardDescription>Assign a service package if applicable</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => updateForm('packageKey', '')}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      !form.packageKey ? 'border-primary bg-primary/10' : 'border-border bg-muted hover:border-primary/50'
                    }`}
                  >
                    <span className="text-sm text-foreground">No package (subscription only)</span>
                    {!form.packageKey && <Check className="ml-auto h-4 w-4 text-primary" />}
                  </button>
                  {PACKAGES.map((pkg) => (
                    <button
                      key={pkg.value}
                      type="button"
                      onClick={() => updateForm('packageKey', pkg.value)}
                      className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                        form.packageKey === pkg.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-muted hover:border-primary/50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{pkg.label}</p>
                        <p className="text-xs text-muted-foreground">{pkg.weeks} weeks</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">N{pkg.price}</span>
                        {form.packageKey === pkg.value && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  CAC Documentation
                </CardTitle>
                <CardDescription>Business registration status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {CAC_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateForm('cacStatus', opt.value)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                      form.cacStatus === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted hover:border-primary/50'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      form.cacStatus === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {form.cacStatus === opt.value && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </button>
                ))}
                {form.cacStatus === 'provided' && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-foreground">Document URL (optional)</Label>
                    <Input
                      value={form.cacDocumentUrl}
                      onChange={(e) => updateForm('cacDocumentUrl', e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="bg-muted border-border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Industry Setup */}
        {step === 2 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Sparkles className="h-5 w-5 text-primary" />
                Industry Bundle
              </CardTitle>
              <CardDescription>
                Optionally apply an industry-specific bundle to pre-configure pipelines, flows, and automations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Industry bundles automatically set up sales pipelines, automation flows, message templates,
                  and customer segments tailored to the selected industry. This can be applied later from the
                  client dashboard if not selected now.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Bundle ID (optional)</Label>
                <Input
                  value={form.industryBundleId}
                  onChange={(e) => updateForm('industryBundleId', e.target.value)}
                  placeholder="e.g. retail-sales, restaurant-order"
                  className="bg-muted border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to skip bundle application. The client can apply a bundle later.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Shield className="h-5 w-5 text-primary" />
                Review and Provision
              </CardTitle>
              <CardDescription>Confirm all details before creating the client account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Business</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Name: <span className="text-foreground">{form.businessName}</span></p>
                    <p className="text-muted-foreground">Industry: <span className="text-foreground">{form.industry}</span></p>
                    <p className="text-muted-foreground">Size: <span className="text-foreground">{form.businessSize || 'Not specified'}</span></p>
                    <p className="text-muted-foreground">Address: <span className="text-foreground">{form.clientAddress || 'Not provided'}</span></p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Owner</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Name: <span className="text-foreground">{form.ownerName}</span></p>
                    <p className="text-muted-foreground">Email: <span className="text-foreground">{form.ownerEmail}</span></p>
                    <p className="text-muted-foreground">Phone: <span className="text-foreground">{form.ownerPhone || 'Not provided'}</span></p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Tier: <Badge variant="outline">{form.subscriptionTier}</Badge></p>
                    <p className="text-muted-foreground">Package: <span className="text-foreground">{form.packageKey || 'None'}</span></p>
                    <p className="text-muted-foreground">CAC: <span className="text-foreground">{form.cacStatus}</span></p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Bundle: <span className="text-foreground">{form.industryBundleId || 'None'}</span></p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sendWelcomeEmail}
                    onChange={(e) => updateForm('sendWelcomeEmail', e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground flex items-center gap-1">
                    <Send className="h-3.5 w-3.5" />
                    Send welcome email with login credentials
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {step === 4 && result && (
          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <CardTitle className="text-foreground">Client Provisioned Successfully</CardTitle>
              <CardDescription>
                {form.businessName} is now set up in the Business Growth Engine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Login Credentials</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-mono text-foreground">{form.ownerEmail}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(form.ownerEmail, 'email')}
                  >
                    {copiedField === 'email' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Temporary Password</p>
                    <p className="text-sm font-mono text-foreground">{result.temporaryPassword}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(result.temporaryPassword, 'password')}
                  >
                    {copiedField === 'password' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {form.sendWelcomeEmail && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="text-sm text-emerald-300 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Welcome email sent to {form.ownerEmail}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/clients/${result.accountId}`)}
                  className="flex-1"
                >
                  View Client Details
                </Button>
                <Button
                  onClick={() => router.push('/admin/clients')}
                  className="flex-1"
                >
                  Back to Client List
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleProvision}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Provision Client
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
