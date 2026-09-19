"use client";

import * as React from "react";
import { Target, Users, Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";

export interface SegmentSelectorProps {
  value: string;
  onValueChange: (segmentId: string) => void;
  placeholder?: string;
  className?: string;
  showCounts?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
}

interface SegmentRecord {
  id: string;
  name: string;
  description?: string;
  contact_count?: number;
}

export function SegmentSelector({
  value,
  onValueChange,
  placeholder = "Select segment...",
  className,
  showCounts = false,
  allowClear = false,
  disabled = false,
}: SegmentSelectorProps) {
  const [options, setOptions] = React.useState<SearchableSelectOption[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchSegments() {
      setLoading(true);
      try {
        const res = await fetch("/api/segments");
        if (!res.ok) return;
        const data = await res.json();
        const segments: SegmentRecord[] = data.segments ?? [];

        if (cancelled) return;

        const opts: SearchableSelectOption[] = [];

        if (allowClear) {
          opts.push({
            value: "",
            label: "All Contacts",
            sublabel: "No segment filter",
            icon: <Users className="size-3.5 text-muted-foreground" />,
          });
        }

        for (const seg of segments) {
          opts.push({
            value: seg.id,
            label: seg.name,
            sublabel: showCounts && seg.contact_count != null
              ? `${seg.contact_count.toLocaleString()} contacts`
              : seg.description || undefined,
            icon: <Target className="size-3.5 text-muted-foreground" />,
          });
        }

        setOptions(opts);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSegments();
    return () => { cancelled = true; };
  }, [allowClear, showCounts]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm text-muted-foreground ${className ?? ""}`}>
        <Loader2 className="size-4 animate-spin" />
        <span>Loading segments...</span>
      </div>
    );
  }

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Search segments..."
      emptyMessage="No segments found"
      className={className}
      disabled={disabled}
    />
  );
}
