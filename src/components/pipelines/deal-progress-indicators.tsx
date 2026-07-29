"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Banknote,
  ListChecks,
} from "lucide-react";
import type { DealChecklistProgress } from "@/types/offline-operations";
import type { PipelineStage } from "@/types";

// ── Checklist Progress Bar ──────────────────────────────────

interface ChecklistProgressBarProps {
  progress: DealChecklistProgress | null;
  compact?: boolean;
}

export function ChecklistProgressBar({
  progress,
  compact = false,
}: ChecklistProgressBarProps) {
  if (!progress || progress.total_items === 0) return null;

  const pct = progress.completion_percent;
  const color =
    pct === 100
      ? "bg-green-500"
      : pct >= 50
        ? "bg-yellow-500"
        : "bg-red-500";

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1">
              <ListChecks className="h-3 w-3 text-muted-foreground" />
              <div className="h-1.5 w-10 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {progress.completed_items}/{progress.total_items}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>
              Checklist: {progress.completed_items}/{progress.total_items} done
              ({pct}%)
            </p>
            {progress.required_items > 0 && (
              <p>
                Required: {progress.required_completed}/
                {progress.required_items}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          <ListChecks className="h-3 w-3" />
          Checklist
        </span>
        <span className="font-medium text-foreground">
          {progress.completed_items}/{progress.total_items} ({pct}%)
        </span>
      </div>
      <Progress value={pct} className="h-2" />
      {progress.required_items > 0 && (
        <p className="text-[10px] text-muted-foreground">
          Required: {progress.required_completed}/{progress.required_items}
          {progress.all_required_complete && (
            <CheckCircle2 className="ml-1 inline h-3 w-3 text-green-500" />
          )}
        </p>
      )}
    </div>
  );
}

// ── Stage Type Badge ────────────────────────────────────────

interface StageTypeBadgeProps {
  stage: PipelineStage;
  size?: "sm" | "md";
}

const STAGE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Circle; className: string }
> = {
  auto_digital: {
    label: "Auto",
    icon: CheckCircle2,
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  manual_digital: {
    label: "Manual",
    icon: Circle,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  physical_verification: {
    label: "Physical",
    icon: AlertCircle,
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  external_dependent: {
    label: "External",
    icon: Clock,
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  time_gated: {
    label: "Time-Gated",
    icon: Clock,
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
};

export function StageTypeBadge({ stage, size = "sm" }: StageTypeBadgeProps) {
  const stageType = stage.stage_type || "manual_digital";
  const config = STAGE_TYPE_CONFIG[stageType] || STAGE_TYPE_CONFIG.manual_digital;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        config.className,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
      )}
    >
      <Icon className={cn("mr-1", size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
      {config.label}
    </Badge>
  );
}

// ── Payment Status Badge ────────────────────────────────────

interface PaymentStatusBadgeProps {
  pendingCount: number;
  verifiedCount: number;
  compact?: boolean;
}

export function PaymentStatusBadge({
  pendingCount,
  verifiedCount,
  compact = true,
}: PaymentStatusBadgeProps) {
  if (pendingCount === 0 && verifiedCount === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1">
            <Banknote className="h-3 w-3 text-muted-foreground" />
            {pendingCount > 0 && (
              <span className="text-[10px] text-yellow-400">
                {pendingCount} pending
              </span>
            )}
            {!compact && verifiedCount > 0 && (
              <span className="text-[10px] text-green-400">
                {verifiedCount} verified
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{verifiedCount} verified, {pendingCount} pending payments</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Min Duration Indicator ──────────────────────────────────

interface MinDurationIndicatorProps {
  hours: number;
  enteredAt?: string;
}

export function MinDurationIndicator({
  hours,
  enteredAt,
}: MinDurationIndicatorProps) {
  if (!hours || hours <= 0) return null;

  let elapsed = 0;
  if (enteredAt) {
    elapsed = Math.floor(
      (Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60)
    );
  }
  const remaining = Math.max(0, hours - elapsed);
  const canProgress = remaining === 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1">
            <Clock
              className={cn(
                "h-3 w-3",
                canProgress ? "text-green-400" : "text-yellow-400"
              )}
            />
            <span
              className={cn(
                "text-[10px]",
                canProgress ? "text-green-400" : "text-yellow-400"
              )}
            >
              {canProgress ? "Ready" : `${remaining}h left`}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>Min. {hours}h in this stage</p>
          {enteredAt && <p>Entered: {new Date(enteredAt).toLocaleString()}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
