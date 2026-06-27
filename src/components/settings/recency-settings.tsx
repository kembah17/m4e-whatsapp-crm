"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  RefreshCw,
  Snowflake,
  Sun,
  Thermometer,
  TrendingUp,
  Zap,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { SettingsPanelHead } from "./settings-panel-head";
import {
  type IndustryPreset,
  type ProductScoreSettings,
  type RecencyAnalysis,
  INDUSTRY_PRESETS,
} from "@/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Confidence badge                                                   */
/* ------------------------------------------------------------------ */
function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
      : pct >= 40
        ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
        : "text-red-400 bg-red-400/10 border-red-400/30";
  const label = pct >= 70 ? "High" : pct >= 40 ? "Medium" : "Low";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        color,
      )}
    >
      <TrendingUp className="size-3" />
      {label} ({pct}%)
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Threshold tier visual                                              */
/* ------------------------------------------------------------------ */
function ThresholdTier({
  icon: Icon,
  label,
  days,
  recommended,
  color,
  description,
}: {
  icon: React.ElementType;
  label: string;
  days: number;
  recommended?: number | null;
  color: string;
  description: string;
}) {
  const diff = recommended ? recommended - days : null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-3">
      <div className={cn("mt-0.5 rounded-md p-1.5", color)}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-lg font-bold text-foreground">{days}d</span>
          {recommended != null && recommended !== days && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ChevronRight className="size-3" />
              <span className="font-medium text-primary">{recommended}d</span>
              <span className="text-[10px]">suggested</span>
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export function RecencySettings() {
  const { accountId, canEditSettings } = useAuth();

  const [settings, setSettings] = useState<ProductScoreSettings | null>(null);
  const [analysis, setAnalysis] = useState<RecencyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  // Editable form state
  const [industry, setIndustry] = useState<IndustryPreset>("retail");
  const [hotDays, setHotDays] = useState(60);
  const [warmDays, setWarmDays] = useState(120);
  const [coldDays, setColdDays] = useState(240);
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(false);

  /* ---- Fetch settings ---- */
  const fetchSettings = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/purchases/score-settings", { cache: "no-store" });
      const json = await res.json();
      if (json.settings) {
        const s = json.settings as ProductScoreSettings;
        setSettings(s);
        setIndustry(s.industry);
        setHotDays(s.hot_dormant_days);
        setWarmDays(s.warm_dormant_days);
        setColdDays(s.cold_dormant_days);
        setAdaptiveEnabled(s.adaptive_enabled);
      }
    } catch {
      toast.error("Failed to load recency settings");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /* ---- Run analysis ---- */
  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/purchases/recency-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: false }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
      } else {
        setAnalysis(json.analysis);
        await fetchSettings(); // Refresh to get stored recommendations
        toast.success("Analysis complete");
      }
    } catch {
      toast.error("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  /* ---- Apply recommendations ---- */
  async function handleApplyRecommendations() {
    setApplying(true);
    try {
      const res = await fetch("/api/purchases/recency-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply: true }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
      } else {
        setAnalysis(json.analysis);
        await fetchSettings();
        toast.success("Recommendations applied!");
      }
    } catch {
      toast.error("Failed to apply recommendations");
    } finally {
      setApplying(false);
    }
  }

  /* ---- Save manual settings ---- */
  async function handleSave() {
    if (hotDays <= 0 || warmDays <= hotDays || coldDays <= warmDays) {
      toast.error("Thresholds must be in ascending order: Hot < Warm < Cold");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/purchases/score-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          hot_dormant_days: hotDays,
          warm_dormant_days: warmDays,
          cold_dormant_days: coldDays,
          adaptive_enabled: adaptiveEnabled,
        }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
      } else {
        setSettings(json.settings);
        toast.success("Settings saved");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  /* ---- Industry preset change ---- */
  function handleIndustryChange(preset: IndustryPreset) {
    setIndustry(preset);
    if (preset !== "custom") {
      const p = INDUSTRY_PRESETS[preset];
      setHotDays(p.hot);
      setWarmDays(p.warm);
      setColdDays(p.cold);
    }
  }

  const dirty =
    settings &&
    (industry !== settings.industry ||
      hotDays !== settings.hot_dormant_days ||
      warmDays !== settings.warm_dormant_days ||
      coldDays !== settings.cold_dormant_days ||
      adaptiveEnabled !== settings.adaptive_enabled);

  const hasRecommendations =
    settings?.recommended_hot_days != null &&
    settings?.recommended_warm_days != null &&
    settings?.recommended_cold_days != null;

  if (loading) {
    return (
      <section className="max-w-2xl animate-in fade-in-50 duration-200">
        <SettingsPanelHead
          title="Recency & segmentation"
          description="Configure how customers are segmented by purchase recency."
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-2xl animate-in fade-in-50 duration-200 space-y-6">
      <SettingsPanelHead
        title="Recency & segmentation"
        description="Configure how customers are segmented by purchase recency. Start with industry defaults, then let the system learn from your data."
      />

      {/* ---- Industry Preset ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="size-4 text-primary" />
            Industry preset
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Select your industry to start with proven defaults. Switch to
            &ldquo;Custom&rdquo; for manual control.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.entries(INDUSTRY_PRESETS) as [IndustryPreset, (typeof INDUSTRY_PRESETS)[IndustryPreset]][]).map(
              ([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  disabled={!canEditSettings}
                  onClick={() => handleIndustryChange(key)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    industry === key
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-muted/50 hover:border-muted-foreground/30",
                    !canEditSettings && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <div className="text-sm font-medium text-foreground">
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {preset.description}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {preset.hot}/{preset.warm}/{preset.cold}d
                  </div>
                </button>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- Current Thresholds ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Thermometer className="size-4 text-primary" />
            Dormancy thresholds
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Days since last purchase to classify customers into segments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visual tier display */}
          <div className="space-y-2">
            <ThresholdTier
              icon={Flame}
              label="Hot Dormant"
              days={hotDays}
              recommended={settings?.recommended_hot_days}
              color="bg-orange-500/10 text-orange-400"
              description={`No purchase for ${hotDays}+ days — recently lapsed, easiest to win back`}
            />
            <ThresholdTier
              icon={Sun}
              label="Warm Dormant"
              days={warmDays}
              recommended={settings?.recommended_warm_days}
              color="bg-amber-500/10 text-amber-400"
              description={`No purchase for ${warmDays}+ days — moderately lapsed, needs incentive`}
            />
            <ThresholdTier
              icon={Snowflake}
              label="Cold Dormant"
              days={coldDays}
              recommended={settings?.recommended_cold_days}
              color="bg-blue-500/10 text-blue-400"
              description={`No purchase for ${coldDays}+ days — deeply lapsed, hardest to reactivate`}
            />
          </div>

          {/* Editable inputs */}
          {canEditSettings && (
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hot (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={hotDays}
                  onChange={(e) => {
                    setHotDays(Number(e.target.value));
                    setIndustry("custom");
                  }}
                  className="h-8 border-border bg-muted text-sm text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Warm (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={warmDays}
                  onChange={(e) => {
                    setWarmDays(Number(e.target.value));
                    setIndustry("custom");
                  }}
                  className="h-8 border-border bg-muted text-sm text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cold (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={coldDays}
                  onChange={(e) => {
                    setColdDays(Number(e.target.value));
                    setIndustry("custom");
                  }}
                  className="h-8 border-border bg-muted text-sm text-foreground"
                />
              </div>
            </div>
          )}

          {canEditSettings && dirty && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Thresholds"
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ---- Adaptive Intelligence ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Brain className="size-4 text-primary" />
            Adaptive intelligence
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Let the system analyze your purchase history to recommend optimal
            thresholds. The more data you accumulate, the more accurate the
            recommendations become.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Adaptive toggle */}
          {canEditSettings && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3">
              <div>
                <div className="text-sm font-medium text-foreground">
                  Auto-adaptive mode
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Automatically apply recommendations when confidence is
                  sufficient (≥50%)
                </div>
              </div>
              <Switch
                checked={adaptiveEnabled}
                onCheckedChange={(checked) => {
                  setAdaptiveEnabled(checked);
                }}
              />
            </div>
          )}

          {/* Analysis results */}
          {hasRecommendations && settings && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Data-driven recommendations
                  </span>
                </div>
                <ConfidenceBadge value={settings.data_confidence} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md bg-background/50 p-2">
                  <div className="text-lg font-bold text-orange-400">
                    {settings.recommended_hot_days}d
                  </div>
                  <div className="text-[10px] text-muted-foreground">Hot</div>
                </div>
                <div className="rounded-md bg-background/50 p-2">
                  <div className="text-lg font-bold text-amber-400">
                    {settings.recommended_warm_days}d
                  </div>
                  <div className="text-[10px] text-muted-foreground">Warm</div>
                </div>
                <div className="rounded-md bg-background/50 p-2">
                  <div className="text-lg font-bold text-blue-400">
                    {settings.recommended_cold_days}d
                  </div>
                  <div className="text-[10px] text-muted-foreground">Cold</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Based on{" "}
                  <strong className="text-foreground">
                    {settings.data_sample_size}
                  </strong>{" "}
                  purchase intervals
                </span>
                {settings.last_analysis_at && (
                  <span>
                    Last analyzed:{" "}
                    {new Date(settings.last_analysis_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {canEditSettings &&
                (settings.recommended_hot_days !== settings.hot_dormant_days ||
                  settings.recommended_warm_days !== settings.warm_dormant_days ||
                  settings.recommended_cold_days !==
                    settings.cold_dormant_days) && (
                  <Button
                    onClick={handleApplyRecommendations}
                    disabled={applying}
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {applying ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Apply recommendations
                      </>
                    )}
                  </Button>
                )}

              {settings.recommended_hot_days === settings.hot_dormant_days &&
                settings.recommended_warm_days === settings.warm_dormant_days &&
                settings.recommended_cold_days === settings.cold_dormant_days && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    Thresholds match recommendations
                  </div>
                )}
            </div>
          )}

          {/* Analysis stats (if we have them) */}
          {analysis && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <div className="text-sm font-medium text-foreground flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                Purchase interval statistics
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Median",
                    value: `${analysis.interval_stats.p50_days}d`,
                  },
                  {
                    label: "P75",
                    value: `${analysis.interval_stats.p75_days}d`,
                  },
                  {
                    label: "P90",
                    value: `${analysis.interval_stats.p90_days}d`,
                  },
                  {
                    label: "Mean",
                    value: `${analysis.interval_stats.mean_days}d`,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-md bg-background/50 p-2 text-center"
                  >
                    <div className="text-sm font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  Total contacts:{" "}
                  <strong className="text-foreground">
                    {analysis.contact_stats.total_contacts}
                  </strong>
                </div>
                <div>
                  Repeat customers:{" "}
                  <strong className="text-foreground">
                    {analysis.contact_stats.repeat_customers}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Run analysis button */}
          {canEditSettings && (
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              variant="outline"
              className="w-full border-border bg-transparent text-muted-foreground hover:bg-muted"
            >
              {analyzing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Analyzing purchase data...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  {hasRecommendations
                    ? "Re-analyze purchase data"
                    : "Analyze purchase data"}
                </>
              )}
            </Button>
          )}

          {!hasRecommendations && !analysis && (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <Clock className="size-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No analysis data yet. Click &ldquo;Analyze purchase data&rdquo;
                to generate recommendations based on your transaction history.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Recommendations improve with more data — at least 30 repeat
                purchase intervals are needed for meaningful results.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
