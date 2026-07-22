"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface TierGateProps {
  /** Feature key from FEATURE_TIER_MAP (e.g. "debt_book", "loyalty") */
  feature: string;
  /** Rendered when feature is not accessible */
  fallback?: ReactNode;
  /** Children rendered when feature IS accessible */
  children: ReactNode;
  /** If true, show a loading spinner while checking access */
  showLoader?: boolean;
}

interface AccessState {
  loading: boolean;
  allowed: boolean;
  preview: boolean;
  tier_required?: string;
}

/**
 * Wrapper component that gates content behind tier access.
 *
 * - If feature accessible: renders children
 * - If in preview: renders children with a "Preview" badge overlay
 * - If not accessible: renders fallback (or nothing)
 *
 * Usage:
 * ```tsx
 * <TierGate feature="debt_book" fallback={<UpsellCard feature="debt_book" />}>
 *   <DebtBookContent />
 * </TierGate>
 * ```
 */
export function TierGate({
  feature,
  fallback = null,
  children,
  showLoader = true,
}: TierGateProps) {
  const [access, setAccess] = useState<AccessState>({
    loading: true,
    allowed: false,
    preview: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        const res = await fetch("/api/account/tier/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feature, record_upsell: false }),
        });

        if (!res.ok) {
          // On error, default to allowing access (fail open for UX)
          if (!cancelled) {
            setAccess({ loading: false, allowed: true, preview: false });
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setAccess({
            loading: false,
            allowed: data.allowed,
            preview: data.preview ?? false,
            tier_required: data.tier_required,
          });
        }
      } catch {
        // Fail open on network errors
        if (!cancelled) {
          setAccess({ loading: false, allowed: true, preview: false });
        }
      }
    }

    checkAccess();
    return () => { cancelled = true; };
  }, [feature]);

  // Loading state
  if (access.loading) {
    if (!showLoader) return null;
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Not allowed → show fallback
  if (!access.allowed) {
    return <>{fallback}</>;
  }

  // Preview mode → show children with badge
  if (access.preview) {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs"
          >
            Preview
          </Badge>
        </div>
        {children}
      </div>
    );
  }

  // Full access
  return <>{children}</>;
}
