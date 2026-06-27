"use client";

import { useState } from "react";
import {
  Sparkles,
  Database,
  Users,
  ShoppingCart,
  UserX,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  Target,
  Zap,
  RefreshCw,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { DatabaseAnalysis } from "@/types/campaigns";

interface Step1AnalyzeProps {
  onNext: () => void;
  onBack: () => void;
  analysis: DatabaseAnalysis | null;
  onAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
}

export function Step1Analyze({
  onNext,
  onBack,
  analysis,
  onAnalyze,
  isAnalyzing,
}: Step1AnalyzeProps) {
  const [hasAnalyzed, setHasAnalyzed] = useState(!!analysis);

  const handleAnalyze = async () => {
    await onAnalyze();
    setHasAnalyzed(true);
  };

  const totalSegments = analysis
    ? analysis.segments.active.count +
      analysis.segments.at_risk.count +
      analysis.segments.dormant.count
    : 0;

  const getSegmentPercentage = (count: number) => {
    if (totalSegments === 0) return 0;
    return Math.round((count / totalSegments) * 100);
  };

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
          <Database className="h-4 w-4" />
          Step 1 of 5
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Analyze Your Database
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          We&apos;ll scan your customer database to identify segments, revenue
          opportunities, and recommend the best campaigns for your business.
        </p>
      </div>

      {/* Analyze Button - shown when no analysis yet */}
      {!analysis && !isAnalyzing && (
        <div className="flex justify-center py-12">
          <button
            onClick={handleAnalyze}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-lg rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-6 w-6 animate-sparkle" />
            Analyze My Database
            <Zap className="h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
            {/* Sparkle animation ring */}
            <span className="absolute inset-0 rounded-2xl animate-ping-slow bg-emerald-400 opacity-20" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/50">
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                <Database className="h-6 w-6 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-gray-900">
                  Analyzing your database...
                </p>
                <p className="text-sm text-gray-500">
                  Scanning contacts, purchases, and engagement patterns
                </p>
              </div>
              <div className="w-full max-w-xs space-y-2">
                <Progress value={65} className="h-2" />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Scanning segments</span>
                  <span>Calculating revenue</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {analysis && !isAnalyzing && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      Total Contacts
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {analysis.total_contacts.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600">
                      With Purchases
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {analysis.contacts_with_purchases.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {analysis.total_contacts > 0
                        ? Math.round(
                            (analysis.contacts_with_purchases /
                              analysis.total_contacts) *
                              100
                          )
                        : 0}
                      % of total
                    </p>
                  </div>
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">
                      Without Purchases
                    </p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {analysis.contacts_without_purchases.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {analysis.total_contacts > 0
                        ? Math.round(
                            (analysis.contacts_without_purchases /
                              analysis.total_contacts) *
                              100
                          )
                        : 0}
                      % of total
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <UserX className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Segment Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                Segment Breakdown
              </CardTitle>
              <CardDescription>
                Your contacts grouped by engagement level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Active */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="font-medium text-gray-900">
                      {analysis.segments.active.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {analysis.segments.active.count.toLocaleString()} contacts
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-700 border-emerald-200"
                    >
                      {getSegmentPercentage(analysis.segments.active.count)}%
                    </Badge>
                  </div>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${getSegmentPercentage(analysis.segments.active.count)}%`,
                    }}
                  />
                </div>
              </div>

              {/* At Risk */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="font-medium text-gray-900">
                      {analysis.segments.at_risk.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {analysis.segments.at_risk.count.toLocaleString()} contacts
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-700 border-yellow-200"
                    >
                      {getSegmentPercentage(analysis.segments.at_risk.count)}%
                    </Badge>
                  </div>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${getSegmentPercentage(analysis.segments.at_risk.count)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Dormant */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="font-medium text-gray-900">
                      {analysis.segments.dormant.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {analysis.segments.dormant.count.toLocaleString()}{" "}
                      contacts
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-red-700 border-red-200"
                    >
                      {getSegmentPercentage(analysis.segments.dormant.count)}%
                    </Badge>
                  </div>
                </div>
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${getSegmentPercentage(analysis.segments.dormant.count)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Insights */}
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-yellow-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
                Revenue Insights
              </CardTitle>
              <CardDescription>
                Financial overview and recovery potential
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-sm">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                    Total Lifetime Revenue
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(analysis.revenue.total_lifetime, "NGN")}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-amber-200 shadow-sm">
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                    Avg Purchase Value
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(analysis.revenue.avg_purchase_value, "NGN")}
                  </p>
                </div>
                <div className="relative p-4 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl border-2 border-amber-300 shadow-sm overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <Sparkles className="h-4 w-4 text-amber-500 animate-sparkle" />
                  </div>
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">
                    Dormant Potential
                  </p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">
                    {formatCurrency(analysis.revenue.dormant_potential, "NGN")}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Revenue you could recover
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          {analysis.recommendations &&
            analysis.recommendations.filter(Boolean).length > 0 && (
              <Card className="border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-purple-600" />
                    AI Recommendations
                  </CardTitle>
                  <CardDescription>
                    Campaigns suggested based on your database analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analysis.recommendations
                      .filter(
                        (rec): rec is NonNullable<typeof rec> => rec !== null
                      )
                      .map((rec, index) => (
                        <div
                          key={index}
                          className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                              {rec.campaign}
                            </h4>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs shrink-0 ml-2",
                                getPriorityColor(rec.priority)
                              )}
                            >
                              {rec.priority}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="h-3.5 w-3.5" />
                              <span>
                                {rec.audience_size.toLocaleString()} contacts
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                              <TrendingUp className="h-3.5 w-3.5" />
                              <span>
                                Est.{" "}
                                {formatCurrency(
                                  rec.estimated_revenue,
                                  "NGN"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Re-analyze button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-analyze Database
            </Button>
          </div>
        </div>
      )}

      {/* Empty state when analysis returned no contacts */}
      {analysis && analysis.total_contacts === 0 && !isAnalyzing && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-gray-100 rounded-full">
                <Database className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  No contacts found
                </p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Your database appears to be empty. Import contacts first, then
                  come back to analyze and create campaigns.
                </p>
              </div>
              <Button variant="outline" onClick={handleAnalyze}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
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
          disabled={!analysis || analysis.total_contacts === 0}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* CSS Keyframes */}
      <style jsx global>{`
        @keyframes sparkle {
          0%,
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          25% {
            opacity: 0.7;
            transform: scale(0.85) rotate(-5deg);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.7) rotate(0deg);
          }
          75% {
            opacity: 0.7;
            transform: scale(0.85) rotate(5deg);
          }
        }
        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.2;
          }
          75%,
          100% {
            transform: scale(1.15);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-in {
          animation: animateIn 0.5s ease-out forwards;
        }
        @keyframes animateIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
