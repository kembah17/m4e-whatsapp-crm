"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Award } from "lucide-react";

export function LoyaltySettingsPanel() {
  const [config, setConfig] = useState({
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/loyalty/config");
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig((prev) => ({ ...prev, ...data.config }));
      }
    } catch { /* defaults */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/loyalty/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Loyalty settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Award className="h-5 w-5 text-[#C9A84C]" /> Loyalty Programme Settings
        </h2>
        <p className="text-sm text-zinc-400 mt-1">Configure your customer loyalty programme.</p>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-white">Programme Active</Label>
            <Switch checked={config.is_active} onCheckedChange={(v) => setConfig({ ...config, is_active: v })} />
          </div>
          <div>
            <Label className="text-zinc-300">Programme Name</Label>
            <Input value={config.programme_name} onChange={(e) => setConfig({ ...config, programme_name: e.target.value })} className="bg-zinc-800 border-zinc-700 text-white max-w-sm" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader><CardTitle className="text-white text-sm">Points Earning</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><Label className="text-zinc-300">Points per Naira</Label><Input type="number" step="0.1" value={config.points_per_naira} onChange={(e) => setConfig({ ...config, points_per_naira: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
          <div><Label className="text-zinc-300">Points per Referral</Label><Input type="number" value={config.points_per_referral} onChange={(e) => setConfig({ ...config, points_per_referral: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
          <div><Label className="text-zinc-300">Points per Review</Label><Input type="number" value={config.points_per_review} onChange={(e) => setConfig({ ...config, points_per_review: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
          <div><Label className="text-zinc-300">Birthday Bonus</Label><Input type="number" value={config.birthday_bonus_points} onChange={(e) => setConfig({ ...config, birthday_bonus_points: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader><CardTitle className="text-white text-sm">Tier Thresholds &amp; Benefits</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div><Label className="text-zinc-300">Silver Points</Label><Input type="number" value={config.silver_threshold} onChange={(e) => setConfig({ ...config, silver_threshold: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
          <div><Label className="text-zinc-300">Gold Points</Label><Input type="number" value={config.gold_threshold} onChange={(e) => setConfig({ ...config, gold_threshold: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
          <div><Label className="text-zinc-300">Platinum Points</Label><Input type="number" value={config.platinum_threshold} onChange={(e) => setConfig({ ...config, platinum_threshold: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
          <div><Label className="text-zinc-300">Silver Discount %</Label><Input type="number" step="0.5" value={config.silver_discount_percent} onChange={(e) => setConfig({ ...config, silver_discount_percent: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
          <div><Label className="text-zinc-300">Gold Discount %</Label><Input type="number" step="0.5" value={config.gold_discount_percent} onChange={(e) => setConfig({ ...config, gold_discount_percent: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
          <div><Label className="text-zinc-300">Platinum Discount %</Label><Input type="number" step="0.5" value={config.platinum_discount_percent} onChange={(e) => setConfig({ ...config, platinum_discount_percent: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader><CardTitle className="text-white text-sm">Redemption &amp; Expiry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-zinc-300">Points to Naira Rate</Label><Input type="number" step="0.1" value={config.points_to_naira_rate} onChange={(e) => setConfig({ ...config, points_to_naira_rate: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /><p className="text-xs text-zinc-500 mt-1">e.g. 0.5 = 100 pts = NGN 50</p></div>
            <div><Label className="text-zinc-300">Min Redemption Points</Label><Input type="number" value={config.min_redemption_points} onChange={(e) => setConfig({ ...config, min_redemption_points: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white" /></div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-white">Points Expire</Label>
            <Switch checked={config.points_expire} onCheckedChange={(v) => setConfig({ ...config, points_expire: v })} />
          </div>
          {config.points_expire && (
            <div><Label className="text-zinc-300">Expiry Period (months)</Label><Input type="number" value={config.points_expiry_months} onChange={(e) => setConfig({ ...config, points_expiry_months: Number(e.target.value) })} className="bg-zinc-800 border-zinc-700 text-white w-32" /></div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Loyalty Settings
      </Button>
    </div>
  );
}
