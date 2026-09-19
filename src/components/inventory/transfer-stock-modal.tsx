"use client";

import { useState, useEffect, useCallback } from "react";
import type { StockLocation } from "@/types/inventory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeftRight, Plus, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  unit_of_measure: string | null;
}

interface StockInfo {
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
}

interface LineItem {
  productId: string;
  quantity: string;
  notes: string;
}

interface TransferStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: StockLocation[];
  onSuccess: () => void;
}

const emptyItem = (): LineItem => ({ productId: "", quantity: "", notes: "" });

export function TransferStockModal({
  open,
  onOpenChange,
  locations,
  onSuccess,
}: TransferStockModalProps) {
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [stockMap, setStockMap] = useState<Record<string, StockInfo>>({});
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    if (open && products.length === 0) {
      fetchProducts();
    }
    if (open) {
      setFromLocationId("");
      setToLocationId("");
      setItems([emptyItem()]);
      setStockMap({});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch stock levels when source location changes
  useEffect(() => {
    if (fromLocationId) {
      fetchStockForLocation(fromLocationId);
    } else {
      setStockMap({});
    }
  }, [fromLocationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchStockForLocation = async (locId: string) => {
    setLoadingStock(true);
    try {
      const res = await fetch(`/api/inventory?location_id=${locId}`);
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, StockInfo> = {};
        for (const row of data.stock || []) {
          map[row.product_id] = {
            quantity_on_hand: row.quantity_on_hand ?? 0,
            quantity_reserved: row.quantity_reserved ?? 0,
            quantity_available: row.quantity_available ?? 0,
          };
        }
        setStockMap(map);
      }
    } catch (err) {
      console.error("Failed to load stock:", err);
    } finally {
      setLoadingStock(false);
    }
  };

  const updateItem = useCallback((index: number, updates: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  const validItems = items.filter(
    (item) => item.productId && parseInt(item.quantity) > 0
  );

  const getAvailable = (productId: string) =>
    stockMap[productId]?.quantity_available ?? 0;

  const hasOverTransfer = validItems.some(
    (item) => parseInt(item.quantity) > getAvailable(item.productId)
  );

  const sameLocation = fromLocationId && toLocationId && fromLocationId === toLocationId;

  const handleSubmit = async () => {
    if (!fromLocationId || !toLocationId) {
      toast.error("Please select both source and destination locations");
      return;
    }
    if (sameLocation) {
      toast.error("Source and destination must be different");
      return;
    }
    if (validItems.length === 0) {
      toast.error("Please add at least one item with a product and quantity");
      return;
    }
    if (hasOverTransfer) {
      toast.error("One or more items exceed available stock at source");
      return;
    }
    setSaving(true);
    let successCount = 0;
    let failCount = 0;
    try {
      for (const item of validItems) {
        try {
          const res = await fetch("/api/inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "transfer",
              from_location_id: fromLocationId,
              to_location_id: toLocationId,
              product_id: item.productId,
              quantity: parseInt(item.quantity),
              notes: item.notes.trim() || null,
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed");
          }
          successCount++;
        } catch {
          failCount++;
        }
      }
      if (failCount === 0) {
        toast.success(
          validItems.length === 1
            ? "Stock transferred successfully"
            : `${successCount} items transferred successfully`
        );
      } else {
        toast.warning(
          `${successCount} transferred, ${failCount} failed. Check inventory for details.`
        );
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to transfer stock";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const getProductName = (id: string) =>
    products.find((p) => p.id === id)?.name || "";

  const fromName = locations.find((l) => l.id === fromLocationId)?.name || "";
  const toName = locations.find((l) => l.id === toLocationId)?.name || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-blue-400" />
            Transfer Stock
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Source and Destination Locations */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground">From *</Label>
              <Select value={fromLocationId} onValueChange={setFromLocationId}>
                <SelectTrigger className="bg-muted border-border mt-1">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">To *</Label>
              <Select value={toLocationId} onValueChange={setToLocationId}>
                <SelectTrigger className={`bg-muted border-border mt-1 ${
                  sameLocation ? "border-red-500" : ""
                }`}>
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((l) => l.id !== fromLocationId)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {sameLocation && (
                <p className="text-xs text-red-400 mt-1">Must differ from source</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <Label className="text-muted-foreground">Items *</Label>
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
              </div>
            ) : (
              items.map((item, index) => {
                const avail = item.productId ? getAvailable(item.productId) : null;
                const qty = parseInt(item.quantity) || 0;
                const overTransfer = avail !== null && qty > avail;
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-2 rounded-lg border p-3 ${
                      overTransfer
                        ? "border-red-500/50 bg-red-500/5"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex-1 space-y-2">
                      <Select
                        value={item.productId}
                        onValueChange={(v) => updateItem(index, { productId: v })}
                      >
                        <SelectTrigger className="bg-muted border-border">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} {p.sku ? `(${p.sku})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          max={avail ?? undefined}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, { quantity: e.target.value })
                          }
                          placeholder="Qty"
                          className={`bg-muted border-border w-24 ${
                            overTransfer ? "border-red-500 text-red-400" : ""
                          }`}
                        />
                        <Input
                          value={item.notes}
                          onChange={(e) =>
                            updateItem(index, { notes: e.target.value })
                          }
                          placeholder="Notes (optional)"
                          className="bg-muted border-border flex-1"
                        />
                      </div>
                      {item.productId && fromLocationId && !loadingStock && (
                        <p className={`text-xs ${
                          overTransfer ? "text-red-400" : "text-muted-foreground"
                        }`}>
                          {overTransfer && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                          Available at source: {avail} units
                          {overTransfer && " — exceeds available stock"}
                        </p>
                      )}
                    </div>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={addItem}
              className="w-full border-dashed border-border text-muted-foreground"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Another Item
            </Button>
          </div>

          {/* Summary */}
          {validItems.length > 0 && fromLocationId && toLocationId && !sameLocation && (
            <div className={`border rounded-lg p-3 text-sm ${
              hasOverTransfer
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            }`}>
              Transferring {validItems.length} item{validItems.length !== 1 ? "s" : ""}{" "}
              from <span className="font-medium">{fromName}</span>{" "}
              to <span className="font-medium">{toName}</span>:
              <ul className="mt-1 ml-4 list-disc text-xs">
                {validItems.map((item, i) => (
                  <li key={i}>
                    {getProductName(item.productId)} × {item.quantity}
                    {parseInt(item.quantity) > getAvailable(item.productId) && (
                      <span className="text-red-400 font-medium"> (exceeds stock!)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              saving ||
              !fromLocationId ||
              !toLocationId ||
              !!sameLocation ||
              validItems.length === 0 ||
              hasOverTransfer
            }
            className="bg-blue-600 hover:bg-blue-700 text-primary-foreground"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transfer {validItems.length > 1 ? `${validItems.length} Items` : "Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
