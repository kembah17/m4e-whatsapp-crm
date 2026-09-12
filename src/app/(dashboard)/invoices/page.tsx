"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import type {
  Invoice, InvoiceItem, InvoiceStatus, DocType, DiscountType,
} from "@/types/business-growth";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText, AlertTriangle, DollarSign, Clock,
  Plus, Send, ArrowRightLeft, Loader2, Search, Trash2,
} from "lucide-react";

interface ContactOption {
  id: string;
  name: string;
  phone?: string;
}

interface ProductOption {
  id: string;
  name: string;
  price?: number;
  sku?: string;
}

interface LineItem {
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceSummary {
  unpaid_total: number;
  overdue_total: number;
  this_month_revenue: number;
  pending_count: number;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-muted/50 text-muted-foreground border-border" },
  sent: { label: "Sent", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  viewed: { label: "Viewed", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  accepted: { label: "Accepted", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  paid: { label: "Paid", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  partial: { label: "Partial", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  overdue: { label: "Overdue", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  cancelled: { label: "Cancelled", color: "bg-muted/50 text-muted-foreground border-border" },
  expired: { label: "Expired", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
};

const DOC_TYPE_LABELS: Record<DocType, string> = {
  invoice: "Invoice",
  quotation: "Quotation",
  proforma: "Proforma",
  receipt: "Receipt",
  credit_note: "Credit Note",
};

export default function InvoicesPage() {
  const { defaultCurrency } = useAuth();
  const currency = defaultCurrency || "NGN";

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    contact_id: "",
    doc_type: "invoice" as DocType,
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    discount_type: "none" as DiscountType,
    discount_value: "0",
    tax_rate: "7.5",
    notes: "",
    terms: "Payment due within 30 days of invoice date.",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unit_price: 0, total: 0 },
  ]);

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("doc_type", activeTab);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "50");
      const res = await fetch(`/api/invoices?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
  }, [activeTab, searchQuery]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/invoices?summary=true");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || null);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts?limit=200");
      if (res.ok) {
        const data = await res.json();
        setContacts(
          (data.contacts || data.data || []).map((c: Record<string, string>) => ({
            id: c.id, name: c.name || c.phone || "Unknown", phone: c.phone,
          })),
        );
      }
    } catch { /* ignore */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?limit=200");
      if (res.ok) {
        const data = await res.json();
        setProducts(
          (data.products || data.data || []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: (p.name as string) || "Unnamed",
            price: (p.price as number) || 0,
            sku: (p.sku as string) || "",
          })),
        );
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchInvoices(), fetchSummary(), fetchContacts(), fetchProducts()]).finally(() =>
      setLoading(false),
    );
  }, [fetchInvoices, fetchSummary, fetchContacts, fetchProducts]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Line item helpers
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        item.total = Number(item.quantity) * Number(item.unit_price);
      }
      updated[index] = item;
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const selectProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        product_id: productId,
        description: product.name,
        unit_price: product.price || 0,
        total: (product.price || 0) * updated[index].quantity,
      };
      return updated;
    });
  };

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount =
    createForm.discount_type === "percentage"
      ? subtotal * (parseFloat(createForm.discount_value || "0") / 100)
      : createForm.discount_type === "fixed"
        ? parseFloat(createForm.discount_value || "0")
        : 0;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (parseFloat(createForm.tax_rate || "0") / 100);
  const grandTotal = afterDiscount + taxAmount;

  const handleCreateInvoice = async () => {
    if (!createForm.contact_id) {
      toast.error("Please select a customer");
      return;
    }
    const validItems = lineItems.filter((item) => item.description && item.total > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: createForm.contact_id,
          doc_type: createForm.doc_type,
          issue_date: createForm.issue_date,
          due_date: createForm.due_date || null,
          discount_type: createForm.discount_type,
          discount_value: parseFloat(createForm.discount_value || "0"),
          tax_rate: parseFloat(createForm.tax_rate || "0"),
          notes: createForm.notes || null,
          terms: createForm.terms || null,
          items: validItems.map((item) => ({
            product_id: item.product_id || null,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create");
      toast.success(`${DOC_TYPE_LABELS[createForm.doc_type]} created`);
      setShowCreateModal(false);
      resetCreateForm();
      fetchInvoices();
      fetchSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      contact_id: "", doc_type: "invoice",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: "", discount_type: "none", discount_value: "0",
      tax_rate: "7.5", notes: "",
      terms: "Payment due within 30 days of invoice date.",
    });
    setLineItems([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
  };

  const handleConvertToInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convert_to_invoice: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to convert");
      toast.success("Converted to invoice");
      fetchInvoices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to convert");
    }
  };

  const handleSendWhatsApp = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "whatsapp" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to send");
      toast.success("Sent via WhatsApp");
      fetchInvoices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices & Quotations</h1>
          <p className="text-muted-foreground text-sm">Create and manage invoices, quotations, and receipts</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
          <Plus className="h-4 w-4 mr-2" /> Create Document
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unpaid</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(summary?.unpaid_total ?? 0, currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {formatCurrency(summary?.overdue_total ?? 0, currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <FileText className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(summary?.this_month_revenue ?? 0, currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary?.pending_count ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Search */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <TabsList className="bg-muted">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="invoice">Invoices</TabsTrigger>
            <TabsTrigger value="quotation">Quotations</TabsTrigger>
            <TabsTrigger value="proforma">Proforma</TabsTrigger>
            <TabsTrigger value="receipt">Receipts</TabsTrigger>
            <TabsTrigger value="credit_note">Credit Notes</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by doc number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border text-foreground"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Documents</CardTitle>
              <CardDescription className="text-muted-foreground">{total} total</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Doc #</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Customer</TableHead>
                    <TableHead className="text-muted-foreground text-right">Total</TableHead>
                    <TableHead className="text-muted-foreground text-right">Balance</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No documents found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((inv) => {
                      const contact = inv.contact as Record<string, string> | undefined;
                      const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                      const balance = inv.total - inv.amount_paid;
                      return (
                        <TableRow key={inv.id} className="border-border">
                          <TableCell className="text-foreground font-mono text-sm">
                            {inv.doc_number}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-muted-foreground border-border">
                              {DOC_TYPE_LABELS[inv.doc_type] || inv.doc_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {contact?.name || "Unknown"}
                          </TableCell>
                          <TableCell className="text-foreground text-right font-medium">
                            {formatCurrency(inv.total, currency)}
                          </TableCell>
                          <TableCell className={`text-right ${balance > 0 ? "text-yellow-400" : "text-green-400"}`}>
                            {formatCurrency(balance, currency)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(inv.issue_date).toLocaleDateString("en-NG", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusCfg.color}>
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {inv.doc_type === "quotation" && inv.status !== "cancelled" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
                                  onClick={() => handleConvertToInvoice(inv.id)}
                                  title="Convert to Invoice"
                                >
                                  <ArrowRightLeft className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-600 text-green-400 hover:bg-green-600/20"
                                onClick={() => handleSendWhatsApp(inv.id)}
                                title="Send via WhatsApp"
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invoice Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-card border-border text-foreground max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create {DOC_TYPE_LABELS[createForm.doc_type]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Header Fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground">Document Type</Label>
                <Select value={createForm.doc_type} onValueChange={(v) => setCreateForm((p) => ({ ...p, doc_type: v as DocType }))}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground">Customer *</Label>
                <Select value={createForm.contact_id} onValueChange={(v) => setCreateForm((p) => ({ ...p, contact_id: v }))}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground">Issue Date</Label>
                <Input
                  type="date"
                  value={createForm.issue_date}
                  onChange={(e) => setCreateForm((p) => ({ ...p, issue_date: e.target.value }))}
                  className="bg-muted border-border"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Due Date</Label>
                <Input
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm((p) => ({ ...p, due_date: e.target.value }))}
                  className="bg-muted border-border"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-muted-foreground text-base">Line Items</Label>
                <Button size="sm" variant="outline" onClick={addLineItem} className="border-border text-muted-foreground">
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Product</Label>}
                      <Select
                        value={item.product_id || "manual"}
                        onValueChange={(v) => v !== "manual" && selectProduct(idx, v)}
                      >
                        <SelectTrigger className="bg-muted border-border text-xs">
                          <SelectValue placeholder="Pick" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                        placeholder="Item description"
                        className="bg-muted border-border text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, "quantity", parseInt(e.target.value, 10) || 0)}
                        min="1"
                        className="bg-muted border-border text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Unit Price</Label>}
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                        className="bg-muted border-border text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">Total</Label>}
                      <div className="h-9 flex items-center px-3 bg-muted/50 border border-border rounded-md text-sm text-foreground">
                        {formatCurrency(item.total, currency)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      {idx === 0 && <Label className="text-xs text-muted-foreground">&nbsp;</Label>}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLineItem(idx)}
                        disabled={lineItems.length <= 1}
                        className="text-red-400 hover:text-red-300 h-9 w-9 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount, Tax, Totals */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Discount</Label>
                  <div className="flex gap-2">
                    <Select
                      value={createForm.discount_type}
                      onValueChange={(v) => setCreateForm((p) => ({ ...p, discount_type: v as DiscountType }))}
                    >
                      <SelectTrigger className="bg-muted border-border w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                    {createForm.discount_type !== "none" && (
                      <Input
                        type="number"
                        value={createForm.discount_value}
                        onChange={(e) => setCreateForm((p) => ({ ...p, discount_value: e.target.value }))}
                        className="bg-muted border-border flex-1"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tax Rate (%)</Label>
                  <Input
                    type="number"
                    value={createForm.tax_rate}
                    onChange={(e) => setCreateForm((p) => ({ ...p, tax_rate: e.target.value }))}
                    className="bg-muted border-border"
                  />
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatCurrency(subtotal, currency)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-red-400">-{formatCurrency(discountAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({createForm.tax_rate}%)</span>
                  <span className="text-foreground">{formatCurrency(taxAmount, currency)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="text-foreground font-medium">Total</span>
                  <span className="text-[#C9A84C] font-bold text-lg">
                    {formatCurrency(grandTotal, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-muted-foreground">Notes</Label>
                <Textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes to customer..."
                  className="bg-muted border-border"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Terms & Conditions</Label>
                <Textarea
                  value={createForm.terms}
                  onChange={(e) => setCreateForm((p) => ({ ...p, terms: e.target.value }))}
                  className="bg-muted border-border"
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="border-border">
              Cancel
            </Button>
            <Button onClick={handleCreateInvoice} disabled={saving} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create {DOC_TYPE_LABELS[createForm.doc_type]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
