"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Check, ClipboardCopy, Eye, Globe2, Key, Loader2, RefreshCw, Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface SyncConfig {
  enabled: boolean;
  apiKey: string;
  config: { products: boolean; testimonials: boolean; stats: boolean };
  webhookUrl: string;
  lastSyncAt: string | null;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "m4e_sync_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export function WebsiteSyncSettings() {
  const [config, setConfig] = useState<SyncConfig>({
    enabled: false,
    apiKey: "",
    config: { products: true, testimonials: true, stats: true },
    webhookUrl: "",
    lastSyncAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/website-sync");
      if (res.ok) {
        const d = await res.json();
        setConfig(d);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/website-sync", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to save");
        return;
      }
      toast.success("Website sync settings saved");
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  }

  function handleGenerateKey() {
    const key = generateApiKey();
    setConfig((c) => ({ ...c, apiKey: key }));
    toast.success("New API key generated. Remember to save!");
  }

  async function handlePreview() {
    if (!config.apiKey) { toast.error("Generate an API key first"); return; }
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const res = await fetch(`/api/sync/website?key=${encodeURIComponent(config.apiKey)}`);
      const d = await res.json();
      setPreviewData(JSON.stringify(d, null, 2));
    } catch {
      setPreviewData('{"error": "Failed to fetch preview"}');
    }
    finally { setPreviewLoading(false); }
  }

  function copyEndpoint() {
    const url = `${window.location.origin}/api/sync/website?key=${config.apiKey}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Endpoint URL copied");
    setTimeout(() => setCopied(false), 2000);
  }

  const endpointUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/sync/website?key=${config.apiKey || "YOUR_API_KEY"}`
    : `/api/sync/website?key=${config.apiKey || "YOUR_API_KEY"}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe2 className="size-4" />Website Content Sync
              </CardTitle>
              <CardDescription>
                Expose CRM data via API for your website to consume. Products, testimonials, and stats stay in sync automatically.
              </CardDescription>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig((c) => ({ ...c, enabled: checked }))}
            />
          </div>
        </CardHeader>
      </Card>

      {config.enabled && (
        <>
          {/* API Key */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Key className="size-4" />API Key
              </CardTitle>
              <CardDescription>Used to authenticate requests to the sync endpoint.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={config.apiKey}
                  readOnly
                  placeholder="Click 'Generate' to create an API key"
                  className="font-mono text-xs"
                />
                <Button variant="outline" onClick={handleGenerateKey}>
                  <RefreshCw className="size-4 mr-1" />Generate
                </Button>
              </div>
              {config.apiKey && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={endpointUrl}
                      readOnly
                      className="font-mono text-[11px] text-muted-foreground"
                    />
                    <Button variant="outline" size="icon" onClick={copyEndpoint}>
                      {copied ? <Check className="size-4 text-green-500" /> : <ClipboardCopy className="size-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Data to Expose</CardTitle>
              <CardDescription>Choose what data your website can access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["products", "testimonials", "stats"] as const).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium capitalize">{key}</span>
                    <p className="text-xs text-muted-foreground">
                      {key === "products" && "Product catalog with prices and stock status"}
                      {key === "testimonials" && "Customer testimonials and ratings"}
                      {key === "stats" && "Aggregate stats (customer count, product count, avg rating)"}
                    </p>
                  </div>
                  <Switch
                    checked={config.config[key]}
                    onCheckedChange={(checked) =>
                      setConfig((c) => ({
                        ...c,
                        config: { ...c.config, [key]: checked },
                      }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Webhook */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Webhook className="size-4" />Webhook (Optional)
              </CardTitle>
              <CardDescription>Receive a POST notification when sync data is fetched.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={config.webhookUrl}
                onChange={(e) => setConfig((c) => ({ ...c, webhookUrl: e.target.value }))}
                placeholder="https://your-website.com/api/webhook/crm-sync"
                type="url"
              />
            </CardContent>
          </Card>

          {/* Last Sync & Preview */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Last synced:</span>
                  {config.lastSyncAt ? (
                    <Badge variant="secondary" className="text-xs">
                      {new Date(config.lastSyncAt).toLocaleString()}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Never</span>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="size-4 mr-1" />Preview Payload
                </Button>
              </div>

              {showPreview && (
                <div className="rounded-lg border bg-muted/30 p-3 max-h-80 overflow-auto">
                  {previewLoading ? (
                    <div className="flex items-center gap-2 py-4 justify-center">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="text-sm">Loading preview...</span>
                    </div>
                  ) : (
                    <pre className="text-[11px] font-mono whitespace-pre-wrap">{previewData}</pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Save */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin mr-1" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
