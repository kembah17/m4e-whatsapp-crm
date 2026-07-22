"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowUpRight, Lock, Sparkles, Crown, Gem, Star } from "lucide-react";
import type { FeatureTier } from "@/types/business-growth";

const TIER_DISPLAY: Record<FeatureTier, {
  label: string;
  color: string;
  icon: typeof Crown;
  price: string;
}> = {
  starter: {
    label: "Starter",
    color: "text-zinc-400 bg-zinc-800/50 border-zinc-700",
    icon: Star,
    price: "Free",
  },
  professional: {
    label: "Professional",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    icon: Gem,
    price: "NGN 25,000/mo",
  },
  business: {
    label: "Business",
    color: "text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/30",
    icon: Crown,
    price: "NGN 50,000/mo",
  },
  enterprise: {
    label: "Enterprise",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    icon: Sparkles,
    price: "Custom",
  },
};

const FEATURE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  debt_book: {
    title: "Debt Book",
    description: "Track customer debts, record payments, and manage outstanding balances with automated reminders.",
  },
  invoices: {
    title: "Invoicing",
    description: "Create professional invoices, quotations, and receipts. Send via WhatsApp with one click.",
  },
  inventory: {
    title: "Inventory Management",
    description: "Track stock levels, get low-stock alerts, and manage supplier information.",
  },
  installments: {
    title: "Installment Plans",
    description: "Offer flexible payment plans with automated scheduling and late fee management.",
  },
  trust_score: {
    title: "Trust Score",
    description: "AI-powered customer reliability scoring based on payment history and engagement.",
  },
  voice_transcription: {
    title: "Voice Transcription",
    description: "Automatically transcribe WhatsApp voice notes and extract action items.",
  },
  receipt_scanner: {
    title: "Receipt Scanner",
    description: "AI-powered receipt scanning that matches payments to outstanding debts.",
  },
  price_negotiation: {
    title: "Price Negotiation",
    description: "Track negotiation history and optimize pricing strategies.",
  },
  referrals: {
    title: "Referral Programme",
    description: "Grow your customer base with trackable referral codes and automated rewards.",
  },
  loyalty: {
    title: "Loyalty Programme",
    description: "Reward repeat customers with points, tiers, and exclusive benefits.",
  },
  ai_insights: {
    title: "AI Business Insights",
    description: "Get AI-generated insights about sales trends, customer behaviour, and growth opportunities.",
  },
  campaigns: {
    title: "Campaigns",
    description: "Create and manage multi-channel marketing campaigns with analytics.",
  },
  funnel: {
    title: "Funnel Engine",
    description: "Build automated sales funnels with nurture sequences and conversion tracking.",
  },
  ecommerce: {
    title: "E-Commerce",
    description: "Full online store with product catalog, cart, and checkout integration.",
  },
  public_api: {
    title: "Public API",
    description: "Integrate with external systems using our REST API.",
  },
  white_label: {
    title: "White Label",
    description: "Remove M4E branding and use your own brand identity.",
  },
  multi_branch: {
    title: "Multi-Branch",
    description: "Manage multiple business locations from a single dashboard.",
  },
};

interface UpsellCardProps {
  /** Feature key from FEATURE_TIER_MAP */
  feature: string;
  /** Override the required tier (otherwise inferred from feature) */
  tierRequired?: FeatureTier;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Upsell card shown when a feature is not accessible.
 * Displays feature info, required tier, and upgrade CTA.
 */
export function UpsellCard({
  feature,
  tierRequired = "professional",
  compact = false,
  className = "",
}: UpsellCardProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const tier = TIER_DISPLAY[tierRequired];
  const featureInfo = FEATURE_DESCRIPTIONS[feature] || {
    title: feature.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "Upgrade your plan to access this feature.",
  };
  const TierIcon = tier.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 ${className}`}>
        <Lock className="h-4 w-4 text-zinc-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-300">
            <span className="font-medium">{featureInfo.title}</span> requires the{" "}
            <Badge variant="outline" className={`${tier.color} text-xs`}>
              <TierIcon className="h-3 w-3 mr-1" />
              {tier.label}
            </Badge>{" "}
            plan
          </p>
        </div>
        <Link href="/platform">
          <Button size="sm" variant="outline" className="border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/10 shrink-0">
            Upgrade
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Card className={`bg-zinc-900/50 border-zinc-800 relative overflow-hidden ${className}`}>
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#C9A84C]/5 via-transparent to-transparent pointer-events-none" />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#C9A84C]/10 border border-[#C9A84C]/20">
            <Lock className="h-5 w-5 text-[#C9A84C]" />
          </div>
          <div>
            <CardTitle className="text-lg text-white">{featureInfo.title}</CardTitle>
            <Badge variant="outline" className={`${tier.color} text-xs mt-1`}>
              <TierIcon className="h-3 w-3 mr-1" />
              {tier.label} Plan &middot; {tier.price}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-400">{featureInfo.description}</p>

        <div className="flex items-center gap-3">
          <Link href="/platform" className="flex-1">
            <Button className="w-full bg-[#C9A84C] hover:bg-[#b8993f] text-black">
              Upgrade to {tier.label}
              <ArrowUpRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        <p className="text-xs text-zinc-500 text-center">
          Upgrade anytime. All plans include a 14-day free trial.
        </p>
      </CardContent>
    </Card>
  );
}
