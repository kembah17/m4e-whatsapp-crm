"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { useAuth } from "@/hooks/use-auth";
import {
  ITEM_TYPE_REGISTRY,
  getEnabledItemTypes,
  getItemTypeLabel,
} from '@/lib/industry/item-type-config';
import type { ItemType } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Download,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Package,
  ImageIcon,
} from "lucide-react";

interface ParsedProduct {
  name: string;
  price: number;
  category?: string;
  description?: string;
  short_pitch?: string;
  cost?: number;
  sku?: string;
  image_url?: string;
  status?: string;
  unit_of_measure?: string;
  track_inventory?: boolean;
  reorder_point?: number;
  tags?: string[];
}

interface ProductImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type Step = "upload" | "preview" | "importing" | "done";

export function ProductImportWizard({
  open,
  onOpenChange,
  onImported,
}: ProductImportWizardProps) {
  const { defaultCurrency, industry } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [defaultItemType, setDefaultItemType] = useState<ItemType>('product');

  const enabledItemTypes = useMemo(() => getEnabledItemTypes(industry), [industry]);

  const reset = useCallback(() => {
    setStep("upload");
    setProducts([]);
    setSelected(new Set());
    setWarnings([]);
    setParsing(false);
    setImporting(false);
    setImportResult(null);
    setDragOver(false);
    setDefaultItemType('product');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const parseFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      toast.error("Please upload a CSV file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5 MB");
      return;
    }

    setParsing(true);
    try {
      const content = await file.text();
      const res = await fetch("/api/products/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to parse CSV");
        return;
      }

      const parsed: ParsedProduct[] = data.products ?? [];
      if (parsed.length === 0) {
        toast.error("No valid products found in the file");
        return;
      }

      setProducts(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
      setWarnings(data.warnings ?? []);
      setStep("preview");
      toast.success(`Found ${parsed.length} products`);
    } catch {
      toast.error("Failed to parse file");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile],
  );

  const handleImport = useCallback(async () => {
    const toImport = products.filter((_, i) => selected.has(i)).map(p => ({
      ...p,
      item_type: (p as any).item_type || defaultItemType,
      item_role: ITEM_TYPE_REGISTRY[defaultItemType].defaultRole,
    }));
    if (toImport.length === 0) {
      toast.error("No products selected");
      return;
    }

    setImporting(true);
    setStep("importing");
    try {
      const res = await fetch("/api/products/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: toImport }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Import failed");
        setStep("preview");
        return;
      }

      setImportResult({ imported: data.imported });
      setStep("done");
      toast.success(`Imported ${data.imported} products`);
    } catch {
      toast.error("Import failed");
      setStep("preview");
    } finally {
      setImporting(false);
    }
  }, [products, selected]);

  const downloadTemplate = useCallback(async () => {
    try {
      const res = await fetch("/api/products/import/csv");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product-import-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template");
    }
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((_, i) => i)));
    }
  }, [selected, products]);

  const toggleOne = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-card border-border max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Package className="h-5 w-5" />
            Import Products
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === "upload" && "Upload a CSV file with your product catalog"}
            {step === "preview" && `${products.length} products found — select which to import`}
            {step === "importing" && "Importing products..."}
            {step === "done" && "Import complete!"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0">
          {/* STEP: Upload */}
          {step === "upload" && (
            <div className="space-y-4 py-4">
              {/* What are you importing? */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">What are you importing?</label>
                <Select value={defaultItemType} onValueChange={(v) => setDefaultItemType(v as ItemType)}>
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledItemTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ITEM_TYPE_REGISTRY[t].icon} {getItemTypeLabel(t, industry, true)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={`
                  flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors
                  ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-border"}
                `}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) parseFile(file);
                    e.target.value = "";
                  }}
                />
                {parsing ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Parsing file...</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted">
                      <Upload className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Drop your CSV file here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">CSV format, max 500 products, max 5 MB</p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download CSV Template
                </Button>
              </div>

              <div className="rounded-lg bg-muted/50 border border-border p-4">
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  CSV Format Guide
                </h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong className="text-muted-foreground">Required:</strong> name</p>
                  <p><strong className="text-muted-foreground">Recommended:</strong> price, category, description, image_url</p>
                  <p><strong className="text-muted-foreground">Optional:</strong> sku, cost, short_pitch, status, unit_of_measure, tags</p>
                  <p className="mt-2">Tags should be separated by semicolons (;) or pipes (|)</p>
                  <p>Image URLs must start with http:// or https://</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP: Preview */}
          {step === "preview" && (
            <div className="space-y-3 py-2">
              {warnings.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                  <h4 className="text-xs font-medium text-amber-400 flex items-center gap-1 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Warnings ({warnings.length})
                  </h4>
                  <ul className="text-xs text-amber-300/80 space-y-0.5 max-h-24 overflow-auto">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-lg border border-border overflow-auto max-h-[45vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selected.size === products.length}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className="text-muted-foreground w-[40px]">Img</TableHead>
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Price</TableHead>
                      <TableHead className="text-muted-foreground">Category</TableHead>
                      <TableHead className="text-muted-foreground">SKU</TableHead>
                      <TableHead className="text-muted-foreground">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p, i) => (
                      <TableRow
                        key={i}
                        className={`border-border ${!selected.has(i) ? "opacity-40" : ""}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selected.has(i)}
                            onCheckedChange={() => toggleOne(i)}
                          />
                        </TableCell>
                        <TableCell>
                          {p.image_url ? (
                            <div className="h-8 w-8 rounded bg-muted overflow-hidden">
                              <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                              <ImageIcon className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-foreground truncate max-w-[200px]">{p.name}</p>
                          {p.short_pitch && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{p.short_pitch}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {formatCurrency(p.price, defaultCurrency)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.category || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.sku || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.track_inventory ? "Tracked" : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* STEP: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Importing {selected.size} products...
              </p>
            </div>
          )}

          {/* STEP: Done */}
          {step === "done" && importResult && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">
                  {importResult.imported} products imported
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your product catalog has been updated
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-3">
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import {selected.size} Products
              </Button>
            </>
          )}
          {step === "done" && (
            <Button
              onClick={() => {
                handleClose();
                onImported();
              }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
