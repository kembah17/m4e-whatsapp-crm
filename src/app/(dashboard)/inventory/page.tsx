"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import type {
  InventorySummary,
  StockLocation,
  LocationStock,
  StockLedgerEntry,
  LedgerEntryType,
  InventoryCount,
} from "@/types/inventory";
import { LocationTree } from "@/components/inventory/location-tree";
import { LocationFormModal } from "@/components/inventory/location-form-modal";
import { SupplierFormModal } from "@/components/inventory/supplier-form-modal";
import { ReceiveStockModal } from "@/components/inventory/receive-stock-modal";
import { IssueStockModal } from "@/components/inventory/issue-stock-modal";
import { TransferStockModal } from "@/components/inventory/transfer-stock-modal";
import { SetupWizard } from "@/components/inventory/setup-wizard";
import { StockCountWizard } from "@/components/inventory/stock-count-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  MapPin,
  ArrowLeftRight,
  BookOpen,
  Users,
  ClipboardCheck,
  LayoutGrid,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Settings,
  PackagePlus,
  PackageMinus,
  RefreshCw,
  ChevronRight,
  Pencil,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms: string | null;
  notes: string | null;
  created_at: string;
}

type TabId =
  | "overview"
  | "locations"
  | "stock"
  | "transfers"
  | "ledger"
  | "suppliers"
  | "counts";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "stock", label: "Stock", icon: Package },
  { id: "transfers", label: "Transfers", icon: ArrowLeftRight },
  { id: "ledger", label: "Ledger", icon: BookOpen },
  { id: "suppliers", label: "Suppliers", icon: Users },
  { id: "counts", label: "Stock Counts", icon: ClipboardCheck },
];

const ENTRY_TYPE_STYLES: Record<string, string> = {
  receipt: "bg-green-500/20 text-green-400 border-green-500/30",
  issue: "bg-red-500/20 text-red-400 border-red-500/30",
  transfer_in: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  transfer_out: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  adjustment: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  damage: "bg-red-500/20 text-red-400 border-red-500/30",
  count_adjustment: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const COUNT_STATUS_STYLES: Record<string, string> = {
  draft: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);

  // Data state
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [stock, setStock] = useState<LocationStock[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [recentLedger, setRecentLedger] = useState<StockLedgerEntry[]>([]);

  // Filter state
  const [stockLocationFilter, setStockLocationFilter] = useState("all");
  const [stockSearch, setStockSearch] = useState("");
  const [ledgerLocationFilter, setLedgerLocationFilter] = useState("all");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");

  // Modal state
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StockLocation | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showReceiveStock, setShowReceiveStock] = useState(false);
  const [showIssueStock, setShowIssueStock] = useState(false);
  const [showTransferStock, setShowTransferStock] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showCountWizard, setShowCountWizard] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  }, []);

  const fetchStock = useCallback(async () => {
    try {
      const url =
        stockLocationFilter && stockLocationFilter !== "all"
          ? `/api/inventory?location_id=${stockLocationFilter}`
          : "/api/inventory?all_stock=true";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStock(data.stock || []);
      }
    } catch (err) {
      console.error("Failed to fetch stock:", err);
    }
  }, [stockLocationFilter]);

  const fetchLedger = useCallback(
    async (page = 0) => {
      try {
        const params = new URLSearchParams();
        params.set("limit", "20");
        params.set("offset", String(page * 20));
        if (ledgerLocationFilter && ledgerLocationFilter !== "all")
          params.set("location_id", ledgerLocationFilter);
        if (ledgerTypeFilter && ledgerTypeFilter !== "all")
          params.set("entry_type", ledgerTypeFilter);
        const res = await fetch(`/api/inventory/ledger?${params}`);
        if (res.ok) {
          const data = await res.json();
          setLedgerEntries(data.entries || []);
          setLedgerTotal(data.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch ledger:", err);
      }
    },
    [ledgerLocationFilter, ledgerTypeFilter]
  );

  const fetchRecentLedger = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/ledger?limit=10");
      if (res.ok) {
        const data = await res.json();
        setRecentLedger(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to fetch recent ledger:", err);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (err) {
      console.error("Failed to fetch suppliers:", err);
    }
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/counts");
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts || []);
      }
    } catch (err) {
      console.error("Failed to fetch counts:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchLocations(), fetchRecentLedger()]);
      setLoading(false);
    };
    load();
  }, [fetchSummary, fetchLocations, fetchRecentLedger]);

  // Tab-specific data loading
  useEffect(() => {
    if (activeTab === "stock") fetchStock();
    if (activeTab === "ledger") fetchLedger(ledgerPage);
    if (activeTab === "suppliers") fetchSuppliers();
    if (activeTab === "counts") fetchCounts();
    if (activeTab === "transfers") fetchLedger(0);
  }, [activeTab, fetchStock, fetchLedger, fetchSuppliers, fetchCounts, ledgerPage]);

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchSummary(), fetchLocations(), fetchRecentLedger()]);
    if (activeTab === "stock") await fetchStock();
    if (activeTab === "ledger") await fetchLedger(ledgerPage);
    if (activeTab === "suppliers") await fetchSuppliers();
    if (activeTab === "counts") await fetchCounts();
    setLoading(false);
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Delete this location? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/inventory/locations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Location deleted");
      fetchLocations();
      fetchSummary();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error(message);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      const res = await fetch(`/api/inventory/suppliers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Supplier deleted");
      fetchSuppliers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error(message);
    }
  };

  // Filter stock by search
  const filteredStock = stock.filter((s) => {
    if (!stockSearch) return true;
    const search = stockSearch.toLowerCase();
    const name = (s.product as { name: string })?.name?.toLowerCase() || "";
    const sku = (s.product as { sku: string | null })?.sku?.toLowerCase() || "";
    return name.includes(search) || sku.includes(search);
  });

  // Build location tree
  const buildTree = (locs: StockLocation[]): StockLocation[] => {
    const map = new Map<string, StockLocation & { children?: StockLocation[] }>();
    const roots: (StockLocation & { children?: StockLocation[] })[] = [];
    locs.forEach((l) => map.set(l.id, { ...l, children: [] }));
    locs.forEach((l) => {
      if (l.parent_id && map.has(l.parent_id)) {
        map.get(l.parent_id)!.children!.push(map.get(l.id)!);
      } else {
        roots.push(map.get(l.id)!);
      }
    });
    return roots;
  };

  const locationTree = buildTree(locations);

  // Transfer entries from ledger
  const transferEntries = ledgerEntries.filter(
    (e) => e.entry_type === "transfer_in" || e.entry_type === "transfer_out"
  );

  if (!user) return null;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage stock, locations, suppliers, and physical counts
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="border-zinc-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-zinc-800">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-zinc-800 text-white border-b-2 border-[#C9A84C]"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══ Tab: Overview ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Package className="h-4 w-4" />
                <span className="text-xs uppercase">Products Tracked</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {summary?.total_products_tracked ?? "-"}
              </p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs uppercase">Stock Value</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {summary ? formatCurrency(summary.total_stock_value) : "-"}
              </p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <MapPin className="h-4 w-4" />
                <span className="text-xs uppercase">Locations</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {summary?.total_locations ?? "-"}
              </p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4 border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs uppercase">Low Stock</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">
                {summary?.low_stock_count ?? "-"}
              </p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4 border border-red-500/30">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs uppercase">Out of Stock</span>
              </div>
              <p className="text-2xl font-bold text-red-400">
                {summary?.out_of_stock_count ?? "-"}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowReceiveStock(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PackagePlus className="h-4 w-4 mr-2" /> Receive Stock
            </Button>
            <Button
              onClick={() => setShowTransferStock(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" /> Transfer Stock
            </Button>
            <Button
              onClick={() => setShowCountWizard(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <ClipboardCheck className="h-4 w-4 mr-2" /> New Count
            </Button>
            {locations.length === 0 && (
              <Button
                onClick={() => setShowSetupWizard(true)}
                className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
              >
                <Settings className="h-4 w-4 mr-2" /> Setup Wizard
              </Button>
            )}
          </div>

          {/* Recent Stock Movements */}
          <div className="bg-zinc-800 rounded-lg border border-zinc-700">
            <div className="p-4 border-b border-zinc-700">
              <h3 className="text-sm font-semibold text-white">Recent Stock Movements</h3>
            </div>
            {recentLedger.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No stock movements yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-400 text-xs uppercase border-b border-zinc-700">
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">Location</th>
                      <th className="text-left p-3">Type</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-right p-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLedger.map((entry) => (
                      <tr key={entry.id} className="border-b border-zinc-700/50 hover:bg-zinc-700/30">
                        <td className="p-3 text-zinc-400">
                          {formatDateTime(entry.created_at)}
                        </td>
                        <td className="p-3 text-white">
                          {(entry as unknown as { product?: { name: string } }).product?.name || "-"}
                        </td>
                        <td className="p-3 text-zinc-400">
                          {(entry as unknown as { location?: { name: string } }).location?.name || "-"}
                        </td>
                        <td className="p-3">
                          <Badge className={ENTRY_TYPE_STYLES[entry.entry_type] || "bg-zinc-500/20 text-zinc-400"}>
                            {entry.entry_type.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className={`p-3 text-right font-medium ${
                          entry.quantity > 0 ? "text-green-400" : "text-red-400"
                        }`}>
                          {entry.quantity > 0 ? "+" : ""}{entry.quantity}
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {entry.balance_after}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Tab: Locations ═══ */}
      {activeTab === "locations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Stock Locations</h2>
            <div className="flex gap-2">
              {locations.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowSetupWizard(true)}
                  className="border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10"
                >
                  <Settings className="h-4 w-4 mr-2" /> Industry Presets
                </Button>
              )}
              <Button
                onClick={() => {
                  setEditingLocation(null);
                  setShowLocationForm(true);
                }}
                className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Location
              </Button>
            </div>
          </div>

          {locations.length === 0 ? (
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-12 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
              <h3 className="text-lg font-medium text-white mb-2">
                No locations set up yet
              </h3>
              <p className="text-zinc-400 mb-6 max-w-md mx-auto">
                Set up stock locations to track inventory across warehouses, stores,
                and other areas. Use industry presets for quick setup.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setShowSetupWizard(true)}
                  className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
                >
                  <Settings className="h-4 w-4 mr-2" /> Use Industry Preset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingLocation(null);
                    setShowLocationForm(true);
                  }}
                  className="border-zinc-600"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-800 rounded-lg border border-zinc-700">
              <LocationTree
                locations={locationTree}
                onEdit={(loc) => {
                  setEditingLocation(loc);
                  setShowLocationForm(true);
                }}
                onDelete={(loc) => handleDeleteLocation(loc.id)}
                onAddChild={(parentId) => {
                  setEditingLocation(null);
                  setShowLocationForm(true);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ═══ Tab: Stock ═══ */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Stock Levels</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowReceiveStock(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <PackagePlus className="h-4 w-4 mr-2" /> Receive
              </Button>
              <Button
                onClick={() => setShowIssueStock(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <PackageMinus className="h-4 w-4 mr-2" /> Issue
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search by product name or SKU..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700"
              />
            </div>
            <Select value={stockLocationFilter} onValueChange={setStockLocationFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock Table */}
          <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-x-auto">
            {filteredStock.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No stock records found</p>
                <p className="text-xs mt-1">
                  Receive stock to start tracking inventory levels
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 text-xs uppercase border-b border-zinc-700">
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">SKU</th>
                    <th className="text-left p-3">Location</th>
                    <th className="text-right p-3">On Hand</th>
                    <th className="text-right p-3">Reserved</th>
                    <th className="text-right p-3">Available</th>
                    <th className="text-right p-3">Reorder Pt</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((s) => {
                    const product = s.product as { name: string; sku: string | null } | undefined;
                    const location = s.location as { name: string } | undefined;
                    const available = s.quantity_on_hand - (s.quantity_reserved ?? 0);
                    let status = "in_stock";
                    let statusLabel = "In Stock";
                    let statusClass = "bg-green-500/20 text-green-400 border-green-500/30";
                    if (available <= 0) {
                      status = "out";
                      statusLabel = "Out of Stock";
                      statusClass = "bg-red-500/20 text-red-400 border-red-500/30";
                    } else if (s.reorder_point && available <= s.reorder_point) {
                      status = "low";
                      statusLabel = "Low Stock";
                      statusClass = "bg-amber-500/20 text-amber-400 border-amber-500/30";
                    }
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-zinc-700/50 hover:bg-zinc-700/30"
                      >
                        <td className="p-3 text-white font-medium">
                          {product?.name || "-"}
                        </td>
                        <td className="p-3 text-zinc-400 font-mono text-xs">
                          {product?.sku || "-"}
                        </td>
                        <td className="p-3 text-zinc-400">
                          {location?.name || "-"}
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {s.quantity_on_hand}
                        </td>
                        <td className="p-3 text-right text-zinc-400">
                          {s.quantity_reserved ?? 0}
                        </td>
                        <td className="p-3 text-right text-white font-medium">
                          {available}
                        </td>
                        <td className="p-3 text-right text-zinc-400">
                          {s.reorder_point ?? "-"}
                        </td>
                        <td className="p-3">
                          <Badge className={statusClass}>{statusLabel}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ Tab: Transfers ═══ */}
      {activeTab === "transfers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Stock Transfers</h2>
            <Button
              onClick={() => setShowTransferStock(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" /> New Transfer
            </Button>
          </div>

          <div className="bg-zinc-800 rounded-lg border border-zinc-700">
            {transferEntries.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No transfers recorded yet</p>
                <p className="text-xs mt-1">
                  Transfer stock between locations to see history here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-400 text-xs uppercase border-b border-zinc-700">
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">Location</th>
                      <th className="text-left p-3">Direction</th>
                      <th className="text-right p-3">Quantity</th>
                      <th className="text-right p-3">Balance After</th>
                      <th className="text-left p-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-zinc-700/50 hover:bg-zinc-700/30"
                      >
                        <td className="p-3 text-zinc-400">
                          {formatDateTime(entry.created_at)}
                        </td>
                        <td className="p-3 text-white">
                          {(entry as unknown as { product?: { name: string } }).product?.name || "-"}
                        </td>
                        <td className="p-3 text-zinc-400">
                          {(entry as unknown as { location?: { name: string } }).location?.name || "-"}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={
                              entry.entry_type === "transfer_in"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            }
                          >
                            {entry.entry_type === "transfer_in" ? "Received" : "Sent"}
                          </Badge>
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${
                            entry.quantity > 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {entry.quantity > 0 ? "+" : ""}
                          {entry.quantity}
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {entry.balance_after}
                        </td>
                        <td className="p-3 text-zinc-400 max-w-[200px] truncate">
                          {entry.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Tab: Ledger ═══ */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Stock Ledger</h2>
            <p className="text-sm text-zinc-400">
              {ledgerTotal} total entries
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={ledgerLocationFilter}
              onValueChange={(v) => {
                setLedgerLocationFilter(v);
                setLedgerPage(0);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px] bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={ledgerTypeFilter}
              onValueChange={(v) => {
                setLedgerTypeFilter(v);
                setLedgerPage(0);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px] bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
                <SelectItem value="transfer_in">Transfer In</SelectItem>
                <SelectItem value="transfer_out">Transfer Out</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="count_adjustment">Count Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ledger Table */}
          <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-x-auto">
            {ledgerEntries.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No ledger entries found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 text-xs uppercase border-b border-zinc-700">
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">Location</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3">Qty</th>
                    <th className="text-right p-3">Balance</th>
                    <th className="text-left p-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-zinc-700/50 hover:bg-zinc-700/30"
                    >
                      <td className="p-3 text-zinc-400 whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </td>
                      <td className="p-3 text-white">
                        {(entry as unknown as { product?: { name: string } }).product?.name || "-"}
                      </td>
                      <td className="p-3 text-zinc-400">
                        {(entry as unknown as { location?: { name: string } }).location?.name || "-"}
                      </td>
                      <td className="p-3">
                        <Badge
                          className={
                            ENTRY_TYPE_STYLES[entry.entry_type] ||
                            "bg-zinc-500/20 text-zinc-400"
                          }
                        >
                          {entry.entry_type.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td
                        className={`p-3 text-right font-medium ${
                          entry.quantity > 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {entry.quantity > 0 ? "+" : ""}
                        {entry.quantity}
                      </td>
                      <td className="p-3 text-right text-zinc-300">
                        {entry.balance_after}
                      </td>
                      <td className="p-3 text-zinc-400 max-w-[200px] truncate">
                        {entry.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {ledgerTotal > 20 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                Showing {ledgerPage * 20 + 1}-
                {Math.min((ledgerPage + 1) * 20, ledgerTotal)} of {ledgerTotal}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ledgerPage === 0}
                  onClick={() => setLedgerPage((p) => p - 1)}
                  className="border-zinc-700"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(ledgerPage + 1) * 20 >= ledgerTotal}
                  onClick={() => setLedgerPage((p) => p + 1)}
                  className="border-zinc-700"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Tab: Suppliers ═══ */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Suppliers</h2>
            <Button
              onClick={() => {
                setEditingSupplier(null);
                setShowSupplierForm(true);
              }}
              className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Supplier
            </Button>
          </div>

          <div className="bg-zinc-800 rounded-lg border border-zinc-700">
            {suppliers.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No suppliers added yet</p>
                <p className="text-xs mt-1">
                  Add suppliers to track your stock sources
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-400 text-xs uppercase border-b border-zinc-700">
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Contact</th>
                      <th className="text-left p-3">Phone</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Payment Terms</th>
                      <th className="text-left p-3">Added</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr
                        key={supplier.id}
                        className="border-b border-zinc-700/50 hover:bg-zinc-700/30"
                      >
                        <td className="p-3 text-white font-medium">
                          {supplier.name}
                        </td>
                        <td className="p-3 text-zinc-400">
                          {supplier.contact_name || "-"}
                        </td>
                        <td className="p-3 text-zinc-400">
                          {supplier.phone || "-"}
                        </td>
                        <td className="p-3 text-zinc-400">
                          {supplier.email || "-"}
                        </td>
                        <td className="p-3 text-zinc-400">
                          {supplier.payment_terms || "-"}
                        </td>
                        <td className="p-3 text-zinc-500 text-xs">
                          {formatDate(supplier.created_at)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setShowSupplierForm(true);
                              }}
                              className="p-1.5 rounded hover:bg-zinc-600 text-zinc-400 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="p-1.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Tab: Stock Counts ═══ */}
      {activeTab === "counts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Physical Stock Counts</h2>
            <Button
              onClick={() => setShowCountWizard(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" /> New Count
            </Button>
          </div>

          <div className="bg-zinc-800 rounded-lg border border-zinc-700">
            {counts.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No stock counts recorded yet</p>
                <p className="text-xs mt-1">
                  Start a physical count to verify your inventory levels
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-400 text-xs uppercase border-b border-zinc-700">
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Location</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3">Items</th>
                      <th className="text-left p-3">Notes</th>
                      <th className="text-left p-3">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counts.map((count) => (
                      <tr
                        key={count.id}
                        className="border-b border-zinc-700/50 hover:bg-zinc-700/30"
                      >
                        <td className="p-3 text-zinc-400">
                          {formatDate(count.count_date)}
                        </td>
                        <td className="p-3 text-white">
                          {count.location?.name || "-"}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={
                              COUNT_STATUS_STYLES[count.status] ||
                              "bg-zinc-500/20 text-zinc-400"
                            }
                          >
                            {count.status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {count.items?.length ?? 0}
                        </td>
                        <td className="p-3 text-zinc-400 max-w-[200px] truncate">
                          {count.notes || "-"}
                        </td>
                        <td className="p-3 text-zinc-500 text-xs">
                          {count.completed_at
                            ? formatDateTime(count.completed_at)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Modals ═══ */}
      <LocationFormModal
        open={showLocationForm}
        onOpenChange={setShowLocationForm}
        allLocations={locations}
        location={editingLocation}
        onSuccess={() => {
          setShowLocationForm(false);
          setEditingLocation(null);
          fetchLocations();
          fetchSummary();
        }}
      />

      <SupplierFormModal
        open={showSupplierForm}
        onOpenChange={setShowSupplierForm}
        supplier={editingSupplier}
        onSuccess={() => {
          setShowSupplierForm(false);
          setEditingSupplier(null);
          fetchSuppliers();
        }}
      />

      <ReceiveStockModal
        open={showReceiveStock}
        onOpenChange={setShowReceiveStock}
        locations={locations}
        onSuccess={() => {
          setShowReceiveStock(false);
          fetchStock();
          fetchSummary();
          fetchRecentLedger();
        }}
      />

      <IssueStockModal
        open={showIssueStock}
        onOpenChange={setShowIssueStock}
        locations={locations}
        onSuccess={() => {
          setShowIssueStock(false);
          fetchStock();
          fetchSummary();
          fetchRecentLedger();
        }}
      />

      <TransferStockModal
        open={showTransferStock}
        onOpenChange={setShowTransferStock}
        locations={locations}
        onSuccess={() => {
          setShowTransferStock(false);
          fetchStock();
          fetchSummary();
          fetchRecentLedger();
          if (activeTab === "transfers" || activeTab === "ledger") {
            fetchLedger(ledgerPage);
          }
        }}
      />

      {showSetupWizard && (
        <SetupWizard
          open={showSetupWizard}
          onOpenChange={setShowSetupWizard}
          onSuccess={() => {
            setShowSetupWizard(false);
            fetchLocations();
            fetchSummary();
          }}
        />
      )}

      {showCountWizard && (
        <StockCountWizard
          open={showCountWizard}
          onOpenChange={setShowCountWizard}
          locations={locations}
          onSuccess={() => {
            setShowCountWizard(false);
            fetchCounts();
            fetchStock();
            fetchSummary();
            fetchRecentLedger();
          }}
        />
      )}
    </div>
  );
}
