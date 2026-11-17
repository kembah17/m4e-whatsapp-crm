"use client";

import { Coins, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  estimateBroadcastCost,
  FREE_TIER_LIMIT,
  type BroadcastCostEstimate,
} from '@/lib/whatsapp/message-cost-tracker';
import { ExchangeRateBadge } from '@/components/ui/exchange-rate-badge';

interface CostEstimateBadgeProps {
  audienceSize: number;
  templateCategory: string;
  countryCode?: string;
  className?: string;
}

/**
 * Compact badge/card showing estimated Meta cost for a broadcast.
 * Displays cost in both USD and NGN, plus free-tier status.
 */
export function CostEstimateBadge({
  audienceSize,
  templateCategory,
  countryCode = 'NG',
  className,
}: CostEstimateBadgeProps) {
  const estimate: BroadcastCostEstimate = estimateBroadcastCost(
    audienceSize,
    templateCategory,
    countryCode,
  );

  if (audienceSize <= 0) return null;

  const isFreeTier = audienceSize <= FREE_TIER_LIMIT;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card/50 p-3 space-y-2',
        className,
      )}
    >
      {/* Cost row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Coins className="h-4 w-4 text-yellow-500" />
          <span className="text-muted-foreground">Estimated Meta cost</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-foreground">
            ₦{estimate.cost_ngn.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
          <span className="ml-1.5 text-xs text-muted-foreground">
            (${estimate.cost_usd.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })})
          </span>
        </div>
      </div>

      {/* Per-message rate */}
      <p className="text-[11px] text-muted-foreground">
        {templateCategory} rate: ₦{estimate.rate_ngn.toFixed(2)}/msg ×{' '}
        {audienceSize.toLocaleString()} recipients. Charged by Meta, not M4E.
      </p>

      {/* Free tier indicator */}
      {isFreeTier && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-500">
          <TrendingDown className="h-3.5 w-3.5" />
          <span>
            Within free tier ({FREE_TIER_LIMIT.toLocaleString()} service
            conversations/month)
          </span>
        </div>
      )}

      {/* Exchange rate */}
      <ExchangeRateBadge />
    </div>
  );
}
