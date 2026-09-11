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
import { Loader2, PackageMinus } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  unit_of_measure: string | null;
}

interface StockInfo {
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
}

interface IssueStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: StockLocation[];
  onSuccess: () => void;
}

export function IssueStockModal({
  open,
  onOpenChange,
  locations,
  onSuccess,
}: IssueStockModalProps) {
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
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
      setStockInfo(null);
    }
  }, [open]);

  // Fetch available stock when product + location selected
  useEffect(() => {
    if (form.productId && form.locationId) {
      fetchStockInfo();
    } else {
      setStockInfo(null);
    }
  }, [form.productId, form.locationId]);

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

  const fetchStockInfo = async () => {
    setLoadingStock(true);
    try {
      const res = await fetch(
        `/api/inventory?location_id=${form.locationId}`
      );
      if (res.ok) {
        const data = await res.json();
        const stock = (data.stock || []).find(
          (s: { product_id: string }) => s.product_id === form.productId
        );
        if (stock) {
          setStockInfo({
            quantity_on_hand: stock.quantity_on_hand,
            quantity_reserved: stock.quantity_reserved,
            quantity_available: stock.quantity_available,
          });
        } else {
          setStockInfo({ quantity_on_hand: 0, quantity_reserved: 0, quantity_available: 0 });
        }
      }
    } catch (err) {
      console.error("Failed to load stock info:", err);
    } finally {
      setLoadingStock(false);
    }
  };

  const handleSubmit = async () => {
    const qty = parseInt(form.quantity);
    if (!form.productId || !form.locationId || !qty || qty <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (stockInfo && qty > stockInfo.quantity_available) {
      toast.error(
        `Cannot issue ${qty} units. Only ${stockInfo.quantity_available} available.`
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue",
          location_id: form.locationId,
          product_id: form.productId,
          quantity: qty,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to issue stock");
      }
      toast.success("Stock issued successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to issue stock";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === form.productId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageMinus className="h-5 w-5 text-red-400" />
            Issue Stock
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

          <div>
            <Label className="text-zinc-300">Location *</Label>
            <Select
              value={form.locationId}
              onValueChange={(v) => setForm((p) => ({ ...p, locationId: v }))}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
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

          {/* Stock availability info */}
          {form.productId && form.locationId && (
            <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
              {loadingStock ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking stock...
                </div>
              ) : stockInfo ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">On Hand</p>
                    <p className="text-sm font-bold text-white">
                      {stockInfo.quantity_on_hand}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Reserved</p>
                    <p className="text-sm font-bold text-amber-400">
                      {stockInfo.quantity_reserved}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase">Available</p>
                    <p className="text-sm font-bold text-green-400">
                      {stockInfo.quantity_available}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No stock record found</p>
              )}
            </div>
          )}

          <div>
            <Label className="text-zinc-300">
              Quantity *{selectedProduct?.unit_of_measure
                ? ` (${selectedProduct.unit_of_measure})`
                : ""}
            </Label>
            <Input
              type="number"
              min="1"
              max={stockInfo?.quantity_available || undefined}
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              placeholder="Enter quantity to issue"
              className="bg-zinc-800 border-zinc-700 mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-300">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Sale #1234, Customer pickup"
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
            disabled={saving || !form.productId || !form.locationId || !form.quantity}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Issue Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
