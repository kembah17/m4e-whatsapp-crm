"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Crown, Check, X, Eye } from "lucide-react";
import type { FeatureTier } from "@/types/business-growth";

interface FeatureItem {
  feature: string;
  label: string;
  tier_required: FeatureTier;
  accessible: boolean;
}

interface UsageLimits {
  contacts: { current: number; max: number };
  broadcasts: { current: number; max: number };
  campaigns: { current: number; max: number };
  invoices: { current: number; max: number };
  ai_queries: { current: number; max: number };
}

const TIER_COLORS: Record<string, string> = {
  starter: "bg-zinc-800/50 text-zinc-400 border-zinc-700",
  professional: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  business: "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30",
  enterprise: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

export function TierAccessPanel() {
  const [currentTier, setCurrentTier] = useState<FeatureTier>("starter");
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/account/tier");
      if (res.ok) {
        const data = await res.json();
        setCurrentTier(data.config?.current_tier || "starter");
        setFeatures(data.features || []);
        setLimits(data.limits || null);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>;
  }

  const tierGroups: Record<FeatureTier, FeatureItem[]> = {
    starter: [],
    professional: [],
    business: [],
    enterprise: [],
  };
  features.forEach((f) => tierGroups[f.tier_required]?.push(f));

  const usageBar = (label: string, current: number, max: number) => {
    const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const isHigh = pct > 80;
    return (
      <div key={label}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-zinc-300">{label}</span>
          <span className={isHigh ? "text-red-400" : "text-zinc-400"}>
            {current.toLocaleString()} / {max >= 999999 ? "Unlimited" : max.toLocaleString()}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Crown className="h-5 w-5 text-[#C9A84C]" /> Plan &amp; Features
        </h2>
        <p className="text-sm text-zinc-400 mt-1">Your current plan and feature access.</p>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 text-sm">Current Plan:</span>
            <Badge variant="outline" className={`text-sm px-3 py-1 ${TIER_COLORS[currentTier] || ""}`}>
              <Crown className="h-4 w-4 mr-1" />
              {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {limits && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader><CardTitle className="text-white text-sm">Usage Limits</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {usageBar("Contacts", limits.contacts.current, limits.contacts.max)}
            {usageBar("Broadcasts (this month)", limits.broadcasts.current, limits.broadcasts.max)}
            {usageBar("Campaigns", limits.campaigns.current, limits.campaigns.max)}
            {usageBar("Invoices (this month)", limits.invoices.current, limits.invoices.max)}
            {usageBar("AI Queries (today)", limits.ai_queries.current, limits.ai_queries.max)}
          </CardContent>
        </Card>
      )}

      {(["starter", "professional", "business", "enterprise"] as FeatureTier[]).map((tier) => (
        tierGroups[tier].length > 0 && (
          <Card key={tier} className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Badge variant="outline" className={TIER_COLORS[tier]}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Badge>
                Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {tierGroups[tier].map((f) => (
                  <div key={f.feature} className="flex items-center gap-2 text-sm">
                    {f.accessible ? (
                      <Check className="h-4 w-4 text-green-400 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-zinc-600 shrink-0" />
                    )}
                    <span className={f.accessible ? "text-zinc-200" : "text-zinc-500"}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ))}
    </div>
  );
}
