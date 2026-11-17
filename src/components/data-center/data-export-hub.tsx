"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  Users,
  Package,
  Warehouse,
  Loader2,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

interface DataExportHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function DataExportHub({ open, onOpenChange }: DataExportHubProps) {
  const supabase = createClient();
  const { accountId } = useAuth();

  const [exporting, setExporting] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);

  const exportContacts = async () => {
    if (!accountId) return;
    setExporting("contacts");
    try {
      const { data } = await supabase
        .from("contacts")
        .select(
          "name, phone, email, company, tags, source, lifecycle_stage, created_at"
        )
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) {
        setExporting(null);
        return;
      }

      const headers = [
        "Name",
        "Phone",
        "Email",
        "Company",
        "Tags",
        "Source",
        "Lifecycle Stage",
        "Created At",
      ];
      const rows = data.map((c) =>
        [
          c.name,
          c.phone,
          c.email,
          c.company,
          Array.isArray(c.tags) ? c.tags.join(";") : c.tags,
          c.source,
          c.lifecycle_stage,
          c.created_at,
        ]
          .map(escapeCsvField)
          .join(",")
      );

      const csv = [headers.join(","), ...rows].join("\n");
      const date = new Date().toISOString().split("T")[0];
      downloadCsv(csv, `contacts_export_${date}.csv`);
      setLastExport("contacts");
    } catch {
      // silently handle
    } finally {
      setExporting(null);
    }
  };

  const exportProducts = async () => {
    if (!accountId) return;
    setExporting("products");
    try {
      const { data } = await supabase
        .from("products")
        .select(
          "name, sku, price, cost_price, item_type, category, description, is_active, created_at"
        )
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) {
        setExporting(null);
        return;
      }

      const headers = [
        "Name",
        "SKU",
        "Price",
        "Cost Price",
        "Type",
        "Category",
        "Description",
        "Active",
        "Created At",
      ];
      const rows = data.map((p) =>
        [
          p.name,
          p.sku,
          p.price,
          p.cost_price,
          p.item_type,
          p.category,
          p.description,
          p.is_active,
          p.created_at,
        ]
          .map(escapeCsvField)
          .join(",")
      );

      const csv = [headers.join(","), ...rows].join("\n");
      const date = new Date().toISOString().split("T")[0];
      downloadCsv(csv, `products_export_${date}.csv`);
      setLastExport("products");
    } catch {
      // silently handle
    } finally {
      setExporting(null);
    }
  };

  const exportInventory = async () => {
    if (!accountId) return;
    setExporting("inventory");
    try {
      const { data } = await supabase
        .from("location_stock")
        .select(
          "quantity_on_hand, quantity_reserved, quantity_available, reorder_point, reorder_quantity, product:products(name, sku, price), location:stock_locations(name, location_type)"
        )
        .eq("account_id", accountId);

      if (!data || data.length === 0) {
        setExporting(null);
        return;
      }

      const headers = [
        "Product Name",
        "SKU",
        "Location",
        "Location Type",
        "On Hand",
        "Reserved",
        "Available",
        "Reorder Point",
        "Reorder Qty",
        "Unit Price",
        "Stock Value",
      ];

      const rows = data.map((s) => {
        const product = Array.isArray(s.product)
          ? s.product[0]
          : (s.product as { name: string; sku: string | null; price: number } | null);
        const location = Array.isArray(s.location)
          ? s.location[0]
          : (s.location as { name: string; location_type: string } | null);
        const price = product?.price ?? 0;
        const stockValue = s.quantity_on_hand * price;

        return [
          product?.name,
          product?.sku,
          location?.name,
          location?.location_type,
          s.quantity_on_hand,
          s.quantity_reserved,
          s.quantity_available,
          s.reorder_point,
          s.reorder_quantity,
          price,
          stockValue,
        ]
          .map(escapeCsvField)
          .join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      const date = new Date().toISOString().split("T")[0];
      downloadCsv(csv, `inventory_export_${date}.csv`);
      setLastExport("inventory");
    } catch {
      // silently handle
    } finally {
      setExporting(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Data
          </SheetTitle>
          <SheetDescription>
            Download your business data as CSV files.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="contacts" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="contacts" className="text-xs">
              <Users className="h-3.5 w-3.5 mr-1" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs">
              <Package className="h-3.5 w-3.5 mr-1" />
              Products
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs">
              <Warehouse className="h-3.5 w-3.5 mr-1" />
              Inventory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">Contact Export</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                Exports all contacts with the following fields:
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {[
                  "Name",
                  "Phone",
                  "Email",
                  "Company",
                  "Tags",
                  "Source",
                  "Stage",
                  "Created",
                ].map((f) => (
                  <span
                    key={f}
                    className="text-[11px] px-1.5 py-0.5 bg-background rounded border"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <Button
              onClick={exportContacts}
              disabled={!!exporting}
              className="w-full"
            >
              {exporting === "contacts" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : lastExport === "contacts" ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exporting === "contacts"
                ? "Exporting..."
                : lastExport === "contacts"
                  ? "Downloaded! Export Again"
                  : "Export Contacts CSV"}
            </Button>
          </TabsContent>

          <TabsContent value="products" className="mt-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <h3 className="font-medium">Product Export</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                Exports all products with the following fields:
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {[
                  "Name",
                  "SKU",
                  "Price",
                  "Cost",
                  "Type",
                  "Category",
                  "Description",
                  "Active",
                  "Created",
                ].map((f) => (
                  <span
                    key={f}
                    className="text-[11px] px-1.5 py-0.5 bg-background rounded border"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <Button
              onClick={exportProducts}
              disabled={!!exporting}
              className="w-full"
            >
              {exporting === "products" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : lastExport === "products" ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exporting === "products"
                ? "Exporting..."
                : lastExport === "products"
                  ? "Downloaded! Export Again"
                  : "Export Products CSV"}
            </Button>
          </TabsContent>

          <TabsContent value="inventory" className="mt-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                <h3 className="font-medium">Inventory Export</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                Exports stock levels per product per location:
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {[
                  "Product",
                  "SKU",
                  "Location",
                  "On Hand",
                  "Reserved",
                  "Available",
                  "Reorder Pt",
                  "Value",
                ].map((f) => (
                  <span
                    key={f}
                    className="text-[11px] px-1.5 py-0.5 bg-background rounded border"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <Button
              onClick={exportInventory}
              disabled={!!exporting}
              className="w-full"
            >
              {exporting === "inventory" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : lastExport === "inventory" ? (
                <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {exporting === "inventory"
                ? "Exporting..."
                : lastExport === "inventory"
                  ? "Downloaded! Export Again"
                  : "Export Inventory CSV"}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
