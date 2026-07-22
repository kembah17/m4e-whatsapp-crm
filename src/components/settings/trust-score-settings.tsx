"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Info } from "lucide-react";

interface TrustScoreConfig {
  weight_payment_history: number;
  weight_order_frequency: number;
  weight_communication: number;
  weight_referral_quality: number;
  weight_account_age: number;
  high_trust_threshold: number;
  low_trust_threshold: number;
}

const DEFAULT_CONFIG: TrustScoreConfig = {
  weight_payment_history: 30,
  weight_order_frequency: 25,
  weight_communication: 20,
  weight_referral_quality: 15,
  weight_account_age: 10,
  high_trust_threshold: 75,
  low_trust_threshold: 35,
};

export function TrustScoreSettings() {
  const [config, setConfig] = useState<TrustScoreConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts/trust-score");
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
      }
    } catch { /* use defaults */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const totalWeight = config.weight_payment_history + config.weight_order_frequency +
    config.weight_communication + config.weight_referral_quality + config.weight_account_age;

  const handleSave = async () => {
    if (totalWeight !== 100) {
      toast.error("Weights must sum to 100");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/contacts/trust-score", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Trust score settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>;
  }

  const weightField = (label: string, key: keyof TrustScoreConfig, desc: string) => (
    <div>
      <Label className="text-zinc-300">{label}</Label>
      <Input
        type="number"
        min={0}
        max={100}
        value={config[key]}
        onChange={(e) => setConfig({ ...config, [key]: Number(e.target.value) })}
        className="bg-zinc-800 border-zinc-700 text-white w-24"
      />
      <p className="text-xs text-zinc-500 mt-1">{desc}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#C9A84C]" /> Trust Score Configuration
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Configure how customer trust scores are calculated. Weights must sum to 100.
        </p>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Score Weights (must total 100)</CardTitle>
          <div className={`text-sm font-medium ${totalWeight === 100 ? "text-green-400" : "text-red-400"}`}>
            Current total: {totalWeight}/100
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {weightField("Payment History", "weight_payment_history", "How reliably they pay on time")}
          {weightField("Order Frequency", "weight_order_frequency", "How often they make purchases")}
          {weightField("Communication", "weight_communication", "Responsiveness and engagement")}
          {weightField("Referral Quality", "weight_referral_quality", "Quality of referrals they bring")}
          {weightField("Account Age", "weight_account_age", "How long they have been a customer")}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-300">High Trust Threshold</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={config.high_trust_threshold}
              onChange={(e) => setConfig({ ...config, high_trust_threshold: Number(e.target.value) })}
              className="bg-zinc-800 border-zinc-700 text-white w-24"
            />
            <p className="text-xs text-zinc-500 mt-1">Score above this = green (trusted)</p>
          </div>
          <div>
            <Label className="text-zinc-300">Low Trust Threshold</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={config.low_trust_threshold}
              onChange={(e) => setConfig({ ...config, low_trust_threshold: Number(e.target.value) })}
              className="bg-zinc-800 border-zinc-700 text-white w-24"
            />
            <p className="text-xs text-zinc-500 mt-1">Score below this = red (risky)</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || totalWeight !== 100} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Save Trust Score Settings
        </Button>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Info className="h-3 w-3" /> Changes apply to future score calculations
        </div>
      </div>
    </div>
  );
}
