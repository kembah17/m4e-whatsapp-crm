"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Zap,
  RotateCcw,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

interface SmsConfigData {
  sender_id: string;
  enabled: boolean;
  monthly_cost_cap: number | null;
  monthly_sms_count: number;
}

export function SmsConfig() {
  const { user, accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [brevoConnected, setBrevoConnected] = useState(false);

  const [senderId, setSenderId] = useState("M4E");
  const [enabled, setEnabled] = useState(false);
  const [monthlyCostCap, setMonthlyCostCap] = useState("");
  const [monthlySmsCount, setMonthlySmsCount] = useState(0);
  const [testPhone, setTestPhone] = useState("");

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sms/config", { method: "GET" });
      const payload = await res.json();

      setBrevoConnected(payload.brevo_connected ?? false);

      if (payload.configured && payload.config) {
        setHasConfig(true);
        setSenderId(payload.config.sender_id || "M4E");
        setEnabled(payload.config.enabled ?? false);
        setMonthlyCostCap(
          payload.config.monthly_cost_cap != null
            ? String(payload.config.monthly_cost_cap)
            : ""
        );
        setMonthlySmsCount(payload.config.monthly_sms_count ?? 0);
      } else {
        setHasConfig(false);
      }
    } catch (err) {
      console.error("fetchConfig error:", err);
      toast.error("Failed to load SMS configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !profileLoading && user && accountId) {
      fetchConfig();
    } else if (!authLoading && !profileLoading) {
      setLoading(false);
    }
  }, [authLoading, profileLoading, user, accountId, fetchConfig]);

  async function handleSave() {
    if (!senderId.trim()) {
      toast.error("Sender ID is required.");
      return;
    }
    if (!/^[a-zA-Z0-9]{3,11}$/.test(senderId.trim())) {
      toast.error("Sender ID must be 3-11 alphanumeric characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/sms/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sender_id: senderId.trim(),
          enabled,
          monthly_cost_cap: monthlyCostCap ? Number(monthlyCostCap) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save SMS configuration.");
        return;
      }
      toast.success("SMS configuration saved.");
      setHasConfig(true);
      await fetchConfig();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save SMS configuration.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSms() {
    if (!testPhone.trim()) {
      toast.error("Enter a phone number to send a test SMS.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: testPhone.trim(), test: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Test SMS failed.");
        return;
      }
      toast.success(
        `Test SMS sent! Message ID: ${data.message_id}. Credits remaining: ${data.remaining_credits}`
      );
    } catch (err) {
      console.error("Test SMS error:", err);
      toast.error("Failed to send test SMS.");
    } finally {
      setTesting(false);
    }
  }

  async function handleReset() {
    if (!confirm("Remove SMS configuration? This will disable SMS sending.")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/sms/config", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset configuration.");
        return;
      }
      toast.success("SMS configuration removed.");
      setHasConfig(false);
      setSenderId("M4E");
      setEnabled(false);
      setMonthlyCostCap("");
      setMonthlySmsCount(0);
    } catch (err) {
      console.error("Reset error:", err);
      toast.error("Failed to reset configuration.");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] mt-4">
      <div className="space-y-6">
        {/* Brevo Dependency Warning */}
        {!brevoConnected && (
          <Alert className="bg-yellow-950/40 border-yellow-700">
            <AlertTriangle className="size-4 text-yellow-500" />
            <AlertTitle className="text-yellow-300">Brevo Email Required</AlertTitle>
            <AlertDescription className="text-yellow-400">
              SMS uses the same Brevo API key as Email. Configure your Brevo email
              integration first in the Email tab, then return here to enable SMS.
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Status */}
        <Alert className="bg-slate-900 border-slate-700">
          <div className="flex items-center gap-2">
            {hasConfig && enabled ? (
              <CheckCircle2 className="size-4 text-primary" />
            ) : (
              <XCircle className="size-4 text-red-500" />
            )}
            <AlertTitle className="text-white mb-0">
              {hasConfig && enabled
                ? `SMS Active \u2014 Sender: ${senderId}`
                : hasConfig
                  ? "SMS Configured but Disabled"
                  : "SMS Not Configured"}
            </AlertTitle>
          </div>
          <AlertDescription className="text-slate-400">
            {hasConfig && enabled
              ? `${monthlySmsCount} SMS sent this month.`
              : hasConfig
                ? "Toggle the switch below to enable SMS sending."
                : "Configure a Sender ID below to get started."}
          </AlertDescription>
        </Alert>

        {/* SMS Configuration */}
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="size-5" />
              SMS Configuration
            </CardTitle>
            <CardDescription className="text-slate-400">
              Configure Brevo SMS sending. Uses the same API key as your email integration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-slate-300">Enable SMS Sending</Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  When enabled, automations can send SMS messages.
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={!brevoConnected}
              />
            </div>

            {/* Sender ID */}
            <div className="space-y-2">
              <Label className="text-slate-300">Sender ID</Label>
              <Input
                placeholder="e.g. M4E, AcmeCorp"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                maxLength={11}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                3\u201311 alphanumeric characters. Displayed as the SMS sender name.
                Some Nigerian carriers require pre-registered sender IDs.
              </p>
            </div>

            {/* Monthly Cost Cap */}
            <div className="space-y-2">
              <Label className="text-slate-300">Monthly SMS Cap (optional)</Label>
              <Input
                type="number"
                placeholder="e.g. 500 (max SMS per month)"
                value={monthlyCostCap}
                onChange={(e) => setMonthlyCostCap(e.target.value)}
                min={0}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                Maximum number of SMS messages per month. Leave empty for no limit.
              </p>
            </div>

            {/* Test SMS */}
            {hasConfig && enabled && (
              <div className="space-y-2 pt-2 border-t border-slate-700">
                <Label className="text-slate-300">Send Test SMS</Label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestSms}
                    disabled={testing}
                    className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shrink-0"
                  >
                    {testing ? (
                      <><Loader2 className="size-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Zap className="size-4" /> Test</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || !brevoConnected}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {saving ? (
              <><Loader2 className="size-4 animate-spin" /> Saving...</>
            ) : (
              "Save Configuration"
            )}
          </Button>
          {hasConfig && (
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetting}
              className="border-red-900 text-red-400 hover:text-red-300 hover:bg-red-950/40"
            >
              {resetting ? (
                <><Loader2 className="size-4 animate-spin" /> Resetting...</>
              ) : (
                <><RotateCcw className="size-4" /> Remove SMS Config</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Setup Instructions Sidebar */}
      <div>
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardHeader>
            <CardTitle className="text-white text-base">SMS Setup Guide</CardTitle>
            <CardDescription className="text-slate-400">
              How to enable Brevo SMS sending.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-400">
            <ol className="list-decimal list-inside space-y-2">
              <li>Ensure <strong className="text-slate-200">Brevo Email</strong> is configured (same API key)</li>
              <li>Purchase SMS credits in your <strong className="text-slate-200">Brevo dashboard</strong></li>
              <li>Set your <strong className="text-slate-200">Sender ID</strong> (3\u201311 alphanumeric chars)</li>
              <li>For Nigerian carriers, <strong className="text-slate-200">register your Sender ID</strong> with Brevo support</li>
              <li>Toggle <strong className="text-slate-200">Enable SMS</strong> and save</li>
              <li>Send a <strong className="text-slate-200">test SMS</strong> to verify delivery</li>
            </ol>

            <div className="pt-3 border-t border-slate-700 space-y-2">
              <p className="text-xs text-slate-500">
                <strong className="text-slate-400">Pricing:</strong> Brevo SMS to Nigeria costs
                approximately \u20A64\u20135 per SMS segment (160 characters). Credits are
                purchased separately from email.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-700">
              <a
                href="https://developers.brevo.com/reference/sendtransacsms"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="size-3.5" />
                Brevo SMS API Documentation
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
