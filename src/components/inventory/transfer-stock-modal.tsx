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
import { Loader2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  unit_of_measure: string | null;
}

interface TransferStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: StockLocation[];
  onSuccess: () => void;
}

export function TransferStockModal({
  open,
  onOpenChange,
  locations,
  onSuccess,
}: TransferStockModalProps) {
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    fromLocationId: "",
    toLocationId: "",
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    if (open && products.length === 0) {
      fetchProducts();
    }
    if (open) {
      setForm({
        productId: "",
        fromLocationId: "",
        toLocationId: "",
        quantity: "",
        notes: "",
      });
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
    if (
      !form.productId ||
      !form.fromLocationId ||
      !form.toLocationId ||
      !qty ||
      qty <= 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.fromLocationId === form.toLocationId) {
      toast.error("Source and destination must be different locations");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_location_id: form.fromLocationId,
          to_location_id: form.toLocationId,
          product_id: form.productId,
          quantity: qty,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to transfer stock");
      }
      toast.success("Stock transferred successfully");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-blue-400" />
            Transfer Stock
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-zinc-300">Product *</Label>
            {loadingProducts ? (
              <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
              </div>
            ) : (
              <Select
                value={form.productId}
                onValueChange={(v) => setForm((p) => ({ ...p, productId: v }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-300">From Location *</Label>
              <Select
                value={form.fromLocationId}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, fromLocationId: v }))
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((l) => l.id !== form.toLocationId)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-300">To Location *</Label>
              <Select
                value={form.toLocationId}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, toLocationId: v }))
                }
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                  <SelectValue placeholder="Destination" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((l) => l.id !== form.fromLocationId)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-zinc-300">Quantity *</Label>
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) =>
                setForm((p) => ({ ...p, quantity: e.target.value }))
              }
              placeholder="Enter quantity to transfer"
              className="bg-zinc-800 border-zinc-700 mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-300">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="e.g. Restocking store from warehouse"
              className="bg-zinc-800 border-zinc-700 mt-1"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              saving ||
              !form.productId ||
              !form.fromLocationId ||
              !form.toLocationId ||
              !form.quantity
            }
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
