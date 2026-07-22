"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import type { DebtEntry, DebtPayment, DebtStatus, PaymentMethod } from "@/types/business-growth";
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
  BookOpen, AlertTriangle, DollarSign, TrendingUp,
  Plus, CreditCard, Loader2, Search, Filter,
} from "lucide-react";

interface DebtSummary {
  total_outstanding: number;
  total_overdue: number;
  entries_count: number;
  overdue_count: number;
  collection_rate: number;
}

interface ContactOption {
  id: string;
  name: string;
  phone?: string;
}

const STATUS_CONFIG: Record<DebtStatus, { label: string; color: string }> = {
  outstanding: { label: "Outstanding", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  partial: { label: "Partial", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  paid: { label: "Paid", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  overdue: { label: "Overdue", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  written_off: { label: "Written Off", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  disputed: { label: "Disputed", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "ussd", label: "USSD" },
  { value: "pos", label: "POS" },
  { value: "cheque", label: "Cheque" },
  { value: "crypto", label: "Crypto" },
  { value: "other", label: "Other" },
];

export default function DebtBookPage() {
  const { defaultCurrency } = useAuth();
  const currency = defaultCurrency || "NGN";

  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [entries, setEntries] = useState<DebtEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DebtEntry | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    contact_id: "",
    description: "",
    original_amount: "",
    due_date: "",
    entry_type: "credit_sale",
    reminder_enabled: true,
    reminder_frequency_days: "7",
    max_reminders: "5",
    notes: "",
  });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "bank_transfer" as PaymentMethod,
    payment_reference: "",
    notes: "",
  });

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/debt/summary");
      if (res.ok) setSummary(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "50");
      const res = await fetch(`/api/debt?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
  }, [statusFilter, searchQuery]);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts?limit=200");
      if (res.ok) {
        const data = await res.json();
        setContacts(
          (data.contacts || data.data || []).map((c: Record<string, string>) => ({
            id: c.id,
            name: c.name || c.phone || "Unknown",
            phone: c.phone,
          })),
        );
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchSummary(), fetchEntries(), fetchContacts()]).finally(() =>
      setLoading(false),
    );
  }, [fetchSummary, fetchEntries, fetchContacts]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleCreateDebt = async () => {
    if (!createForm.contact_id || !createForm.description || !createForm.original_amount) {
      toast.error("Contact, description, and amount are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/debt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          original_amount: parseFloat(createForm.original_amount),
          reminder_frequency_days: parseInt(createForm.reminder_frequency_days, 10),
          max_reminders: parseInt(createForm.max_reminders, 10),
          due_date: createForm.due_date || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create");
      toast.success("Debt entry created");
      setShowCreateModal(false);
      setCreateForm({
        contact_id: "", description: "", original_amount: "", due_date: "",
        entry_type: "credit_sale", reminder_enabled: true,
        reminder_frequency_days: "7", max_reminders: "5", notes: "",
      });
      fetchEntries();
      fetchSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedEntry || !paymentForm.amount) {
      toast.error("Amount is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/debt/${selectedEntry.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to record payment");
      toast.success("Payment recorded");
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", payment_method: "bank_transfer", payment_reference: "", notes: "" });
      setSelectedEntry(null);
      fetchEntries();
      fetchSummary();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const getOutstanding = (e: DebtEntry) => e.original_amount - e.amount_paid;

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
          <h1 className="text-2xl font-bold text-white">Debt Book</h1>
          <p className="text-zinc-400 text-sm">Track credit sales and collect payments</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
          <Plus className="h-4 w-4 mr-2" /> Record Sale on Credit
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(summary?.total_outstanding ?? 0, currency)}
            </div>
            <p className="text-xs text-zinc-500">{summary?.entries_count ?? 0} entries</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {formatCurrency(summary?.total_overdue ?? 0, currency)}
            </div>
            <p className="text-xs text-zinc-500">{summary?.overdue_count ?? 0} overdue</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {summary?.collection_rate ?? 0}%
            </div>
            <p className="text-xs text-zinc-500">of total debt collected</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Entries</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{total}</div>
            <p className="text-xs text-zinc-500">debt records</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-700 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-700 text-white">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Debt Entries Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Debt Entries</CardTitle>
          <CardDescription className="text-zinc-400">
            {total} total entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Customer</TableHead>
                <TableHead className="text-zinc-400">Description</TableHead>
                <TableHead className="text-zinc-400 text-right">Amount</TableHead>
                <TableHead className="text-zinc-400 text-right">Paid</TableHead>
                <TableHead className="text-zinc-400 text-right">Outstanding</TableHead>
                <TableHead className="text-zinc-400">Due Date</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-zinc-500 py-8">
                    No debt entries found. Record a credit sale to get started.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  const contact = entry.contact as Record<string, string> | undefined;
                  const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.outstanding;
                  return (
                    <TableRow key={entry.id} className="border-zinc-800">
                      <TableCell className="text-white font-medium">
                        {contact?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-zinc-300 max-w-[200px] truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-white text-right">
                        {formatCurrency(entry.original_amount, currency)}
                      </TableCell>
                      <TableCell className="text-green-400 text-right">
                        {formatCurrency(entry.amount_paid, currency)}
                      </TableCell>
                      <TableCell className="text-yellow-400 text-right font-medium">
                        {formatCurrency(getOutstanding(entry), currency)}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {entry.due_date
                          ? new Date(entry.due_date).toLocaleDateString("en-NG", {
                              day: "numeric", month: "short", year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusCfg.color}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.status !== "paid" && entry.status !== "written_off" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-400 hover:bg-green-600/20"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setPaymentForm({
                                amount: String(getOutstanding(entry)),
                                payment_method: "bank_transfer",
                                payment_reference: "",
                                notes: "",
                              });
                              setShowPaymentModal(true);
                            }}
                          >
                            <CreditCard className="h-3 w-3 mr-1" /> Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Debt Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Sale on Credit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">Customer *</Label>
              <Select value={createForm.contact_id} onValueChange={(v) => setCreateForm((p) => ({ ...p, contact_id: v }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-300">Description *</Label>
              <Input
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. 5 bags of rice"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Amount ({currency}) *</Label>
                <Input
                  type="number"
                  value={createForm.original_amount}
                  onChange={(e) => setCreateForm((p) => ({ ...p, original_amount: e.target.value }))}
                  placeholder="0.00"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Due Date</Label>
                <Input
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm((p) => ({ ...p, due_date: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Entry Type</Label>
              <Select value={createForm.entry_type} onValueChange={(v) => setCreateForm((p) => ({ ...p, entry_type: v }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_sale">Credit Sale</SelectItem>
                  <SelectItem value="loan">Loan</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Reminder Every (days)</Label>
                <Input
                  type="number"
                  value={createForm.reminder_frequency_days}
                  onChange={(e) => setCreateForm((p) => ({ ...p, reminder_frequency_days: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Max Reminders</Label>
                <Input
                  type="number"
                  value={createForm.max_reminders}
                  onChange={(e) => setCreateForm((p) => ({ ...p, max_reminders: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            <div>
              <Label className="text-zinc-300">Notes</Label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Additional notes..."
                className="bg-zinc-800 border-zinc-700"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-zinc-700">
              Cancel
            </Button>
            <Button onClick={handleCreateDebt} disabled={saving} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-sm text-zinc-400">Outstanding Balance</p>
                <p className="text-xl font-bold text-yellow-400">
                  {formatCurrency(getOutstanding(selectedEntry), currency)}
                </p>
              </div>
              <div>
                <Label className="text-zinc-300">Payment Amount ({currency}) *</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Payment Method</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(v) => setPaymentForm((p) => ({ ...p, payment_method: v as PaymentMethod }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-300">Reference / Receipt No.</Label>
                <Input
                  value={paymentForm.payment_reference}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, payment_reference: e.target.value }))}
                  placeholder="e.g. TRF-12345"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Notes</Label>
                <Textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Payment notes..."
                  className="bg-zinc-800 border-zinc-700"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="border-zinc-700">
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
