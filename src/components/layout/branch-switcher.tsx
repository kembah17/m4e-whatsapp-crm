"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitBranch, ChevronDown, Settings } from "lucide-react";
import Link from "next/link";

interface BranchInfo {
  id: string;
  name: string;
  is_active: boolean;
  unread_count?: number;
}

export function BranchSwitcher() {
  const { accountId } = useAuth();
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranches = useCallback(async () => {
    if (!accountId) return;
    try {
      const res = await fetch("/api/branches?active=true");
      if (res.ok) {
        const data = await res.json();
        const list = data.branches ?? data ?? [];
        setBranches(Array.isArray(list) ? list : []);
        if (list.length > 0 && !currentBranchId) {
          const saved = localStorage.getItem(`m4e_branch_${accountId}`);
          if (saved && list.find((b: BranchInfo) => b.id === saved)) {
            setCurrentBranchId(saved);
          }
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [accountId, currentBranchId]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  function handleSwitch(branchId: string | null) {
    setCurrentBranchId(branchId);
    if (accountId) {
      if (branchId) localStorage.setItem(`m4e_branch_${accountId}`, branchId);
      else localStorage.removeItem(`m4e_branch_${accountId}`);
    }
    window.dispatchEvent(new CustomEvent("branch-changed", { detail: { branchId } }));
  }

  if (loading || branches.length === 0) return null;
  const current = branches.find((b) => b.id === currentBranchId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/50 bg-background/50 px-3 text-sm font-normal transition-colors hover:bg-muted focus:outline-none">
          <GitBranch className="size-3.5 text-muted-foreground" />
          <span className="max-w-[120px] truncate">{current?.name ?? "All Branches"}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => handleSwitch(null)} className={!currentBranchId ? "bg-accent" : ""}>
          <GitBranch className="size-3.5 text-muted-foreground" />
          <span>All Branches</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {branches.map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => handleSwitch(b.id)} className={currentBranchId === b.id ? "bg-accent" : ""}>
            <span className="flex-1 truncate">{b.name}</span>
            {(b.unread_count ?? 0) > 0 && (
              <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 text-[10px]">{b.unread_count}</Badge>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link
              href="/settings?tab=branches"
              className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
            />
          }
        >
          <Settings className="size-3.5" />Manage Branches
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
