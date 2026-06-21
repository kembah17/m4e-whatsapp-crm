"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Branch } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitBranch } from "lucide-react";

interface BranchFilterProps {
  value: string;
  onChange: (branchId: string) => void;
  /** Show only active branches. Defaults to true. */
  activeOnly?: boolean;
  /** Placeholder text. */
  placeholder?: string;
  /** CSS class for the trigger. */
  className?: string;
}

/**
 * Reusable branch filter/selector. Fetches branches for the current
 * account and renders a Select dropdown. The special value "__all__"
 * represents "All branches" (no filter).
 */
export function BranchFilter({
  value,
  onChange,
  activeOnly = true,
  placeholder = "All branches",
  className,
}: BranchFilterProps) {
  const supabase = createClient();
  const { accountId } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const url = activeOnly ? "/api/branches?is_active=true" : "/api/branches";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setBranches(data.branches ?? []);
    }
    setLoading(false);
  }, [accountId, activeOnly]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Don’t render if there are no branches configured
  if (!loading && branches.length === 0) return null;

  return (
    <Select value={value || "__all__"} onValueChange={(v) => onChange(!v || v === "__all__" ? "" : v)}>
      <SelectTrigger className={className ?? "w-[180px] h-9 text-sm"}>
        <GitBranch className="size-3.5 text-muted-foreground shrink-0" />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All branches</SelectItem>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
