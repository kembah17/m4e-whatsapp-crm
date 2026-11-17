'use client';

import { ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NGN_PER_USD } from '@/lib/whatsapp/message-cost-tracker';

interface ExchangeRateBadgeProps {
  className?: string;
}

export function ExchangeRateBadge({ className }: ExchangeRateBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <ArrowRightLeft className="h-3 w-3" />
      <span>\u20A6{NGN_PER_USD.toLocaleString()}/$1</span>
    </div>
  );
}
