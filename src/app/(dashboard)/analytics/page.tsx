"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, TrendingUp, TrendingDown, DollarSign, Users,
  Package, FileText, Award, UserPlus, BarChart3, Activity,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

interface MetricCard {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
}

interface OperationalData {
  revenue: { current_month: number; previous_month: number; trend: number };
  debts: { total_outstanding: number; total_overdue: number; collection_rate: number };
  inventory: { total_value: number; low_stock_count: number; out_of_stock: number };
  invoices: { unpaid_total: number; overdue_total: number; this_month_count: number };
  loyalty: { active_members: number; points_outstanding: number; tier_distribution: Record<string, number> };
  referrals: { total: number; converted: number; conversion_rate: number; pending: number };
}

function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function TrendBadge({ value }: { value?: number }) {
  if (value === undefined || value === null) return null;
  const isPositive = value > 0;
  const isNeutral = value === 0;
  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        isNeutral
          ? "text-zinc-400 border-zinc-700"
          : isPositive
          ? "text-green-400 border-green-500/30 bg-green-500/10"
          : "text-red-400 border-red-500/30 bg-red-500/10"
      }`}
    >
      {isNeutral ? (
        <Minus className="h-3 w-3 mr-1" />
      ) : isPositive ? (
        <ArrowUpRight className="h-3 w-3 mr-1" />
      ) : (
        <ArrowDownRight className="h-3 w-3 mr-1" />
      )}
      {Math.abs(value).toFixed(1)}%
    </Badge>
  );
}

function StatCard({ card }: { card: MetricCard }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-zinc-400">{card.label}</p>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            {card.changeLabel && (
              <p className="text-xs text-zinc-500">{card.changeLabel}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="p-2 rounded-lg bg-zinc-800/50">{card.icon}</div>
            {card.change !== undefined && <TrendBadge value={card.change} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("operations");
  const [loading, setLoading] = useState(true);
  const [opsData, setOpsData] = useState<OperationalData | null>(null);
  const [marketingData, setMarketingData] = useState<Record<string, unknown> | null>(null);

  const fetchOperationalData = useCallback(async () => {
    try {
      // Fetch from multiple endpoints
      const [debtRes, invRes, loyaltyRes, referralRes, inventoryRes] = await Promise.allSettled([
        fetch("/api/debt/summary"),
        fetch("/api/invoices?summary=true"),
        fetch("/api/loyalty"),
        fetch("/api/referrals?summary=true"),
        fetch("/api/inventory/summary"),
      ]);

      const debt = debtRes.status === "fulfilled" && debtRes.value.ok
        ? await debtRes.value.json() : { total_outstanding: 0, total_overdue: 0, collection_rate: 0 };
      const inv = invRes.status === "fulfilled" && invRes.value.ok
        ? await invRes.value.json() : { unpaid_total: 0, overdue_total: 0, this_month_count: 0 };
      const loyalty = loyaltyRes.status === "fulfilled" && loyaltyRes.value.ok
        ? await loyaltyRes.value.json() : { active_members: 0, points_outstanding: 0, tier_distribution: {} };
      const referral = referralRes.status === "fulfilled" && referralRes.value.ok
        ? await referralRes.value.json() : { total: 0, converted: 0, conversion_rate: 0, pending: 0 };
      const inventory = inventoryRes.status === "fulfilled" && inventoryRes.value.ok
        ? await inventoryRes.value.json() : { total_value: 0, low_stock_count: 0, out_of_stock: 0 };

      setOpsData({
        revenue: { current_month: 0, previous_month: 0, trend: 0 },
        debts: debt.summary || debt,
        inventory: inventory.summary || inventory,
        invoices: inv.summary || inv,
        loyalty: loyalty.stats || loyalty,
        referrals: referral.stats || referral,
      });
    } catch {
      // Silently fail, show empty state
    }
    setLoading(false);
  }, []);

  const fetchMarketingData = useCallback(async () => {
    try {
      const [campaignRes, contactRes] = await Promise.allSettled([
        fetch("/api/campaigns?summary=true"),
        fetch("/api/contacts?summary=true"),
      ]);

      const campaigns = campaignRes.status === "fulfilled" && campaignRes.value.ok
        ? await campaignRes.value.json() : {};
      const contacts = contactRes.status === "fulfilled" && contactRes.value.ok
        ? await contactRes.value.json() : {};

      setMarketingData({ campaigns, contacts });
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchOperationalData();
    fetchMarketingData();
  }, [fetchOperationalData, fetchMarketingData]);

  const operationalCards: MetricCard[] = opsData
    ? [
        {
          label: "Outstanding Debts",
          value: formatNaira(opsData.debts.total_outstanding || 0),
          icon: <DollarSign className="h-5 w-5 text-red-400" />,
          changeLabel: `${formatNaira(opsData.debts.total_overdue || 0)} overdue`,
        },
        {
          label: "Collection Rate",
          value: `${(opsData.debts.collection_rate || 0).toFixed(1)}%`,
          icon: <TrendingUp className="h-5 w-5 text-green-400" />,
        },
        {
          label: "Inventory Value",
          value: formatNaira(opsData.inventory.total_value || 0),
          icon: <Package className="h-5 w-5 text-blue-400" />,
          changeLabel: `${opsData.inventory.low_stock_count || 0} low stock, ${opsData.inventory.out_of_stock || 0} out`,
        },
        {
          label: "Unpaid Invoices",
          value: formatNaira(opsData.invoices.unpaid_total || 0),
          icon: <FileText className="h-5 w-5 text-amber-400" />,
          changeLabel: `${formatNaira(opsData.invoices.overdue_total || 0)} overdue`,
        },
        {
          label: "Loyalty Members",
          value: String(opsData.loyalty.active_members || 0),
          icon: <Award className="h-5 w-5 text-[#C9A84C]" />,
          changeLabel: `${(opsData.loyalty.points_outstanding || 0).toLocaleString()} points outstanding`,
        },
        {
          label: "Referrals",
          value: String(opsData.referrals.total || 0),
          icon: <UserPlus className="h-5 w-5 text-purple-400" />,
          changeLabel: `${opsData.referrals.converted || 0} converted (${(opsData.referrals.conversion_rate || 0).toFixed(1)}%)`,
        },
      ]
    : [];

  const marketingCards: MetricCard[] = [
    {
      label: "Total Contacts",
      value: String((marketingData?.contacts as Record<string, unknown>)?.total || 0),
      icon: <Users className="h-5 w-5 text-blue-400" />,
    },
    {
      label: "Active Campaigns",
      value: String((marketingData?.campaigns as Record<string, unknown>)?.active || 0),
      icon: <BarChart3 className="h-5 w-5 text-green-400" />,
    },
    {
      label: "Messages Sent (30d)",
      value: String((marketingData?.campaigns as Record<string, unknown>)?.messages_sent || 0),
      icon: <Activity className="h-5 w-5 text-[#C9A84C]" />,
    },
    {
      label: "Avg Open Rate",
      value: `${((marketingData?.campaigns as Record<string, unknown>)?.avg_open_rate as number || 0).toFixed(1)}%`,
      icon: <TrendingUp className="h-5 w-5 text-purple-400" />,
    },
  ];

  // Tier distribution chart (simple bar)
  const tierDist = opsData?.loyalty.tier_distribution || {};
  const tierColors: Record<string, string> = {
    bronze: "bg-orange-600",
    silver: "bg-zinc-400",
    gold: "bg-[#C9A84C]",
    platinum: "bg-purple-500",
  };
  const totalMembers = Object.values(tierDist).reduce((a, b) => a + (b as number), 0) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-zinc-400 mt-1">Track your marketing and operational performance.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="operations" className="data-[state=active]:bg-zinc-800">
            Operations
          </TabsTrigger>
          <TabsTrigger value="marketing" className="data-[state=active]:bg-zinc-800">
            Marketing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="mt-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {operationalCards.map((card) => (
                  <StatCard key={card.label} card={card} />
                ))}
              </div>

              {/* Loyalty Tier Distribution */}
              {Object.keys(tierDist).length > 0 && (
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Loyalty Tier Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(tierDist).map(([tier, count]) => (
                        <div key={tier} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-zinc-300 capitalize">{tier}</span>
                            <span className="text-zinc-400">
                              {count as number} ({(((count as number) / totalMembers) * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${tierColors[tier] || "bg-zinc-600"}`}
                              style={{ width: `${((count as number) / totalMembers) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Debt Aging placeholder */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Debt Aging Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    {["0-30 days", "31-60 days", "61-90 days", "90+ days"].map((range) => (
                      <div key={range} className="p-3 rounded-lg bg-zinc-800/50">
                        <p className="text-xs text-zinc-500">{range}</p>
                        <p className="text-lg font-bold text-white mt-1">-</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-3 text-center">
                    Detailed aging data available after recording debt entries.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="marketing" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketingCards.map((card) => (
              <StatCard key={card.label} card={card} />
            ))}
          </div>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                Detailed campaign analytics are available on individual campaign pages.
                Visit the Campaigns section to view per-campaign metrics.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Engagement Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                Message engagement trends, response rates, and customer interaction
                patterns will populate as you send more campaigns.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
