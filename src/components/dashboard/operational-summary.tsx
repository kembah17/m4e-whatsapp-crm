"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import {
  BookOpen,
  AlertTriangle,
  Warehouse,
  FileText,
  Award,
  UserPlus,
  ArrowRight,
  CalendarClock,
  Loader2,
} from "lucide-react";

interface OperationalData {
  debt: {
    total_outstanding: number;
    total_overdue: number;
    entries_count: number;
    overdue_count: number;
  };
  inventory: {
    total_products: number;
    tracked_products: number;
    low_stock: number;
    out_of_stock: number;
    total_value: number;
  };
  invoices: {
    total_unpaid: number;
    total_overdue: number;
    pending_count: number;
    this_month_revenue: number;
  };
  loyalty: {
    active_members: number;
    total_points_outstanding: number;
    avg_trust_score: number;
  };
  referrals: {
    total: number;
    converted: number;
    pending: number;
    conversion_rate: number;
  };
  installments: {
    active_plans: number;
    total_expected: number;
    overdue_installments: number;
  };
}

interface SummaryCard {
  key: string;
  label: string;
  value: string;
  subtitle: string;
  icon: typeof BookOpen;
  href: string;
  color: string;
  urgent?: boolean;
}

export function OperationalSummary() {
  const { account, defaultCurrency } = useAuth();
  const [data, setData] = useState<OperationalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!account?.id) return;
    try {
      const db = createClient();
      const { data: result, error: rpcError } = await db.rpc(
        "get_operational_summary",
        { p_account_id: account.id }
      );
      if (rpcError) throw rpcError;
      setData(result as OperationalData);
    } catch (err) {
      console.error("[dashboard] operational summary failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [account?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return null; // Silently hide if RPC not available yet
  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Operations
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="h-10 w-10 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-5 w-16 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cards: SummaryCard[] = [
    {
      key: "debt",
      label: "Outstanding Debts",
      value: formatCurrency(data.debt.total_outstanding, defaultCurrency),
      subtitle: `${data.debt.entries_count} entries${data.debt.overdue_count > 0 ? ` · ${data.debt.overdue_count} overdue` : ""}`,
      icon: BookOpen,
      href: "/debt-book",
      color: data.debt.overdue_count > 0 ? "text-red-400" : "text-blue-400",
      urgent: data.debt.overdue_count > 0,
    },
    {
      key: "overdue",
      label: "Overdue Payments",
      value: formatCurrency(data.debt.total_overdue + data.invoices.total_overdue, defaultCurrency),
      subtitle: `Debts + invoices combined`,
      icon: AlertTriangle,
      href: "/debt-book",
      color: (data.debt.total_overdue + data.invoices.total_overdue) > 0 ? "text-red-400" : "text-green-400",
      urgent: (data.debt.total_overdue + data.invoices.total_overdue) > 0,
    },
    {
      key: "inventory",
      label: "Low Stock Items",
      value: `${data.inventory.low_stock + data.inventory.out_of_stock}`,
      subtitle: `${data.inventory.out_of_stock} out of stock · ${data.inventory.tracked_products} tracked`,
      icon: Warehouse,
      href: "/inventory",
      color: data.inventory.out_of_stock > 0 ? "text-red-400" : data.inventory.low_stock > 0 ? "text-amber-400" : "text-green-400",
      urgent: data.inventory.out_of_stock > 0,
    },
    {
      key: "invoices",
      label: "Pending Invoices",
      value: formatCurrency(data.invoices.total_unpaid, defaultCurrency),
      subtitle: `${data.invoices.pending_count} pending · This month: ${formatCurrency(data.invoices.this_month_revenue, defaultCurrency)}`,
      icon: FileText,
      href: "/invoices",
      color: data.invoices.total_overdue > 0 ? "text-amber-400" : "text-blue-400",
    },
    {
      key: "loyalty",
      label: "Loyalty Members",
      value: `${data.loyalty.active_members}`,
      subtitle: `${data.loyalty.total_points_outstanding.toLocaleString()} pts outstanding · Avg trust: ${data.loyalty.avg_trust_score}`,
      icon: Award,
      href: "/loyalty",
      color: "text-purple-400",
    },
    {
      key: "referrals",
      label: "Referrals",
      value: `${data.referrals.pending} pending`,
      subtitle: `${data.referrals.converted} converted · ${data.referrals.conversion_rate}% rate`,
      icon: UserPlus,
      href: "/referrals",
      color: "text-emerald-400",
    },
  ];

  // Only show installments card if there are active plans
  if (data.installments.active_plans > 0) {
    cards.push({
      key: "installments",
      label: "Active Installments",
      value: `${data.installments.active_plans} plans`,
      subtitle: `${formatCurrency(data.installments.total_expected, defaultCurrency)} expected${data.installments.overdue_installments > 0 ? ` · ${data.installments.overdue_installments} overdue` : ""}`,
      icon: CalendarClock,
      href: "/installments",
      color: data.installments.overdue_installments > 0 ? "text-amber-400" : "text-blue-400",
      urgent: data.installments.overdue_installments > 0,
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Operations
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-card/80"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ${card.color}`}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">
                {card.label}
                {card.urgent && (
                  <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
                )}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {card.value}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {card.subtitle}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );
}
