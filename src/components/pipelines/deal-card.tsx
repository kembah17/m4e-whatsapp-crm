"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Deal, PipelineStage } from "@/types";
import { Calendar, Check, X } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { ChecklistProgressBar, PaymentStatusBadge } from "./deal-progress-indicators";
import type { DealChecklistProgress } from "@/types/offline-operations";

interface DealCardProps {
  deal: Deal;
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  isOverlay?: boolean;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name?: string, fallback?: string) {
  const source = (name || fallback || "?").trim();
  if (!source) return "?";
  return source.charAt(0).toUpperCase();
}

/** Lightweight hook to fetch checklist + payment summary for a deal card */
function useDealIndicators(dealId: string, open: boolean) {
  const [progress, setProgress] = useState<DealChecklistProgress | null>(null);
  const [payments, setPayments] = useState<{ pendingCount: number; verifiedCount: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      // Fetch checklist progress from the view
      const { data: progData } = await supabase
        .from("deal_checklist_progress")
        .select("*")
        .eq("deal_id", dealId)
        .maybeSingle();

      if (!cancelled) {
        setProgress((progData as DealChecklistProgress) ?? null);
      }

      // Fetch offline payments for this deal
      const { data: payData } = await supabase
        .from("offline_payments")
        .select("status")
        .eq("deal_id", dealId);

      if (!cancelled && payData) {
        setPayments({
          pendingCount: payData.filter(
            (p: { status: string }) => p.status === "pending"
          ).length,
          verifiedCount: payData.filter(
            (p: { status: string }) => p.status === "verified"
          ).length,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [dealId, open]);

  return { progress, payments };
}

export function DealCard({ deal, stage, onEdit, isOverlay }: DealCardProps) {
  const contactLabel = deal.contact?.name || deal.contact?.phone || "No contact";
  const assigneeLabel = deal.assignee?.full_name || null;
  const { progress, payments } = useDealIndicators(deal.id, !isOverlay);

  return (
    <button
      type="button"
      onClick={(e) => {
        // `onClick` still fires after a non-drag tap because the PointerSensor
        // requires 5px movement before it counts as a drag.
        if (isOverlay) return;
        e.stopPropagation();
        onEdit(deal);
      }}
      className={`group relative w-full cursor-pointer rounded-xl border border-border/50 bg-muted/70 pl-4 pr-3 py-3 text-left shadow-sm transition-all ${
        isOverlay
          ? "shadow-xl"
          : "hover:-translate-y-0.5 hover:border-border hover:bg-muted hover:shadow-lg"
      }`}
    >
      {/* 4px left accent bar using stage color */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
        style={{ backgroundColor: stage?.color ?? "#94a3b8" }}
      />

      <div className="flex items-start justify-between gap-2">
        <h4 className="flex-1 text-sm font-semibold leading-snug text-foreground break-words">
          {deal.title}
        </h4>
        {deal.status === "won" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Check className="h-3 w-3" />
            Won
          </span>
        )}
        {deal.status === "lost" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
            <X className="h-3 w-3" />
            Lost
          </span>
        )}
      </div>

      {/* Contact row */}
      <div className="mt-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
          {initials(deal.contact?.name, deal.contact?.phone ?? undefined)}
        </span>
        <span className="truncate text-xs text-muted-foreground">{contactLabel}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-primary">
          {formatCurrency(deal.value, deal.currency)}
        </span>
        {deal.expected_close_date && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(deal.expected_close_date)}
          </span>
        )}
      </div>

      {/* Progress indicators row */}
      {(progress?.total_items ?? 0) > 0 || (payments?.pendingCount ?? 0) > 0 || (payments?.verifiedCount ?? 0) > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          {progress && progress.total_items > 0 && (
            <ChecklistProgressBar
              progress={progress}
              compact
            />
          )}
          {payments && (payments.pendingCount > 0 || payments.verifiedCount > 0) && (
            <PaymentStatusBadge
              pendingCount={payments.pendingCount}
              verifiedCount={payments.verifiedCount}
              compact
            />
          )}
        </div>
      ) : null}

      {assigneeLabel && (
        <div className="mt-2 flex items-center justify-end">
          <span
            title={assigneeLabel}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary"
          >
            {initials(assigneeLabel)}
          </span>
        </div>
      )}
    </button>
  );
}
