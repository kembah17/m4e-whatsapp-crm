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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ClipboardCheck,
  ChevronRight,
  AlertTriangle,
  Check,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface CountItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  expected_quantity: number;
  counted_quantity: number | null;
  variance: number | null;
  notes: string | null;
}

interface CountData {
  id: string;
  location_id: string;
  status: string;
  count_date: string;
  notes: string | null;
  items: CountItem[];
}

interface StockCountWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: StockLocation[];
  onSuccess: () => void;
}

export function StockCountWizard({
  open,
  onOpenChange,
  locations,
  onSuccess,
}: StockCountWizardProps) {
  const [step, setStep] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [countData, setCountData] = useState<CountData | null>(null);
  const [countedValues, setCountedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setStep(1);
      setLocationId("");
      setNotes("");
      setCountData(null);
      setCountedValues({});
    }
  }, [open]);

  const handleCreateCount = async () => {
    if (!locationId) {
      toast.error("Please select a location");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          count_date: new Date().toISOString().split("T")[0],
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create count");
      }
      const data = await res.json();
      const countId = data.count?.id;
      if (!countId) throw new Error("No count ID returned");

      // Fetch the count with items
      const detailRes = await fetch(`/api/inventory/counts/${countId}`);
      if (!detailRes.ok) throw new Error("Failed to load count details");
      const detailData = await detailRes.json();
      setCountData(detailData.count);

      // Initialize counted values
      const initial: Record<string, string> = {};
      (detailData.count?.items || []).forEach((item: CountItem) => {
        initial[item.id] = "";
      });
      setCountedValues(initial);
      setStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create count";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCounts = async () => {
    if (!countData) return;
    setSaving(true);
    try {
      const items = countData.items
        .filter((item) => countedValues[item.id] !== "")
        .map((item) => ({
          id: item.id,
          counted_quantity: parseInt(countedValues[item.id]) || 0,
        }));

      if (items.length === 0) {
        toast.error("Please enter at least one counted quantity");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/inventory/counts/${countData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save counts");
      }

      // Refresh count data to get updated variances
      const detailRes = await fetch(`/api/inventory/counts/${countData.id}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setCountData(detailData.count);
      }

      toast.success("Counts saved");
      setStep(3);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save counts";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!countData) return;
    setFinalizing(true);
    try {
      const res = await fetch(`/api/inventory/counts/${countData.id}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to finalize count");
      }
      toast.success("Count finalized! Stock adjustments have been applied.");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to finalize count";
      toast.error(message);
    } finally {
      setFinalizing(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setStep(1);
      setCountData(null);
    }
    onOpenChange(isOpen);
  };

  const items = countData?.items || [];
  const countedCount = items.filter((i) => countedValues[i.id] !== "").length;
  const hasVariances = items.some((i) => {
    const counted = parseInt(countedValues[i.id]);
    return !isNaN(counted) && counted !== i.expected_quantity;
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-purple-400" />
            Physical Stock Count
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Step {step} of 3</span>
            <span>
              {step === 1
                ? "Select Location"
                : step === 2
                ? "Enter Counts"
                : "Review & Finalize"}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1">
            <div
              className="bg-purple-500 h-1 rounded-full transition-all"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Select Location */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Select the location to count. The system will load all products
              and their expected quantities at that location.
            </p>
            <div>
              <Label className="text-zinc-300">Location *</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 mt-1">
                  <SelectValue placeholder="Select location to count" />
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
              <Label className="text-zinc-300">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Monthly stock count, End of quarter audit"
                className="bg-zinc-800 border-zinc-700 mt-1"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 2: Enter Counts */}
        {step === 2 && countData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                Enter the physical count for each product.
              </p>
              <Badge variant="outline" className="border-zinc-600 text-zinc-400">
                {countedCount} / {items.length} counted
              </Badge>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No products found at this location.</p>
                <p className="text-xs mt-1">
                  Receive stock at this location first.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {items.map((item) => {
                  const counted = parseInt(countedValues[item.id]);
                  const variance = !isNaN(counted)
                    ? counted - item.expected_quantity
                    : null;
                  return (
                    <div
                      key={item.id}
                      className={`bg-zinc-800 rounded-lg p-3 border transition-colors ${
                        variance !== null && variance !== 0
                          ? variance > 0
                            ? "border-blue-500/50"
                            : "border-red-500/50"
                          : variance === 0
                          ? "border-green-500/50"
                          : "border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {item.product_name}
                          </p>
                          {item.product_sku && (
                            <p className="text-xs text-zinc-500">
                              SKU: {item.product_sku}
                            </p>
                          )}
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Expected: <span className="font-medium">{item.expected_quantity}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={countedValues[item.id] || ""}
                            onChange={(e) =>
                              setCountedValues((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Count"
                            className="bg-zinc-900 border-zinc-600 w-24 text-center"
                          />
                          {variance !== null && (
                            <div
                              className={`flex items-center gap-1 text-xs font-medium min-w-[60px] justify-end ${
                                variance > 0
                                  ? "text-blue-400"
                                  : variance < 0
                                  ? "text-red-400"
                                  : "text-green-400"
                              }`}
                            >
                              {variance > 0 ? (
                                <Plus className="h-3 w-3" />
                              ) : variance < 0 ? (
                                <Minus className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              {variance === 0 ? "Match" : Math.abs(variance)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review & Finalize */}
        {step === 3 && countData && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Review the count results. Finalizing will create stock adjustment
              entries for any variances.
            </p>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 text-center">
                <p className="text-[10px] text-zinc-500 uppercase">Items Counted</p>
                <p className="text-lg font-bold text-white">{countedCount}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 text-center">
                <p className="text-[10px] text-zinc-500 uppercase">Matches</p>
                <p className="text-lg font-bold text-green-400">
                  {items.filter((i) => {
                    const c = parseInt(countedValues[i.id]);
                    return !isNaN(c) && c === i.expected_quantity;
                  }).length}
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 text-center">
                <p className="text-[10px] text-zinc-500 uppercase">Variances</p>
                <p className="text-lg font-bold text-amber-400">
                  {items.filter((i) => {
                    const c = parseInt(countedValues[i.id]);
                    return !isNaN(c) && c !== i.expected_quantity;
                  }).length}
                </p>
              </div>
            </div>

            {/* Variance details */}
            {hasVariances && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Items with variances:
                </div>
                <div className="space-y-1 max-h-[30vh] overflow-y-auto">
                  {items
                    .filter((i) => {
                      const c = parseInt(countedValues[i.id]);
                      return !isNaN(c) && c !== i.expected_quantity;
                    })
                    .map((item) => {
                      const counted = parseInt(countedValues[item.id]);
                      const variance = counted - item.expected_quantity;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-zinc-800 rounded p-2 border border-zinc-700"
                        >
                          <div>
                            <span className="text-sm text-white">
                              {item.product_name}
                            </span>
                            <span className="text-xs text-zinc-500 ml-2">
                              Expected: {item.expected_quantity} | Counted: {counted}
                            </span>
                          </div>
                          <Badge
                            className={`${
                              variance > 0
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : "bg-red-500/20 text-red-400 border-red-500/30"
                            }`}
                          >
                            {variance > 0 ? "+" : ""}
                            {variance}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {!hasVariances && countedCount > 0 && (
              <div className="text-center py-4">
                <Check className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-green-400">All counts match expected quantities!</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step > 1 && step < 3 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-zinc-700"
            >
              Back
            </Button>
          )}
          {step === 1 && (
            <>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                className="border-zinc-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCount}
                disabled={loading || !locationId}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Start Count
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === 2 && (
            <Button
              onClick={handleSaveCounts}
              disabled={saving || countedCount === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save & Review
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="border-zinc-700"
              >
                Back to Counting
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={finalizing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {finalizing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Finalize Count
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
