"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Loader2,
  CreditCard,
  Lock,
  ExternalLink,
} from "lucide-react"

interface PaymentProvider {
  id: string
  provider: string
  is_active: boolean
  is_test_mode: boolean
  supported_channels: string[]
  created_at: string
}

interface ProviderConfig {
  name: string
  description: string
  website: string
  color: string
  comingSoon: boolean
}

const PROVIDERS: Record<string, ProviderConfig> = {
  paystack: {
    name: "Paystack",
    description: "Accept payments from customers in Africa via card, bank transfer, USSD, and mobile money.",
    website: "https://paystack.com",
    color: "border-blue-200 bg-blue-50/50",
    comingSoon: true,
  },
  flutterwave: {
    name: "Flutterwave",
    description: "Accept payments across Africa and globally with cards, bank transfers, mobile money, and more.",
    website: "https://flutterwave.com",
    color: "border-orange-200 bg-orange-50/50",
    comingSoon: true,
  },
}

export function ProviderCards() {
  const [providers, setProviders] = useState<PaymentProvider[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/payments/providers")
      if (!res.ok) throw new Error("Failed to fetch providers")
      const data = await res.json()
      setProviders(data.providers ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load providers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {Object.entries(PROVIDERS).map(([key, config]) => {
        const existing = providers.find((p) => p.provider === key)

        return (
          <Card key={key} className={config.color}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{config.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </div>
                {config.comingSoon ? (
                  <Badge variant="secondary" className="shrink-0">
                    Coming Soon
                  </Badge>
                ) : existing?.is_active ? (
                  <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">
                    Inactive
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.comingSoon ? (
                <>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Public Key</Label>
                      <div className="relative">
                        <Input
                          disabled
                          placeholder="Available after bank account setup"
                          className="bg-muted/50 pr-8"
                        />
                        <Lock className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Secret Key</Label>
                      <div className="relative">
                        <Input
                          disabled
                          type="password"
                          placeholder="Available after bank account setup"
                          className="bg-muted/50 pr-8"
                        />
                        <Lock className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-white/50 p-3">
                    <div>
                      <p className="text-sm font-medium">Test Mode</p>
                      <p className="text-xs text-muted-foreground">Use sandbox environment</p>
                    </div>
                    <Switch disabled checked={true} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled className="flex-1">
                      Configure
                    </Button>
                    <a
                      href={config.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Learn More
                    </a>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {existing ? "Provider configured." : "Not yet configured."}
                  </p>
                  {existing && (
                    <div className="flex flex-wrap gap-1">
                      {existing.supported_channels.map((ch) => (
                        <Badge key={ch} variant="outline" className="text-xs capitalize">
                          {ch.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
