"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Zap,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MASKED_KEY = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

type ConnectionStatus = "connected" | "disconnected" | "unknown";

export function EmailConfig() {
  const { user, accountId, loading: authLoading, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("unknown");
  const [statusMessage, setStatusMessage] = useState("");
  const [accountName, setAccountName] = useState("");

  const [apiKey, setApiKey] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email/config", { method: "GET" });
      const payload = await res.json();

      if (payload.connected) {
        setConnectionStatus("connected");
        setHasConfig(true);
        setStatusMessage("");
        setAccountName(payload.account_name || "");
      } else if (payload.reason === "no_config") {
        setConnectionStatus("disconnected");
        setHasConfig(false);
        setStatusMessage(payload.message || "");
      } else {
        setConnectionStatus("disconnected");
        setHasConfig(!!payload.has_config);
        setStatusMessage(payload.message || "");
      }

      // Populate form fields from saved config if present
      if (payload.config) {
        setSenderName(payload.config.sender_name || "");
        setSenderEmail(payload.config.sender_email || "");
        setApiKey(MASKED_KEY);
        setKeyEdited(false);
      } else {
        setSenderName("");
        setSenderEmail("");
        setApiKey("");
        setKeyEdited(false);
      }
    } catch (err) {
      console.error("fetchConfig error:", err);
      setConnectionStatus("disconnected");
      toast.error("Failed to load email configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user || !accountId) {
      setLoading(false);
      return;
    }
    fetchConfig();
  }, [authLoading, profileLoading, user, accountId, fetchConfig]);

  async function handleSave() {
    if (!senderName.trim()) {
      toast.error("Sender Name is required");
      return;
    }
    if (!senderEmail.trim()) {
      toast.error("Sender Email is required");
      return;
    }
    if (!hasConfig && (!apiKey.trim() || !keyEdited)) {
      toast.error("Brevo API Key is required for initial setup");
      return;
    }
    if (hasConfig && !keyEdited) {
      toast.error("Please re-enter the API Key to save changes");
      return;
    }

    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        sender_name: senderName.trim(),
        sender_email: senderEmail.trim(),
      };
      if (keyEdited && apiKey !== MASKED_KEY && apiKey.trim()) {
        payload.api_key = apiKey.trim();
      }

      const res = await fetch("/api/email/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to save configuration");
        return;
      }

      toast.success(
        data.account_name
          ? `Connected \u2014 Brevo account: ${data.account_name}`
          : "Email configuration saved and verified."
      );
      await fetchConfig();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    try {
      setTesting(true);
      const res = await fetch("/api/email/config", { method: "GET" });
      const payload = await res.json();

      if (payload.connected) {
        setConnectionStatus("connected");
        setStatusMessage("");
        toast.success(
          payload.account_name
            ? `Connected to Brevo (${payload.account_name})`
            : "Brevo API connection successful"
        );
      } else {
        setConnectionStatus("disconnected");
        setStatusMessage(payload.message || "");
        toast.error(payload.message || "API connection failed");
      }
    } catch (err) {
      console.error("Test connection error:", err);
      setConnectionStatus("disconnected");
      toast.error("Connection test failed.");
    } finally {
      setTesting(false);
    }
  }

  async function handleReset() {
    if (!confirm("This will delete the current email config. Continue?")) return;
    try {
      setResetting(true);
      const res = await fetch("/api/email/config", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset configuration");
        return;
      }
      toast.success("Email configuration cleared.");
      setHasConfig(false);
      setApiKey("");
      setSenderName("");
      setSenderEmail("");
      setKeyEdited(false);
      setConnectionStatus("disconnected");
      setStatusMessage("");
      setAccountName("");
    } catch (err) {
      console.error("Reset error:", err);
      toast.error("Failed to reset configuration");
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
        {/* Connection Status */}
        <Alert className="bg-slate-900 border-slate-700">
          <div className="flex items-center gap-2">
            {connectionStatus === "connected" ? (
              <CheckCircle2 className="size-4 text-primary" />
            ) : (
              <XCircle className="size-4 text-red-500" />
            )}
            <AlertTitle className="text-white mb-0">
              {connectionStatus === "connected"
                ? `Connected${accountName ? ` \u2014 ${accountName}` : ""}`
                : "Not Connected"}
            </AlertTitle>
          </div>
          <AlertDescription className="text-slate-400">
            {connectionStatus === "connected"
              ? "Your Brevo API key is valid. Emails can be sent via automations."
              : statusMessage || "Configure your Brevo API credentials below to enable email sending."}
          </AlertDescription>
        </Alert>

        {/* API Credentials */}
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardHeader>
            <CardTitle className="text-white">Brevo Email Configuration</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your Brevo (formerly Sendinblue) API credentials for transactional email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Brevo API Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="xkeysib-..."
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setKeyEdited(true);
                  }}
                  onFocus={() => {
                    if (apiKey === MASKED_KEY) {
                      setApiKey("");
                      setKeyEdited(true);
                    }
                  }}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {hasConfig && !keyEdited && (
                <p className="text-xs text-slate-500">
                  Key is hidden for security. Re-enter it to update configuration.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Sender Name</Label>
              <Input
                placeholder="e.g. Marketing4Effect"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Sender Email</Label>
              <Input
                type="email"
                placeholder="e.g. hello@marketing4effect.com"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                Must be a verified sender in your Brevo account.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {saving ? (
              <><Loader2 className="size-4 animate-spin" /> Saving...</>
            ) : (
              "Save Configuration"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !hasConfig}
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {testing ? (
              <><Loader2 className="size-4 animate-spin" /> Testing...</>
            ) : (
              <><Zap className="size-4" /> Test Connection</>
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
                <><RotateCcw className="size-4" /> Reset Configuration</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Setup Instructions Sidebar */}
      <div>
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardHeader>
            <CardTitle className="text-white text-base">Setup Instructions</CardTitle>
            <CardDescription className="text-slate-400">
              How to get your Brevo API key.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-400">
            <ol className="list-decimal list-inside space-y-2">
              <li>Sign up at <strong className="text-slate-200">brevo.com</strong> (free tier: 300 emails/day)</li>
              <li>Go to <strong className="text-slate-200">Settings \u2192 SMTP &amp; API \u2192 API Keys</strong></li>
              <li>Click <strong className="text-slate-200">Generate a new API key</strong></li>
              <li>Copy the key (starts with <code className="text-slate-300">xkeysib-</code>)</li>
              <li>Verify your sender email in <strong className="text-slate-200">Settings \u2192 Senders &amp; IPs</strong></li>
            </ol>
            <div className="pt-3 border-t border-slate-700">
              <a
                href="https://developers.brevo.com/docs/getting-started"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="size-3.5" />
                Brevo API Documentation
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
