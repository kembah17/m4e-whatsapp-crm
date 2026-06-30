"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2, Clock, Loader2, MapPin, MessageSquare, Phone, Plus,
  Settings2, Trash2, UserPlus, Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Branch {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  whatsapp_number: string;
  auto_reply_message: string;
  business_hours: Record<string, { open: string; close: string }>;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

interface BranchMember {
  id: string;
  profile_id: string;
  role: string;
  full_name: string;
  email: string;
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABELS: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};
const DEFAULT_HOURS: Record<string, { open: string; close: string }> = {
  mon: { open: "09:00", close: "17:00" },
  tue: { open: "09:00", close: "17:00" },
  wed: { open: "09:00", close: "17:00" },
  thu: { open: "09:00", close: "17:00" },
  fri: { open: "09:00", close: "17:00" },
  sat: { open: "09:00", close: "13:00" },
  sun: { open: "", close: "" },
};

export function BranchSettings() {
  const { accountId } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [members, setMembers] = useState<BranchMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersBranchId, setMembersBranchId] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [form, setForm] = useState<Partial<Branch>>({
    name: "", description: "", address: "", phone: "",
    whatsapp_number: "", auto_reply_message: "",
    business_hours: { ...DEFAULT_HOURS }, is_active: true,
  });

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        const d = await res.json();
        setBranches(d.branches ?? d ?? []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (accountId) fetchBranches(); else setLoading(false);
  }, [accountId, fetchBranches]);

  async function fetchMembers(branchId: string) {
    setMembersBranchId(branchId);
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/branches/${branchId}/members`);
      if (res.ok) {
        const d = await res.json();
        setMembers(d.members ?? []);
      }
    } catch { /* silent */ }
    finally { setMembersLoading(false); }
  }

  function startEdit(branch: Branch) {
    setEditingId(branch.id);
    setForm({ ...branch });
    fetchMembers(branch.id);
    setShowCreate(false);
  }

  function startCreate() {
    setEditingId(null);
    setForm({
      name: "", description: "", address: "", phone: "",
      whatsapp_number: "", auto_reply_message: "",
      business_hours: { ...DEFAULT_HOURS }, is_active: true,
    });
    setShowCreate(true);
    setMembersBranchId(null);
    setMembers([]);
  }

  async function handleSave() {
    if (!form.name?.trim()) { toast.error("Branch name is required"); return; }
    setSaving(true);
    try {
      const url = editingId ? `/api/branches/${editingId}` : "/api/branches";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const p = await res.json();
        toast.error(p.error || "Failed to save branch");
        return;
      }
      toast.success(editingId ? "Branch updated" : "Branch created");
      setShowCreate(false);
      setEditingId(null);
      await fetchBranches();
    } catch { toast.error("Failed to save branch"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this branch? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete branch"); return; }
      toast.success("Branch deleted");
      if (editingId === id) { setEditingId(null); setShowCreate(false); }
      await fetchBranches();
    } catch { toast.error("Failed to delete branch"); }
  }

  async function addMember() {
    if (!membersBranchId || !newMemberEmail.trim()) return;
    try {
      const res = await fetch(`/api/branches/${membersBranchId}/members`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: newMemberEmail.trim(), role: "agent" }),
      });
      const p = await res.json();
      if (!res.ok) { toast.error(p.error || "Failed to add member"); return; }
      toast.success("Member added");
      setNewMemberEmail("");
      fetchMembers(membersBranchId);
    } catch { toast.error("Failed to add member"); }
  }

  async function removeMember(memberId: string) {
    if (!membersBranchId) return;
    try {
      await fetch(`/api/branches/${membersBranchId}/members/${memberId}`, { method: "DELETE" });
      toast.success("Member removed");
      fetchMembers(membersBranchId);
    } catch { toast.error("Failed to remove member"); }
  }

  function updateHours(day: string, field: "open" | "close", value: string) {
    setForm((f) => ({
      ...f,
      business_hours: {
        ...(f.business_hours ?? DEFAULT_HOURS),
        [day]: { ...(f.business_hours?.[day] ?? DEFAULT_HOURS[day] ?? { open: "", close: "" }), [field]: value },
      },
    }));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  const isEditing = editingId || showCreate;

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="size-5" />Branches
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage your business locations and branch-specific settings.
          </p>
        </div>
        <Button onClick={startCreate} size="sm">
          <Plus className="size-4 mr-1" />Add Branch
        </Button>
      </div>

      {!isEditing && branches.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No branches yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first branch to get started.</p>
          <Button onClick={startCreate} size="sm" className="mt-4">
            <Plus className="size-4 mr-1" />Create Branch
          </Button>
        </Card>
      )}

      {!isEditing && branches.length > 0 && (
        <div className="grid gap-3">
          {branches.map((b) => (
            <Card key={b.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => startEdit(b)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Building2 className="size-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{b.name}</span>
                      {b.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                      {!b.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                    </div>
                    {b.address && <p className="text-xs text-muted-foreground mt-0.5">{b.address}</p>}
                  </div>
                </div>
                <Settings2 className="size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{editingId ? "Edit Branch" : "New Branch"}</h4>
            <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setShowCreate(false); }}>Cancel</Button>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Branch Name *</Label>
                  <Input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Lagos HQ" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+234..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><MapPin className="size-3.5" />Address</Label>
                <Input value={form.address ?? ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Full address" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Phone className="size-3.5" />WhatsApp Number</Label>
                <Input value={form.whatsapp_number ?? ""} onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))} placeholder="+234... (if different from main)" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.is_active ?? true} onCheckedChange={(c: boolean) => setForm((f) => ({ ...f, is_active: c }))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5"><MessageSquare className="size-4" />Auto-Reply Message</CardTitle>
              <CardDescription>Sent when customers message outside business hours.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={form.auto_reply_message ?? ""} onChange={(e) => setForm((f) => ({ ...f, auto_reply_message: e.target.value }))} placeholder="Thank you for contacting us! We will respond during business hours." rows={3} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-1.5"><Clock className="size-4" />Business Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {DAYS.map((day) => {
                const h = form.business_hours?.[day] ?? { open: "", close: "" };
                const isClosed = !h.open && !h.close;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium">{DAY_LABELS[day]}</span>
                    <Input type="time" value={h.open} onChange={(e) => updateHours(day, "open", e.target.value)} className="w-28 h-8 text-sm" />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input type="time" value={h.close} onChange={(e) => updateHours(day, "close", e.target.value)} className="w-28 h-8 text-sm" />
                    {isClosed && <Badge variant="secondary" className="text-[10px]">Closed</Badge>}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {editingId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-1.5"><Users className="size-4" />Branch Members</CardTitle>
                <CardDescription>Assign team members to this branch.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {membersLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border p-2">
                        <div>
                          <span className="text-sm font-medium">{m.full_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{m.email}</span>
                          <Badge variant="secondary" className="ml-2 text-[10px]">{m.role}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => removeMember(m.id)}>
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="Team member email" className="flex-1" />
                  <Button variant="outline" size="sm" onClick={addMember}>
                    <UserPlus className="size-4 mr-1" />Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin mr-1" />}
              {editingId ? "Update Branch" : "Create Branch"}
            </Button>
            {editingId && !branches.find((b) => b.id === editingId)?.is_default && (
              <Button variant="destructive" onClick={() => handleDelete(editingId)}>
                <Trash2 className="size-4 mr-1" />Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
