"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Users,
  UserCheck,
  AlertTriangle,
  UserX,
  UsersRound,
  Settings2,
  Target,
  Info,
  Hash,
  Clock,
  DollarSign,
  Tag,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  CampaignTemplate,
  CampaignAudienceFilter,
  DatabaseAnalysis,
} from "@/types/campaigns";

interface Step3AudienceProps {
  template: CampaignTemplate;
  analysis: DatabaseAnalysis | null;
  audienceFilter: CampaignAudienceFilter;
  onUpdate: (filter: CampaignAudienceFilter) => void;
  audienceCount: number;
  onNext: () => void;
  onBack: () => void;
}

type SegmentOption = "active" | "at_risk" | "dormant" | "all" | "custom";

interface SegmentConfigItem {
  label: string;
  description: string;
  icon: typeof Users;
  color: string;
  bgColor: string;
  borderColor: string;
  ringColor: string;
  dotColor: string;
}

const SEGMENT_CONFIG: Record<Exclude<SegmentOption, "custom">, SegmentConfigItem> = {
  active: {
    label: "Active",
    description: "Recently engaged customers who purchased or interacted within the last 90 days",
    icon: UserCheck,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    ringColor: "ring-emerald-200",
    dotColor: "bg-emerald-500",
  },
  at_risk: {
    label: "At Risk",
    description: "Customers showing declining engagement, inactive for 90–180 days",
    icon: AlertTriangle,
    color: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    ringColor: "ring-yellow-200",
    dotColor: "bg-yellow-500",
  },
  dormant: {
    label: "Dormant",
    description: "Inactive customers with no engagement for 180+ days but recovery potential",
    icon: UserX,
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    ringColor: "ring-red-200",
    dotColor: "bg-red-500",
  },
  all: {
    label: "All Contacts",
    description: "Target your entire database regardless of engagement level",
    icon: UsersRound,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    ringColor: "ring-blue-200",
    dotColor: "bg-blue-500",
  },
};

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 600;
    const startTime = performance.now();

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    prevValueRef.current = endValue;

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
}

function deriveSegmentFromFilter(filter: CampaignAudienceFilter): SegmentOption {
  if (filter.segment) {
    const seg = filter.segment.toLowerCase();
    if (seg === "active" || seg === "at_risk" || seg === "dormant" || seg === "all") {
      return seg;
    }
    return "custom";
  }
  return "all";
}

export function Step3Audience({
  template,
  analysis,
  audienceFilter,
  onUpdate,
  audienceCount,
  onNext,
  onBack,
}: Step3AudienceProps) {
  const [selectedSegment, setSelectedSegment] = useState<SegmentOption>(
    () => deriveSegmentFromFilter(audienceFilter)
  );

  const [minPurchaseValue, setMinPurchaseValue] = useState<string>(
    audienceFilter.min_purchase_value?.toString() ?? ""
  );
  const [minDaysInactive, setMinDaysInactive] = useState<string>(
    audienceFilter.min_days_inactive?.toString() ?? ""
  );
  const [customTags, setCustomTags] = useState<string>("");

  const getSegmentCount = (
    segment: Exclude<SegmentOption, "custom">
  ): number | null => {
    if (!analysis) return null;
    switch (segment) {
      case "active":
        return analysis.segments.active.count;
      case "at_risk":
        return analysis.segments.at_risk.count;
      case "dormant":
        return analysis.segments.dormant.count;
      case "all":
        return analysis.total_contacts;
    }
  };

  const totalSegments = analysis
    ? analysis.segments.active.count +
      analysis.segments.at_risk.count +
      analysis.segments.dormant.count
    : 0;

  const handleSegmentChange = (value: SegmentOption) => {
    setSelectedSegment(value);
    const newFilter: CampaignAudienceFilter = { ...audienceFilter };

    if (value === "custom") {
      newFilter.segment = undefined;
    } else {
      newFilter.segment = value;
    }

    onUpdate(newFilter);
  };

  const handleMinPurchaseChange = (value: string) => {
    setMinPurchaseValue(value);
    const numValue = parseFloat(value);
    onUpdate({
      ...audienceFilter,
      min_purchase_value: isNaN(numValue) || value === "" ? undefined : numValue,
    });
  };

  const handleMinDaysInactiveChange = (value: string) => {
    setMinDaysInactive(value);
    const numValue = parseInt(value, 10);
    onUpdate({
      ...audienceFilter,
      min_days_inactive: isNaN(numValue) || value === "" ? undefined : numValue,
    });
  };

  const handleCustomTagsChange = (value: string) => {
    setCustomTags(value);
    const tags = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onUpdate({
      ...audienceFilter,
      custom_filter: tags.length > 0 ? { tags } : undefined,
    });
  };

  const hasActiveFilters =
    audienceFilter.segment ||
    audienceFilter.min_purchase_value !== undefined ||
    audienceFilter.min_days_inactive !== undefined ||
    audienceFilter.custom_filter !== undefined;

  const hasDefaultFilters =
    template.audience_filter.segment ||
    template.audience_filter.min_days_inactive ||
    template.audience_filter.min_purchase_value ||
    template.audience_filter.has_upsell_products ||
    template.audience_filter.min_days_since_purchase ||
    template.audience_filter.has_date_field ||
    template.audience_filter.min_lifetime_value ||
    template.audience_filter.min_purchases;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm font-medium">
          <Target className="h-4 w-4" />
          Step 3 of 5
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Select Your Audience
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          Choose which contacts to target with your{" "}
          <span className="font-medium text-gray-700">{template.name}</span>{" "}
          campaign.
        </p>
      </div>

      {/* Template Default Filter Info */}
      {hasDefaultFilters && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Template Default Targeting
                </p>
                <p className="text-xs text-blue-600 mt-1 mb-2">
                  This template comes with pre-configured targeting. You can customize below.
                </p>
                <div className="flex flex-wrap gap-2">
                  {template.audience_filter.segment && (
                    <Badge
                      variant="outline"
                      className="bg-white text-blue-700 border-blue-200 text-xs"
                    >
                      Segment: {template.audience_filter.segment}
                    </Badge>
                  )}
                  {template.audience_filter.min_days_inactive !== undefined && (
                    <Badge
                      variant="outline"
                      className="bg-white text-blue-700 border-blue-200 text-xs"
                    >
                      Min {template.audience_filter.min_days_inactive} days inactive
                    </Badge>
                  )}
                  {template.audience_filter.min_purchase_value !== undefined && (
                    <Badge
                      variant="outline"
                      className="bg-white text-blue-700 border-blue-200 text-xs"
                    >
                      Min purchase: {template.audience_filter.min_purchase_value.toLocaleString()}
                    </Badge>
                  )}
                  {template.audience_filter.has_upsell_products && (
                    <Badge
                      variant="outline"
                      className="bg-white text-blue-700 border-blue-200 text-xs"
                    >
                      Has upsell products
                    </Badge>
                  )}
                  {template.audience_filter.min_days_since_purchase !== undefined && (
                    <Badge
                      variant="outline"
                      className="bg-white text-blue-700 border-blue-200 text-xs"
                    >
                      Min {template.audience_filter.min_days_since_purchase} days since purchase
                    </Badge>
                  )}
                  {template.audience_filter.has_date_field && (
                    <Badge
                      variant="outline"
                      className="bg-white text-blue-700 border-blue-200 text-xs"
                    >
                      Date field: {template.audience_filter.has_date_field}
                    </Badge>
                  )}
                  {template.audience_filter.min_lifetime_value !== undefined && (
                    <Badge
                      variant="outline"
                      className="bg-white text-blue-700 border-blue-200 text-xs"
                    >
                      Min LTV: {template.audience_filter.min_lifetime_value.toLocaleString()}
                    </Badge>
                  )}
                  {template.audience_filter.min_purchases !== undefined && (
                    <Badge
                      variant="outline"
                      className="bg-white text-blue-700 border-blue-200 text-xs"
                    >
                      Min {template.audience_filter.min_purchases} purchases
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segment Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-gray-600" />
            Target Segment
          </CardTitle>
          <CardDescription>
            Select which customer segment to target with this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedSegment}
            onValueChange={(v) => handleSegmentChange(v as SegmentOption)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {(
              Object.entries(SEGMENT_CONFIG) as [
                Exclude<SegmentOption, "custom">,
                SegmentConfigItem,
              ][]
            ).map(([key, config]) => {
              const count = getSegmentCount(key);
              const Icon = config.icon;
              const isSelected = selectedSegment === key;

              return (
                <Label
                  key={key}
                  htmlFor={`segment-${key}`}
                  className={cn(
                    "relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                    isSelected
                      ? cn(
                          config.bgColor,
                          config.borderColor,
                          "shadow-sm ring-1",
                          config.ringColor
                        )
                      : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50"
                  )}
                >
                  <RadioGroupItem
                    value={key}
                    id={`segment-${key}`}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "p-1 rounded-md",
                          isSelected ? config.bgColor : "bg-gray-100"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isSelected ? config.color : "text-gray-400"
                          )}
                        />
                      </div>
                      <span
                        className={cn(
                          "font-semibold text-sm",
                          isSelected ? config.color : "text-gray-900"
                        )}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      {config.description}
                    </p>
                    {count !== null && (
                      <div className="flex items-center gap-2 mt-2.5">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            config.dotColor
                          )}
                        />
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-medium",
                            isSelected
                              ? cn(config.bgColor, config.color)
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {count.toLocaleString()} contacts
                          {key !== "all" && totalSegments > 0 && (
                            <span className="ml-1 opacity-70">
                              ({Math.round((count / totalSegments) * 100)}%)
                            </span>
                          )}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Label>
              );
            })}

            {/* Custom option */}
            <Label
              htmlFor="segment-custom"
              className={cn(
                "relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 sm:col-span-2",
                selectedSegment === "custom"
                  ? "bg-gray-50 border-gray-400 shadow-sm ring-1 ring-gray-300"
                  : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50"
              )}
            >
              <RadioGroupItem
                value="custom"
                id="segment-custom"
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "p-1 rounded-md",
                      selectedSegment === "custom" ? "bg-gray-200" : "bg-gray-100"
                    )}
                  >
                    <Settings2
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selectedSegment === "custom"
                          ? "text-gray-700"
                          : "text-gray-400"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "font-semibold text-sm",
                      selectedSegment === "custom"
                        ? "text-gray-700"
                        : "text-gray-900"
                    )}
                  >
                    Custom
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  Define your own targeting criteria using the filters below. Combine
                  multiple conditions for precise audience selection.
                </p>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Additional Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-gray-600" />
            Additional Filters
          </CardTitle>
          <CardDescription>
            Refine your audience with additional criteria. These filters combine
            with your segment selection above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Min Purchase Value */}
          <div className="space-y-2">
            <Label
              htmlFor="min-purchase"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <DollarSign className="h-4 w-4 text-gray-400" />
              Minimum Purchase Value (NGN)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="max-w-xs">
                      Only target contacts who have spent at least this amount in
                      a single purchase
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="min-purchase"
              type="number"
              placeholder="e.g. 5000"
              value={minPurchaseValue}
              onChange={(e) => handleMinPurchaseChange(e.target.value)}
              min={0}
              step={500}
              className="max-w-xs"
            />
            <p className="text-xs text-gray-400">
              Leave empty to include all purchase values
            </p>
          </div>

          <Separator />

          {/* Min Days Inactive */}
          <div className="space-y-2">
            <Label
              htmlFor="min-days"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Clock className="h-4 w-4 text-gray-400" />
              Minimum Days Inactive
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="max-w-xs">
                      Only target contacts who have been inactive for at least
                      this many days since their last interaction
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="min-days"
              type="number"
              placeholder="e.g. 30"
              value={minDaysInactive}
              onChange={(e) => handleMinDaysInactiveChange(e.target.value)}
              min={0}
              step={1}
              className="max-w-xs"
            />
            <p className="text-xs text-gray-400">
              Leave empty to include contacts regardless of activity
            </p>
          </div>

          <Separator />

          {/* Custom Tags */}
          <div className="space-y-2">
            <Label
              htmlFor="custom-tags"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <Tag className="h-4 w-4 text-gray-400" />
              Custom Tags
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="max-w-xs">
                      Filter contacts by tags assigned in your CRM. Contacts must
                      have at least one of the specified tags.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="custom-tags"
              type="text"
              placeholder="e.g. vip, wholesale, lagos"
              value={customTags}
              onChange={(e) => handleCustomTagsChange(e.target.value)}
              className="max-w-md"
            />
            <p className="text-xs text-gray-400">
              Separate multiple tags with commas. Leave empty to skip tag filtering.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audience Count Preview */}
      <Card
        className={cn(
          "border-2 transition-all duration-500",
          audienceCount > 0
            ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50/50"
            : "border-gray-300 bg-gray-50"
        )}
      >
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className={cn(
                "p-4 rounded-full transition-colors duration-500",
                audienceCount > 0 ? "bg-emerald-100" : "bg-gray-200"
              )}
            >
              <Users
                className={cn(
                  "h-8 w-8 transition-colors duration-500",
                  audienceCount > 0 ? "text-emerald-600" : "text-gray-400"
                )}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                This campaign will reach approximately
              </p>
              <p
                className={cn(
                  "text-5xl sm:text-6xl font-bold mt-2 tracking-tight transition-colors duration-500",
                  audienceCount > 0 ? "text-emerald-700" : "text-gray-400"
                )}
              >
                ~<AnimatedCounter value={audienceCount} />
              </p>
              <p className="text-sm text-gray-500 mt-1">contacts</p>
            </div>

            {audienceCount === 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-2.5 border border-amber-200 max-w-md">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  No contacts match your current filters. Try selecting a
                  different segment or broadening your criteria.
                </span>
              </div>
            )}

            {audienceCount > 0 && analysis && analysis.total_contacts > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  {Math.round(
                    (audienceCount / analysis.total_contacts) * 100
                  )}
                  % of your total database ({analysis.total_contacts.toLocaleString()}{" "}
                  contacts)
                </p>
                {/* Mini progress bar */}
                <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden mx-auto">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(
                        Math.round(
                          (audienceCount / analysis.total_contacts) * 100
                        ),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Active filters:
          </span>
          {audienceFilter.segment && (
            <Badge
              variant="secondary"
              className="text-xs gap-1 bg-gray-100 text-gray-700"
            >
              <Hash className="h-3 w-3" />
              {audienceFilter.segment}
            </Badge>
          )}
          {audienceFilter.min_purchase_value !== undefined && (
            <Badge
              variant="secondary"
              className="text-xs gap-1 bg-gray-100 text-gray-700"
            >
              <DollarSign className="h-3 w-3" />
              Min {audienceFilter.min_purchase_value.toLocaleString()}
            </Badge>
          )}
          {audienceFilter.min_days_inactive !== undefined && (
            <Badge
              variant="secondary"
              className="text-xs gap-1 bg-gray-100 text-gray-700"
            >
              <Clock className="h-3 w-3" />
              {audienceFilter.min_days_inactive}+ days inactive
            </Badge>
          )}
          {audienceFilter.custom_filter && (
            <Badge
              variant="secondary"
              className="text-xs gap-1 bg-gray-100 text-gray-700"
            >
              <Tag className="h-3 w-3" />
              Custom tags applied
            </Badge>
          )}
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
          disabled={audienceCount === 0}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
