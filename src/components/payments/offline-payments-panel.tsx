"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Banknote,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Upload,
  Eye,
  Image as ImageIcon,
  CreditCard,
  Smartphone,
  Globe,
  MoreHorizontal,
  Building2,
  Wallet,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import type {
  OfflinePayment,
  PaymentMethodType,
  OfflinePaymentStatus,
} from "@/types/offline-operations";
import {
  PAYMENT_METHOD_LABELS,
  OFFLINE_PAYMENT_STATUS_LABELS,
} from "@/types/offline-operations";

const METHOD_ICONS: Record<PaymentMethodType, typeof Banknote> = {
  bank_transfer: Building2,
  pos: CreditCard,
  cash: Wallet,
  cheque: FileCheck,
  mobile_transfer: Smartphone,
  online: Globe,
  other: MoreHorizontal,
};

const STATUS_CONFIG: Record<
  OfflinePaymentStatus,
  { icon: typeof Clock; className: string }
> = {
  pending: {
    icon: Clock,
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
  verified: {
    icon: CheckCircle2,
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  rejected: {
    icon: XCircle,
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  reversed: {
    icon: RotateCcw,
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
};

interface OfflinePaymentsPanelProps {
  dealId?: string;
  invoiceId?: string;
  contactId?: string;
  compact?: boolean;
}

export function OfflinePaymentsPanel({
  dealId,
  invoiceId,
  contactId,
  compact = false,
}: OfflinePaymentsPanelProps) {
  const { accountId, user } = useAuth();
  const [payments, setPayments] = useState<OfflinePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodType>("bank_transfer");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  // Verify dialog
  const [verifyDialog, setVerifyDialog] = useState<{
    open: boolean;
    payment: OfflinePayment | null;
    action: "verify" | "reject";
  }>({ open: false, payment: null, action: "verify" });
  const [rejectionReason, setRejectionReason] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Proof upload
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofPaymentId, setProofPaymentId] = useState<string | null>(null);

  // Proof preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (dealId) params.set("deal_id", dealId);
      if (invoiceId) params.set("invoice_id", invoiceId);
      if (contactId) params.set("contact_id", contactId);

      const res = await fetch(`/api/offline-payments?${params}`);
      if (res.ok) {
        const json = await res.json();
        setPayments(json.data ?? []);
        setTotal(json.total ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [dealId, invoiceId, contactId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  async function handleCreate() {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/offline-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_id: dealId || null,
          invoice_id: invoiceId || null,
          contact_id: contactId || null,
          amount: numAmount,
          currency: "NGN",
          payment_method: method,
          reference_number: reference.trim() || null,
          payment_date: paymentDate
            ? new Date(paymentDate).toISOString()
            : new Date().toISOString(),
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record payment");
      }
      toast.success("Payment recorded");
      setAmount("");
      setReference("");
      setNotes("");
      setShowForm(false);
      fetchPayments();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record payment"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    if (!verifyDialog.payment) return;
    setVerifying(true);
    try {
      const res = await fetch(
        `/api/offline-payments/${verifyDialog.payment.id}/verify`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: verifyDialog.action,
            rejection_reason:
              verifyDialog.action === "reject"
                ? rejectionReason.trim() || null
                : null,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast.success(
        verifyDialog.action === "verify"
          ? "Payment verified"
          : "Payment rejected"
      );
      setVerifyDialog({ open: false, payment: null, action: "verify" });
      setRejectionReason("");
      fetchPayments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setVerifying(false);
    }
  }

  async function handleProofUpload(file: File) {
    if (!proofPaymentId) return;
    setUploadingProof(proofPaymentId);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `account-${accountId}/${Date.now()}-proof.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("payment-proofs").getPublicUrl(path);

      const res = await fetch(
        `/api/offline-payments/${proofPaymentId}/proof`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proof_url: publicUrl,
            proof_storage_path: path,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to save proof");
      toast.success("Proof uploaded");
      fetchPayments();
    } catch {
      toast.error("Failed to upload proof");
    } finally {
      setUploadingProof(null);
      setProofPaymentId(null);
    }
  }

  function formatAmount(amount: number, currency: string) {
    if (currency === "NGN") {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 0,
      }).format(amount);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Summary stats
  const pendingTotal = payments
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);
  const verifiedTotal = payments
    .filter((p) => p.status === "verified")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">Payments</h3>
          {!compact && payments.length > 0 && (
            <div className="flex gap-3 mt-1">
              {verifiedTotal > 0 && (
                <span className="text-[10px] text-green-400">
                  Verified: {formatAmount(verifiedTotal, "NGN")}
                </span>
              )}
              {pendingTotal > 0 && (
                <span className="text-[10px] text-yellow-400">
                  Pending: {formatAmount(pendingTotal, "NGN")}
                </span>
              )}
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="h-7 text-xs border-border bg-transparent text-muted-foreground hover:bg-muted"
        >
          <Plus className="mr-1 h-3 w-3" />
          Record
        </Button>
      </div>

      {/* Record Payment Form */}
      {showForm && (
        <div className="mb-3 rounded-lg border border-border bg-muted/50 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Amount (₦)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-8 text-xs border-border bg-muted"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Method</Label>
              <Select
                value={method}
                onValueChange={(v) => setMethod(v as PaymentMethodType)}
              >
                <SelectTrigger className="h-8 text-xs border-border bg-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethodType[]
                  ).map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">
                Reference #
              </Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction ref..."
                className="h-8 text-xs border-border bg-muted"
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">
                Payment Date
              </Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-8 text-xs border-border bg-muted"
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="min-h-[40px] text-xs border-border bg-muted"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving || !amount}
              className="h-7 text-xs bg-primary text-primary-foreground"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Record Payment"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Payment List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center">
            <Banknote className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">
              No payments recorded
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => {
              const MethodIcon =
                METHOD_ICONS[payment.payment_method] || Banknote;
              const statusCfg =
                STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              return (
                <Card
                  key={payment.id}
                  className="border-border bg-muted/30"
                >
                  <CardContent className="p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <MethodIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground">
                              {formatAmount(
                                payment.amount,
                                payment.currency
                              )}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1 py-0 ${statusCfg.className}`}
                            >
                              <StatusIcon className="mr-0.5 h-2 w-2" />
                              {OFFLINE_PAYMENT_STATUS_LABELS[payment.status]}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {PAYMENT_METHOD_LABELS[payment.payment_method]}
                            {payment.reference_number &&
                              ` • Ref: ${payment.reference_number}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70">
                            {formatDate(payment.payment_date)}
                            {payment.recorded_by_profile &&
                              ` • by ${
                                payment.recorded_by_profile.full_name ||
                                payment.recorded_by_profile.email
                              }`}
                          </p>
                          {payment.notes && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              {payment.notes}
                            </p>
                          )}
                          {payment.status === "rejected" &&
                            payment.rejection_reason && (
                              <p className="text-[10px] text-red-400 mt-0.5">
                                Rejected: {payment.rejection_reason}
                              </p>
                            )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 shrink-0">
                        {/* Proof upload */}
                        {!payment.proof_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setProofPaymentId(payment.id);
                              fileInputRef.current?.click();
                            }}
                            disabled={uploadingProof === payment.id}
                            className="h-6 px-1.5 text-[10px]"
                          >
                            {uploadingProof === payment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-2.5 w-2.5 mr-0.5" />
                                Proof
                              </>
                            )}
                          </Button>
                        )}
                        {payment.proof_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setPreviewUrl(payment.proof_url!)
                            }
                            className="h-6 px-1.5 text-[10px]"
                          >
                            <Eye className="h-2.5 w-2.5 mr-0.5" />
                            View
                          </Button>
                        )}

                        {/* Verify/Reject buttons for pending */}
                        {payment.status === "pending" && (
                          <div className="flex gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setVerifyDialog({
                                  open: true,
                                  payment,
                                  action: "verify",
                                })
                              }
                              className="h-6 px-1.5 text-[10px] text-green-400 hover:text-green-300"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setVerifyDialog({
                                  open: true,
                                  payment,
                                  action: "reject",
                                })
                              }
                              className="h-6 px-1.5 text-[10px] text-red-400 hover:text-red-300"
                            >
                              <XCircle className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Hidden file input for proof upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProofUpload(file);
          e.target.value = "";
        }}
      />

      {/* Verify/Reject Dialog */}
      <Dialog
        open={verifyDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setVerifyDialog({ open: false, payment: null, action: "verify" });
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {verifyDialog.action === "verify"
                ? "Verify Payment"
                : "Reject Payment"}
            </DialogTitle>
          </DialogHeader>
          {verifyDialog.payment && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {formatAmount(
                    verifyDialog.payment.amount,
                    verifyDialog.payment.currency
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {PAYMENT_METHOD_LABELS[verifyDialog.payment.payment_method]}
                  {verifyDialog.payment.reference_number &&
                    ` • Ref: ${verifyDialog.payment.reference_number}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Date: {formatDate(verifyDialog.payment.payment_date)}
                </p>
              </div>

              {verifyDialog.action === "reject" && (
                <div className="grid gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Rejection Reason
                  </Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Why is this payment being rejected?"
                    className="min-h-[60px] text-xs border-border bg-muted"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setVerifyDialog({ open: false, payment: null, action: "verify" })
              }
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={verifying}
              className={`text-xs ${
                verifyDialog.action === "verify"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {verifying ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : verifyDialog.action === "verify" ? (
                "Confirm Verification"
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Preview Dialog */}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
      >
        <DialogContent className="sm:max-w-lg bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Payment Proof</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex items-center justify-center">
              {previewUrl.endsWith(".pdf") ? (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline"
                >
                  Open PDF in new tab
                </a>
              ) : (
                <img
                  src={previewUrl}
                  alt="Payment proof"
                  className="max-h-[400px] rounded-md object-contain"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
