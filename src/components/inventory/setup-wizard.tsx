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

function PresetLocationPreview({
  locations,
  depth = 0,
}: {
  locations: PresetLocation[];
  depth?: number;
}) {
  return (
    <div className={depth > 0 ? "ml-5 border-l border-zinc-700 pl-3" : ""}>
      {locations.map((loc, i) => {
        const Icon = TYPE_ICONS[loc.type] || Box;
        return (
          <div key={`${loc.name}-${i}`}>
            <div className="flex items-center gap-2 py-1.5">
              <Icon className="h-4 w-4 text-zinc-400 shrink-0" />
              <span className="text-sm text-white">{loc.name}</span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-zinc-600 text-zinc-400"
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

  const selectedPreset = INDUSTRY_PRESETS.find(
    (p) => p.industry === selectedIndustry
  );

  const handleApply = async () => {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#C9A84C]" />
            Inventory Setup Wizard
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Step {step} of 3</span>
            <span>
              {step === 1
                ? "Select Industry"
                : step === 2
                ? "Preview Locations"
                : "Confirm"}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1">
            <div
              className="bg-[#C9A84C] h-1 rounded-full transition-all"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Select Industry */}
        {step === 1 && (
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">
              Choose your industry to set up recommended stock locations.
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
              {INDUSTRY_PRESETS.map((preset) => {
                const Icon = INDUSTRY_ICONS[preset.industry] || Box;
                return (
                  <button
                    key={preset.industry}
                    onClick={() => setSelectedIndustry(preset.industry)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedIndustry === preset.industry
                        ? "border-[#C9A84C] bg-[#C9A84C]/10"
                        : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <Icon className={`h-5 w-5 mb-1 ${
                      selectedIndustry === preset.industry
                        ? "text-[#C9A84C]"
                        : "text-zinc-400"
                    }`} />
                    <div className="text-sm font-medium text-white capitalize">
                      {preset.industry.replace(/_/g, " ")}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && selectedPreset && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                These locations will be created:
              </p>
              <Badge
                variant="outline"
                className="border-zinc-600 text-zinc-400"
              >
                {countLocations(selectedPreset.defaultLocations)} locations
              </Badge>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 max-h-[40vh] overflow-y-auto">
              <PresetLocationPreview
                locations={selectedPreset.defaultLocations}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-800 rounded p-2 border border-zinc-700">
                <span className="text-zinc-500">Unit of Measure:</span>
                <span className="text-white ml-1">
                  {selectedPreset.unitOfMeasure}
                </span>
              </div>
              <div className="bg-zinc-800 rounded p-2 border border-zinc-700">
                <span className="text-zinc-500">Batch Tracking:</span>
                <span className="text-white ml-1">
                  {selectedPreset.batchTrackingEnabled ? "Yes" : "No"}
                </span>
              </div>
              <div className="bg-zinc-800 rounded p-2 border border-zinc-700">
                <span className="text-zinc-500">Expiry Tracking:</span>
                <span className="text-white ml-1">
                  {selectedPreset.expiryTrackingEnabled ? "Yes" : "No"}
                </span>
              </div>
              <div className="bg-zinc-800 rounded p-2 border border-zinc-700">
                <span className="text-zinc-500">Reorder Point:</span>
                <span className="text-white ml-1">
                  {selectedPreset.reorderDefaults.point}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedPreset && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              {(() => {
                const Icon = INDUSTRY_ICONS[selectedPreset.industry] || Box;
                return <Icon className="h-10 w-10 text-[#C9A84C] mx-auto mb-2" />;
              })()}
              <h3 className="text-lg font-semibold text-white capitalize">
                {selectedPreset.industry.replace(/_/g, " ")} Setup
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {countLocations(selectedPreset.defaultLocations)} locations will
                be created for your business.
              </p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
              <p className="text-xs text-zinc-500 mb-2">This will create:</p>
              <ul className="space-y-1">
                {selectedPreset.defaultLocations.map((loc, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-white"
                  >
                    <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    {loc.name}
                    {loc.children && (
                      <span className="text-zinc-500 text-xs">
                        ({loc.children.length} sub-locations)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-zinc-700"
            >
              Back
            </Button>
          )}
          {step === 1 && (
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-zinc-700"
            >
              Cancel
            </Button>
          )}
          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!selectedIndustry}
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
              className="bg-green-600 hover:bg-green-700 text-white"
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
