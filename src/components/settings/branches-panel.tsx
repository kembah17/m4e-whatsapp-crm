"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCan } from "@/hooks/use-can";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import type { Branch, BranchMetrics } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { GatedButton } from "@/components/ui/gated-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  DollarSign,
  Briefcase,
  MapPin,
  Phone,
  UserCircle,
} from "lucide-react";

interface BranchFormData {
  name: string;
  address: string;
  phone: string;
  manager_name: string;
}

const EMPTY_FORM: BranchFormData = {
  name: "",
  address: "",
  phone: "",
  manager_name: "",
};

export function BranchesPanel() {
  const supabase = createClient();
  const { accountId, defaultCurrency } = useAuth();
  const canEdit = useCan("edit-settings");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [metrics, setMetrics] = useState<BranchMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  // Form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBranches = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    const res = await fetch("/api/branches");
    if (res.ok) {
      const data = await res.json();
      setBranches(data.branches ?? []);
    }
    setLoading(false);
  }, [accountId]);

  const fetchMetrics = useCallback(async () => {
    if (!accountId) return;
    const res = await fetch("/api/branches/metrics");
    if (res.ok) {
      const data = await res.json();
      setMetrics(data.metrics ?? []);
    }
  }, [accountId]);

  useEffect(() => {
    fetchBranches();
    fetchMetrics();
  }, [fetchBranches, fetchMetrics]);

  function openCreate() {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      manager_name: branch.manager_name ?? "",
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Branch name is required");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingBranch;
      const url = isEdit
        ? `/api/branches/${editingBranch!.id}`
        : "/api/branches";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          manager_name: form.manager_name.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save branch");
      }

      toast.success(isEdit ? "Branch updated" : "Branch created");
      setFormOpen(false);
      fetchBranches();
      fetchMetrics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(branch: Branch) {
    const res = await fetch(`/api/branches/${branch.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !branch.is_active }),
    });
    if (res.ok) {
      toast.success(
        branch.is_active ? "Branch deactivated" : "Branch activated"
      );
      fetchBranches();
    } else {
      toast.error("Failed to update branch status");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/branches/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete branch");
      }
      toast.success("Branch deleted");
      setDeleteTarget(null);
      fetchBranches();
      fetchMetrics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  function getMetrics(branchId: string): BranchMetrics | undefined {
    return metrics.find((m) => m.branch_id === branchId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Branches</h2>
          <p className="text-sm text-muted-foreground">
            Manage your business locations and track performance per branch.
          </p>
        </div>
        <GatedButton
          canAct={canEdit}
          gateReason="manage branches"
          onClick={openCreate}
          size="sm"
        >
          <Plus className="size-4" />
          Add Branch
        </GatedButton>
      </div>

      {/* Branch list */}
      {branches.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <GitBranch className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground">
            No branches yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first branch to start organizing contacts and deals by
            location.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.map((branch) => {
            const m = getMetrics(branch.id);
            return (
              <Card
                key={branch.id}
                className="relative overflow-hidden p-4 space-y-3"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {branch.name}
                      </h3>
                      <Badge
                        variant={branch.is_active ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {branch.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {branch.address && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{branch.address}</span>
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => openEdit(branch)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(branch)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Info row */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {branch.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" />
                      {branch.phone}
                    </span>
                  )}
                  {branch.manager_name && (
                    <span className="flex items-center gap-1">
                      <UserCircle className="size-3" />
                      {branch.manager_name}
                    </span>
                  )}
                </div>

                {/* Metrics row */}
                {m && (
                  <div className="flex gap-4 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Users className="size-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {m.contact_count}
                      </span>
                      <span className="text-muted-foreground">contacts</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Briefcase className="size-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {m.deal_count}
                      </span>
                      <span className="text-muted-foreground">deals</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <DollarSign className="size-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {formatCurrency(m.total_revenue, defaultCurrency)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Active toggle */}
                {canEdit && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Active
                    </span>
                    <Switch
                      checked={branch.is_active}
                      onCheckedChange={() => handleToggleActive(branch)}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? "Edit Branch" : "Add Branch"}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? "Update the branch details below."
                : "Create a new branch to organize your contacts and deals by location."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name <span className="text-red-400">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Lagos HQ"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="e.g. 12 Victoria Island, Lagos"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="e.g. +234 801 234 5678"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Manager Name</Label>
              <Input
                value={form.manager_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, manager_name: e.target.value }))
                }
                placeholder="e.g. Adebayo Ogunlesi"
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editingBranch ? "Save Changes" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong>? Contacts and deals
              assigned to this branch will become unassigned. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
