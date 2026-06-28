"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react"

interface SyncStatus {
  id: string
  product_id: string
  catalog_id: string | null
  meta_product_id: string | null
  sync_status: string
  last_synced_at: string | null
  error_message: string | null
  product?: { name: string; price: number; status: string }
}

interface Catalog {
  id: string
  name: string
  product_count?: number
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  synced: { icon: CheckCircle2, color: "text-green-500", label: "Synced" },
  pending: { icon: Clock, color: "text-yellow-500", label: "Pending" },
  error: { icon: AlertCircle, color: "text-red-500", label: "Error" },
  deleted: { icon: AlertCircle, color: "text-gray-400", label: "Deleted" },
}

export function CatalogSync() {
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [catRes, statusRes] = await Promise.all([
        fetch("/api/whatsapp/catalog"),
        fetch("/api/products?status=active"),
      ])
      if (catRes.ok) {
        const catData = await catRes.json()
        setCatalogs(catData.catalogs ?? [])
      }
      // We'll show products with their sync status
      if (statusRes.ok) {
        const _prodData = await statusRes.json()
        void _prodData
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const syncAll = async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/whatsapp/catalog", { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Sync failed")
      }
      const data = await res.json()
      const synced = data.results?.filter((r: { status: string }) => r.status === 'synced').length || 0
      const errors = data.results?.filter((r: { status: string }) => r.status === 'error').length || 0
      toast.success(`Sync complete: ${synced} synced, ${errors} errors`)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Catalog Info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" /> Meta Catalog
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={syncAll} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Sync All Products
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : catalogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No catalogs found. Create a catalog in Meta Business Suite first,
                then come back to sync your CRM products.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {catalogs.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">ID: {cat.id}</p>
                  </div>
                  <Badge variant="outline">
                    {cat.product_count ?? 0} products
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Status Table */}
      {syncStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncStatuses.map((s) => {
                const cfg = STATUS_CONFIG[s.sync_status] || STATUS_CONFIG.pending
                const Icon = cfg.icon
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                      <div>
                        <p className="text-sm font-medium">{s.product?.name || s.product_id}</p>
                        {s.error_message && (
                          <p className="text-xs text-red-400">{s.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                      {s.last_synced_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(s.last_synced_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
