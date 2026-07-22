"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type {
  BusinessInsight, InsightCategory, InsightPriority,
} from "@/types/business-growth";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb, TrendingUp, TrendingDown, AlertTriangle,
  Target, Sparkles, X, CheckCircle, Loader2, RefreshCw,
  ShoppingCart, Users, Package, CreditCard, MessageSquare, Calendar,
} from "lucide-react";

const PRIORITY_CONFIG: Record<InsightPriority, { label: string; color: string; icon: typeof AlertTriangle }> = {
  critical: { label: "Critical", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: AlertTriangle },
  high: { label: "High", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: TrendingUp },
  medium: { label: "Medium", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Target },
  low: { label: "Low", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", icon: Lightbulb },
};

const CATEGORY_CONFIG: Record<InsightCategory, { label: string; icon: typeof ShoppingCart; color: string }> = {
  sales: { label: "Sales", icon: ShoppingCart, color: "text-green-400" },
  customers: { label: "Customers", icon: Users, color: "text-blue-400" },
  inventory: { label: "Inventory", icon: Package, color: "text-yellow-400" },
  payments: { label: "Payments", icon: CreditCard, color: "text-purple-400" },
  engagement: { label: "Engagement", icon: MessageSquare, color: "text-cyan-400" },
  seasonal: { label: "Seasonal", icon: Calendar, color: "text-orange-400" },
};

const TYPE_ICONS: Record<string, typeof TrendingUp> = {
  trend: TrendingUp,
  anomaly: AlertTriangle,
  opportunity: Sparkles,
  risk: AlertTriangle,
  recommendation: Lightbulb,
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const fetchInsights = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (filterPriority !== "all") params.set("priority", filterPriority);
      const res = await fetch(`/api/ai/insights?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch { /* ignore */ }
  }, [filterCategory, filterPriority]);

  useEffect(() => {
    fetchInsights().finally(() => setLoading(false));
  }, [fetchInsights]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/insights", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const data = await res.json();
      toast.success(`Generated ${data.generated} new insights`);
      fetchInsights();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  };

  const handleAction = async (insightId: string, action: "dismiss" | "action_taken") => {
    try {
      const res = await fetch(`/api/ai/insights/${insightId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(action === "dismiss" ? "Insight dismissed" : "Marked as actioned");
      setInsights((prev) => prev.filter((i) => i.id !== insightId));
    } catch {
      toast.error("Failed to update insight");
    }
  };

  // Group insights by category
  const grouped = insights.reduce<Record<string, BusinessInsight[]>>((acc, insight) => {
    const cat = insight.category || "sales";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(insight);
    return acc;
  }, {});

  // Category summary counts
  const categoryCounts = Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => ({
    key,
    ...cfg,
    count: grouped[key]?.length || 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Business Insights</h1>
          <p className="text-zinc-400 text-sm">
            AI-powered analysis of your business patterns and opportunities
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Generate New Insights
        </Button>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {categoryCounts.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card
              key={cat.key}
              className={`bg-zinc-900/50 border-zinc-800 cursor-pointer transition-colors ${
                filterCategory === cat.key ? "border-[#C9A84C]" : "hover:border-zinc-700"
              }`}
              onClick={() => setFilterCategory(filterCategory === cat.key ? "all" : cat.key)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className={`h-5 w-5 ${cat.color}`} />
                <div>
                  <p className="text-xs text-zinc-400">{cat.label}</p>
                  <p className="text-lg font-bold text-white">{cat.count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 bg-zinc-900/50 border-zinc-700 text-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40 bg-zinc-900/50 border-zinc-700 text-white">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setFilterCategory("all"); setFilterPriority("all"); }}
          className="border-zinc-700 text-zinc-400"
        >
          <RefreshCw className="h-3 w-3 mr-1" /> Reset
        </Button>
        <span className="text-sm text-zinc-500 ml-auto">
          {insights.length} active insight{insights.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Insights Grid */}
      {insights.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Lightbulb className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No Active Insights</h3>
            <p className="text-zinc-500 mb-4">
              Click &quot;Generate New Insights&quot; to analyze your business data
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
            >
              <Sparkles className="h-4 w-4 mr-2" /> Generate Insights
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([, a], [, b]) => {
              const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
              const aMax = Math.min(...a.map((i) => priorityOrder[i.priority as keyof typeof priorityOrder] ?? 3));
              const bMax = Math.min(...b.map((i) => priorityOrder[i.priority as keyof typeof priorityOrder] ?? 3));
              return aMax - bMax;
            })
            .map(([category, categoryInsights]) => {
              const catCfg = CATEGORY_CONFIG[category as InsightCategory];
              if (!catCfg) return null;
              const CatIcon = catCfg.icon;

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <CatIcon className={`h-5 w-5 ${catCfg.color}`} />
                    <h2 className="text-lg font-semibold text-white">{catCfg.label}</h2>
                    <Badge variant="outline" className="text-zinc-400 border-zinc-600">
                      {categoryInsights.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryInsights.map((insight) => {
                      const priCfg = PRIORITY_CONFIG[insight.priority] || PRIORITY_CONFIG.medium;
                      const TypeIcon = TYPE_ICONS[insight.insight_type] || Lightbulb;

                      return (
                        <Card key={insight.id} className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <TypeIcon className={`h-4 w-4 ${catCfg.color}`} />
                                <CardTitle className="text-sm font-medium text-white leading-tight">
                                  {insight.title}
                                </CardTitle>
                              </div>
                              <Badge variant="outline" className={`text-xs ${priCfg.color}`}>
                                {priCfg.label}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-zinc-400 leading-relaxed">
                              {insight.description}
                            </p>

                            {/* Metric Change */}
                            {insight.metric_name && (
                              <div className="bg-zinc-800/50 rounded-lg p-2">
                                <p className="text-xs text-zinc-500">{insight.metric_name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-white">
                                    {typeof insight.metric_value === "number"
                                      ? insight.metric_value.toLocaleString()
                                      : "—"}
                                  </span>
                                  {insight.change_percent != null && insight.change_percent !== 0 && (
                                    <span
                                      className={`text-xs flex items-center gap-0.5 ${
                                        insight.change_percent > 0 ? "text-green-400" : "text-red-400"
                                      }`}
                                    >
                                      {insight.change_percent > 0 ? (
                                        <TrendingUp className="h-3 w-3" />
                                      ) : (
                                        <TrendingDown className="h-3 w-3" />
                                      )}
                                      {Math.abs(insight.change_percent).toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Suggested Action */}
                            {insight.suggested_action && (
                              <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-lg p-2">
                                <p className="text-xs text-[#C9A84C] font-medium mb-0.5">Suggested Action</p>
                                <p className="text-xs text-zinc-300">{insight.suggested_action}</p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(insight.id, "action_taken")}
                                className="flex-1 border-green-600/50 text-green-400 hover:bg-green-600/20 text-xs"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" /> Action Taken
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAction(insight.id, "dismiss")}
                                className="border-zinc-700 text-zinc-500 hover:bg-zinc-800 text-xs"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
