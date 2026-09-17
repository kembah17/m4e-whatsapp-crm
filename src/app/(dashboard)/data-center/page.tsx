"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
import {
  Database,
  Upload,
  Users,
  Phone,
  Mail,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  Package,
  Layers,
} from "lucide-react";

interface DataQuality {
  totalContacts: number;
  withPhone: number;
  withEmail: number;
  withFullName: number;
  recentlyAdded: number;
  duplicatePhones: number;
  loading: boolean;
}

export default function DataCenterPage() {
  const supabase = createClient();
  const { accountId } = useAuth();

  // Unified Import Hub state
  const [hubOpen, setHubOpen] = useState(false);

  // Direct wizard states (for quick-access cards)
  const [contactWizardOpen, setContactWizardOpen] = useState(false);
  const [productWizardOpen, setProductWizardOpen] = useState(false);

  const [quality, setQuality] = useState<DataQuality>({
    totalContacts: 0,
    withPhone: 0,
    withEmail: 0,
    withFullName: 0,
    recentlyAdded: 0,
    duplicatePhones: 0,
    loading: true,
  });
  const [productCount, setProductCount] = useState(0);

  const fetchQuality = async () => {
    if (!accountId) return;
    setQuality((q) => ({ ...q, loading: true }));

    try {
      const { count: total } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);

      const { count: phones } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .not("phone", "is", null)
        .neq("phone", "");

      const { count: emails } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .not("email", "is", null)
        .neq("email", "");

      const { count: names } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .not("name", "is", null)
        .neq("name", "");

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: recent } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .gte("created_at", weekAgo.toISOString());

      setQuality({
        totalContacts: total ?? 0,
        withPhone: phones ?? 0,
        withEmail: emails ?? 0,
        withFullName: names ?? 0,
        recentlyAdded: recent ?? 0,
        duplicatePhones: 0,
        loading: false,
      });
    } catch {
      setQuality((q) => ({ ...q, loading: false }));
    }
  };

  const fetchProductCount = async () => {
    if (!accountId) return;
    try {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);
      setProductCount(count ?? 0);
    } catch {}
  };

  const refreshAll = () => {
    fetchQuality();
    fetchProductCount();
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const pct = (n: number) =>
    quality.totalContacts > 0
      ? Math.round((n / quality.totalContacts) * 100)
      : 0;

  const hasData = quality.totalContacts > 0 || productCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Data Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Import, manage, and monitor the quality of your business data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={quality.loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${quality.loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setHubOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Import Data
          </Button>
        </div>
      </div>

      {/* Empty State — prominent CTA for new accounts */}
      {!hasData && !quality.loading && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="flex flex-col items-center text-center py-10">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Import Your Business Data</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Get started by importing your customer contacts and product catalog.
              The import wizard supports Excel, CSV, Google Sheets, and more.
            </p>
            <Button size="lg" onClick={() => setHubOpen(true)}>
              <Upload className="h-5 w-5 mr-2" />
              Start Importing
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tip */}
      {hasData && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="flex items-start gap-3 pt-4 pb-4">
            <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <strong>Why data quality matters:</strong> Campaigns sent to contacts
              with complete phone numbers and names get 3x higher response rates.
              Use the Import Wizard to bulk-upload your customer list from Excel or
              CSV files.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quality.loading ? "..." : quality.totalContacts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {quality.recentlyAdded > 0 && (
                <span className="text-green-600">
                  +{quality.recentlyAdded} this week
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">in your catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Phone Completeness
            </CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pct(quality.withPhone)}%</div>
            <Progress value={pct(quality.withPhone)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {quality.withPhone} of {quality.totalContacts} contacts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Email Completeness
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pct(quality.withEmail)}%</div>
            <Progress value={pct(quality.withEmail)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {quality.withEmail} of {quality.totalContacts} contacts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setContactWizardOpen(true)}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              Import Contacts
            </CardTitle>
            <CardDescription>
              Upload Excel, CSV, or import from Google Sheets and phone contacts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full">
              Open Contact Wizard
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setProductWizardOpen(true)}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              Import Products
            </CardTitle>
            <CardDescription>
              Upload your product catalog with pricing, images, and inventory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                {productCount} products
              </Badge>
              <Button variant="outline" size="sm">
                Import
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Data Health
            </CardTitle>
            <CardDescription>
              Review data quality scores and completeness recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quality.totalContacts === 0 ? (
              <Badge variant="outline" className="text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                No contacts yet
              </Badge>
            ) : pct(quality.withPhone) >= 80 && pct(quality.withEmail) >= 50 ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Good quality
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Missing phone or email
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-600" />
              Data Sources
            </CardTitle>
            <CardDescription>
              Your data comes from imports, WhatsApp, and web forms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Manual</Badge>
              <Badge variant="secondary">CSV/Excel</Badge>
              <Badge variant="secondary">WhatsApp</Badge>
              <Badge variant="secondary">Web Forms</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}

      {/* Unified Import Hub (main entry point) */}
      <UnifiedImportHub
        open={hubOpen}
        onOpenChange={setHubOpen}
        onImported={refreshAll}
      />

      {/* Direct Contact Import Wizard (from quick-access card) */}
      <ImportWizard
        open={contactWizardOpen}
        onOpenChange={setContactWizardOpen}
        onImported={refreshAll}
      />

      {/* Direct Product Import Wizard (from quick-access card) */}
      <ProductImportWizard
        open={productWizardOpen}
        onOpenChange={setProductWizardOpen}
        onImported={refreshAll}
      />
    </div>
  );
}
