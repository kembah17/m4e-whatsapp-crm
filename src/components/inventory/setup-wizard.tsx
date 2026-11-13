"use client";

import { useState } from "react";
import { INDUSTRY_PRESETS } from "@/lib/inventory/presets";
import type { PresetLocation } from "@/types/inventory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Settings,
  ChevronRight,
  Check,
  Warehouse,
  Store,
  LayoutGrid,
  Box,
  Truck,
  Cloud,
  Factory,
  Building2,
  GraduationCap,
  Heart,
  Leaf,
  UtensilsCrossed,
  Home,
  Briefcase,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

const INDUSTRY_ICONS: Record<string, React.ElementType> = {
  retail: Store,
  restaurant: UtensilsCrossed,
  healthcare: Heart,
  agriculture: Leaf,
  manufacturing: Factory,
  hospitality: Building2,
  real_estate: Home,
  education: GraduationCap,
  logistics: Truck,
  professional_services: Briefcase,
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  warehouse: Warehouse,
  store: Store,
  zone: LayoutGrid,
  shelf: Box,
  bin: Box,
  transit: Truck,
  virtual: Cloud,
};

const LOCATION_TYPES = [
  { value: "warehouse", label: "Warehouse" },
  { value: "store", label: "Store" },
  { value: "zone", label: "Zone" },
  { value: "shelf", label: "Shelf" },
  { value: "bin", label: "Bin" },
  { value: "transit", label: "Transit" },
  { value: "virtual", label: "Virtual" },
];

function PresetLocationPreview({
  locations,
  depth = 0,
}: {
  locations: PresetLocation[];
  depth?: number;
}) {
  return (
    <div className={depth > 0 ? "ml-5 border-l border-border pl-3" : ""}>
      {locations.map((loc, i) => {
        const Icon = TYPE_ICONS[loc.type] || Box;
        return (
          <div key={`${loc.name}-${i}`}>
            <div className="flex items-center gap-2 py-1.5">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{loc.name}</span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-border text-muted-foreground"
              >
                {loc.type}
              </Badge>
            </div>
            {loc.children && loc.children.length > 0 && (
              <PresetLocationPreview
                locations={loc.children}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface SetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SetupWizard({
  open,
  onOpenChange,
  onSuccess,
}: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Custom location builder state
  const [customLocations, setCustomLocations] = useState<{name: string, type: string}[]>([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationType, setNewLocationType] = useState("warehouse");

  const selectedPreset = INDUSTRY_PRESETS.find(
    (p) => p.industry === selectedIndustry
  );

  const isCustom = selectedIndustry === "custom";

  const handleAddCustomLocation = () => {
    const name = newLocationName.trim();
    if (!name) return;
    if (customLocations.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A location with that name already exists");
      return;
    }
    setCustomLocations((prev) => [...prev, { name, type: newLocationType }]);
    setNewLocationName("");
  };

  const handleRemoveCustomLocation = (index: number) => {
    setCustomLocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApply = async () => {
    // Custom mode: call custom setup API
    if (isCustom) {
      if (customLocations.length === 0) return;
      setSaving(true);
      try {
        const res = await fetch("/api/inventory/setup-custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations: customLocations }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create custom locations");
        }
        toast.success("Custom locations created successfully!");
        setStep(1);
        setSelectedIndustry("");
        setCustomLocations([]);
        setNewLocationName("");
        setNewLocationType("warehouse");
        onSuccess();
        onOpenChange(false);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create locations";
        toast.error(message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Preset mode: existing logic
    if (!selectedIndustry) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: selectedIndustry }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to apply preset");
      }
      toast.success("Inventory locations created successfully!");
      setStep(1);
      setSelectedIndustry("");
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to apply preset";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setStep(1);
      setSelectedIndustry("");
      setCustomLocations([]);
      setNewLocationName("");
      setNewLocationType("warehouse");
    }
    onOpenChange(isOpen);
  };

  const countLocations = (locs: PresetLocation[]): number => {
    let count = locs.length;
    locs.forEach((l) => {
      if (l.children) count += countLocations(l.children);
    });
    return count;
  };

  // Determine if Next button should be disabled
  const isNextDisabled = () => {
    if (step === 1) return !selectedIndustry;
    if (step === 2 && isCustom) return customLocations.length === 0;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#C9A84C]" />
            Inventory Setup Wizard
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {step} of 3</span>
            <span>
              {step === 1
                ? "Select Industry"
                : step === 2
                ? isCustom ? "Add Locations" : "Preview Locations"
                : "Confirm"}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <div
              className="bg-[#C9A84C] h-1 rounded-full transition-all"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Select Industry */}
        {step === 1 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Choose your industry to set up recommended stock locations, or build a custom structure.
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
              {/* Custom option - first card */}
              <button
                onClick={() => setSelectedIndustry("custom")}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedIndustry === "custom"
                    ? "border-[#C9A84C] bg-[#C9A84C]/10"
                    : "border-dashed border-border bg-muted hover:border-[#C9A84C]/50"
                }`}
              >
                <Settings className={`h-5 w-5 mb-1 ${
                  selectedIndustry === "custom"
                    ? "text-[#C9A84C]"
                    : "text-muted-foreground"
                }`} />
                <div className="text-sm font-medium text-foreground">
                  Custom Setup
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  Build your own location structure from scratch
                </div>
              </button>

              {/* Industry presets */}
              {INDUSTRY_PRESETS.map((preset) => {
                const Icon = INDUSTRY_ICONS[preset.industry] || Box;
                return (
                  <button
                    key={preset.industry}
                    onClick={() => setSelectedIndustry(preset.industry)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedIndustry === preset.industry
                        ? "border-[#C9A84C] bg-[#C9A84C]/10"
                        : "border-border bg-muted hover:border-border"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${
                      selectedIndustry === preset.industry
                        ? "text-[#C9A84C]"
                        : "text-muted-foreground"
                    }`} />
                    <div className="text-sm font-medium text-foreground capitalize">
                      {preset.industry.replace(/_/g, " ")}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Preview (Preset) */}
        {step === 2 && !isCustom && selectedPreset && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                These locations will be created:
              </p>
              <Badge
                variant="outline"
                className="border-border text-muted-foreground"
              >
                {countLocations(selectedPreset.defaultLocations)} locations
              </Badge>
            </div>
            <div className="bg-muted rounded-lg p-3 border border-border max-h-[40vh] overflow-y-auto">
              <PresetLocationPreview
                locations={selectedPreset.defaultLocations}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted rounded p-2 border border-border">
                <span className="text-muted-foreground">Unit of Measure:</span>
                <span className="text-foreground ml-1">
                  {selectedPreset.unitOfMeasure}
                </span>
              </div>
              <div className="bg-muted rounded p-2 border border-border">
                <span className="text-muted-foreground">Batch Tracking:</span>
                <span className="text-foreground ml-1">
                  {selectedPreset.batchTrackingEnabled ? "Yes" : "No"}
                </span>
              </div>
              <div className="bg-muted rounded p-2 border border-border">
                <span className="text-muted-foreground">Expiry Tracking:</span>
                <span className="text-foreground ml-1">
                  {selectedPreset.expiryTrackingEnabled ? "Yes" : "No"}
                </span>
              </div>
              <div className="bg-muted rounded p-2 border border-border">
                <span className="text-muted-foreground">Reorder Point:</span>
                <span className="text-foreground ml-1">
                  {selectedPreset.reorderDefaults.point}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Custom Location Builder */}
        {step === 2 && isCustom && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Add your custom locations:
              </p>
              <Badge
                variant="outline"
                className="border-border text-muted-foreground"
              >
                {customLocations.length} location{customLocations.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Add location form */}
            <div className="flex gap-2">
              <Input
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="Location name"
                className="flex-1 bg-muted border-border text-foreground text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCustomLocation();
                }}
              />
              <Select value={newLocationType} onValueChange={setNewLocationType}>
                <SelectTrigger className="w-[130px] bg-muted border-border text-foreground text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {LOCATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleAddCustomLocation}
                disabled={!newLocationName.trim()}
                className="bg-[#C9A84C] hover:bg-[#b8993f] text-black px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Location list */}
            <div className="bg-muted rounded-lg border border-border max-h-[35vh] overflow-y-auto">
              {customLocations.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No locations added yet. Add at least one location to continue.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {customLocations.map((loc, i) => {
                    const Icon = TYPE_ICONS[loc.type] || Box;
                    return (
                      <div
                        key={`${loc.name}-${i}`}
                        className="flex items-center gap-2 px-3 py-2"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground flex-1">
                          {loc.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border-border text-muted-foreground"
                        >
                          {loc.type}
                        </Badge>
                        <button
                          onClick={() => handleRemoveCustomLocation(i)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Confirm (Preset) */}
        {step === 3 && !isCustom && selectedPreset && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              {(() => {
                const Icon = INDUSTRY_ICONS[selectedPreset.industry] || Box;
                return <Icon className="h-10 w-10 text-[#C9A84C] mx-auto mb-2" />;
              })()}
              <h3 className="text-lg font-semibold text-foreground capitalize">
                {selectedPreset.industry.replace(/_/g, " ")} Setup
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {countLocations(selectedPreset.defaultLocations)} locations will
                be created for your business.
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-2">This will create:</p>
              <ul className="space-y-1">
                {selectedPreset.defaultLocations.map((loc, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    {loc.name}
                    {loc.children && (
                      <span className="text-muted-foreground text-xs">
                        ({loc.children.length} sub-locations)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Step 3: Confirm (Custom) */}
        {step === 3 && isCustom && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <Settings className="h-10 w-10 text-[#C9A84C] mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-foreground">
                Custom Setup
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {customLocations.length} location{customLocations.length !== 1 ? "s" : ""} will
                be created for your business.
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-2">This will create:</p>
              <ul className="space-y-1">
                {customLocations.map((loc, i) => {
                  const Icon = TYPE_ICONS[loc.type] || Box;
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {loc.name}
                      <span className="text-muted-foreground text-xs">
                        ({loc.type})
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-border"
            >
              Back
            </Button>
          )}
          {step === 1 && (
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-border"
            >
              Cancel
            </Button>
          )}
          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={isNextDisabled()}
              className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={handleApply}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-primary-foreground"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Locations
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
