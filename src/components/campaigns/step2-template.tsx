"use client";

import { useState, useMemo } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  Star,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Users,
  Eye,
  MessageSquare,
  ShoppingCart,
  Filter,
  LayoutGrid,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type {
  CampaignTemplate,
  CampaignCategory,
  DatabaseAnalysisRecommendation,
} from "@/types/campaigns";

interface Step2TemplateProps {
  templates: CampaignTemplate[];
  selectedTemplate: CampaignTemplate | null;
  onSelect: (t: CampaignTemplate) => void;
  onNext: () => void;
  onBack: () => void;
  recommendations?: DatabaseAnalysisRecommendation[];
}

const CATEGORY_LABELS: Record<CampaignCategory | "all", string> = {
  all: "All",
  reactivation: "Reactivation",
  cart_recovery: "Cart Recovery",
  post_purchase: "Post Purchase",
  lifecycle: "Lifecycle",
  engagement: "Engagement",
  revenue: "Revenue",
  feedback: "Feedback",
};

const CATEGORY_COLORS: Record<CampaignCategory, string> = {
  reactivation: "bg-orange-100 text-orange-700 border-orange-200",
  cart_recovery: "bg-red-100 text-red-700 border-red-200",
  post_purchase: "bg-emerald-100 text-emerald-700 border-emerald-200",
  lifecycle: "bg-blue-100 text-blue-700 border-blue-200",
  engagement: "bg-purple-100 text-purple-700 border-purple-200",
  revenue: "bg-amber-100 text-amber-700 border-amber-200",
  feedback: "bg-teal-100 text-teal-700 border-teal-200",
};

const TIER_CONFIG: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: {
    label: "Basic",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  2: {
    label: "Pro",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  3: {
    label: "Enterprise",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

export function Step2Template({
  templates,
  selectedTemplate,
  onSelect,
  onNext,
  onBack,
  recommendations,
}: Step2TemplateProps) {
  const [activeCategory, setActiveCategory] = useState<
    CampaignCategory | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeTemplates = useMemo(
    () =>
      templates
        .filter((t) => t.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    let result = activeTemplates;

    if (activeCategory !== "all") {
      result = result.filter((t) => t.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [activeTemplates, activeCategory, searchQuery]);

  const recommendedTemplateNames = useMemo(() => {
    if (!recommendations) return new Set<string>();
    return new Set(
      recommendations
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map((r) => r.campaign.toLowerCase())
    );
  }, [recommendations]);

  const recommendedTemplates = useMemo(() => {
    if (recommendedTemplateNames.size === 0) return [];
    return activeTemplates.filter(
      (t) =>
        recommendedTemplateNames.has(t.name.toLowerCase()) ||
        recommendedTemplateNames.has(t.slug.toLowerCase())
    );
  }, [activeTemplates, recommendedTemplateNames]);

  const getRecommendation = (template: CampaignTemplate) => {
    if (!recommendations) return null;
    return recommendations.find(
      (r) =>
        r !== null &&
        (r.campaign.toLowerCase() === template.name.toLowerCase() ||
          r.campaign.toLowerCase() === template.slug.toLowerCase())
    );
  };

  const formatRate = (rate: number | null) => {
    if (rate === null) return "—";
    return `${Math.round(rate * 100)}%`;
  };

  const renderTemplateCard = (
    template: CampaignTemplate,
    isRecommended: boolean = false
  ) => {
    const isSelected = selectedTemplate?.id === template.id;
    const recommendation = getRecommendation(template);
    const tierConfig = TIER_CONFIG[template.tier];

    return (
      <Card
        key={template.id}
        onClick={() => onSelect(template)}
        className={cn(
          "relative cursor-pointer transition-all duration-200 hover:shadow-md",
          isSelected
            ? "border-2 border-emerald-500 ring-2 ring-emerald-200 shadow-md"
            : "border border-gray-200 hover:border-gray-300",
          isRecommended && !isSelected && "border-amber-300 bg-amber-50/30"
        )}
      >
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-emerald-500 text-white rounded-full p-1 shadow-md">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        )}

        <CardContent className="pt-5 pb-4 px-5">
          <div className="space-y-3">
            {/* Header: Icon + Name */}
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none shrink-0">
                {template.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
                  {template.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {template.description}
                </p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  CATEGORY_COLORS[template.category]
                )}
              >
                {CATEGORY_LABELS[template.category]}
              </Badge>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", tierConfig.color)}
              >
                {tierConfig.label}
              </Badge>
              {recommendation && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-300"
                >
                  <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-500" />
                  Recommended
                </Badge>
              )}
            </div>

            {/* Expected Rates */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                      <Eye className="h-3 w-3 text-gray-400 mx-auto mb-0.5" />
                      <p className="text-xs font-semibold text-gray-700">
                        {formatRate(template.expected_open_rate)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Expected open rate</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                      <MessageSquare className="h-3 w-3 text-gray-400 mx-auto mb-0.5" />
                      <p className="text-xs font-semibold text-gray-700">
                        {formatRate(template.expected_reply_rate)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Expected reply rate</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="text-center p-1.5 bg-gray-50 rounded-lg">
                      <ShoppingCart className="h-3 w-3 text-gray-400 mx-auto mb-0.5" />
                      <p className="text-xs font-semibold text-gray-700">
                        {formatRate(template.expected_conversion_rate)}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Expected conversion rate</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Recommendation revenue estimate */}
            {recommendation && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-200">
                <TrendingUp className="h-3 w-3 shrink-0" />
                <span>
                  Est. {formatCurrency(recommendation.estimated_revenue, "NGN")}{" "}
                  from {recommendation.audience_size.toLocaleString()} contacts
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
          <LayoutGrid className="h-4 w-4" />
          Step 2 of 5
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Choose a Campaign Template
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          Select a pre-built campaign template to get started. Each template
          includes optimized message sequences and targeting.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(v) => setActiveCategory(v as CampaignCategory | "all")}
      >
        <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100/80 p-1">
          {(Object.keys(CATEGORY_LABELS) as (CampaignCategory | "all")[]).map(
            (cat) => {
              const count =
                cat === "all"
                  ? activeTemplates.length
                  : activeTemplates.filter((t) => t.category === cat).length;
              if (cat !== "all" && count === 0) return null;
              return (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="text-xs sm:text-sm px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {CATEGORY_LABELS[cat]}
                  <span className="ml-1 text-[10px] text-gray-400">
                    {count}
                  </span>
                </TabsTrigger>
              );
            }
          )}
        </TabsList>
      </Tabs>

      {/* Recommended Section */}
      {recommendedTemplates.length > 0 &&
        activeCategory === "all" &&
        !searchQuery && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-gray-900 text-sm">
                Recommended for You
              </h3>
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-300 text-[10px]"
              >
                Based on your analysis
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gradient-to-br from-amber-50/60 to-yellow-50/40 rounded-xl border-2 border-amber-200 border-dashed">
              {recommendedTemplates.map((t) => renderTemplateCard(t, true))}
            </div>
            <Separator />
          </div>
        )}

      {/* All Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="space-y-3">
          {recommendedTemplates.length > 0 &&
            activeCategory === "all" &&
            !searchQuery && (
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-gray-400" />
                All Templates
              </h3>
            )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((t) => renderTemplateCard(t))}
          </div>
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-gray-100 rounded-full">
                <Filter className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  No templates found
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery
                    ? `No templates match "${searchQuery}". Try a different search term.`
                    : "No templates available in this category."}
                </p>
              </div>
              {(searchQuery || activeCategory !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Template Summary */}
      {selectedTemplate && (
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 -mx-6 px-6 py-3 mt-6 z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">{selectedTemplate.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {selectedTemplate.name}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedTemplate.message_templates.length} messages &middot;{" "}
                  {selectedTemplate.sequence_steps.length} steps
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Selected
            </Badge>
          </div>
        </div>
      )}

      {/* Navigation */}
      <Separator />
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedTemplate}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
