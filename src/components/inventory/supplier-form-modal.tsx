"use client";

import { useState, useEffect } from "react";
import type { Supplier } from "@/types/inventory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface SupplierFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSuccess: () => void;
}

export function SupplierFormModal({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: SupplierFormModalProps) {
  const isEditing = !!supplier;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    paymentTerms: "",
    notes: "",
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        contactName: supplier.contact_name || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        paymentTerms: supplier.payment_terms || "",
        notes: supplier.notes || "",
      });
    } else {
      setForm({
        name: "",
        contactName: "",
        phone: "",
        email: "",
        address: "",
        paymentTerms: "",
        notes: "",
      });
    }
  }, [supplier, open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        paymentTerms: form.paymentTerms.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (isEditing && supplier) {
        const res = await fetch(`/api/inventory/suppliers/${supplier.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update supplier");
      } else {
        const res = await fetch("/api/inventory/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create supplier");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Supplier" : "Add Supplier"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-zinc-300">Company Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. ABC Distributors Ltd"
              className="bg-zinc-800 border-zinc-700 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-300">Contact Person</Label>
              <Input
                value={form.contactName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, contactName: e.target.value }))
                }
                placeholder="Full name"
                className="bg-zinc-800 border-zinc-700 mt-1"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
                placeholder="+234..."
                className="bg-zinc-800 border-zinc-700 mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-zinc-300">Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="supplier@example.com"
              className="bg-zinc-800 border-zinc-700 mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-300">Address</Label>
            <Textarea
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
              placeholder="Business address"
              className="bg-zinc-800 border-zinc-700 mt-1"
              rows={2}
            />
          </div>

          <div>
            <Label className="text-zinc-300">Payment Terms</Label>
            <Input
              value={form.paymentTerms}
              onChange={(e) =>
                setForm((p) => ({ ...p, paymentTerms: e.target.value }))
              }
              placeholder="e.g. Net 30, COD, 50% upfront"
              className="bg-zinc-800 border-zinc-700 mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-300">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="Additional notes about this supplier"
              className="bg-zinc-800 border-zinc-700 mt-1"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="bg-[#C9A84C] hover:bg-[#b8993f] text-black"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
