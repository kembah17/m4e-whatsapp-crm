'use client';

import { Layers, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConsolidationSummary } from '@/lib/whatsapp/message-consolidator';

interface ConsolidationIndicatorProps {
  summary: ConsolidationSummary;
  className?: string;
}

/**
 * Shows when messages have been consolidated and how much was saved.
 */
export function ConsolidationIndicator({
  summary,
  className,
}: ConsolidationIndicatorProps) {
  if (summary.messages_saved <= 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2',
        className,
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-100">
        <Layers className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-emerald-800">
          {summary.original_count} messages consolidated into{' '}
          {summary.consolidated_count}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <TrendingDown className="h-3 w-3" />
          <span>
            {summary.messages_saved} fewer messages &middot; saving \u20A6
            {summary.estimated_savings_ngn.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}{' '}
            ($
            {summary.estimated_savings_usd.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            )
          </span>
        </div>
      </div>
    </div>
  );
}
