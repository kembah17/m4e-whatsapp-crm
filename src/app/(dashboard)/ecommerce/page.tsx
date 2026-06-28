"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ShoppingCart,
  Store,
  Package,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Layers,
} from "lucide-react"
import { IntegrationSetupWizard } from "@/components/ecommerce/integration-setup-wizard"
import { OrderList } from "@/components/ecommerce/order-list"
import { CartList } from "@/components/ecommerce/cart-list"
import { CatalogSync } from "@/components/catalog/catalog-sync"

interface Integration {
  id: string
  platform: string
  store_url: string
  sync_products: boolean
  sync_orders: boolean
  sync_customers: boolean
  is_active: boolean
  last_synced_at: string | null
  created_at: string
}

type TabValue = "integrations" | "orders" | "carts" | "catalog"

export default function EcommercePage() {
  const [activeTab, setActiveTab] = useState<TabValue>("integrations")
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/ecommerce/integrations")
      if (!res.ok) throw new Error("Failed to fetch integrations")
      const data = await res.json()
      setIntegrations(data.integrations ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load integrations")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  const activeIntegrations = integrations.filter((i) => i.is_active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">E-Commerce</h1>
          <p className="text-sm text-muted-foreground">
            Connect your online store and manage orders, carts, and product sync.
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Connect Store
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Connected Stores
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeIntegrations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platforms
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {activeIntegrations.length > 0 ? (
                [...new Set(activeIntegrations.map((i) => i.platform))].map((p) => (
                  <Badge key={p} variant="secondary" className="capitalize">
                    {p}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Sync
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {activeIntegrations.some((i) => i.last_synced_at)
                ? new Date(
                    Math.max(
                      ...activeIntegrations
                        .filter((i) => i.last_synced_at)
                        .map((i) => new Date(i.last_synced_at!).getTime()),
                    ),
                  ).toLocaleString()
                : "Never"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Store className="h-3.5 w-3.5" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="carts" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" />
            Carts
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Catalog
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      {activeTab === "integrations" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : integrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Store className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-foreground">No stores connected</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your Shopify or WooCommerce store to sync orders and products.
                </p>
                <Button onClick={() => setShowWizard(true)} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Connect Store
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium capitalize">{integration.platform}</h3>
                          <p className="text-xs text-muted-foreground">{integration.store_url}</p>
                        </div>
                      </div>
                      <Badge variant={integration.is_active ? "default" : "secondary"}>
                        {integration.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {integration.sync_products && (
                        <Badge variant="outline" className="text-xs">Products</Badge>
                      )}
                      {integration.sync_orders && (
                        <Badge variant="outline" className="text-xs">Orders</Badge>
                      )}
                      {integration.sync_customers && (
                        <Badge variant="outline" className="text-xs">Customers</Badge>
                      )}
                    </div>
                    {integration.last_synced_at && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Last synced: {new Date(integration.last_synced_at).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "orders" && <OrderList />}
      {activeTab === "carts" && <CartList />}
        {activeTab === "catalog" && <CatalogSync />}

      {/* Setup Wizard Dialog */}
      {showWizard && (
        <IntegrationSetupWizard
          open={showWizard}
          onClose={() => {
            setShowWizard(false)
            fetchIntegrations()
          }}
        />
      )}
    </div>
  )
}
