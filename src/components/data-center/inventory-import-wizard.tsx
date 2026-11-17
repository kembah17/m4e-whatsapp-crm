"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
  Warehouse,
} from "lucide-react";

interface InventoryImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

type Step = "upload" | "map" | "preview" | "importing" | "done";

interface ParsedRow {
  raw: string[];
  product_identifier: string;
  location_name: string;
  quantity: number;
  reorder_point: number | null;
}

interface MatchedRow extends ParsedRow {
  product_id: string | null;
  product_name: string | null;
  location_id: string | null;
  matched_location: string | null;
  status: "matched" | "partial" | "unmatched";
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const COLUMN_ROLES = [
  { value: "product", label: "Product Name / SKU" },
  { value: "location", label: "Location Name" },
  { value: "quantity", label: "Quantity" },
  { value: "reorder_point", label: "Reorder Point" },
  { value: "skip", label: "Skip this column" },
] as const;

type ColumnRole = (typeof COLUMN_ROLES)[number]["value"];

export function InventoryImportWizard({
  open,
  onOpenChange,
  onImported,
}: InventoryImportWizardProps) {
  const supabase = createClient();
  const { accountId } = useAuth();

  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<number, ColumnRole>>({});
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [matching, setMatching] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [fileName, setFileName] = useState("");

  const reset = useCallback(() => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setColumnMap({});
    setMatchedRows([]);
    setMatching(false);
    setImportResult(null);
    setImportProgress(0);
    setFileName("");
  }, []);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  // ── Step 1: Parse CSV ──────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const ch of line) {
          if (ch === '"') {
            inQuotes = !inQuotes;
          } else if (ch === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        result.push(current.trim());
        return result;
      };

      const hdr = parseLine(lines[0]);
      const dataRows = lines.slice(1).map(parseLine);

      setHeaders(hdr);
      setRows(dataRows);

      // Auto-map columns by header name
      const autoMap: Record<number, ColumnRole> = {};
      hdr.forEach((h, i) => {
        const lower = h.toLowerCase();
        if (
          lower.includes("product") ||
          lower.includes("sku") ||
          lower.includes("item")
        )
          autoMap[i] = "product";
        else if (
          lower.includes("location") ||
          lower.includes("warehouse") ||
          lower.includes("store")
        )
          autoMap[i] = "location";
        else if (
          lower.includes("qty") ||
          lower.includes("quantity") ||
          lower.includes("stock")
        )
          autoMap[i] = "quantity";
        else if (lower.includes("reorder") || lower.includes("min"))
          autoMap[i] = "reorder_point";
        else autoMap[i] = "skip";
      });
      setColumnMap(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
  };

  // ── Step 2 → 3: Match products & locations ─────────────
  const handleMatch = async () => {
    if (!accountId) return;
    setMatching(true);

    try {
      // Find column indices
      const productCol = Object.entries(columnMap).find(
        ([, v]) => v === "product"
      )?.[0];
      const locationCol = Object.entries(columnMap).find(
        ([, v]) => v === "location"
      )?.[0];
      const quantityCol = Object.entries(columnMap).find(
        ([, v]) => v === "quantity"
      )?.[0];
      const reorderCol = Object.entries(columnMap).find(
        ([, v]) => v === "reorder_point"
      )?.[0];

      if (
        productCol === undefined ||
        locationCol === undefined ||
        quantityCol === undefined
      ) {
        setMatching(false);
        return;
      }

      // Fetch products and locations
      const { data: products } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("account_id", accountId);

      const { data: locations } = await supabase
        .from("stock_locations")
        .select("id, name")
        .eq("account_id", accountId)
        .eq("is_active", true);

      const productList = products ?? [];
      const locationList = locations ?? [];

      const matched: MatchedRow[] = rows.map((row) => {
        const productIdent = row[Number(productCol)] ?? "";
        const locationName = row[Number(locationCol)] ?? "";
        const qty = parseFloat(row[Number(quantityCol)] ?? "0") || 0;
        const reorder = reorderCol
          ? parseFloat(row[Number(reorderCol)] ?? "") || null
          : null;

        // Match product by name or SKU (case-insensitive)
        const pLower = productIdent.toLowerCase().trim();
        const matchedProduct = productList.find(
          (p) =>
            p.name?.toLowerCase().trim() === pLower ||
            p.sku?.toLowerCase().trim() === pLower
        );

        // Match location by name (case-insensitive)
        const lLower = locationName.toLowerCase().trim();
        const matchedLocation = locationList.find(
          (l) => l.name?.toLowerCase().trim() === lLower
        );

        const hasProduct = !!matchedProduct;
        const hasLocation = !!matchedLocation;

        return {
          raw: row,
          product_identifier: productIdent,
          location_name: locationName,
          quantity: qty,
          reorder_point: reorder,
          product_id: matchedProduct?.id ?? null,
          product_name: matchedProduct?.name ?? null,
          location_id: matchedLocation?.id ?? null,
          matched_location: matchedLocation?.name ?? null,
          status:
            hasProduct && hasLocation
              ? "matched"
              : hasProduct || hasLocation
                ? "partial"
                : "unmatched",
        };
      });

      setMatchedRows(matched);
      setStep("preview");
    } catch {
      // silently handle
    } finally {
      setMatching(false);
    }
  };

  // ── Step 4: Import ─────────────────────────────────────
  const handleImport = async () => {
    const importable = matchedRows.filter(
      (r) => r.product_id && r.location_id && r.quantity > 0
    );
    if (importable.length === 0) return;

    setStep("importing");
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < importable.length; i++) {
      const row = importable[i];
      try {
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "receive",
            location_id: row.location_id,
            product_id: row.product_id,
            quantity: row.quantity,
            notes: `Bulk import from ${fileName}`,
            reference_type: "manual" as const,
          }),
        });
        if (res.ok) {
          success++;
        } else {
          failed++;
          const err = await res.json().catch(() => ({ error: "Unknown" }));
          errors.push(
            `Row ${i + 1} (${row.product_identifier}): ${err.error ?? "Failed"}`
          );
        }
      } catch {
        failed++;
        errors.push(`Row ${i + 1} (${row.product_identifier}): Network error`);
      }
      setImportProgress(Math.round(((i + 1) / importable.length) * 100));
    }

    setImportResult({ success, failed, errors });
    setStep("done");
    if (success > 0) onImported?.();
  };

  const matchedCount = matchedRows.filter((r) => r.status === "matched").length;
  const partialCount = matchedRows.filter((r) => r.status === "partial").length;
  const unmatchedCount = matchedRows.filter(
    (r) => r.status === "unmatched"
  ).length;
  const importableCount = matchedRows.filter(
    (r) => r.product_id && r.location_id && r.quantity > 0
  ).length;

  const hasRequiredMappings =
    Object.values(columnMap).includes("product") &&
    Object.values(columnMap).includes("location") &&
    Object.values(columnMap).includes("quantity");

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-orange-600" />
            Import Inventory Data
          </SheetTitle>
          <SheetDescription>
            Upload a CSV with stock levels per product and location.
          </SheetDescription>
        </SheetHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          {(["upload", "map", "preview", "done"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  step === s || (step === "importing" && s === "preview")
                    ? "bg-primary text-primary-foreground"
                    : ["upload", "map", "preview", "done"].indexOf(step === "importing" ? "preview" : step) >
                        i
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div className="w-8 h-0.5 bg-muted" />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Upload ─────────────────────────── */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload a CSV file with columns for product name/SKU, location,
                quantity, and optionally reorder point.
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" asChild>
                  <span>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Choose CSV File
                  </span>
                </Button>
              </label>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              <p className="font-medium">Expected CSV format:</p>
              <code className="text-xs block bg-background p-2 rounded">
                product_name,location,quantity,reorder_point
                <br />
                Widget A,Main Warehouse,100,20
                <br />
                Widget B,Store Front,50,10
              </code>
            </div>
          </div>
        )}

        {/* ── Step 2: Map Columns ────────────────────── */}
        {step === "map" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <strong>{rows.length}</strong> rows found in{" "}
                <strong>{fileName}</strong>
              </p>
            </div>

            <div className="space-y-3">
              {headers.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <span className="text-sm font-medium min-w-[120px] truncate">
                    {h}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select
                    value={columnMap[i] ?? "skip"}
                    onValueChange={(v) =>
                      setColumnMap((m) => ({ ...m, [i]: v as ColumnRole }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {!hasRequiredMappings && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Map at least Product, Location, and Quantity columns.
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleMatch}
                disabled={!hasRequiredMappings || matching}
                className="flex-1"
              >
                {matching ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : null}
                Match & Preview
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ────────────────────────── */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-700 dark:text-green-400">
                  {matchedCount}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500">
                  Matched
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  {partialCount}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-500">
                  Partial
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-700 dark:text-red-400">
                  {unmatchedCount}
                </div>
                <div className="text-xs text-red-600 dark:text-red-500">
                  Unmatched
                </div>
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Product</th>
                    <th className="text-left p-2">Location</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedRows.slice(0, 100).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">
                        <div className="truncate max-w-[140px]">
                          {r.product_name ?? r.product_identifier}
                        </div>
                        {!r.product_id && (
                          <span className="text-xs text-red-500">
                            Not found
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="truncate max-w-[120px]">
                          {r.matched_location ?? r.location_name}
                        </div>
                        {!r.location_id && (
                          <span className="text-xs text-red-500">
                            Not found
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">{r.quantity}</td>
                      <td className="p-2 text-center">
                        {r.status === "matched" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : r.status === "partial" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {matchedRows.length > 100 && (
                <p className="text-xs text-muted-foreground p-2 text-center">
                  Showing first 100 of {matchedRows.length} rows
                </p>
              )}
            </div>

            <p className="text-sm">
              <strong>{importableCount}</strong> rows ready to import
              {unmatchedCount + partialCount > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  ({unmatchedCount + partialCount} will be skipped)
                </span>
              )}
            </p>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("map")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={importableCount === 0}
                className="flex-1"
              >
                Import {importableCount} Rows
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3.5: Importing ────────────────────── */}
        {step === "importing" && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="font-medium">Importing inventory data...</p>
            <Progress value={importProgress} className="max-w-xs mx-auto" />
            <p className="text-sm text-muted-foreground">
              {importProgress}% complete
            </p>
          </div>
        )}

        {/* ── Step 4: Done ───────────────────────────── */}
        {step === "done" && importResult && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold">Import Complete</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-700 dark:text-green-400">
                  {importResult.success}
                </div>
                <div className="text-xs text-green-600">Successful</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-700 dark:text-red-400">
                  {importResult.failed}
                </div>
                <div className="text-xs text-red-600">Failed</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="max-h-[150px] overflow-y-auto bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                  Errors:
                </p>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-500">
                    {err}
                  </p>
                ))}
              </div>
            )}

            <Button onClick={() => handleClose(false)} className="w-full">
              Done
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
