"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { Referral, ReferralConfig } from "@/types/business-growth";
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
  UserPlus, Users, CheckCircle, Clock, Gift, Loader2,
  TrendingUp, Copy, Trophy,
} from "lucide-react";

interface ReferralStats {
  total: number;
  pending: number;
  converted: number;
  rewarded: number;
  conversion_rate: number;
  avg_discount: number;
}

interface TopReferrer {
  contact_id: string;
  name: string;
  phone: string;
  referral_count: number;
  converted_count: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  contacted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  converted: "bg-green-500/20 text-green-400 border-green-500/30",
  expired: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  rewarded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Create form
  const [createForm, setCreateForm] = useState({
    referrer_contact_id: "",
    referred_contact_id: "",
    channel: "whatsapp",
    notes: "",
  });

  // Config form
  const [configForm, setConfigForm] = useState({
    is_active: true,
    reward_type: "points" as string,
    reward_value: 100,
    reward_currency: "NGN",
    require_purchase: false,
    min_purchase_amount: 0,
    max_referrals_per_month: 10,
    referral_message_template: "Hey! I love shopping at {business_name}. Use my code {referral_code} for a special reward!",
    thank_you_message: "Thank you for your referral! Your reward has been credited.",
  });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);

      const [refRes, statsRes, configRes] = await Promise.all([
        fetch(`/api/referrals?${params}`),
        fetch("/api/referrals?view=stats"),
        fetch("/api/referrals/config"),
      ]);

      if (refRes.ok) {
        const data = await refRes.json();
        setReferrals(data.referrals || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
        // Derive top referrers from referrals
      }
      if (configRes.ok) {
        const data = await configRes.json();
        if (data.config) {
          setConfig(data.config);
          setConfigForm({
            is_active: data.config.is_active ?? true,
            reward_type: data.config.reward_type || "points",
            reward_value: data.config.reward_value || 100,
            reward_currency: data.config.reward_currency || "NGN",
            require_purchase: data.config.require_purchase ?? false,
            min_purchase_amount: data.config.min_purchase_amount || 0,
            max_referrals_per_month: data.config.max_referrals_per_month || 10,
            referral_message_template: data.config.referral_message_template || configForm.referral_message_template,
            thank_you_message: data.config.thank_you_message || configForm.thank_you_message,
          });
        }
      }

      // Derive top referrers from referral data
      deriveTopReferrers();
    } catch { /* ignore */ }
  }, [filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const deriveTopReferrers = () => {
    const map = new Map<string, TopReferrer>();
    for (const r of referrals) {
      const id = r.referrer_contact_id;
      const existing = map.get(id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ref = r.referrer as any;
      if (existing) {
        existing.referral_count++;
        if (["converted", "rewarded"].includes(r.status)) existing.converted_count++;
      } else {
        map.set(id, {
          contact_id: id,
          name: ref?.name || "Unknown",
          phone: ref?.phone || "",
          referral_count: 1,
          converted_count: ["converted", "rewarded"].includes(r.status) ? 1 : 0,
        });
      }
    }
    setTopReferrers(
      Array.from(map.values()).sort((a, b) => b.referral_count - a.referral_count).slice(0, 10)
    );
  };

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  useEffect(() => {
    if (referrals.length > 0) deriveTopReferrers();
  }, [referrals]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!createForm.referrer_contact_id) {
      toast.error("Referrer contact ID is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Referral created");
      setShowCreateModal(false);
      setCreateForm({ referrer_contact_id: "", referred_contact_id: "", channel: "whatsapp", notes: "" });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async (referralId: string) => {
    try {
      const res = await fetch(`/api/referrals/${referralId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "convert" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Referral converted and reward issued");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/referrals/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Referral settings saved");
      const data = await res.json();
      setConfig(data.config);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Referral code copied");
  };

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
          <h1 className="text-2xl font-bold text-white">Referral Programme</h1>
          <p className="text-zinc-400 text-sm">Track and reward customer referrals</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
        >
          <UserPlus className="h-4 w-4 mr-2" /> Record Referral
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs text-zinc-400">Total Referrals</p>
                <p className="text-xl font-bold text-white">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-xs text-zinc-400">Converted</p>
                <p className="text-xl font-bold text-white">{stats?.converted || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-xs text-zinc-400">Pending</p>
                <p className="text-xl font-bold text-white">{stats?.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-xs text-zinc-400">Conversion Rate</p>
                <p className="text-xl font-bold text-white">{(stats?.conversion_rate || 0).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="overview">Referrals</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Referrals List */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex gap-3 items-center">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 bg-zinc-900/50 border-zinc-700 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rewarded">Rewarded</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-zinc-500 ml-auto">
              {referrals.length} referral{referrals.length !== 1 ? "s" : ""}
            </span>
          </div>

          {referrals.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="py-12 text-center">
                <UserPlus className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-300 mb-2">No Referrals Yet</h3>
                <p className="text-zinc-500 mb-4">Start tracking customer referrals</p>
                <Button onClick={() => setShowCreateModal(true)} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
                  <UserPlus className="h-4 w-4 mr-2" /> Record First Referral
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Referrer</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Referred</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Code</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Channel</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Status</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Reward</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Date</th>
                    <th className="text-left text-xs text-zinc-400 font-medium py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((ref) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const referrer = ref.referrer as any;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const referred = ref.referred as any;
                    return (
                      <tr key={ref.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-3 px-4 text-sm text-white">{referrer?.name || "Unknown"}</td>
                        <td className="py-3 px-4 text-sm text-zinc-300">{referred?.name || "—"}</td>
                        <td className="py-3 px-4">
                          {ref.referral_code && (
                            <button
                              onClick={() => copyCode(ref.referral_code!)}
                              className="flex items-center gap-1 text-xs font-mono text-[#C9A84C] hover:text-[#b8993f]"
                            >
                              {ref.referral_code} <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400 capitalize">{ref.channel}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={STATUS_COLORS[ref.status] || ""}>
                            {ref.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-300">
                          {ref.reward_issued ? (
                            <span className="text-green-400">
                              <Gift className="h-3 w-3 inline mr-1" />
                              {ref.reward_value} {ref.reward_type}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {new Date(ref.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {ref.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConvert(ref.id)}
                              className="border-green-600/50 text-green-400 hover:bg-green-600/20 text-xs"
                            >
                              Convert
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[#C9A84C]" /> Top Referrers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topReferrers.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No referrers yet</p>
              ) : (
                <div className="space-y-3">
                  {topReferrers.map((referrer, idx) => (
                    <div key={referrer.contact_id} className="flex items-center gap-4 p-3 bg-zinc-800/30 rounded-lg">
                      <span className={`text-lg font-bold w-8 text-center ${
                        idx === 0 ? "text-[#C9A84C]" : idx === 1 ? "text-zinc-300" : idx === 2 ? "text-orange-400" : "text-zinc-500"
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{referrer.name}</p>
                        <p className="text-xs text-zinc-400">{referrer.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-white">{referrer.referral_count} referrals</p>
                        <p className="text-xs text-green-400">{referrer.converted_count} converted</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Referral Programme Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Programme Active</Label>
                  <p className="text-xs text-zinc-400">Enable or disable the referral programme</p>
                </div>
                <Switch
                  checked={configForm.is_active}
                  onCheckedChange={(v) => setConfigForm({ ...configForm, is_active: v })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-300">Reward Type</Label>
                  <Select
                    value={configForm.reward_type}
                    onValueChange={(v) => setConfigForm({ ...configForm, reward_type: v })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="points">Loyalty Points</SelectItem>
                      <SelectItem value="discount_percent">Discount %</SelectItem>
                      <SelectItem value="discount_fixed">Fixed Discount</SelectItem>
                      <SelectItem value="cashback">Cashback</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-zinc-300">Reward Value</Label>
                  <Input
                    type="number"
                    value={configForm.reward_value}
                    onChange={(e) => setConfigForm({ ...configForm, reward_value: Number(e.target.value) })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Max Referrals/Month</Label>
                  <Input
                    type="number"
                    value={configForm.max_referrals_per_month}
                    onChange={(e) => setConfigForm({ ...configForm, max_referrals_per_month: Number(e.target.value) })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={configForm.require_purchase}
                    onCheckedChange={(v) => setConfigForm({ ...configForm, require_purchase: v })}
                  />
                  <div>
                    <Label className="text-zinc-300">Require Purchase</Label>
                    <p className="text-xs text-zinc-500">Referred must purchase to trigger reward</p>
                  </div>
                </div>
              </div>

              {configForm.require_purchase && (
                <div>
                  <Label className="text-zinc-300">Minimum Purchase Amount (NGN)</Label>
                  <Input
                    type="number"
                    value={configForm.min_purchase_amount}
                    onChange={(e) => setConfigForm({ ...configForm, min_purchase_amount: Number(e.target.value) })}
                    className="bg-zinc-800 border-zinc-700 text-white w-48"
                  />
                </div>
              )}

              <div>
                <Label className="text-zinc-300">Referral Message Template</Label>
                <Textarea
                  value={configForm.referral_message_template}
                  onChange={(e) => setConfigForm({ ...configForm, referral_message_template: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  rows={3}
                />
                <p className="text-xs text-zinc-500 mt-1">Variables: {'{business_name}'}, {'{referral_code}'}, {'{reward_value}'}</p>
              </div>

              <div>
                <Label className="text-zinc-300">Thank You Message</Label>
                <Textarea
                  value={configForm.thank_you_message}
                  onChange={(e) => setConfigForm({ ...configForm, thank_you_message: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  rows={2}
                />
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

      {/* Create Referral Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Record Referral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">Referrer Contact ID *</Label>
              <Input
                value={createForm.referrer_contact_id}
                onChange={(e) => setCreateForm({ ...createForm, referrer_contact_id: e.target.value })}
                placeholder="Contact ID of the person who referred"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Referred Contact ID</Label>
              <Input
                value={createForm.referred_contact_id}
                onChange={(e) => setCreateForm({ ...createForm, referred_contact_id: e.target.value })}
                placeholder="Contact ID of the referred person (optional)"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Channel</Label>
              <Select
                value={createForm.channel}
                onValueChange={(v) => setCreateForm({ ...createForm, channel: v })}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-300">Notes</Label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-zinc-700 text-zinc-300">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create Referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
