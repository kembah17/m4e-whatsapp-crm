"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText } from "lucide-react";

interface InvoiceConfig {
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  tax_id: string;
  default_tax_rate: number;
  default_payment_terms: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_sort_code: string;
  invoice_prefix: string;
  quotation_prefix: string;
  receipt_prefix: string;
  invoice_footer_note: string;
}

const DEFAULT_CONFIG: InvoiceConfig = {
  business_name: "",
  business_address: "",
  business_phone: "",
  business_email: "",
  tax_id: "",
  default_tax_rate: 7.5,
  default_payment_terms: "Payment due within 14 days of invoice date.",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  bank_sort_code: "",
  invoice_prefix: "INV",
  quotation_prefix: "QUO",
  receipt_prefix: "REC",
  invoice_footer_note: "Thank you for your business!",
};

export function InvoicingSettings() {
  const [config, setConfig] = useState<InvoiceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/invoices?config=true");
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config });
      }
    } catch { /* use defaults */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/invoices?config=true", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invoice settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>;
  }

  const field = (label: string, key: keyof InvoiceConfig, type = "text", placeholder = "") => (
    <div>
      <Label className="text-zinc-300">{label}</Label>
      <Input
        type={type}
        value={config[key] as string | number}
        onChange={(e) => setConfig({ ...config, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        placeholder={placeholder}
        className="bg-zinc-800 border-zinc-700 text-white"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#C9A84C]" /> Invoice Settings
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Configure your business details for invoices, quotations, and receipts.
        </p>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader><CardTitle className="text-white text-sm">Business Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("Business Name", "business_name", "text", "Your Company Ltd")}
          {field("Phone", "business_phone", "tel", "+234...")}
          {field("Email", "business_email", "email", "billing@company.com")}
          {field("Tax ID / TIN", "tax_id", "text", "Optional")}
          <div className="md:col-span-2">
            <Label className="text-zinc-300">Business Address</Label>
            <Textarea
              value={config.business_address}
              onChange={(e) => setConfig({ ...config, business_address: e.target.value })}
              placeholder="Full business address"
              className="bg-zinc-800 border-zinc-700 text-white"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader><CardTitle className="text-white text-sm">Bank Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("Bank Name", "bank_name", "text", "Zenith Bank")}
          {field("Account Name", "bank_account_name", "text", "Your Company Ltd")}
          {field("Account Number", "bank_account_number", "text", "0123456789")}
          {field("Sort Code", "bank_sort_code", "text", "Optional")}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader><CardTitle className="text-white text-sm">Defaults</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("Default Tax Rate (%)", "default_tax_rate", "number")}
          {field("Invoice Prefix", "invoice_prefix", "text", "INV")}
          {field("Quotation Prefix", "quotation_prefix", "text", "QUO")}
          {field("Receipt Prefix", "receipt_prefix", "text", "REC")}
          <div className="md:col-span-2">
            <Label className="text-zinc-300">Default Payment Terms</Label>
            <Textarea
              value={config.default_payment_terms}
              onChange={(e) => setConfig({ ...config, default_payment_terms: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
              rows={2}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-zinc-300">Invoice Footer Note</Label>
            <Textarea
              value={config.invoice_footer_note}
              onChange={(e) => setConfig({ ...config, invoice_footer_note: e.target.value })}
              className="bg-zinc-800 border-zinc-700 text-white"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save Invoice Settings
      </Button>
    </div>
  );
}
