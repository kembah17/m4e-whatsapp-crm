"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UnifiedImportHub } from "@/components/data-center/unified-import-hub";
import { ImportWizard } from "@/components/contacts/import-wizard";
import { ProductImportWizard } from "@/components/products/product-import-wizard";
import { InventoryImportWizard } from "@/components/data-center/inventory-import-wizard";
import { DataExportHub } from "@/components/data-center/data-export-hub";
import {
  Database,
  Upload,
  Users,
  Phone,
  Mail,
  UserCheck,
  RefreshCw,
  FileSpreadsheet,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  Package,
  Layers,
  Warehouse,
  Download,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Clock,
  ExternalLink,
  Filter,
  Activity,
  Shield,
  Wifi,
  WifiOff,
  BarChart3,
  PackageOpen,
  CircleDollarSign,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface DataMetrics {
  totalContacts: number;
  totalProducts: number;
  inventoryLocations: number;
  pipelineDeals: number;
  activeSegments: number;
  importSessions: number;
  // Contact quality
  withPhone: number;
  withEmail: number;
  withFullName: number;
  recentContacts: number;
  recentProducts: number;
  // Inventory
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  // WhatsApp
  whatsappConnected: boolean;
  whatsappPhone: string | null;
  templateCount: number;
  loading: boolean;
}

interface ImportSessionRow {
  id: string;
  channel: string;
  status: string;
  source_types: string[];
  created_at: string;
  validation_summary: {
    total?: number;
    valid?: number;
  } | null;
}

const DEFAULT_METRICS: DataMetrics = {
  totalContacts: 0,
  totalProducts: 0,
  inventoryLocations: 0,
  pipelineDeals: 0,
  activeSegments: 0,
  importSessions: 0,
  withPhone: 0,
  withEmail: 0,
  withFullName: 0,
  recentContacts: 0,
  recentProducts: 0,
  totalStockValue: 0,
  lowStockCount: 0,
  outOfStockCount: 0,
  whatsappConnected: false,
  whatsappPhone: null,
  templateCount: 0,
  loading: true,
};

// ── Health Score Calculator ──────────────────────────────────

function calculateHealthScore(m: DataMetrics): {
  score: number;
  recommendations: string[];
} {
  const recs: string[] = [];
  let total = 0;
  let earned = 0;

  // Phone completeness (25 pts)
  total += 25;
  if (m.totalContacts > 0) {
    const phonePct = m.withPhone / m.totalContacts;
    earned += Math.round(phonePct * 25);
    if (phonePct < 0.8)
      recs.push(
        `Improve phone completeness (${Math.round(phonePct * 100)}% → 80%+). Update contacts missing phone numbers.`
      );
  } else {
    recs.push("Import your customer contacts to get started.");
  }

  // Email completeness (15 pts)
  total += 15;
  if (m.totalContacts > 0) {
    const emailPct = m.withEmail / m.totalContacts;
    earned += Math.round(emailPct * 15);
    if (emailPct < 0.5)
      recs.push(
        `Collect more email addresses (${Math.round(emailPct * 100)}% → 50%+).`
      );
  }

  // Name completeness (10 pts)
  total += 10;
  if (m.totalContacts > 0) {
    const namePct = m.withFullName / m.totalContacts;
    earned += Math.round(namePct * 10);
    if (namePct < 0.9)
      recs.push(
        `Add names to contacts (${Math.round(namePct * 100)}% → 90%+).`
      );
  }

  // Product catalog (15 pts)
  total += 15;
  if (m.totalProducts > 0) {
    earned += 15;
  } else {
    recs.push("Import your product catalog to enable sales features.");
  }

  // Inventory setup (15 pts)
  total += 15;
  if (m.inventoryLocations > 0) {
    earned += 15;
  } else {
    recs.push(
      "Set up inventory locations to track stock levels."
    );
  }

  // WhatsApp connected (20 pts)
  total += 20;
  if (m.whatsappConnected) {
    earned += 20;
  } else {
    recs.push(
      "Connect WhatsApp to enable messaging and automation."
    );
  }

  const score = total > 0 ? Math.round((earned / total) * 100) : 0;
  return { score, recommendations: recs.slice(0, 4) };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 50) return "bg-amber-100 dark:bg-amber-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

// ── Page Component ───────────────────────────────────────────

export default function DataCenterPage() {
  const supabase = createClient();
  const { accountId } = useAuth();

  // Modal states
  const [hubOpen, setHubOpen] = useState(false);
  const [contactWizardOpen, setContactWizardOpen] = useState(false);
  const [productWizardOpen, setProductWizardOpen] = useState(false);
  const [inventoryWizardOpen, setInventoryWizardOpen] = useState(false);
  const [exportHubOpen, setExportHubOpen] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<DataMetrics>(DEFAULT_METRICS);
  const [recentImports, setRecentImports] = useState<ImportSessionRow[]>([]);

  // ── Fetch all metrics ──────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    if (!accountId) return;
    setMetrics((m) => ({ ...m, loading: true }));

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString();

      // Parallel queries for performance
      const [
        contactsRes,
        phonesRes,
        emailsRes,
        namesRes,
        recentContactsRes,
        productsRes,
        recentProductsRes,
        locationsRes,
        dealsRes,
        segmentsRes,
        importsRes,
        waConfigRes,
        templatesRes,
        recentImportsRes,
      ] = await Promise.all([
        // Total contacts
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId),
        // With phone
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId)
          .not("phone", "is", null)
          .neq("phone", ""),
        // With email
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId)
          .not("email", "is", null)
          .neq("email", ""),
        // With name
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId)
          .not("name", "is", null)
          .neq("name", ""),
        // Recent contacts
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId)
          .gte("created_at", weekAgoISO),
        // Total products
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId),
        // Recent products
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId)
          .gte("created_at", weekAgoISO),
        // Stock locations
        supabase
          .from("stock_locations")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId)
          .eq("is_active", true),
        // Pipeline deals
        supabase
          .from("deals")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId),
        // Active segments
        supabase
          .from("segments")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId),
        // Import sessions
        supabase
          .from("import_sessions")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId),
        // WhatsApp config
        supabase
          .from("whatsapp_config")
          .select("phone_number, is_connected")
          .eq("account_id", accountId)
          .maybeSingle(),
        // WhatsApp templates
        supabase
          .from("whatsapp_templates")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId),
        // Recent imports (last 5)
        supabase
          .from("import_sessions")
          .select("id, channel, status, source_types, created_at, validation_summary")
          .eq("account_id", accountId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      // Fetch inventory summary via API (handles complex joins)
      let stockValue = 0;
      let lowStock = 0;
      let outOfStock = 0;
      try {
        const invRes = await fetch("/api/inventory");
        if (invRes.ok) {
          const invData = await invRes.json();
          if (invData.summary) {
            stockValue = invData.summary.total_stock_value ?? 0;
            lowStock = invData.summary.low_stock_count ?? 0;
            outOfStock = invData.summary.out_of_stock_count ?? 0;
          }
        }
      } catch {
        // Inventory API may not be available
      }

      const waConfig = waConfigRes.data;

      setMetrics({
        totalContacts: contactsRes.count ?? 0,
        totalProducts: productsRes.count ?? 0,
        inventoryLocations: locationsRes.count ?? 0,
        pipelineDeals: dealsRes.count ?? 0,
        activeSegments: segmentsRes.count ?? 0,
        importSessions: importsRes.count ?? 0,
        withPhone: phonesRes.count ?? 0,
        withEmail: emailsRes.count ?? 0,
        withFullName: namesRes.count ?? 0,
        recentContacts: recentContactsRes.count ?? 0,
        recentProducts: recentProductsRes.count ?? 0,
        totalStockValue: stockValue,
        lowStockCount: lowStock,
        outOfStockCount: outOfStock,
        whatsappConnected: waConfig?.is_connected === true,
        whatsappPhone: waConfig?.phone_number ?? null,
        templateCount: templatesRes.count ?? 0,
        loading: false,
      });

      setRecentImports(
        (recentImportsRes.data as ImportSessionRow[] | null) ?? []
      );
    } catch {
      setMetrics((m) => ({ ...m, loading: false }));
    }
  }, [accountId, supabase]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const pct = (n: number) =>
    metrics.totalContacts > 0
      ? Math.round((n / metrics.totalContacts) * 100)
      : 0;

  const { score: healthScore, recommendations } = calculateHealthScore(metrics);
  const hasData = metrics.totalContacts > 0 || metrics.totalProducts > 0;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Data Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Import, export, and monitor the quality of your business data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={metrics.loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${metrics.loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportHubOpen(true)}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button onClick={() => setHubOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Import Data
          </Button>
        </div>
      </div>

      {/* ── Empty State ─────────────────────────────────── */}
      {!hasData && !metrics.loading && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex flex-col items-center text-center py-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              Import Your Business Data
            </h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Get started by importing your customer contacts and product
              catalog. The import wizard supports Excel, CSV, Google Sheets,
              and more.
            </p>
            <Button size="lg" onClick={() => setHubOpen(true)}>
              <Upload className="h-5 w-5 mr-2" />
              Start Importing
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Section 1: Data Overview Dashboard ──────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.loading
                ? "..."
                : metrics.totalContacts.toLocaleString()}
            </div>
            {metrics.recentContacts > 0 && (
              <p className="text-xs text-green-600">
                +{metrics.recentContacts} this week
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.loading
                ? "..."
                : metrics.totalProducts.toLocaleString()}
            </div>
            {metrics.recentProducts > 0 && (
              <p className="text-xs text-green-600">
                +{metrics.recentProducts} this week
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Locations
            </CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.loading
                ? "..."
                : metrics.inventoryLocations.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">active locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pipeline Deals
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.loading
                ? "..."
                : metrics.pipelineDeals.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">in pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Segments</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.loading
                ? "..."
                : metrics.activeSegments.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">active segments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Import Sessions
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.loading
                ? "..."
                : metrics.importSessions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">total imports</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 2: Data Health Score + Section 5: WhatsApp ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Health Score */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Data Health Score
            </CardTitle>
            <CardDescription>
              Overall quality and completeness of your business data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              {/* Score display */}
              <div
                className={`flex flex-col items-center justify-center w-28 h-28 rounded-full ${getScoreBg(healthScore)} shrink-0`}
              >
                <span
                  className={`text-3xl font-bold ${getScoreColor(healthScore)}`}
                >
                  {metrics.loading ? "..." : healthScore}
                </span>
                <span
                  className={`text-xs font-medium ${getScoreColor(healthScore)}`}
                >
                  {getScoreLabel(healthScore)}
                </span>
              </div>

              {/* Breakdown bars */}
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> Phone
                    </span>
                    <span>{pct(metrics.withPhone)}%</span>
                  </div>
                  <Progress value={pct(metrics.withPhone)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </span>
                    <span>{pct(metrics.withEmail)}%</span>
                  </div>
                  <Progress value={pct(metrics.withEmail)} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5" /> Name
                    </span>
                    <span>{pct(metrics.withFullName)}%</span>
                  </div>
                  <Progress value={pct(metrics.withFullName)} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Badge
                    variant={metrics.totalProducts > 0 ? "default" : "outline"}
                    className="text-xs"
                  >
                    <Package className="h-3 w-3 mr-1" />
                    Catalog{" "}
                    {metrics.totalProducts > 0 ? "✓" : "Missing"}
                  </Badge>
                  <Badge
                    variant={
                      metrics.inventoryLocations > 0 ? "default" : "outline"
                    }
                    className="text-xs"
                  >
                    <Warehouse className="h-3 w-3 mr-1" />
                    Inventory{" "}
                    {metrics.inventoryLocations > 0 ? "✓" : "Missing"}
                  </Badge>
                  <Badge
                    variant={
                      metrics.whatsappConnected ? "default" : "outline"
                    }
                    className="text-xs"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    WhatsApp{" "}
                    {metrics.whatsappConnected ? "✓" : "Missing"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Recommendations
                </p>
                <ul className="space-y-1">
                  {recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {metrics.whatsappConnected ? (
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Wifi className="h-5 w-5 text-green-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <WifiOff className="h-5 w-5 text-red-500" />
                </div>
              )}
              <div>
                <p className="font-medium">
                  {metrics.whatsappConnected
                    ? "Connected"
                    : "Not Connected"}
                </p>
                {metrics.whatsappPhone && (
                  <p className="text-sm text-muted-foreground">
                    {metrics.whatsappPhone}
                  </p>
                )}
              </div>
            </div>

            {metrics.whatsappConnected && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Templates</span>
                  <span className="font-medium">
                    {metrics.templateCount}
                  </span>
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/whatsapp-admin">
                WhatsApp Admin
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 3: Quick Actions Grid ───────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Quick Actions
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setContactWizardOpen(true)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                Import Contacts
              </CardTitle>
              <CardDescription>
                Upload Excel, CSV, or import from Google Sheets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                Open Wizard
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setProductWizardOpen(true)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                Import Products
              </CardTitle>
              <CardDescription>
                Upload your product catalog with pricing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {metrics.totalProducts} products
                </Badge>
                <Button variant="outline" size="sm">
                  Import
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setInventoryWizardOpen(true)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-orange-600" />
                Import Inventory
              </CardTitle>
              <CardDescription>
                Upload CSV with stock levels per location.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {metrics.inventoryLocations} locations
                </Badge>
                <Button variant="outline" size="sm">
                  Import
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setExportHubOpen(true)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-5 w-5 text-purple-600" />
                Export Data
              </CardTitle>
              <CardDescription>
                Download contacts, products, or inventory as CSV.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                Open Export Hub
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Section 4 + 6: Recent Imports & Inventory Stats ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Import Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Imports
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/import-history">
                  View All
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentImports.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No import sessions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentImports.map((imp) => (
                  <div
                    key={imp.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {imp.source_types?.join(", ") || imp.channel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(imp.created_at).toLocaleDateString()}{" "}
                          {new Date(imp.created_at).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {imp.validation_summary?.total && (
                        <span className="text-xs text-muted-foreground">
                          {imp.validation_summary.valid ?? imp.validation_summary.total}{" "}
                          records
                        </span>
                      )}
                      <Badge
                        variant={
                          imp.status === "confirmed"
                            ? "default"
                            : imp.status === "expired" ||
                                imp.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {imp.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Quick Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                Inventory Overview
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/inventory">
                  Full Inventory
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.inventoryLocations === 0 && !metrics.loading ? (
              <div className="text-center py-6 text-muted-foreground">
                <Warehouse className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-3">No inventory locations set up</p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href="/inventory">
                    Set Up Inventory
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Locations
                    </span>
                  </div>
                  <p className="text-lg font-bold">
                    {metrics.inventoryLocations}
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Stock Value
                    </span>
                  </div>
                  <p className="text-lg font-bold">
                    {metrics.totalStockValue > 0
                      ? `₦${metrics.totalStockValue.toLocaleString()}`
                      : "—"}
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs text-amber-600">
                      Low Stock
                    </span>
                  </div>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    {metrics.lowStockCount}
                  </p>
                </div>

                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <PackageOpen className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-500">
                      Out of Stock
                    </span>
                  </div>
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">
                    {metrics.outOfStockCount}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tip ─────────────────────────────────────────── */}
      {hasData && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="flex items-start gap-3 pt-4 pb-4">
            <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <strong>Why data quality matters:</strong> Campaigns sent to
              contacts with complete phone numbers and names get 3× higher
              response rates. Use the Import Wizard to bulk-upload your
              customer list from Excel or CSV files.
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Modals ──────────────────────────────────────── */}
      <UnifiedImportHub
        open={hubOpen}
        onOpenChange={setHubOpen}
        onImported={fetchMetrics}
      />
      <ImportWizard
        open={contactWizardOpen}
        onOpenChange={setContactWizardOpen}
        onImported={fetchMetrics}
      />
      <ProductImportWizard
        open={productWizardOpen}
        onOpenChange={setProductWizardOpen}
        onImported={fetchMetrics}
      />
      <InventoryImportWizard
        open={inventoryWizardOpen}
        onOpenChange={setInventoryWizardOpen}
        onImported={fetchMetrics}
      />
      <DataExportHub
        open={exportHubOpen}
        onOpenChange={setExportHubOpen}
      />
    </div>
  );
}
