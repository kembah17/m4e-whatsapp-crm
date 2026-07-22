'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import type { Contact, Tag, ContactTag, ContactNote, CustomField, ContactCustomValue, Deal, PurchaseHistory, Product, Branch } from '@/types';
import type { ContactExtensions } from '@/types/business-growth';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  Mail,
  Building2,
  Copy,
  Check,
  Loader2,
  Plus,
  Trash2,
  Save,
  X,
  DollarSign,
  ShoppingBag,
  Calendar,
  MessageCircle,
  GitBranch,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getTrustScoreColor, getTrustScoreBgColor, getTrustScoreLabel } from '@/lib/contacts/trust-score';
import { Shield, Wallet, Star } from 'lucide-react';

interface ContactDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onUpdated: () => void;
}

export function ContactDetailView({
  open,
  onOpenChange,
  contactId,
  onUpdated,
}: ContactDetailViewProps) {
  const supabase = createClient();
  const { accountId, defaultCurrency } = useAuth();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Details tab
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editPrimaryChannel, setEditPrimaryChannel] = useState<string>('whatsapp');
  const [editBranchId, setEditBranchId] = useState<string>('__none__');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [savingDetails, setSavingDetails] = useState(false);

  // Tags tab
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [contactTagIds, setContactTagIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  // Notes tab
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Custom fields tab
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [savingCustom, setSavingCustom] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(false);

  // Deals tab
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  // Purchases tab
  const [purchases, setPurchases] = useState<PurchaseHistory[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [showRecordPurchase, setShowRecordPurchase] = useState(false);
  const [purchaseProductId, setPurchaseProductId] = useState('');
  const [purchaseProductName, setPurchaseProductName] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('1');
  const [purchaseChannel, setPurchaseChannel] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [savingPurchase, setSavingPurchase] = useState(false);

  const fetchContact = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);

    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (data) {
      setContact(data);
      setEditName(data.name ?? '');
      setEditPhone(data.phone ?? '');
      setEditEmail(data.email ?? '');
      setEditCompany(data.company ?? '');
      setEditPrimaryChannel(data.primary_channel ?? 'whatsapp');
      setEditBranchId(data.branch_id ?? '__none__');
    }
    setLoading(false);
  }, [contactId, supabase]);

  const fetchBranches = useCallback(async () => {
    if (!accountId) return;
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .order('name');
    if (data) setBranches(data);
  }, [accountId, supabase]);

  const fetchTags = useCallback(async () => {
    if (!contactId) return;

    const [tagsRes, contactTagsRes] = await Promise.all([
      supabase.from('tags').select('*').order('name'),
      supabase.from('contact_tags').select('tag_id').eq('contact_id', contactId),
    ]);

    if (tagsRes.data) setAllTags(tagsRes.data);
    if (contactTagsRes.data) {
      setContactTagIds(contactTagsRes.data.map((ct) => ct.tag_id));
    }
  }, [contactId, supabase]);

  const fetchNotes = useCallback(async () => {
    if (!contactId) return;
    setLoadingNotes(true);

    const { data } = await supabase
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (data) setNotes(data);
    setLoadingNotes(false);
  }, [contactId, supabase]);

  const fetchCustomFields = useCallback(async () => {
    if (!contactId) return;
    setLoadingCustom(true);

    const [fieldsRes, valuesRes] = await Promise.all([
      supabase.from('custom_fields').select('*').order('field_name'),
      supabase
        .from('contact_custom_values')
        .select('*')
        .eq('contact_id', contactId),
    ]);

    if (fieldsRes.data) setCustomFields(fieldsRes.data);
    if (valuesRes.data) {
      const map: Record<string, string> = {};
      valuesRes.data.forEach((v) => {
        map[v.custom_field_id] = v.value ?? '';
      });
      setCustomValues(map);
    }
    setLoadingCustom(false);
  }, [contactId, supabase]);

  const fetchDeals = useCallback(async () => {
    if (!contactId) return;
    setLoadingDeals(true);
    const { data } = await supabase
      .from('deals')
      .select('*, stage:pipeline_stages(*)')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    setDeals((data ?? []) as Deal[]);
    setLoadingDeals(false);
  }, [contactId, supabase]);

  const fetchPurchases = useCallback(async () => {
    if (!contactId) return;
    setLoadingPurchases(true);
    try {
      const res = await fetch(`/api/purchases?contact_id=${contactId}`);
      if (res.ok) {
        const json = await res.json();
        setPurchases(json.purchases ?? []);
      }
    } catch {
      // silently fail
    }
    setLoadingPurchases(false);
  }, [contactId]);

  const fetchProductsList = useCallback(async () => {
    try {
      const res = await fetch('/api/products?status=active');
      if (res.ok) {
        const json = await res.json();
        setProductsList(json.products ?? []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (open && contactId) {
      fetchContact();
      fetchTags();
      fetchNotes();
      fetchCustomFields();
      fetchDeals();
      fetchPurchases();
      fetchBranches();
      fetchProductsList();
    }
  }, [open, contactId, fetchContact, fetchTags, fetchNotes, fetchCustomFields, fetchDeals, fetchPurchases, fetchProductsList, fetchBranches]);

  async function recordPurchase() {
    if (!contactId) return;
    const prodName = purchaseProductName.trim() || productsList.find((p) => p.id === purchaseProductId)?.name || '';
    if (!prodName) {
      toast.error('Product name is required');
      return;
    }
    if (!purchaseAmount || isNaN(parseFloat(purchaseAmount))) {
      toast.error('Valid amount is required');
      return;
    }
    if (!purchaseDate) {
      toast.error('Purchase date is required');
      return;
    }
    setSavingPurchase(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          product_id: purchaseProductId || null,
          product_name: prodName,
          amount: parseFloat(purchaseAmount),
          purchase_date: purchaseDate,
          quantity: parseInt(purchaseQuantity) || 1,
          channel: purchaseChannel.trim() || null,
          notes: purchaseNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to record purchase');
      toast.success('Purchase recorded');
      setShowRecordPurchase(false);
      setPurchaseProductId('');
      setPurchaseProductName('');
      setPurchaseAmount('');
      setPurchaseDate('');
      setPurchaseQuantity('1');
      setPurchaseChannel('');
      setPurchaseNotes('');
      fetchPurchases();
    } catch {
      toast.error('Failed to record purchase');
    }
    setSavingPurchase(false);
  }

  async function copyPhone() {
    if (!contact || !contact.phone) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  async function saveDetails() {
    if (!contactId || (!editPhone.trim() && !editEmail.trim())) {
      toast.error('Phone or email is required');
      return;
    }

    setSavingDetails(true);
    const { error } = await supabase
      .from('contacts')
      .update({
        name: editName.trim() || null,
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        company: editCompany.trim() || null,
        primary_channel: editPrimaryChannel,
        branch_id: editBranchId === '__none__' ? null : editBranchId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);

    if (error) {
      toast.error('Failed to update contact');
    } else {
      toast.success('Contact updated');
      fetchContact();
      onUpdated();
    }
    setSavingDetails(false);
  }

  async function toggleTag(tagId: string) {
    if (!contactId) return;
    setSavingTags(true);

    const isSelected = contactTagIds.includes(tagId);

    if (isSelected) {
      const { error } = await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId)
        .eq('tag_id', tagId);
      if (!error) {
        setContactTagIds((prev) => prev.filter((id) => id !== tagId));
        onUpdated();
      }
    } else {
      const { error } = await supabase
        .from('contact_tags')
        .insert({ contact_id: contactId, tag_id: tagId });
      if (!error) {
        setContactTagIds((prev) => [...prev, tagId]);
        onUpdated();
      }
    }
    setSavingTags(false);
  }

  async function addNote() {
    if (!contactId || !newNote.trim()) return;
    setSavingNote(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !accountId) {
      toast.error('Not authenticated');
      setSavingNote(false);
      return;
    }

    const { error } = await supabase.from('contact_notes').insert({
      contact_id: contactId,
      account_id: accountId,
      user_id: user.id,
      note_text: newNote.trim(),
    });

    if (error) {
      toast.error('Failed to add note');
    } else {
      setNewNote('');
      fetchNotes();
      toast.success('Note added');
    }
    setSavingNote(false);
  }

  async function deleteNote(noteId: string) {
    const { error } = await supabase
      .from('contact_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast.error('Failed to delete note');
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success('Note deleted');
    }
  }

  async function saveCustomFields() {
    if (!contactId) return;
    setSavingCustom(true);

    try {
      // Delete existing values and re-insert
      await supabase
        .from('contact_custom_values')
        .delete()
        .eq('contact_id', contactId);

      const rows = Object.entries(customValues)
        .filter(([, val]) => val.trim())
        .map(([fieldId, val]) => ({
          contact_id: contactId,
          custom_field_id: fieldId,
          value: val.trim(),
        }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from('contact_custom_values')
          .insert(rows);
        if (error) throw error;
      }

      toast.success('Custom fields saved');
    } catch {
      toast.error('Failed to save custom fields');
    }
    setSavingCustom(false);
  }

  function getInitials(name?: string | null) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-popover border-border text-popover-foreground sm:max-w-lg w-full p-0"
      >
        {loading || !contact ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <Avatar className="size-12 bg-muted border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-popover-foreground truncate">
                    {contact.name || 'Unknown'}
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground text-xs mt-0.5">
                    Contact details
                  </SheetDescription>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {/* Primary channel badge */}
                    {contact.primary_channel === 'whatsapp' && (
                      <Badge variant="outline" className="gap-1 text-[10px] border-green-500/30 text-green-400 px-1.5 py-0">
                        <MessageCircle className="size-2.5" /> WhatsApp
                      </Badge>
                    )}
                    {contact.primary_channel === 'email' && (
                      <Badge variant="outline" className="gap-1 text-[10px] border-blue-500/30 text-blue-400 px-1.5 py-0">
                        <Mail className="size-2.5" /> Email
                      </Badge>
                    )}
                    {contact.primary_channel === 'sms' && (
                      <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/30 text-amber-400 px-1.5 py-0">
                        <Phone className="size-2.5" /> SMS
                      </Badge>
                    )}
                    {/* Data completeness */}
                    {typeof contact.data_completeness_score === 'number' && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Progress value={contact.data_completeness_score} className="h-1.5 w-12" />
                        {contact.data_completeness_score}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {contact.phone && (
                      <button
                        onClick={copyPhone}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                      >
                        <Phone className="size-3" />
                        {contact.phone}
                        {copiedPhone ? (
                          <Check className="size-3 text-primary" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    )}
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        {contact.company}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Business Growth Badges */}
            {(() => {
              const ext = contact as Contact & Partial<ContactExtensions>;
              const { trust_score, outstanding_balance, loyalty_points, loyalty_tier } = ext;
              const hasBadges = trust_score != null || (outstanding_balance != null && outstanding_balance > 0) || (loyalty_points != null && loyalty_points > 0);
              if (!hasBadges) return null;
            
              const tierColor: Record<string, string> = {
                platinum: 'border-slate-300/50 text-slate-300',
                gold: 'border-amber-400/50 text-amber-400',
                silver: 'border-slate-400/50 text-slate-400',
                bronze: 'border-orange-400/50 text-orange-400',
              };
            
              return (
                <div className="px-4 py-2 border-b border-border/50 flex flex-wrap items-center gap-2">
                  {trust_score != null && (
                    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getTrustScoreBgColor(trust_score)}`}>
                      <Shield className={`size-3 ${getTrustScoreColor(trust_score)}`} />
                      <span className={getTrustScoreColor(trust_score)}>Trust: {trust_score}/100</span>
                      <span className="text-muted-foreground">({getTrustScoreLabel(trust_score)})</span>
                    </div>
                  )}
                  {outstanding_balance != null && outstanding_balance > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium">
                      <Wallet className="size-3 text-red-400" />
                      <span className="text-red-400">Owes: {formatCurrency(outstanding_balance, defaultCurrency)}</span>
                    </div>
                  )}
                  {loyalty_points != null && loyalty_points > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium">
                      <Star className="size-3 text-amber-400" />
                      <span className="text-amber-400">{loyalty_points.toLocaleString()} pts</span>
                      {loyalty_tier && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${tierColor[loyalty_tier] || tierColor.bronze}`}
                        >
                          {loyalty_tier.charAt(0).toUpperCase() + loyalty_tier.slice(1)}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tabs */}
            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
              <TabsList className="bg-muted/50 border-b border-border mx-4 mt-3">
                <TabsTrigger
                  value="details"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="tags"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground"
                >
                  Tags
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground"
                >
                  Notes
                </TabsTrigger>
                <TabsTrigger
                  value="custom"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground"
                >
                  Custom Fields
                </TabsTrigger>
                <TabsTrigger
                  value="deals"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground"
                >
                  Deals
                </TabsTrigger>
                <TabsTrigger
                  value="purchases"
                  className="data-active:bg-slate-800 data-active:text-primary text-slate-400"
                >
                  Purchases
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Name</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      Phone <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Email</Label>
                    <Input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Company</Label>
                    <Input
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Primary Channel</Label>
                    <Select value={editPrimaryChannel} onValueChange={(v) => v && setEditPrimaryChannel(v)}>
                      <SelectTrigger className="bg-muted border-border text-foreground h-8 text-sm">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">
                          <span className="flex items-center gap-1.5">
                            <MessageCircle className="size-3 text-green-400" /> WhatsApp
                          </span>
                        </SelectItem>
                        <SelectItem value="email">
                          <span className="flex items-center gap-1.5">
                            <Mail className="size-3 text-blue-400" /> Email
                          </span>
                        </SelectItem>
                        <SelectItem value="sms">
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3 text-amber-400" /> SMS
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs flex items-center gap-1">
                      <GitBranch className="size-3" /> Branch
                    </Label>
                    <Select value={editBranchId} onValueChange={(v) => setEditBranchId(v ?? "__none__")}>
                      <SelectTrigger className="bg-muted border-border text-foreground h-8 text-sm">
                        <SelectValue placeholder="No branch assigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No branch</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Data completeness score */}
                  {typeof contact?.data_completeness_score === 'number' && (
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">Profile Completeness</Label>
                      <div className="flex items-center gap-2">
                        <Progress value={contact.data_completeness_score} className="h-2 flex-1" />
                        <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                          {contact.data_completeness_score}%
                        </span>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={saveDetails}
                    disabled={savingDetails}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                    size="sm"
                  >
                    {savingDetails ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </TabsContent>

              {/* Tags Tab */}
              <TabsContent value="tags" className="flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Click a tag to add or remove it from this contact.
                  </p>
                  {allTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tags available. Create tags in Settings.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => {
                        const selected = contactTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            disabled={savingTags}
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                              selected
                                ? 'ring-2 ring-primary ring-offset-1 ring-offset-border'
                                : 'opacity-50 hover:opacity-80'
                            }`}
                            style={{
                              backgroundColor: tag.color + '20',
                              color: tag.color,
                            }}
                          >
                            {selected && <Check className="size-3 mr-1" />}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="flex-1 flex flex-col min-h-0 px-4 py-3">
                <div className="space-y-2 mb-3">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a note..."
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[60px] text-sm resize-none"
                  />
                  <Button
                    onClick={addNote}
                    disabled={!newNote.trim() || savingNote}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="sm"
                  >
                    {savingNote ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Add Note
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                  {loadingNotes ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No notes yet.
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg bg-muted/50 border border-border/50 p-3 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap flex-1">
                            {note.note_text}
                          </p>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all cursor-pointer shrink-0"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {new Date(note.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Custom Fields Tab */}
              <TabsContent value="custom" className="flex-1 overflow-y-auto px-4 py-3">
                {loadingCustom ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : customFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No custom fields defined. Create them in Settings.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs capitalize">
                          {field.field_name}
                        </Label>
                        <Input
                          value={customValues[field.id] ?? ''}
                          onChange={(e) =>
                            setCustomValues((prev) => ({
                              ...prev,
                              [field.id]: e.target.value,
                            }))
                          }
                          placeholder={`Enter ${field.field_name}...`}
                          className="bg-muted border-border text-foreground h-8 text-sm placeholder:text-muted-foreground"
                        />
                      </div>
                    ))}
                    <Button
                      onClick={saveCustomFields}
                      disabled={savingCustom}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                      size="sm"
                    >
                      {savingCustom ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                      Save Custom Fields
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Deals Tab */}
              <TabsContent value="deals" className="flex-1 overflow-y-auto px-4 py-3">
                {loadingDeals ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                ) : deals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No deals yet</p>
                ) : (
                  <div className="space-y-2">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="rounded-lg border border-border bg-muted/50 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {deal.title}
                          </p>
                          {deal.stage && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${deal.stage.color}20`,
                                color: deal.stage.color,
                              }}
                            >
                              {deal.stage.name}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DollarSign className="size-3" />
                            {formatCurrency(
                              deal.value ?? 0,
                              deal.currency || defaultCurrency,
                            )}
                          </span>
                          {deal.status && deal.status !== 'open' && (
                            <span
                              className={
                                deal.status === 'won'
                                  ? 'text-primary'
                                  : 'text-red-400'
                              }
                            >
                              {deal.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Purchases Tab */}
              <TabsContent value="purchases" className="flex-1 overflow-y-auto px-4 py-3">
                {/* Purchase Summary */}
                {!loadingPurchases && purchases.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-2.5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Purchases</p>
                      <p className="text-sm font-semibold text-white">{purchases.length}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-2.5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Spent</p>
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(
                          purchases.reduce((sum, p) => sum + (p.amount * p.quantity), 0),
                          defaultCurrency,
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-2.5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Last Purchase</p>
                      <p className="text-sm font-semibold text-white">
                        {new Date(purchases[0].purchase_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-2.5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Top Product</p>
                      <p className="text-sm font-semibold text-white truncate">
                        {(() => {
                          const counts: Record<string, number> = {};
                          purchases.forEach((p) => {
                            counts[p.product_name] = (counts[p.product_name] || 0) + p.quantity;
                          });
                          return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Record Purchase Button */}
                <Button
                  onClick={() => setShowRecordPurchase(true)}
                  size="sm"
                  className="w-full mb-3"
                >
                  <Plus className="size-3.5 mr-1" /> Record Purchase
                </Button>

                {/* Purchases List */}
                {loadingPurchases ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                ) : purchases.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="size-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No purchases recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white">
                            {purchase.product_name}
                          </p>
                          <span className="text-sm font-medium text-primary">
                            {formatCurrency(purchase.amount, defaultCurrency)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {new Date(purchase.purchase_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {purchase.quantity > 1 && (
                            <span>Qty: {purchase.quantity}</span>
                          )}
                          {purchase.channel && (
                            <span className="capitalize">{purchase.channel}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>


      {/* Record Purchase Dialog */}
      <Dialog open={showRecordPurchase} onOpenChange={setShowRecordPurchase}>
        <DialogContent className="bg-slate-900 border-slate-800 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Record Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Product Select or Type */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Product</Label>
              {productsList.length > 0 ? (
                <Select
                  value={purchaseProductId}
                  onValueChange={(v) => {
                    setPurchaseProductId(v ?? '');
                    const prod = productsList.find((p) => p.id === v);
                    if (prod) {
                      setPurchaseProductName(prod.name);
                      if (!purchaseAmount) setPurchaseAmount(String(prod.price));
                    }
                  }}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productsList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.price, defaultCurrency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                value={purchaseProductName}
                onChange={(e) => setPurchaseProductName(e.target.value)}
                placeholder="Or type product name..."
                className="bg-slate-800 border-slate-700 text-white h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Amount *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-slate-800 border-slate-700 text-white h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Date *</Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(e.target.value)}
                  placeholder="1"
                  className="bg-slate-800 border-slate-700 text-white h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Channel</Label>
                <Input
                  value={purchaseChannel}
                  onChange={(e) => setPurchaseChannel(e.target.value)}
                  placeholder="e.g. WhatsApp, Walk-in"
                  className="bg-slate-800 border-slate-700 text-white h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Notes</Label>
              <Input
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                placeholder="Optional notes..."
                className="bg-slate-800 border-slate-700 text-white h-8 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecordPurchase(false)}
              disabled={savingPurchase}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={recordPurchase}
              disabled={savingPurchase}
            >
              {savingPurchase ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <Plus className="size-3.5 mr-1" />
              )}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
