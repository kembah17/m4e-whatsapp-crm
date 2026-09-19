"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function LoginNotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/login-notifications");
        if (res.ok) {
          const data = await res.json();
          setEnabled(data.enabled);
        }
      } catch {
        // Silently fail on load
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function toggle(value: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/login-notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: value }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEnabled(value);
      toast.success(
        value
          ? "Login notifications enabled"
          : "Login notifications disabled"
      );
    } catch {
      toast.error("Failed to update notification preference");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading preference...</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {enabled ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <Label htmlFor="login-notif" className="text-sm font-medium">
              Login notification emails
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get an email whenever someone logs into your account
            </p>
          </div>
        </div>
        <Switch
          id="login-notif"
          checked={enabled}
          onCheckedChange={toggle}
          disabled={saving}
        />
      </div>
    </div>
  );
}
