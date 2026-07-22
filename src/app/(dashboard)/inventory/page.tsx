"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import type { StockMovement, InventoryAlert, MovementType } from "@/types/business-growth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Warehouse,
  AlertTriangle,
  Package,
  PackageX,
  TrendingDown,
  Plus,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface InventorySummary {
  totalTrackedProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  unresolvedAlerts: number;
}

interface ProductOption {
  id: string;
  name: string;
  sku?: string;
  stock_quantity?: number;
}

const MOVEMENT_TYPES: { value: MovementType; label: string; color: string }[] = [
  { value: "restock", label: "Restock", color: "text-green-400" },
  { value: "sale", label: "Sale", color: "text-blue-400" },
  { value: "return", label: "Return", color: "text-cyan-400" },
  { value: "adjustment", label: "Adjustment", color: "text-yellow-400" },
  { value: "damage", label: "Damage", color: "text-red-400" },
  { value: "transfer", label: "Transfer", color: "text-purple-400" },
];

export default function InventoryPage() {
  const { defaultCurrency } = useAuth();

  // Summary
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Alerts
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  // Movements
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [filterProductId, setFilterProductId] = useState("");
  const [filterType, setFilterType] = useState("");

  // Products for dropdowns
  const [products, setProducts] = useState<ProductOption[]>([]);

  // Restock modal
  const [showRestock, setShowRestock] = useState(false);
  const [restockProductId, setRestockProductId] = useState("");
  const [restockQty, setRestockQty] = useState("");
  const [restockNotes, setRestockNotes] = useState("");
  const [restockType, setRestockType] = useState<MovementType>("restock");
  const [savingMovement, setSavingMovement] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch("/api/inventory/summary");
      if (res.ok) {
        const json = await res.json();
        setSummary(json.summary);
      }
    } catch {
      // silent
    }
    setLoadingSummary(false);
  }, []);

  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const res = await fetch("/api/inventory/alerts");
      if (res.ok) {
        const json = await res.json();
        setAlerts(json.alerts ?? []);
      }
    } catch {
      // silent
    }
    setLoadingAlerts(false);
  }, []);

  const fetchMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const params = new URLSearchParams();
      if (filterProductId) params.set("product_id", filterProductId);
      if (filterType) params.set("movement_type", filterType);
      params.set("limit", "50");

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMovements(json.movements ?? []);
        setMovementsTotal(json.total ?? 0);
      }
    } catch {
      // silent
    }
    setLoadingMovements(false);
  }, [filterProductId, filterType]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?status=active&limit=500");
      if (res.ok) {
        const json = await res.json();
        setProducts(json.products ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchAlerts();
    fetchMovements();
    fetchProducts();
  }, [fetchSummary, fetchAlerts, fetchMovements, fetchProducts]);

  // Re-fetch movements when filters change
  useEffect(() => {
    fetchMovements();
  }, [filterProductId, filterType, fetchMovements]);

  async function resolveAlert(alertId: string) {
    try {
      const res = await fetch("/api/inventory/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alertId }),
      });
      if (res.ok) {
        toast.success("Alert resolved");
        fetchAlerts();
        fetchSummary();
      } else {
        toast.error("Failed to resolve alert");
      }
    } catch {
      toast.error("Failed to resolve alert");
    }
  }

  async function recordMovement() {
    if (!restockProductId) {
      toast.error("Select a product");
      return;
    }
    const qty = parseInt(restockQty);
    if (!qty || qty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }

    setSavingMovement(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: restockProductId,
          movement_type: restockType,
          quantity: qty,
          notes: restockNotes.trim() || null,
        }),
      });
      if (res.ok) {
        toast.success("Stock movement recorded");
        setShowRestock(false);
        setRestockProductId("");
        setRestockQty("");
        setRestockNotes("");
        setRestockType("restock");
        fetchMovements();
        fetchSummary();
        fetchAlerts();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to record movement");
      }
    } catch {
      toast.error("Failed to record movement");
    }
    setSavingMovement(false);
  }

  function getMovementBadge(type: string) {
    const mt = MOVEMENT_TYPES.find((m) => m.value === type);
    return (
      <Badge variant="outline" className={`text-[10px] ${mt?.color ?? "text-muted-foreground"}`}>
        {mt?.label ?? type}
      </Badge>
    );
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case "critical": return "border-red-500/30 bg-red-500/10 text-red-400";
      case "warning": return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";
      default: return "border-blue-500/30 bg-blue-500/10 text-blue-400";
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track stock levels, movements, and alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchSummary(); fetchAlerts(); fetchMovements(); }}
          >
            <RefreshCw className="size-3.5 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowRestock(true)}>
            <Plus className="size-3.5 mr-1" /> Record Movement
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-primary" />
              <p className="text-xs text-muted-foreground">Tracked Products</p>
            </div>
            <p className="text-2xl font-bold mt-1">
              {loadingSummary ? "..." : summary?.totalTrackedProducts ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="size-4 text-yellow-400" />
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-400">
              {loadingSummary ? "..." : summary?.lowStockCount ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <PackageX className="size-4 text-red-400" />
              <p className="text-xs text-muted-foreground">Out of Stock</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-400">
              {loadingSummary ? "..." : summary?.outOfStockCount ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Warehouse className="size-4 text-green-400" />
              <p className="text-xs text-muted-foreground">Stock Value</p>
            </div>
            <p className="text-2xl font-bold mt-1">
              {loadingSummary ? "..." : formatCurrency(summary?.totalStockValue ?? 0, defaultCurrency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-yellow-400" />
              Inventory Alerts ({alerts.length})
            </CardTitle>
            <CardDescription>Unresolved stock alerts requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs opacity-70 mt-0.5">
                      {new Date(alert.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                    className="shrink-0 ml-2"
                  >
                    <Check className="size-3.5 mr-1" /> Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Movements */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Stock Movements</CardTitle>
              <CardDescription>{movementsTotal} total movements</CardDescription>
            </div>
          </div>
          {/* Filters */}
          <div className="flex items-center gap-3 mt-3">
            <Select value={filterProductId} onValueChange={(v) => setFilterProductId(v ?? "")}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "")}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {MOVEMENT_TYPES.map((mt) => (
                  <SelectItem key={mt.value} value={mt.value}>
                    {mt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingMovements ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12">
              <Warehouse className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No stock movements recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Before</TableHead>
                    <TableHead className="text-right">After</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {(m.product as { name: string } | undefined)?.name ?? "Unknown"}
                      </TableCell>
                      <TableCell>{getMovementBadge(m.movement_type)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {["restock", "return"].includes(m.movement_type) ? "+" : "-"}
                        {m.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {m.previous_quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {m.new_quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">
                        {m.notes || "\u2014"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Movement Dialog */}
      <Dialog open={showRestock} onOpenChange={setShowRestock}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Stock Movement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Product *</Label>
              <Select value={restockProductId} onValueChange={(v) => setRestockProductId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""}
                      {p.stock_quantity !== undefined ? ` \u2014 ${p.stock_quantity} in stock` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Movement Type *</Label>
                <Select value={restockType} onValueChange={(v) => setRestockType((v ?? "restock") as MovementType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map((mt) => (
                      <SelectItem key={mt.value} value={mt.value}>
                        {mt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input
                value={restockNotes}
                onChange={(e) => setRestockNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRestock(false)}
              disabled={savingMovement}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={recordMovement} disabled={savingMovement}>
              {savingMovement ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Plus className="size-3.5 mr-1" />
              )}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
