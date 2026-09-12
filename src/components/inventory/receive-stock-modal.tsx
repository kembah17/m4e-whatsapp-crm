"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  track_inventory: boolean;
  unit_of_measure: string | null;
}

interface ReceiveStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: StockLocation[];
  onSuccess: () => void;
}

export function ReceiveStockModal({
  open,
  onOpenChange,
  locations,
  onSuccess,
}: ReceiveStockModalProps) {
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    locationId: "",
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    if (open && products.length === 0) {
      fetchProducts();
    }
    if (open) {
      setForm({ productId: "", locationId: "", quantity: "", notes: "" });
    }
  }, [open]);

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

  const handleSubmit = async () => {
    const qty = parseInt(form.quantity);
    if (!form.productId || !form.locationId || !qty || qty <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive",
          location_id: form.locationId,
          product_id: form.productId,
          quantity: qty,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to receive stock");
      }
      toast.success("Stock received successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to receive stock";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === form.productId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-400" />
            Receive Stock
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Product *</Label>
            {loadingProducts ? (
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
              </div>
            ) : (
              <Select
                value={form.productId}
                onValueChange={(v) => setForm((p) => ({ ...p, productId: v }))}
              >
                <SelectTrigger className="bg-muted border-border mt-1">
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
            )}
          </div>

          <div>
            <Label className="text-muted-foreground">Location *</Label>
            <Select
              value={form.locationId}
              onValueChange={(v) => setForm((p) => ({ ...p, locationId: v }))}
            >
              <SelectTrigger className="bg-muted border-border mt-1">
                <SelectValue placeholder="Select location" />
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
            <Label className="text-muted-foreground">
              Quantity *{selectedProduct?.unit_of_measure
                ? ` (${selectedProduct.unit_of_measure})`
                : ""}
            </Label>
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              placeholder="Enter quantity"
              className="bg-muted border-border mt-1"
            />
          </div>

          <div>
            <Label className="text-muted-foreground">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. PO #1234, Supplier delivery"
              className="bg-muted border-border mt-1"
              rows={2}
            />
          </div>
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
            disabled={saving || !form.productId || !form.locationId || !form.quantity}
            className="bg-green-600 hover:bg-green-700 text-primary-foreground"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Receive Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
