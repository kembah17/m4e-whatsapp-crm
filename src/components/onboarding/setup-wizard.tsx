"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Building2,
  Users,
  Globe,
  MessageSquare,
  UserPlus,
  Upload,
  Zap,
  Clock,
  PartyPopper,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Smartphone,
  Settings,
  Sparkles,
  Gift,
  Heart,
  SkipForward,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OnboardingState {
  onboarding_completed: boolean
  onboarding_step: number
  onboarding_data: Record<string, unknown>
  industry: string | null
  business_size: string | null
  country: string | null
}

interface StepData {
  // Step 1
  business_name?: string
  industry?: string
  business_size?: string
  country?: string
  // Step 2
  whatsapp_setup?: "embedded" | "manual" | "skipped"
  phone_number_id?: string
  access_token?: string
  // Step 3
  contact_method?: "manual" | "csv" | "skipped"
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  // Step 4
  ai_chatbot_enabled?: boolean
  business_hours_preset?: string
  first_campaign?: string
}

const INDUSTRIES = [
  "Retail",
  "Restaurant",
  "Healthcare",
  "Real Estate",
  "Fashion",
  "Beauty",
  "Education",
  "Professional Services",
  "Other",
] as const

const BUSINESS_SIZES = [
  { value: "solo", label: "Solo" },
  { value: "2-10", label: "2-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "200+", label: "200+ employees" },
] as const

const COUNTRIES = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United Kingdom",
  "United States",
  "Other",
] as const

const CAMPAIGN_TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome Campaign",
    description: "Greet new customers and introduce your business",
    icon: Gift,
    color: "text-emerald-400",
  },
  {
    id: "win-back",
    name: "Win-Back Campaign",
    description: "Re-engage customers who haven't visited recently",
    icon: Heart,
    color: "text-rose-400",
  },
  {
    id: "birthday",
    name: "Birthday Campaign",
    description: "Send personalized birthday wishes and offers",
    icon: PartyPopper,
    color: "text-amber-400",
  },
] as const

const TOTAL_STEPS = 5

/* ------------------------------------------------------------------ */
/*  Confetti CSS (Step 5)                                              */
/* ------------------------------------------------------------------ */

const confettiStyles = `
@keyframes confetti-fall {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes confetti-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-15px); }
  75% { transform: translateX(15px); }
}
.confetti-piece {
  position: fixed;
  top: -10px;
  animation: confetti-fall linear forwards, confetti-shake 1s ease-in-out infinite;
  pointer-events: none;
  z-index: 50;
}
`

const CONFETTI_COLORS = [
  "#C9A96E", // Champagne Gold
  "#1a1a3e", // Midnight Indigo
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#3b82f6", // Blue
]

function ConfettiEffect() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: Math.random() * 8 + 4,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 2,
        isSquare: Math.random() > 0.5,
      })),
    []
  )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: confettiStyles }} />
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isSquare ? "2px" : "50%",
            animationDuration: `${p.duration}s, 1s`,
            animationDelay: `${p.delay}s, ${p.delay}s`,
          }}
        />
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Wizard                                                        */
/* ------------------------------------------------------------------ */

export function SetupWizard() {
  const router = useRouter()
  const { user, accountId, loading: authLoading } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [data, setData] = useState<StepData>({
    country: "Nigeria",
    ai_chatbot_enabled: true,
    business_hours_preset: "mon-fri-9-5",
  })

  /* ---------- Load existing onboarding state ---------- */
  useEffect(() => {
    if (authLoading || !user) return
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/onboarding")
        if (!res.ok) throw new Error("Failed to load onboarding state")
        const state: OnboardingState = await res.json()

        if (state.onboarding_completed) {
          router.replace("/dashboard")
          return
        }

        if (!cancelled) {
          const saved = (state.onboarding_data ?? {}) as StepData
          setData((prev) => ({ ...prev, ...saved }))
          if (state.onboarding_step > 0 && state.onboarding_step <= TOTAL_STEPS) {
            setCurrentStep(state.onboarding_step)
          }
          setInitialLoading(false)
        }
      } catch {
        if (!cancelled) setInitialLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [authLoading, user, router])

  /* ---------- Save step progress ---------- */
  const saveStep = useCallback(
    async (step: number, stepData: Partial<StepData>) => {
      setSaving(true)
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step, data: stepData }),
        })
        if (!res.ok) throw new Error("Failed to save progress")
      } catch {
        toast.error("Failed to save progress. Please try again.")
      } finally {
        setSaving(false)
      }
    },
    []
  )

  /* ---------- Complete onboarding ---------- */
  const completeOnboarding = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/onboarding", { method: "PUT" })
      if (!res.ok) throw new Error("Failed to complete onboarding")
      toast.success("Setup complete! Welcome aboard.")
      // Small delay so user sees confetti
      setTimeout(() => router.push("/dashboard"), 2000)
    } catch {
      toast.error("Failed to complete setup. Please try again.")
    } finally {
      setSaving(false)
    }
  }, [router])

  /* ---------- Navigation ---------- */
  const goNext = useCallback(async () => {
    await saveStep(currentStep + 1, data)
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }, [currentStep, data, saveStep])

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1))
  }, [])

  const skipStep = useCallback(async () => {
    const skipData = { ...data }
    if (currentStep === 2) skipData.whatsapp_setup = "skipped"
    if (currentStep === 3) skipData.contact_method = "skipped"
    setData(skipData)
    await saveStep(currentStep + 1, skipData)
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }, [currentStep, data, saveStep])

  /* ---------- Field updater ---------- */
  const updateField = useCallback(
    <K extends keyof StepData>(key: K, value: StepData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  /* ---------- Step 1 validation ---------- */
  const step1Valid = Boolean(data.business_name?.trim() && data.industry && data.business_size)

  /* ---------- Loading states ---------- */
  if (authLoading || initialLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading setup wizard...</p>
        </div>
      </div>
    )
  }

  const progressPercent = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome to your CRM
        </h1>
        <p className="mt-2 text-muted-foreground">
          Let&apos;s get you set up in just a few minutes
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Step {currentStep} of {TOTAL_STEPS}</span>
          <span className="text-muted-foreground">
            {currentStep === 1 && "Business Basics"}
            {currentStep === 2 && "Connect WhatsApp"}
            {currentStep === 3 && "Your First Contact"}
            {currentStep === 4 && "Quick Wins"}
            {currentStep === 5 && "You're Ready!"}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Step Content */}
      <Card className="border-slate-800 bg-slate-900/50">
        {currentStep === 1 && (
          <Step1BusinessBasics data={data} updateField={updateField} />
        )}
        {currentStep === 2 && (
          <Step2WhatsApp data={data} updateField={updateField} />
        )}
        {currentStep === 3 && (
          <Step3Contacts data={data} updateField={updateField} />
        )}
        {currentStep === 4 && (
          <Step4QuickWins data={data} updateField={updateField} />
        )}
        {currentStep === 5 && (
          <Step5Ready data={data} />
        )}
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={currentStep === 1 || saving}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {(currentStep === 2 || currentStep === 3) && (
            <Button
              variant="ghost"
              onClick={skipStep}
              disabled={saving}
              className="gap-1 text-muted-foreground"
            >
              Skip
              <SkipForward className="h-4 w-4" />
            </Button>
          )}

          {currentStep < TOTAL_STEPS ? (
            <Button
              onClick={goNext}
              disabled={
                saving ||
                (currentStep === 1 && !step1Valid)
              }
              className="gap-1"
            >
              {saving ? "Saving..." : "Next"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={completeOnboarding}
              disabled={saving}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? "Finishing..." : "Go to Dashboard"}
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Step Components                                                    */
/* ================================================================== */

interface StepProps {
  data: StepData
  updateField: <K extends keyof StepData>(key: K, value: StepData[K]) => void
}

/* ---------- Step 1: Business Basics ---------- */

function Step1BusinessBasics({ data, updateField }: StepProps) {
  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle>Business Basics</CardTitle>
        </div>
        <CardDescription>
          Tell us about your business so we can customize your experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="business_name">Business Name *</Label>
          <Input
            id="business_name"
            placeholder="e.g. Mama Nkechi's Kitchen"
            value={data.business_name ?? ""}
            onChange={(e) => updateField("business_name", e.target.value)}
            className="bg-slate-800/50 border-slate-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry *</Label>
          <select
            id="industry"
            value={data.industry ?? ""}
            onChange={(e) => updateField("industry", e.target.value)}
            className={cn(
              "flex h-9 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1 text-sm",
              "text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50",
              !data.industry && "text-muted-foreground"
            )}
          >
            <option value="" disabled>Select your industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="business_size">Business Size *</Label>
          <select
            id="business_size"
            value={data.business_size ?? ""}
            onChange={(e) => updateField("business_size", e.target.value)}
            className={cn(
              "flex h-9 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1 text-sm",
              "text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50",
              !data.business_size && "text-muted-foreground"
            )}
          >
            <option value="" disabled>Select business size</option>
            {BUSINESS_SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <select
            id="country"
            value={data.country ?? "Nigeria"}
            onChange={(e) => updateField("country", e.target.value)}
            className={cn(
              "flex h-9 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1 text-sm",
              "text-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
            )}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </CardContent>
    </>
  )
}

/* ---------- Step 2: Connect WhatsApp ---------- */

function Step2WhatsApp({ data, updateField }: StepProps) {
  const method = data.whatsapp_setup ?? "embedded"

  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-400" />
          <CardTitle>Connect WhatsApp</CardTitle>
        </div>
        <CardDescription>
          Connect your WhatsApp Business account to start messaging customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Option A: Embedded Signup */}
        <button
          type="button"
          onClick={() => updateField("whatsapp_setup", "embedded")}
          className={cn(
            "w-full rounded-lg border p-4 text-left transition-colors",
            method === "embedded"
              ? "border-primary bg-primary/10"
              : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
          )}
        >
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 text-emerald-400" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Embedded Signup</span>
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                The easiest way to connect. We&apos;ll guide you through Meta&apos;s
                embedded signup flow — no technical knowledge needed.
              </p>
            </div>
          </div>
        </button>

        {method === "embedded" && (
          <div className="ml-8 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            <p className="text-sm text-muted-foreground">
              After completing this wizard, go to{" "}
              <span className="font-medium text-foreground">Settings → WhatsApp</span>{" "}
              to start the embedded signup process.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-1"
              onClick={() => window.open("/settings", "_blank")}
            >
              <Settings className="h-3.5 w-3.5" />
              Open Settings
            </Button>
          </div>
        )}

        {/* Option B: Manual Setup */}
        <button
          type="button"
          onClick={() => updateField("whatsapp_setup", "manual")}
          className={cn(
            "w-full rounded-lg border p-4 text-left transition-colors",
            method === "manual"
              ? "border-primary bg-primary/10"
              : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
          )}
        >
          <div className="flex items-start gap-3">
            <Settings className="mt-0.5 h-5 w-5 text-slate-400" />
            <div>
              <span className="font-medium">Manual Setup</span>
              <p className="mt-1 text-sm text-muted-foreground">
                Already have your WhatsApp Business API credentials? Enter them directly.
              </p>
            </div>
          </div>
        </button>

        {method === "manual" && (
          <div className="ml-8 space-y-3 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number_id">Phone Number ID</Label>
              <Input
                id="phone_number_id"
                placeholder="e.g. 123456789012345"
                value={data.phone_number_id ?? ""}
                onChange={(e) => updateField("phone_number_id", e.target.value)}
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access_token">Access Token</Label>
              <Input
                id="access_token"
                type="password"
                placeholder="Your permanent access token"
                value={data.access_token ?? ""}
                onChange={(e) => updateField("access_token", e.target.value)}
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>You can skip this step and connect WhatsApp later from Settings.</span>
        </div>
      </CardContent>
    </>
  )
}

/* ---------- Step 3: Your First Contact ---------- */

function Step3Contacts({ data, updateField }: StepProps) {
  const method = data.contact_method ?? "manual"

  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-blue-400" />
          <CardTitle>Your First Contact</CardTitle>
        </div>
        <CardDescription>
          Add a test contact to see how the CRM works
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
        <div className="flex gap-2">
          <Button
            variant={method === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => updateField("contact_method", "manual")}
            className="gap-1"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Manually
          </Button>
          <Button
            variant={method === "csv" ? "default" : "outline"}
            size="sm"
            onClick={() => updateField("contact_method", "csv")}
            className="gap-1"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload CSV
          </Button>
        </div>

        {method === "manual" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Name</Label>
              <Input
                id="contact_name"
                placeholder="e.g. John Doe"
                value={data.contact_name ?? ""}
                onChange={(e) => updateField("contact_name", e.target.value)}
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone Number</Label>
              <Input
                id="contact_phone"
                placeholder="e.g. +234 801 234 5678"
                value={data.contact_phone ?? ""}
                onChange={(e) => updateField("contact_phone", e.target.value)}
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email (optional)</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="e.g. john@example.com"
                value={data.contact_email ?? ""}
                onChange={(e) => updateField("contact_email", e.target.value)}
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
          </div>
        )}

        {method === "csv" && (
          <div className="rounded-lg border-2 border-dashed border-slate-700 p-8 text-center">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Upload a CSV file</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Columns: Name, Phone, Email
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.open("/contacts", "_blank")}
            >
              Go to Contacts Page to Import
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>You can skip this and add contacts later from the Contacts page.</span>
        </div>
      </CardContent>
    </>
  )
}

/* ---------- Step 4: Quick Wins ---------- */

function Step4QuickWins({ data, updateField }: StepProps) {
  return (
    <>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <CardTitle>Quick Wins</CardTitle>
        </div>
        <CardDescription>
          Configure a few things to get the most out of your CRM right away
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Chatbot */}
        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/30 p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <div>
              <p className="font-medium">AI Chatbot</p>
              <p className="text-sm text-muted-foreground">
                Auto-respond to customer messages with AI
              </p>
            </div>
          </div>
          <Switch
            checked={data.ai_chatbot_enabled ?? true}
            onCheckedChange={(checked) => updateField("ai_chatbot_enabled", checked)}
          />
        </div>

        <Separator className="bg-slate-800" />

        {/* Business Hours */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label>Business Hours</Label>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { value: "mon-fri-9-5", label: "Mon-Fri, 9am-5pm" },
              { value: "mon-sat-9-6", label: "Mon-Sat, 9am-6pm" },
              { value: "everyday-8-8", label: "Every day, 8am-8pm" },
              { value: "24-7", label: "24/7 (Always on)" },
            ].map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => updateField("business_hours_preset", preset.value)}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm transition-colors",
                  data.business_hours_preset === preset.value
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* First Campaign Template */}
        <div className="space-y-3">
          <Label>Choose Your First Campaign</Label>
          <div className="grid gap-2">
            {CAMPAIGN_TEMPLATES.map((tpl) => {
              const Icon = tpl.icon
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => updateField("first_campaign", tpl.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    data.first_campaign === tpl.id
                      ? "border-primary bg-primary/10"
                      : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                  )}
                >
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tpl.color)} />
                  <div>
                    <p className="font-medium">{tpl.name}</p>
                    <p className="text-sm text-muted-foreground">{tpl.description}</p>
                  </div>
                  {data.first_campaign === tpl.id && (
                    <Check className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </>
  )
}

/* ---------- Step 5: You're Ready! ---------- */

function Step5Ready({ data }: { data: StepData }) {
  const items = [
    {
      label: "Business profile",
      done: Boolean(data.business_name && data.industry),
      detail: data.business_name ?? "Not set",
    },
    {
      label: "WhatsApp connection",
      done: data.whatsapp_setup !== "skipped" && Boolean(data.whatsapp_setup),
      detail:
        data.whatsapp_setup === "skipped"
          ? "Skipped — set up later in Settings"
          : data.whatsapp_setup === "manual"
            ? "Manual credentials provided"
            : "Embedded signup selected",
    },
    {
      label: "First contact",
      done: data.contact_method !== "skipped" && Boolean(data.contact_name || data.contact_method === "csv"),
      detail:
        data.contact_method === "skipped"
          ? "Skipped — add contacts later"
          : data.contact_name
            ? data.contact_name
            : "CSV import selected",
    },
    {
      label: "AI Chatbot",
      done: data.ai_chatbot_enabled ?? true,
      detail: data.ai_chatbot_enabled !== false ? "Enabled" : "Disabled",
    },
    {
      label: "Business hours",
      done: Boolean(data.business_hours_preset),
      detail: data.business_hours_preset ?? "Default",
    },
    {
      label: "First campaign",
      done: Boolean(data.first_campaign),
      detail: data.first_campaign
        ? CAMPAIGN_TEMPLATES.find((t) => t.id === data.first_campaign)?.name ?? data.first_campaign
        : "None selected",
    },
  ]

  return (
    <>
      <ConfettiEffect />
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
          <PartyPopper className="h-6 w-6 text-emerald-400" />
        </div>
        <CardTitle className="text-xl">You&apos;re All Set!</CardTitle>
        <CardDescription>
          Here&apos;s a summary of your setup. You can always change these in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/30 p-3"
            >
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  item.done
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                )}
              >
                {item.done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <Badge
                variant={item.done ? "secondary" : "outline"}
                className={cn(
                  "text-xs",
                  item.done ? "bg-emerald-500/10 text-emerald-400" : "text-amber-400"
                )}
              >
                {item.done ? "Done" : "Pending"}
              </Badge>
            </div>
          ))}
        </div>

        <Separator className="my-6 bg-slate-800" />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Need to change something?{" "}
            <a href="/settings" className="text-primary hover:underline">
              Explore Settings
            </a>
          </p>
        </div>
      </CardContent>
    </>
  )
}
