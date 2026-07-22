"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { LoyaltyConfig, LoyaltyTransaction } from "@/types/business-growth";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Award, Users, Star, Loader2, TrendingUp,
  Plus, Minus, Crown, Gem, Medal, CircleDot,
} from "lucide-react";

interface LoyaltyStats {
  active_members: number;
  total_points_outstanding: number;
  tier_distribution: Record<string, number>;
  total_redeemed: number;
}

interface MemberRow {
  id: string;
  name: string;
  phone: string;
  loyalty_points: number;
  loyalty_tier: string;
  updated_at: string;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  bronze: { label: "Bronze", color: "bg-orange-800/30 text-orange-300 border-orange-700/50", icon: CircleDot },
  silver: { label: "Silver", color: "bg-zinc-400/20 text-zinc-300 border-zinc-500/50", icon: Medal },
  gold: { label: "Gold", color: "bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/50", icon: Star },
  platinum: { label: "Platinum", color: "bg-purple-500/20 text-purple-300 border-purple-500/50", icon: Crown },
};

const TXN_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  purchase: { label: "Purchase", color: "text-green-400" },
  referral: { label: "Referral", color: "text-blue-400" },
  review: { label: "Review", color: "text-purple-400" },
  birthday: { label: "Birthday", color: "text-pink-400" },
  manual: { label: "Manual", color: "text-[#C9A84C]" },
  redemption: { label: "Redemption", color: "text-red-400" },
  expiry: { label: "Expired", color: "text-zinc-500" },
};

export default function LoyaltyPage() {
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Adjust form
  const [adjustForm, setAdjustForm] = useState({
    contact_id: "",
    action: "award" as "award" | "redeem",
    points: 0,
    description: "",
  });

  // Config form
  const [configForm, setConfigForm] = useState({
    is_active: true,
    programme_name: "Loyalty Programme",
    points_per_naira: 1,
    points_per_referral: 100,
    points_per_review: 50,
    birthday_bonus_points: 200,
    silver_threshold: 500,
    gold_threshold: 2000,
    platinum_threshold: 5000,
    silver_discount_percent: 5,
    gold_discount_percent: 10,
    platinum_discount_percent: 15,
    points_to_naira_rate: 0.5,
    min_redemption_points: 100,
    points_expire: false,
    points_expiry_months: 12,
  });

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, configRes, txnRes] = await Promise.all([
        fetch("/api/loyalty"),
        fetch("/api/loyalty/config"),
        fetch("/api/loyalty/transactions?limit=100"),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        if (data.config) {
          setConfig(data.config);
          setConfigForm({
            is_active: data.config.is_active ?? true,
            programme_name: data.config.programme_name || "Loyalty Programme",
            points_per_naira: data.config.points_per_naira ?? 1,
            points_per_referral: data.config.points_per_referral ?? 100,
            points_per_review: data.config.points_per_review ?? 50,
            birthday_bonus_points: data.config.birthday_bonus_points ?? 200,
            silver_threshold: data.config.silver_threshold ?? 500,
            gold_threshold: data.config.gold_threshold ?? 2000,
            platinum_threshold: data.config.platinum_threshold ?? 5000,
            silver_discount_percent: data.config.silver_discount_percent ?? 5,
            gold_discount_percent: data.config.gold_discount_percent ?? 10,
            platinum_discount_percent: data.config.platinum_discount_percent ?? 15,
            points_to_naira_rate: data.config.points_to_naira_rate ?? 0.5,
            min_redemption_points: data.config.min_redemption_points ?? 100,
            points_expire: data.config.points_expire ?? false,
            points_expiry_months: data.config.points_expiry_months ?? 12,
          });
        }
      }
      if (txnRes.ok) {
        const data = await txnRes.json();
        setTransactions(data.transactions || []);

        // Derive members from transactions
        const memberMap = new Map<string, MemberRow>();
        for (const txn of (data.transactions || []) as LoyaltyTransaction[]) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const contact = txn.contact as any;
          if (contact && !memberMap.has(txn.contact_id)) {
            memberMap.set(txn.contact_id, {
              id: txn.contact_id,
              name: contact.name || "Unknown",
              phone: contact.phone || "",
              loyalty_points: txn.balance_after,
              loyalty_tier: "bronze",
              updated_at: txn.created_at,
            });
          }
        }
        setMembers(Array.from(memberMap.values()));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleAdjust = async () => {
    if (!adjustForm.contact_id || !adjustForm.points || !adjustForm.description) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/loyalty/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: adjustForm.contact_id,
          action: adjustForm.action,
          points: adjustForm.points,
          description: adjustForm.description,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success(`Points ${adjustForm.action === "award" ? "awarded" : "redeemed"} successfully`);
      setShowAdjustModal(false);
      setAdjustForm({ contact_id: "", action: "award", points: 0, description: "" });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/loyalty/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Loyalty settings saved");
      const data = await res.json();
      setConfig(data.config);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const formatNumber = (n: number) => n.toLocaleString();

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
          <h1 className="text-2xl font-bold text-white">
            {config?.programme_name || "Loyalty Programme"}
          </h1>
          <p className="text-zinc-400 text-sm">Reward your best customers with points and tiers</p>
        </div>
        <Button
          onClick={() => setShowAdjustModal(true)}
          className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
        >
          <Plus className="h-4 w-4 mr-2" /> Adjust Points
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs text-zinc-400">Active Members</p>
                <p className="text-xl font-bold text-white">{formatNumber(stats?.active_members || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-[#C9A84C]" />
              <div>
                <p className="text-xs text-zinc-400">Points Outstanding</p>
                <p className="text-xl font-bold text-white">{formatNumber(stats?.total_points_outstanding || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-xs text-zinc-400">Total Redeemed</p>
                <p className="text-xl font-bold text-white">{formatNumber(stats?.total_redeemed || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Gem className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-xs text-zinc-400">Tier Distribution</p>
                <div className="flex gap-1 mt-1">
                  {Object.entries(stats?.tier_distribution || {}).map(([tier, count]) => (
                    count > 0 && (
                      <Badge key={tier} variant="outline" className={`text-[10px] px-1 ${TIER_CONFIG[tier]?.color || ""}`}>
                        {tier[0].toUpperCase()}: {count}
                      </Badge>
                    )
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="overview">Members</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Members */}
        <TabsContent value="overview">
          {members.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="py-12 text-center">
                <Award className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">No Loyalty Members Yet</h3>
                <p className="text-zinc-500">Points will be awarded automatically on purchases</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Customer</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Phone</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Points</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Tier</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const tierInfo = TIER_CONFIG[member.loyalty_tier] || TIER_CONFIG.bronze;
                    const TierIcon = tierInfo.icon;
                    return (
                      <tr key={member.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-3 px-4 text-sm font-medium text-white">{member.name}</td>
                        <td className="py-3 px-4 text-sm text-zinc-400">{member.phone}</td>
                        <td className="py-3 px-4 text-sm font-medium text-[#C9A84C]">
                          {formatNumber(member.loyalty_points)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={tierInfo.color}>
                            <TierIcon className="h-3 w-3 mr-1" />
                            {tierInfo.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {new Date(member.updated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="transactions">
          {transactions.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="py-12 text-center">
                <p className="text-zinc-500">No transactions yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Date</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Customer</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Type</th>
                    <th className="text-right text-xs text-zinc-400 font-medium py-3 px-4">Points</th>
                    <th className="text-right text-xs text-zinc-400 font-medium py-3 px-4">Balance</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const contact = txn.contact as any;
                    const typeInfo = TXN_TYPE_LABELS[txn.transaction_type] || { label: txn.transaction_type, color: "text-zinc-400" };
                    const isPositive = txn.points > 0;
                    return (
                      <tr key={txn.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {new Date(txn.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-white">
                          {contact?.name || "Unknown"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-sm font-medium text-right ${
                          isPositive ? "text-green-400" : "text-red-400"
                        }`}>
                          {isPositive ? "+" : ""}{formatNumber(txn.points)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-300 text-right">
                          {formatNumber(txn.balance_after)}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400 max-w-xs truncate">
                          {txn.description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Loyalty Programme Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* General */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">General</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Programme Active</Label>
                    <p className="text-xs text-zinc-400">Enable or disable the loyalty programme</p>
                  </div>
                  <Switch
                    checked={configForm.is_active}
                    onCheckedChange={(v) => setConfigForm({ ...configForm, is_active: v })}
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Programme Name</Label>
                  <Input
                    value={configForm.programme_name}
                    onChange={(e) => setConfigForm({ ...configForm, programme_name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white max-w-sm"
                  />
                </div>
              </div>

              {/* Points Earning */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Points Earning</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-300">Points per Naira Spent</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={configForm.points_per_naira}
                      onChange={(e) => setConfigForm({ ...configForm, points_per_naira: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                    <p className="text-xs text-zinc-500 mt-1">e.g. 1 = 1 point per NGN 1 spent</p>
                  </div>
                  <div>
                    <Label className="text-zinc-300">Points per Referral</Label>
                    <Input
                      type="number"
                      value={configForm.points_per_referral}
                      onChange={(e) => setConfigForm({ ...configForm, points_per_referral: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Points per Review</Label>
                    <Input
                      type="number"
                      value={configForm.points_per_review}
                      onChange={(e) => setConfigForm({ ...configForm, points_per_review: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Birthday Bonus Points</Label>
                    <Input
                      type="number"
                      value={configForm.birthday_bonus_points}
                      onChange={(e) => setConfigForm({ ...configForm, birthday_bonus_points: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Tier Thresholds */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Tier Thresholds</h3>
                <p className="text-xs text-zinc-500">Points needed to reach each tier</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-zinc-300 flex items-center gap-2">
                      <Medal className="h-4 w-4 text-zinc-400" /> Silver Threshold
                    </Label>
                    <Input
                      type="number"
                      value={configForm.silver_threshold}
                      onChange={(e) => setConfigForm({ ...configForm, silver_threshold: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300 flex items-center gap-2">
                      <Star className="h-4 w-4 text-[#C9A84C]" /> Gold Threshold
                    </Label>
                    <Input
                      type="number"
                      value={configForm.gold_threshold}
                      onChange={(e) => setConfigForm({ ...configForm, gold_threshold: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300 flex items-center gap-2">
                      <Crown className="h-4 w-4 text-purple-400" /> Platinum Threshold
                    </Label>
                    <Input
                      type="number"
                      value={configForm.platinum_threshold}
                      onChange={(e) => setConfigForm({ ...configForm, platinum_threshold: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Tier Benefits */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Tier Benefits (Discount %)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-zinc-300">Silver Discount %</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={configForm.silver_discount_percent}
                      onChange={(e) => setConfigForm({ ...configForm, silver_discount_percent: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Gold Discount %</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={configForm.gold_discount_percent}
                      onChange={(e) => setConfigForm({ ...configForm, gold_discount_percent: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Platinum Discount %</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={configForm.platinum_discount_percent}
                      onChange={(e) => setConfigForm({ ...configForm, platinum_discount_percent: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Redemption */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Redemption</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-300">Points to Naira Rate</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={configForm.points_to_naira_rate}
                      onChange={(e) => setConfigForm({ ...configForm, points_to_naira_rate: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                    <p className="text-xs text-zinc-500 mt-1">e.g. 0.5 = 100 points = NGN 50</p>
                  </div>
                  <div>
                    <Label className="text-zinc-300">Minimum Redemption Points</Label>
                    <Input
                      type="number"
                      value={configForm.min_redemption_points}
                      onChange={(e) => setConfigForm({ ...configForm, min_redemption_points: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Expiry */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Point Expiry</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Points Expire</Label>
                    <p className="text-xs text-zinc-400">Automatically expire unused points</p>
                  </div>
                  <Switch
                    checked={configForm.points_expire}
                    onCheckedChange={(v) => setConfigForm({ ...configForm, points_expire: v })}
                  />
                </div>
                {configForm.points_expire && (
                  <div>
                    <Label className="text-zinc-300">Expiry Period (months)</Label>
                    <Input
                      type="number"
                      value={configForm.points_expiry_months}
                      onChange={(e) => setConfigForm({ ...configForm, points_expiry_months: Number(e.target.value) })}
                      className="bg-zinc-800 border-zinc-700 text-white w-32"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={handleSaveConfig}
                disabled={saving}
                className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Adjust Points Modal */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Manual Point Adjustment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">Contact ID *</Label>
              <Input
                value={adjustForm.contact_id}
                onChange={(e) => setAdjustForm({ ...adjustForm, contact_id: e.target.value })}
                placeholder="Contact ID"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Action</Label>
              <Select
                value={adjustForm.action}
                onValueChange={(v) => setAdjustForm({ ...adjustForm, action: v as "award" | "redeem" })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="award">
                    <span className="flex items-center gap-2"><Plus className="h-3 w-3 text-green-400" /> Award Points</span>
                  </SelectItem>
                  <SelectItem value="redeem">
                    <span className="flex items-center gap-2"><Minus className="h-3 w-3 text-red-400" /> Redeem Points</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-300">Points *</Label>
              <Input
                type="number"
                value={adjustForm.points || ""}
                onChange={(e) => setAdjustForm({ ...adjustForm, points: Number(e.target.value) })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Description *</Label>
              <Textarea
                value={adjustForm.description}
                onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                placeholder="Reason for adjustment"
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustModal(false)} className="border-zinc-700 text-zinc-300">
              Cancel
            </Button>
            <Button onClick={handleAdjust} disabled={saving} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {adjustForm.action === "award" ? "Award" : "Redeem"} Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
