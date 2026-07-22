"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import type {
  InstallmentPlan, InstallmentScheduleEntry, InstallmentPlanStatus,
  InstallmentFrequency, LateFeeType,
} from "@/types/business-growth";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  CalendarClock, AlertTriangle, TrendingUp, ListChecks,
  Plus, CreditCard, Loader2, Eye, ChevronDown, ChevronUp,
} from "lucide-react";

interface ContactOption {
  id: string;
  name: string;
  phone?: string;
}

const PLAN_STATUS_CONFIG: Record<InstallmentPlanStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  defaulted: { label: "Defaulted", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  cancelled: { label: "Cancelled", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  paused: { label: "Paused", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
};

const FREQUENCY_OPTIONS: { value: InstallmentFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
];

const LATE_FEE_OPTIONS: { value: LateFeeType; label: string }[] = [
  { value: "none", label: "No Late Fee" },
  { value: "fixed", label: "Fixed Amount" },
  { value: "percentage", label: "Percentage" },
];

export default function InstallmentsPage() {
  const { defaultCurrency } = useAuth();
  const currency = defaultCurrency || "NGN";

  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);
  const [schedule, setSchedule] = useState<InstallmentScheduleEntry[]>([]);
  const [selectedScheduleEntry, setSelectedScheduleEntry] = useState<InstallmentScheduleEntry | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    contact_id: "",
    plan_name: "",
    total_amount: "",
    down_payment: "0",
    number_of_installments: "3",
    frequency: "monthly" as InstallmentFrequency,
    grace_period_days: "3",
    late_fee_type: "none" as LateFeeType,
    late_fee_amount: "0",
    notes: "",
  });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "bank_transfer",
    payment_reference: "",
    notes: "",
  });

  const fetchPlans = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("limit", "50");
      const res = await fetch(`/api/installments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ }
  }, [statusFilter]);

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

  useEffect(() => {
    Promise.all([fetchPlans(), fetchContacts()]).finally(() => setLoading(false));
  }, [fetchPlans, fetchContacts]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const fetchPlanDetail = async (planId: string) => {
    try {
      const res = await fetch(`/api/installments/${planId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPlan(data.plan);
        setSchedule(data.schedule || []);
        setShowDetailModal(true);
      }
    } catch {
      toast.error("Failed to load plan details");
    }
  };

  const handleCreatePlan = async () => {
    if (!createForm.contact_id || !createForm.plan_name || !createForm.total_amount) {
      toast.error("Contact, plan name, and total amount are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          total_amount: parseFloat(createForm.total_amount),
          down_payment: parseFloat(createForm.down_payment || "0"),
          number_of_installments: parseInt(createForm.number_of_installments, 10),
          grace_period_days: parseInt(createForm.grace_period_days, 10),
          late_fee_amount: parseFloat(createForm.late_fee_amount || "0"),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create");
      toast.success("Installment plan created");
      setShowCreateModal(false);
      setCreateForm({
        contact_id: "", plan_name: "", total_amount: "", down_payment: "0",
        number_of_installments: "3", frequency: "monthly",
        grace_period_days: "3", late_fee_type: "none", late_fee_amount: "0", notes: "",
      });
      fetchPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedPlan || !selectedScheduleEntry || !paymentForm.amount) {
      toast.error("Amount is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/installments/${selectedPlan.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_entry_id: selectedScheduleEntry.id,
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          payment_reference: paymentForm.payment_reference || null,
          notes: paymentForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to record payment");
      toast.success("Payment recorded");
      setShowPaymentModal(false);
      setPaymentForm({ amount: "", payment_method: "bank_transfer", payment_reference: "", notes: "" });
      // Refresh plan detail
      fetchPlanDetail(selectedPlan.id);
      fetchPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const getProgressPercent = (plan: InstallmentPlan) => {
    if (plan.total_amount <= 0) return 0;
    return Math.min(100, Math.round((plan.total_paid / plan.total_amount) * 100));
  };

  // Summary stats
  const activePlans = plans.filter((p) => p.status === "active").length;
  const totalExpected = plans
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + (p.total_amount - p.total_paid), 0);
  const overdueCount = plans.filter((p) => {
    if (p.status !== "active" || !p.next_due_date) return false;
    return new Date(p.next_due_date) < new Date();
  }).length;

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
          <h1 className="text-2xl font-bold text-white">Installment Plans</h1>
          <p className="text-zinc-400 text-sm">Manage payment plans and track installments</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
          <Plus className="h-4 w-4 mr-2" /> Create Plan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Plans</CardTitle>
            <CalendarClock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activePlans}</div>
            <p className="text-xs text-zinc-500">{total} total plans</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Expected Collections</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalExpected, currency)}
            </div>
            <p className="text-xs text-zinc-500">remaining from active plans</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{overdueCount}</div>
            <p className="text-xs text-zinc-500">plans with overdue installments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-700 text-white">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(PLAN_STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Plans Table */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Installment Plans</CardTitle>
          <CardDescription className="text-zinc-400">{total} total plans</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Customer</TableHead>
                <TableHead className="text-zinc-400">Plan</TableHead>
                <TableHead className="text-zinc-400 text-right">Total</TableHead>
                <TableHead className="text-zinc-400">Progress</TableHead>
                <TableHead className="text-zinc-400">Next Due</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
                    No installment plans found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => {
                  const contact = plan.contact as Record<string, string> | undefined;
                  const statusCfg = PLAN_STATUS_CONFIG[plan.status] || PLAN_STATUS_CONFIG.active;
                  const progress = getProgressPercent(plan);
                  return (
                    <TableRow key={plan.id} className="border-zinc-800">
                      <TableCell className="text-white font-medium">
                        {contact?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-zinc-300">{plan.plan_name}</TableCell>
                      <TableCell className="text-white text-right">
                        {formatCurrency(plan.total_amount, currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span className="text-xs text-zinc-400 w-10 text-right">{progress}%</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          {plan.installments_paid}/{plan.number_of_installments} paid
                        </p>
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {plan.next_due_date
                          ? new Date(plan.next_due_date).toLocaleDateString("en-NG", {
                              day: "numeric", month: "short",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusCfg.color}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                          onClick={() => fetchPlanDetail(plan.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Plan Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Installment Plan</DialogTitle>
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
              <Label className="text-zinc-300">Plan Name *</Label>
              <Input
                value={createForm.plan_name}
                onChange={(e) => setCreateForm((p) => ({ ...p, plan_name: e.target.value }))}
                placeholder="e.g. Samsung TV - 6 months"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Total Amount ({currency}) *</Label>
                <Input
                  type="number"
                  value={createForm.total_amount}
                  onChange={(e) => setCreateForm((p) => ({ ...p, total_amount: e.target.value }))}
                  placeholder="0.00"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Down Payment ({currency})</Label>
                <Input
                  type="number"
                  value={createForm.down_payment}
                  onChange={(e) => setCreateForm((p) => ({ ...p, down_payment: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Number of Installments</Label>
                <Input
                  type="number"
                  value={createForm.number_of_installments}
                  onChange={(e) => setCreateForm((p) => ({ ...p, number_of_installments: e.target.value }))}
                  min="1"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Frequency</Label>
                <Select value={createForm.frequency} onValueChange={(v) => setCreateForm((p) => ({ ...p, frequency: v as InstallmentFrequency }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-300">Grace Period (days)</Label>
                <Input
                  type="number"
                  value={createForm.grace_period_days}
                  onChange={(e) => setCreateForm((p) => ({ ...p, grace_period_days: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <Label className="text-zinc-300">Late Fee Type</Label>
                <Select value={createForm.late_fee_type} onValueChange={(v) => setCreateForm((p) => ({ ...p, late_fee_type: v as LateFeeType }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LATE_FEE_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {createForm.late_fee_type !== "none" && (
              <div>
                <Label className="text-zinc-300">
                  Late Fee {createForm.late_fee_type === "percentage" ? "(%)" : `(${currency})`}
                </Label>
                <Input
                  type="number"
                  value={createForm.late_fee_amount}
                  onChange={(e) => setCreateForm((p) => ({ ...p, late_fee_amount: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            )}
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
            {/* Preview */}
            {createForm.total_amount && createForm.number_of_installments && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-sm text-zinc-400 mb-1">Plan Preview</p>
                <p className="text-white">
                  {createForm.number_of_installments} payments of{" "}
                  <span className="text-[#C9A84C] font-bold">
                    {formatCurrency(
                      (parseFloat(createForm.total_amount) - parseFloat(createForm.down_payment || "0")) /
                        parseInt(createForm.number_of_installments || "1", 10),
                      currency,
                    )}
                  </span>
                  {" "}{createForm.frequency}
                </p>
                {parseFloat(createForm.down_payment || "0") > 0 && (
                  <p className="text-xs text-zinc-500">
                    Down payment: {formatCurrency(parseFloat(createForm.down_payment), currency)}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-zinc-700">
              Cancel
            </Button>
            <Button onClick={handleCreatePlan} disabled={saving} className="bg-[#C9A84C] hover:bg-[#b8993f] text-black">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.plan_name || "Plan Details"}</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Total</p>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(selectedPlan.total_amount, currency)}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Paid</p>
                  <p className="text-lg font-bold text-green-400">
                    {formatCurrency(selectedPlan.total_paid, currency)}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-400">Remaining</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {formatCurrency(selectedPlan.total_amount - selectedPlan.total_paid, currency)}
                  </p>
                </div>
              </div>

              <div>
                <Progress value={getProgressPercent(selectedPlan)} className="h-3" />
                <p className="text-xs text-zinc-500 mt-1">
                  {selectedPlan.installments_paid} of {selectedPlan.number_of_installments} installments paid
                </p>
              </div>

              {/* Schedule Timeline */}
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-2">Payment Schedule</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">#</TableHead>
                      <TableHead className="text-zinc-400">Due Date</TableHead>
                      <TableHead className="text-zinc-400 text-right">Amount</TableHead>
                      <TableHead className="text-zinc-400 text-right">Paid</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map((entry) => {
                      const isPending = entry.status === "pending" || entry.status === "partial" || entry.status === "overdue";
                      const statusColor =
                        entry.status === "paid" ? "text-green-400" :
                        entry.status === "overdue" ? "text-red-400" :
                        entry.status === "partial" ? "text-blue-400" : "text-zinc-400";
                      return (
                        <TableRow key={entry.id} className="border-zinc-800">
                          <TableCell className="text-zinc-300">{entry.installment_number}</TableCell>
                          <TableCell className="text-zinc-300">
                            {new Date(entry.due_date).toLocaleDateString("en-NG", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-white text-right">
                            {formatCurrency(entry.amount_due, currency)}
                          </TableCell>
                          <TableCell className="text-green-400 text-right">
                            {formatCurrency(entry.amount_paid || 0, currency)}
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium capitalize ${statusColor}`}>
                              {entry.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-600 text-green-400 hover:bg-green-600/20"
                                onClick={() => {
                                  setSelectedScheduleEntry(entry);
                                  setPaymentForm({
                                    amount: String(entry.amount_due - (entry.amount_paid || 0)),
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
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Record Installment Payment</DialogTitle>
          </DialogHeader>
          {selectedScheduleEntry && (
            <div className="space-y-4">
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-sm text-zinc-400">
                  Installment #{selectedScheduleEntry.installment_number} - Due{" "}
                  {new Date(selectedScheduleEntry.due_date).toLocaleDateString("en-NG")}
                </p>
                <p className="text-xl font-bold text-yellow-400">
                  {formatCurrency(
                    selectedScheduleEntry.amount_due - (selectedScheduleEntry.amount_paid || 0),
                    currency,
                  )}{" "}
                  <span className="text-sm text-zinc-500">remaining</span>
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
                  onValueChange={(v) => setPaymentForm((p) => ({ ...p, payment_method: v }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-zinc-300">Reference</Label>
                <Input
                  value={paymentForm.payment_reference}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, payment_reference: e.target.value }))}
                  placeholder="e.g. TRF-12345"
                  className="bg-zinc-800 border-zinc-700"
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
