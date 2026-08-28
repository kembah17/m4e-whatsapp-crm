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
import { ImportWizard } from "@/components/contacts/import-wizard";
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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [quality, setQuality] = useState<DataQuality>({
    totalContacts: 0,
    withPhone: 0,
    withEmail: 0,
    withFullName: 0,
    recentlyAdded: 0,
    duplicatePhones: 0,
    loading: true,
  });

  const fetchQuality = async () => {
    if (!accountId) return;
    setQuality((q) => ({ ...q, loading: true }));

    try {
      // Total contacts
      const { count: total } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId);

      // With phone
      const { count: phones } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .not("phone", "is", null)
        .neq("phone", "");

      // With email
      const { count: emails } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .not("email", "is", null)
        .neq("email", "");

      // With full name
      const { count: names } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .not("name", "is", null)
        .neq("name", "");

      // Recently added (last 7 days)
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

  useEffect(() => {
    fetchQuality();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const pct = (n: number) =>
    quality.totalContacts > 0
      ? Math.round((n / quality.totalContacts) * 100)
      : 0;

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
            Import, manage, and monitor the quality of your customer data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQuality}
            disabled={quality.loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${quality.loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setWizardOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Import Data
          </Button>
        </div>
      </div>

      {/* Tip */}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Name Completeness
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pct(quality.withFullName)}%
            </div>
            <Progress value={pct(quality.withFullName)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {quality.withFullName} of {quality.totalContacts} contacts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => setWizardOpen(true)}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              Import from Spreadsheet
            </CardTitle>
            <CardDescription>
              Upload Excel (.xlsx) or CSV files with your customer data. The
              wizard will guide you through mapping columns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full">
              Open Import Wizard
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Data Health Check
            </CardTitle>
            <CardDescription>
              Review your data quality scores and get recommendations for
              improving contact completeness.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quality.totalContacts === 0 ? (
              <Badge variant="outline" className="text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                No contacts yet — import your first batch
              </Badge>
            ) : pct(quality.withPhone) >= 80 && pct(quality.withEmail) >= 50 ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Good data quality
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Some contacts missing phone or email
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
              Your contacts come from manual entry, spreadsheet imports, WhatsApp
              conversations, and web forms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Manual Entry</Badge>
              <Badge variant="secondary">CSV/Excel Import</Badge>
              <Badge variant="secondary">WhatsApp</Badge>
              <Badge variant="secondary">Web Forms</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Wizard Modal */}
      <ImportWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onImported={fetchQuality}
      />
    </div>
  );
}
