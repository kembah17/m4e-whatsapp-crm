"use client";

import { useState, useEffect } from "react";
import type { StockLocation, LocationType } from "@/types/inventory";
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
import { Loader2 } from "lucide-react";

const LOCATION_TYPES: { value: LocationType; label: string }[] = [
  { value: "warehouse", label: "Warehouse" },
  { value: "store", label: "Store" },
  { value: "zone", label: "Zone" },
  { value: "shelf", label: "Shelf" },
  { value: "bin", label: "Bin" },
  { value: "transit", label: "Transit" },
  { value: "virtual", label: "Virtual" },
];

interface LocationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: StockLocation | null;
  parentId?: string | null;
  allLocations: StockLocation[];
  onSuccess: () => void;
}

export function LocationFormModal({
  open,
  onOpenChange,
  location,
  parentId,
  allLocations,
  onSuccess,
}: LocationFormModalProps) {
  const isEditing = !!location;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    locationType: "warehouse" as LocationType,
    parentId: "" as string,
    address: "",
  });

  useEffect(() => {
    if (location) {
      setForm({
        name: location.name,
        locationType: location.location_type,
        parentId: location.parent_id || "",
        address: location.address || "",
      });
    } else {
      setForm({
        name: "",
        locationType: "warehouse",
        parentId: parentId || "",
        address: "",
      });
    }
  }, [location, parentId, open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        locationType: form.locationType,
        parentId: form.parentId || null,
        address: form.address.trim() || null,
      };

      if (isEditing && location) {
        const res = await fetch(`/api/inventory/locations/${location.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update location");
      } else {
        const res = await fetch("/api/inventory/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create location");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Location" : "Add Location"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Main Warehouse"
              className="bg-muted border-border mt-1"
            />
          </div>

          <div>
            <Label className="text-muted-foreground">Type *</Label>
            <Select
              value={form.locationType}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, locationType: v as LocationType }))
              }
            >
              <SelectTrigger className="bg-muted border-border mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-muted-foreground">Parent Location</Label>
            <Select
              value={form.parentId}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, parentId: v === "none" ? "" : v }))
              }
            >
              <SelectTrigger className="bg-muted border-border mt-1">
                <SelectValue placeholder="None (top level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top level)</SelectItem>
                {allLocations
                  .filter((l) => !location || l.id !== location.id)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-muted-foreground">Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Physical address (optional)"
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
            disabled={saving || !form.name.trim()}
            className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
