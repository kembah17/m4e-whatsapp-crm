"use client";

import { useState } from "react";
import {
  getTrustTier,
  getTopRecommendations,
  getEligibleRecommendations,
  TRUST_TIERS,
} from "@/lib/contacts/trust-score-tiers";
import type { EligibilityRecommendation, TrustTier } from "@/lib/contacts/trust-score-tiers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  CreditCard,
  Banknote,
  Megaphone,
  Users,
  MessageSquareQuote,
  Crown,
  Star,
  Gift,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrustScoreEligibilityProps {
  score: number | null | undefined;
  contactName?: string;
  onAutomationToggle?: (recommendationId: string, enabled: boolean) => void;
  enabledAutomations?: Set<string>;
}

const iconMap: Record<string, typeof Shield> = {
  CreditCard,
  Banknote,
  Megaphone,
  Users,
  MessageSquareQuote,
  Crown,
  Star,
  Gift,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  Eye,
};

const tierIcons: Record<TrustTier, typeof Shield> = {
  champion: ShieldCheck,
  growing: Shield,
  developing: ShieldQuestion,
  new_at_risk: ShieldAlert,
};

const categoryLabels: Record<string, string> = {
  credit: "Credit Eligibility",
  referral: "Referral & Advocacy",
  rewards: "Rewards & Loyalty",
  engagement: "Engagement Actions",
  risk: "Risk Management",
};

const categoryOrder = ["credit", "referral", "rewards", "engagement", "risk"];

export function TrustScoreEligibility({
  score,
  contactName,
  onAutomationToggle,
  enabledAutomations = new Set(),
}: TrustScoreEligibilityProps) {
  const [expanded, setExpanded] = useState(false);
  const tier = getTrustTier(score);
  const TierIcon = tierIcons[tier.tier];
  const topRecs = getTopRecommendations(score, 4);
  const allRecs = getEligibleRecommendations(score);

  // Group recommendations by category
  const grouped = categoryOrder.reduce<Record<string, EligibilityRecommendation[]>>(
    (acc, cat) => {
      const items = allRecs.filter((r) => r.category === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    },
    {}
  );

  const priorityColors = {
    high: "border-red-500/30 text-red-400 bg-red-500/10",
    medium: "border-amber-500/30 text-amber-400 bg-amber-500/10",
    low: "border-border text-muted-foreground bg-muted/50",
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <TierIcon className={`size-4 ${tier.color}`} />
            Trust Score Eligibility
          </CardTitle>
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tier.badgeColor}`}>
            <span>{tier.emoji}</span>
            <span>{score ?? 0}/100</span>
            <span className="text-muted-foreground">·</span>
            <span>{tier.label}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {tier.description}
          {contactName && (
            <span className="text-foreground font-medium"> — {contactName}</span>
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Tier Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            {TRUST_TIERS.slice().reverse().map((t) => (
              <span key={t.tier} className={tier.tier === t.tier ? t.color + " font-medium" : ""}>
                {t.emoji} {t.label}
              </span>
            ))}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            {TRUST_TIERS.slice().reverse().map((t) => {
              const width = ((t.maxScore - t.minScore + 1) / 101) * 100;
              const isActive = score != null && score >= t.minScore && score <= t.maxScore;
              return (
                <div
                  key={t.tier}
                  className={`h-full transition-all ${isActive ? "opacity-100" : "opacity-20"}`}
                  style={{
                    width: `${width}%`,
                    backgroundColor: isActive
                      ? t.tier === "champion" ? "#10b981"
                        : t.tier === "growing" ? "#3b82f6"
                        : t.tier === "developing" ? "#f59e0b"
                        : "#ef4444"
                      : "#374151",
                  }}
                />
              );
            })}
          </div>
          {score != null && (
            <div
              className="relative h-0"
              style={{ marginTop: "-2px" }}
            >
              <div
                className="absolute -top-1 w-0.5 h-3 bg-white rounded-full"
                style={{ left: `${(score / 100) * 100}%`, transform: "translateX(-50%)" }}
              />
            </div>
          )}
        </div>

        {/* Top Recommendations (always visible) */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Top Recommendations
          </p>
          {topRecs.map((rec) => {
            const RecIcon = iconMap[rec.icon] || Info;
            return (
              <div
                key={rec.id}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-2.5"
              >
                <div className={`mt-0.5 rounded-md p-1.5 ${tier.bgColor}`}>
                  <RecIcon className={`size-3.5 ${tier.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground">{rec.title}</p>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 ${priorityColors[rec.priority]}`}
                    >
                      {rec.priority}
                    </Badge>
                    {rec.automatable && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Zap className="size-3 text-amber-400" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-[200px]">
                            <p className="font-medium">Automatable</p>
                            <p className="text-muted-foreground">{rec.automationDescription}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{rec.description}</p>
                  {rec.automatable && onAutomationToggle && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Switch
                        id={`auto-${rec.id}`}
                        checked={enabledAutomations.has(rec.id)}
                        onCheckedChange={(checked) => onAutomationToggle(rec.id, checked)}
                        className="scale-75 origin-left"
                      />
                      <Label
                        htmlFor={`auto-${rec.id}`}
                        className="text-[10px] text-muted-foreground cursor-pointer"
                      >
                        Enable automation
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand/Collapse for all recommendations */}
        {allRecs.length > 4 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <><ChevronUp className="size-3.5" /> Show less</>
              ) : (
                <><ChevronDown className="size-3.5" /> Show all {allRecs.length} recommendations</>
              )}
            </Button>

            {expanded && (
              <div className="space-y-4 pt-2 border-t border-border/50">
                {Object.entries(grouped).map(([category, recs]) => (
                  <div key={category} className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      {categoryLabels[category] || category}
                    </p>
                    {recs.map((rec) => {
                      const RecIcon = iconMap[rec.icon] || Info;
                      return (
                        <div
                          key={rec.id}
                          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50"
                        >
                          <RecIcon className={`size-3.5 ${tier.color} shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground">{rec.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{rec.description}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {rec.automatable && <Zap className="size-3 text-amber-400" />}
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 ${priorityColors[rec.priority]}`}
                            >
                              {rec.priority}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
