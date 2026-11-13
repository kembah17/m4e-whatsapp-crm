"use client";

import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { getTrustTier } from "@/lib/contacts/trust-score-tiers";
import type { TrustTier } from "@/lib/contacts/trust-score-tiers";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrustScoreBadgeProps {
  score: number | null | undefined;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const tierIcons: Record<TrustTier, typeof Shield> = {
  champion: ShieldCheck,
  growing: Shield,
  developing: ShieldQuestion,
  new_at_risk: ShieldAlert,
};

export function TrustScoreBadge({ score, showLabel = false, size = "sm" }: TrustScoreBadgeProps) {
  const tier = getTrustTier(score);
  const Icon = tierIcons[tier.tier];
  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  if (score == null) {
    return (
      <span className="text-muted-foreground text-xs">—</span>
    );
  }

  const badge = (
    <div
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${tier.badgeColor} ${textSize}`}
    >
      <Icon className={`${iconSize} shrink-0`} />
      <span>{score}</span>
      {showLabel && (
        <span className="text-muted-foreground ml-0.5">{tier.label}</span>
      )}
    </div>
  );

  if (!showLabel) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-medium">{tier.emoji} {tier.label} ({score}/100)</p>
            <p className="text-muted-foreground mt-0.5">{tier.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
