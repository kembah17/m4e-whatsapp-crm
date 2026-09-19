"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Package, Pencil } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { formatCurrency } from "@/lib/currency";

export interface ItemPickerProps {
  value: string;
  onValueChange: (productId: string) => void;
  placeholder?: string;
  className?: string;
  showPrice?: boolean;
  allowManual?: boolean;
}

export function ItemPicker({
  value,
  onValueChange,
  placeholder = "Pick item",
  className,
  showPrice = true,
  allowManual = false,
}: ItemPickerProps) {
  const { accountId, account } = useAuth();
  const [options, setOptions] = React.useState<SearchableSelectOption[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const currency = account?.default_currency || "NGN";

  // Recent items from localStorage
  const recentKey = accountId ? `bge_recent_items_${accountId}` : null;

  function getRecentIds(): string[] {
    if (!recentKey) return [];
    try {
      const raw = localStorage.getItem(recentKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function trackRecent(productId: string) {
    if (!recentKey || productId === "manual") return;
    try {
      const ids = getRecentIds().filter((id) => id !== productId);
      ids.unshift(productId);
      localStorage.setItem(recentKey, JSON.stringify(ids.slice(0, 5)));
    } catch {
      // ignore
    }
  }

  React.useEffect(() => {
    if (loaded) return;
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        const products: { id: string; name: string; price?: number; sku?: string; item_type?: string; category?: string }[] =
          data.products || [];

        const recentIds = getRecentIds();

        const productOptions: SearchableSelectOption[] = products.map((p) => ({
          value: p.id,
          label: p.name,
          sublabel: [
            p.sku ? `SKU: ${p.sku}` : null,
            showPrice && p.price ? formatCurrency(p.price, currency) : null,
            p.category || null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
          icon: <Package className="size-3.5 text-muted-foreground" />,
        }));

        // Build final options list
        const finalOptions: SearchableSelectOption[] = [];

        // Manual entry option
        if (allowManual) {
          finalOptions.push({
            value: "manual",
            label: "Manual entry",
            sublabel: "Type description manually",
            icon: <Pencil className="size-3.5 text-muted-foreground" />,
          });
        }

        // Recent items section
        if (recentIds.length > 0) {
          const recentOptions = recentIds
            .map((id) => productOptions.find((o) => o.value === id))
            .filter(Boolean) as SearchableSelectOption[];
          if (recentOptions.length > 0) {
            recentOptions.forEach((o) => {
              finalOptions.push({
                ...o,
                label: `⏱ ${o.label}`,
              });
            });
          }
        }

        // All products
        finalOptions.push(...productOptions);

        setOptions(finalOptions);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  function handleChange(val: string) {
    trackRecent(val);
    onValueChange(val);
  }

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={handleChange}
      placeholder={loaded ? placeholder : "Loading items..."}
      searchPlaceholder="Search by name, SKU, or category..."
      emptyMessage="No products found"
      className={className}
      disabled={!loaded}
    />
  );
}
