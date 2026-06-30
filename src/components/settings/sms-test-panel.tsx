"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, Loader2, MessageSquare, Phone, Send, Wifi, WifiOff, XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface TestResult {
  id: string;
  phone: string;
  message: string;
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

interface HealthStatus {
  connected: boolean;
  accountInfo?: { credits: number; plan: string };
  error?: string;
}

export function SmsTestPanel() {
  const { accountId } = useAuth();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [history, setHistory] = useState<TestResult[]>([]);

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/sms/health");
      if (res.ok) {
        const d = await res.json();
        setHealth(d);
      } else {
        setHealth({ connected: false, error: "Failed to check health" });
      }
    } catch {
      setHealth({ connected: false, error: "Network error" });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accountId) checkHealth();
    else setHealthLoading(false);
  }, [accountId, checkHealth]);

  function validateNigerianPhone(p: string): boolean {
    const cleaned = p.replace(/[\s\-()]/g, "");
    return /^(\+234|234|0)[789]\d{9}$/.test(cleaned);
  }

  function formatPhone(p: string): string {
    const cleaned = p.replace(/[\s\-()]/g, "");
    if (cleaned.startsWith("0")) return "+234" + cleaned.slice(1);
    if (cleaned.startsWith("234")) return "+" + cleaned;
    return cleaned;
  }

  async function handleSendTest() {
    if (!phone.trim()) { toast.error("Enter a phone number"); return; }
    if (!validateNigerianPhone(phone)) {
      toast.error("Enter a valid Nigerian phone number (e.g. +2348012345678)");
      return;
    }
    if (!message.trim()) { toast.error("Enter a message"); return; }
    if (message.length > 160) { toast.error("Message must be 160 characters or less"); return; }

    setSending(true);
    try {
      const res = await fetch("/api/sms/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: formatPhone(phone), message: message.trim() }),
      });
      const d = await res.json();
      const result: TestResult = {
        id: crypto.randomUUID(),
        phone: formatPhone(phone),
        message: message.trim(),
        success: d.success,
        messageId: d.messageId,
        error: d.error,
        timestamp: new Date().toISOString(),
      };
      setHistory((h) => [result, ...h].slice(0, 10));
      if (d.success) {
        toast.success(`Test SMS sent! ID: ${d.messageId ?? "N/A"}`);
      } else {
        toast.error(d.error || "Failed to send test SMS");
      }
    } catch {
      toast.error("Network error sending test SMS");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Connection Status */}
      <div
        className={`flex items-center gap-2 rounded-lg border p-3 ${
          health?.connected
            ? "border-green-500/30 bg-green-500/5"
            : "border-destructive/30 bg-destructive/5"
        }`}
      >
        {healthLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : health?.connected ? (
          <Wifi className="size-4 text-green-500" />
        ) : (
          <WifiOff className="size-4 text-destructive" />
        )}
        <span className="text-sm font-medium">
          {healthLoading
            ? "Checking Brevo SMS connection..."
            : health?.connected
            ? "Brevo SMS connected"
            : "Brevo SMS not connected"}
        </span>
        {health?.connected && health.accountInfo && (
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {health.accountInfo.plan}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {health.accountInfo.credits} credits
            </Badge>
          </div>
        )}
        {!healthLoading && health?.error && (
          <span className="ml-auto text-xs text-destructive">{health.error}</span>
        )}
        <Button variant="ghost" size="sm" onClick={checkHealth} className="ml-2">
          <Loader2 className={`size-3.5 ${healthLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Send Test SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-5" />
            Send Test SMS
          </CardTitle>
          <CardDescription>
            Send a test SMS to verify your Brevo SMS configuration is working.
            Limited to 5 tests per hour.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Phone className="size-3.5" />
              Phone Number
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2348012345678"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Nigerian format: +234XXXXXXXXXX, 0XXXXXXXXXX, or 234XXXXXXXXXX
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="size-3.5" />
                Message
              </span>
              <span
                className={`text-xs ${
                  message.length > 160
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {message.length}/160
              </span>
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hello! This is a test SMS from M4E CRM."
              rows={3}
              maxLength={160}
            />
          </div>

          <Button
            onClick={handleSendTest}
            disabled={sending || !health?.connected}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : (
              <Send className="size-4 mr-1" />
            )}
            Send Test SMS
          </Button>
        </CardContent>
      </Card>

      {/* Test History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Test History</CardTitle>
            <CardDescription>Last {history.length} test(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    r.success
                      ? "border-green-500/20 bg-green-500/5"
                      : "border-destructive/20 bg-destructive/5"
                  }`}
                >
                  {r.success ? (
                    <CheckCircle2 className="size-4 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="size-4 text-destructive mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{r.phone}</span>
                      <Badge
                        variant={r.success ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {r.success ? "Sent" : "Failed"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {r.message}
                    </p>
                    {r.messageId && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ID: {r.messageId}
                      </p>
                    )}
                    {r.error && (
                      <p className="text-xs text-destructive mt-0.5">{r.error}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(r.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
