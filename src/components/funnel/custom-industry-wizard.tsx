"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { CustomIndustryWizardAnswers } from "@/types/funnel"
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CustomIndustryWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (answers: CustomIndustryWizardAnswers) => void
}

/* ------------------------------------------------------------------ */
/*  Option helpers                                                     */
/* ------------------------------------------------------------------ */

interface RadioOption {
  value: string
  label: string
  description: string
}

interface CheckboxOption {
  value: string
  label: string
}

const BUSINESS_TYPES: RadioOption[] = [
  { value: "physical_products", label: "Physical Products", description: "Sell tangible goods (clothing, food, electronics)" },
  { value: "digital_products", label: "Digital Products", description: "Sell digital goods (courses, software, ebooks)" },
  { value: "services", label: "Services", description: "Provide services (consulting, cleaning, repairs)" },
  { value: "venue", label: "Venue / Location", description: "People visit your location (restaurant, salon, gym)" },
  { value: "marketplace", label: "Marketplace", description: "Connect buyers and sellers" },
]

const SALES_CYCLES: RadioOption[] = [
  { value: "same_day", label: "Same Day", description: "Customer buys immediately or within hours" },
  { value: "1_7_days", label: "1-7 Days", description: "Customer decides within a week" },
  { value: "1_4_weeks", label: "1-4 Weeks", description: "Takes a few weeks of consideration" },
  { value: "1_3_months", label: "1-3 Months", description: "Longer decision process, multiple touchpoints" },
  { value: "3_plus_months", label: "3+ Months", description: "Extended sales cycle, high-value decisions" },
]

const AVG_TRANSACTIONS: RadioOption[] = [
  { value: "under_10k", label: "Under ₦10,000", description: "Low-cost, high-volume" },
  { value: "10k_100k", label: "₦10,000 – ₦100,000", description: "Mid-range purchases" },
  { value: "100k_1m", label: "₦100,000 – ₦1,000,000", description: "Significant purchases" },
  { value: "1m_10m", label: "₦1M – ₦10M", description: "High-value transactions" },
  { value: "over_10m", label: "Over ₦10M", description: "Premium / luxury purchases" },
]

const CUSTOMER_CHANNELS: CheckboxOption[] = [
  { value: "instagram_ads", label: "Instagram Ads" },
  { value: "facebook_ads", label: "Facebook Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "google_maps", label: "Google Maps" },
  { value: "tiktok_ads", label: "TikTok Ads" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "referrals", label: "Referrals" },
  { value: "walk_in", label: "Walk-in" },
  { value: "website", label: "Website" },
]

const CLOSE_MECHANISMS: RadioOption[] = [
  { value: "online_payment", label: "Online Payment", description: "Card, bank transfer, or mobile money online" },
  { value: "cod", label: "Cash on Delivery", description: "Pay when goods are delivered" },
  { value: "bank_transfer", label: "Bank Transfer", description: "Direct bank transfer before delivery" },
  { value: "booking", label: "Booking / Appointment", description: "Schedule and pay at visit" },
  { value: "walk_in", label: "Walk-in", description: "Customer visits and pays in person" },
  { value: "hybrid", label: "Multiple Methods", description: "Accept various payment methods" },
]

const REPEAT_FREQUENCIES: RadioOption[] = [
  { value: "weekly", label: "Weekly", description: "Regular repeat purchases" },
  { value: "monthly", label: "Monthly", description: "Monthly repeat customers" },
  { value: "quarterly", label: "Every Few Months", description: "Seasonal or periodic" },
  { value: "annually", label: "Once a Year", description: "Annual purchases" },
  { value: "one_time", label: "One-Time", description: "Customers rarely buy again" },
]

const TOTAL_STEPS = 7

/* ------------------------------------------------------------------ */
/*  Reusable card sub-components                                       */
/* ------------------------------------------------------------------ */

function RadioCard({
  option,
  selected,
  onSelect,
}: {
  option: RadioOption
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/50",
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {option.label}
      </span>
      <span className="text-xs text-muted-foreground">
        {option.description}
      </span>
    </button>
  )
}

function CheckboxCard({
  option,
  checked,
  onToggle,
}: {
  option: CheckboxOption
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-3 text-left transition-colors",
        checked
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/50",
      )}
    >
      <div
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground",
        )}
      >
        {checked && (
          <svg
            className="h-3 w-3"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </div>
      <span className="text-sm font-medium text-foreground">
        {option.label}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Main wizard component                                              */
/* ------------------------------------------------------------------ */

export function CustomIndustryWizard({
  open,
  onOpenChange,
  onComplete,
}: CustomIndustryWizardProps) {
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<Partial<CustomIndustryWizardAnswers>>({
    customer_channels: [],
  })

  /* ---- validation per step ---- */
  const isStepValid = (): boolean => {
    switch (step) {
      case 1:
        return !!answers.business_type
      case 2:
        return !!answers.industry_name?.trim()
      case 3:
        return !!answers.sales_cycle
      case 4:
        return !!answers.avg_transaction
      case 5:
        return (answers.customer_channels?.length ?? 0) > 0
      case 6:
        return !!answers.close_mechanism
      case 7:
        return !!answers.repeat_frequency
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1)
    } else {
      // Final step — submit
      onComplete(answers as CustomIndustryWizardAnswers)
      // Reset for next open
      setStep(1)
      setAnswers({ customer_channels: [] })
    }
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // Reset on close
      setStep(1)
      setAnswers({ customer_channels: [] })
    }
    onOpenChange(next)
  }

  const toggleChannel = (ch: string) => {
    setAnswers((prev) => {
      const current = prev.customer_channels ?? []
      return {
        ...prev,
        customer_channels: current.includes(ch)
          ? current.filter((c) => c !== ch)
          : [...current, ch],
      }
    })
  }

  /* ---- step titles ---- */
  const stepTitles: Record<number, string> = {
    1: "What type of business are you?",
    2: "What industry are you in?",
    3: "How long does it typically take from first contact to purchase?",
    4: "What’s your average transaction value?",
    5: "Where do your customers find you?",
    6: "How do customers typically pay?",
    7: "How often do customers typically buy again?",
  }

  /* ---- render step content ---- */
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col gap-3">
            {BUSINESS_TYPES.map((opt) => (
              <RadioCard
                key={opt.value}
                option={opt}
                selected={answers.business_type === opt.value}
                onSelect={() =>
                  setAnswers((p) => ({
                    ...p,
                    business_type: opt.value as CustomIndustryWizardAnswers["business_type"],
                  }))
                }
              />
            ))}
          </div>
        )

      case 2:
        return (
          <div className="flex flex-col gap-3">
            <Label htmlFor="industry-name" className="text-sm text-muted-foreground">
              Enter your industry
            </Label>
            <Input
              id="industry-name"
              placeholder="e.g., Fashion retail, Real estate, Restaurant"
              value={answers.industry_name ?? ""}
              onChange={(e) =>
                setAnswers((p) => ({ ...p, industry_name: e.target.value }))
              }
              className="bg-card"
              autoFocus
            />
          </div>
        )

      case 3:
        return (
          <div className="flex flex-col gap-3">
            {SALES_CYCLES.map((opt) => (
              <RadioCard
                key={opt.value}
                option={opt}
                selected={answers.sales_cycle === opt.value}
                onSelect={() =>
                  setAnswers((p) => ({
                    ...p,
                    sales_cycle: opt.value as CustomIndustryWizardAnswers["sales_cycle"],
                  }))
                }
              />
            ))}
          </div>
        )

      case 4:
        return (
          <div className="flex flex-col gap-3">
            {AVG_TRANSACTIONS.map((opt) => (
              <RadioCard
                key={opt.value}
                option={opt}
                selected={answers.avg_transaction === opt.value}
                onSelect={() =>
                  setAnswers((p) => ({
                    ...p,
                    avg_transaction: opt.value as CustomIndustryWizardAnswers["avg_transaction"],
                  }))
                }
              />
            ))}
          </div>
        )

      case 5:
        return (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Select all that apply</p>
            <div className="grid grid-cols-2 gap-2">
              {CUSTOMER_CHANNELS.map((opt) => (
                <CheckboxCard
                  key={opt.value}
                  option={opt}
                  checked={answers.customer_channels?.includes(opt.value) ?? false}
                  onToggle={() => toggleChannel(opt.value)}
                />
              ))}
            </div>
          </div>
        )

      case 6:
        return (
          <div className="flex flex-col gap-3">
            {CLOSE_MECHANISMS.map((opt) => (
              <RadioCard
                key={opt.value}
                option={opt}
                selected={answers.close_mechanism === opt.value}
                onSelect={() =>
                  setAnswers((p) => ({
                    ...p,
                    close_mechanism: opt.value as CustomIndustryWizardAnswers["close_mechanism"],
                  }))
                }
              />
            ))}
          </div>
        )

      case 7:
        return (
          <div className="flex flex-col gap-3">
            {REPEAT_FREQUENCIES.map((opt) => (
              <RadioCard
                key={opt.value}
                option={opt}
                selected={answers.repeat_frequency === opt.value}
                onSelect={() =>
                  setAnswers((p) => ({
                    ...p,
                    repeat_frequency: opt.value as CustomIndustryWizardAnswers["repeat_frequency"],
                  }))
                }
              />
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-hidden border-border bg-card p-0">
        {/* Header */}
        <div className="border-b border-border px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-foreground">
              Custom Industry Setup
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </DialogDescription>
          </DialogHeader>
          <Progress
            value={(step / TOTAL_STEPS) * 100}
            className="mt-3 h-1.5"
          />
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: "60vh" }}>
          <h3 className="mb-4 text-base font-medium text-foreground">
            {stepTitles[step]}
          </h3>
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={step === 1}
            className="gap-1 text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            size="sm"
            onClick={handleNext}
            disabled={!isStepValid()}
            className="gap-1"
          >
            {step === TOTAL_STEPS ? (
              <>
                <Sparkles className="h-4 w-4" />
                Generate My Settings
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
