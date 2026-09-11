"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  MapPin,
  ArrowLeftRight,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface InventorySummary {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  locations_count: number;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSummary();
  }, [user]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load inventory summary:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
        <p className="text-slate-400 mt-1">
          Multi-location stock tracking with double-entry ledger
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Package className="h-3.5 w-3.5" />
              Products Tracked
            </div>
            <p className="text-xl font-bold text-white">
              {summary?.total_products ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Total Value
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(summary?.total_value ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <MapPin className="h-3.5 w-3.5" />
              Locations
            </div>
            <p className="text-xl font-bold text-white">
              {summary?.locations_count ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-yellow-400 text-xs mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Low Stock
            </div>
            <p className="text-xl font-bold text-yellow-400">
              {summary?.low_stock_count ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-red-400 text-xs mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Out of Stock
            </div>
            <p className="text-xl font-bold text-red-400">
              {summary?.out_of_stock_count ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
          <CardDescription>
            Manage your inventory across multiple locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 border-slate-700 hover:bg-slate-800"
              onClick={() => toast.info("Stock receive form coming in Phase 2")}
            >
              <Package className="h-5 w-5 text-green-400" />
              <span className="text-xs">Receive Stock</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 border-slate-700 hover:bg-slate-800"
              onClick={() => toast.info("Transfer form coming in Phase 2")}
            >
              <ArrowLeftRight className="h-5 w-5 text-blue-400" />
              <span className="text-xs">Transfer Stock</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 border-slate-700 hover:bg-slate-800"
              onClick={() => toast.info("Stock count form coming in Phase 2")}
            >
              <ClipboardList className="h-5 w-5 text-purple-400" />
              <span className="text-xs">Physical Count</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 border-slate-700 hover:bg-slate-800"
              onClick={() => toast.info("Location management coming in Phase 2")}
            >
              <MapPin className="h-5 w-5 text-amber-400" />
              <span className="text-xs">Manage Locations</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Phase 2 Notice */}
      <Card className="bg-slate-800/50 border-slate-700 border-dashed">
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            Multi-Tier Inventory System
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Full inventory management UI with location trees, stock ledger,
            supplier management, batch tracking, and physical counts is coming
            in Phase 2. The backend API is ready.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              Multi-Location
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              Double-Entry Ledger
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              Batch Tracking
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              Physical Counts
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              Supplier Management
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
