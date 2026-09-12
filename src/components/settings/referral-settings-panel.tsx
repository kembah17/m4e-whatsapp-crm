"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";

export function ReferralSettingsPanel() {
  const [config, setConfig] = useState({
    is_active: true,
    reward_type: "discount" as string,
    reward_value: 10,
    reward_description: "10% discount on next purchase",
    min_purchase_for_reward: 0,
    require_purchase_to_convert: true,
    max_referrals_per_contact: 0,
    referral_expiry_days: 90,
    auto_generate_codes: true,
    welcome_message_template: "Hi! You were referred by {referrer_name}. Welcome!",
    reward_message_template: "Great news! Your referral {referred_name} made a purchase. Your reward: {reward_description}",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/referrals/config");
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
      const res = await fetch("/api/referrals/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Referral settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[#C9A84C]" /> Referral Programme Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Configure how your referral programme works.</p>
      </div>

      <Card className="bg-card/50 border-border">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-foreground">Programme Active</Label>
            <Switch checked={config.is_active} onCheckedChange={(v) => setConfig({ ...config, is_active: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-foreground">Auto-generate Referral Codes</Label>
            <Switch checked={config.auto_generate_codes} onCheckedChange={(v) => setConfig({ ...config, auto_generate_codes: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-foreground">Require Purchase to Convert</Label>
            <Switch checked={config.require_purchase_to_convert} onCheckedChange={(v) => setConfig({ ...config, require_purchase_to_convert: v })} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border">
        <CardHeader><CardTitle className="text-foreground text-sm">Reward Configuration</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Reward Type</Label>
            <Select value={config.reward_type} onValueChange={(v) => setConfig({ ...config, reward_type: v })}>
              <SelectTrigger className="bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="discount">Discount (%)</SelectItem>
                <SelectItem value="fixed_amount">Fixed Amount (NGN)</SelectItem>
                <SelectItem value="loyalty_points">Loyalty Points</SelectItem>
                <SelectItem value="free_product">Free Product</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">Reward Value</Label>
            <Input type="number" value={config.reward_value} onChange={(e) => setConfig({ ...config, reward_value: Number(e.target.value) })} className="bg-muted border-border text-foreground" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-muted-foreground">Reward Description</Label>
            <Input value={config.reward_description} onChange={(e) => setConfig({ ...config, reward_description: e.target.value })} className="bg-muted border-border text-foreground" />
          </div>
          <div>
            <Label className="text-muted-foreground">Min Purchase for Reward (NGN)</Label>
            <Input type="number" value={config.min_purchase_for_reward} onChange={(e) => setConfig({ ...config, min_purchase_for_reward: Number(e.target.value) })} className="bg-muted border-border text-foreground" />
            <p className="text-xs text-muted-foreground mt-1">0 = no minimum</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Max Referrals per Contact</Label>
            <Input type="number" value={config.max_referrals_per_contact} onChange={(e) => setConfig({ ...config, max_referrals_per_contact: Number(e.target.value) })} className="bg-muted border-border text-foreground" />
            <p className="text-xs text-muted-foreground mt-1">0 = unlimited</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Referral Expiry (days)</Label>
            <Input type="number" value={config.referral_expiry_days} onChange={(e) => setConfig({ ...config, referral_expiry_days: Number(e.target.value) })} className="bg-muted border-border text-foreground" />
            <p className="text-xs text-muted-foreground mt-1">0 = never expires</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border">
        <CardHeader><CardTitle className="text-foreground text-sm">Message Templates</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Welcome Message (to referred contact)</Label>
            <Textarea value={config.welcome_message_template} onChange={(e) => setConfig({ ...config, welcome_message_template: e.target.value })} className="bg-muted border-border text-foreground" rows={2} />
            <p className="text-xs text-muted-foreground mt-1">Variables: {'{referrer_name}'}, {'{referral_code}'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Reward Message (to referrer)</Label>
            <Textarea value={config.reward_message_template} onChange={(e) => setConfig({ ...config, reward_message_template: e.target.value })} className="bg-muted border-border text-foreground" rows={2} />
            <p className="text-xs text-muted-foreground mt-1">Variables: {'{referred_name}'}, {'{reward_description}'}, {'{reward_value}'}</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Referral Settings
      </Button>
    </div>
  );
}
