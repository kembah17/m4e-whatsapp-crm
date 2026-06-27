"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Store,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface IntegrationSetupWizardProps {
  open: boolean
  onClose: () => void
}

type Platform = "shopify" | "woocommerce"
type Step = 1 | 2 | 3 | 4

export function IntegrationSetupWizard({ open, onClose }: IntegrationSetupWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [storeUrl, setStoreUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [apiSecret, setApiSecret] = useState("")
  const [syncProducts, setSyncProducts] = useState(true)
  const [syncOrders, setSyncOrders] = useState(true)
  const [syncCustomers, setSyncCustomers] = useState(true)
  const [webhookSecret, setWebhookSecret] = useState("")
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/${platform ?? "shopify"}`
    : ""

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!platform || !storeUrl) return
    setSaving(true)
    try {
      const res = await fetch("/api/ecommerce/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          store_url: storeUrl,
          api_key: apiKey || undefined,
          api_secret: apiSecret || undefined,
          sync_products: syncProducts,
          sync_orders: syncOrders,
          sync_customers: syncCustomers,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Failed to create integration")
      }
      const data = await res.json()
      setWebhookSecret(data.integration?.webhook_secret ?? "")
      toast.success("Store connected successfully!")
      setStep(4)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect store")
    } finally {
      setSaving(false)
    }
  }

  const stepLabels = ["Platform", "Store URL", "Configure", "Complete"]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect Your Store</DialogTitle>
          <DialogDescription>
            Set up your e-commerce integration in a few steps.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                  i + 1 <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <div className="h-px w-4 bg-border sm:w-8" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Platform */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose your e-commerce platform:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["shopify", "woocommerce"] as Platform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-6 transition-colors",
                    platform === p
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <Store className="h-8 w-8" />
                  <span className="font-medium capitalize">{p}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!platform}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Store URL */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-url">
                {platform === "shopify" ? "Shopify Store URL" : "WooCommerce Store URL"}
              </Label>
              <Input
                id="store-url"
                placeholder={
                  platform === "shopify"
                    ? "mystore.myshopify.com"
                    : "https://mystore.com"
                }
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {platform === "shopify"
                  ? "Enter your .myshopify.com domain"
                  : "Enter your full WooCommerce store URL"}
              </p>
            </div>

            {platform === "woocommerce" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="api-key">Consumer Key</Label>
                  <Input
                    id="api-key"
                    placeholder="ck_..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-secret">Consumer Secret</Label>
                  <Input
                    id="api-secret"
                    type="password"
                    placeholder="cs_..."
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!storeUrl.trim()}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Configure Sync */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose what to sync from your store:
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Sync Products</p>
                  <p className="text-xs text-muted-foreground">Import product catalog</p>
                </div>
                <Switch checked={syncProducts} onCheckedChange={setSyncProducts} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Sync Orders</p>
                  <p className="text-xs text-muted-foreground">Track order status and history</p>
                </div>
                <Switch checked={syncOrders} onCheckedChange={setSyncOrders} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Sync Customers</p>
                  <p className="text-xs text-muted-foreground">Match customers to contacts</p>
                </div>
                <Switch checked={syncCustomers} onCheckedChange={setSyncCustomers} />
              </div>
            </div>

            {/* Webhook URL */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Webhook URL (configure in your {platform} admin):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">
                  {webhookUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWebhook}
                  className="shrink-0 gap-1"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Store className="h-4 w-4" />
                )}
                Connect Store
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold">Store Connected!</h3>
            <p className="text-sm text-muted-foreground">
              Your {platform} store has been connected. Configure webhooks in your
              store admin to start receiving real-time updates.
            </p>

            {platform === "shopify" && (
              <div className="rounded-lg border bg-muted/50 p-4 text-left">
                <p className="text-sm font-medium mb-2">Next steps for Shopify:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to Shopify Admin → Settings → Notifications → Webhooks</li>
                  <li>Add the webhook URL above for each event type</li>
                  <li>Events: orders/create, orders/updated, products/create, products/update</li>
                </ol>
              </div>
            )}

            {platform === "woocommerce" && (
              <div className="rounded-lg border bg-muted/50 p-4 text-left">
                <p className="text-sm font-medium mb-2">Next steps for WooCommerce:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to WooCommerce → Settings → Advanced → Webhooks</li>
                  <li>Add the webhook URL above for each event type</li>
                  <li>Events: order.created, order.updated, product.created, product.updated</li>
                </ol>
              </div>
            )}

            <Button onClick={onClose} className="gap-2">
              Done
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
