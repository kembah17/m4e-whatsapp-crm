'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { Contact, Tag, ContactTag } from '@/types';
import {
  findExistingContact,
  isExactMatch,
  isUniqueViolation,
  type ExistingContact,
} from '@/lib/contacts/dedupe';
import {
  getNigerianStates,
  getLGAsByState,
  PREFERRED_LANGUAGES,
  CONTACT_TYPES,
  REFERRAL_SOURCES,
} from '@/lib/contacts/nigerian-fields';
import type { NigerianState, NigerianLGA } from '@/types/business-growth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  contactTags?: ContactTag[];
  onSaved: () => void;
  /** Open an existing contact's detail view — used by the duplicate
   *  notice to jump to the contact that already owns this number. */
  onViewExisting?: (contactId: string) => void;
}

export function ContactForm({
  open,
  onOpenChange,
  contact,
  contactTags = [],
  onSaved,
  onViewExisting,
}: ContactFormProps) {
  const supabase = createClient();
  const { accountId } = useAuth();
  const isEdit = !!contact;

  // Core fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  // Location fields
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [nigerianStates, setNigerianStates] = useState<NigerianState[]>([]);
  const [lgas, setLgas] = useState<NigerianLGA[]>([]);
  const [loadingLgas, setLoadingLgas] = useState(false);

  // Personal fields
  const [birthday, setBirthday] = useState('');
  const [occupation, setOccupation] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');

  // Classification fields
  const [contactType, setContactType] = useState('');
  const [referralSource, setReferralSource] = useState('');

  // Section visibility
  const [showLocation, setShowLocation] = useState(false);
  const [showPersonal, setShowPersonal] = useState(false);
  const [showClassification, setShowClassification] = useState(false);

  // Duplicate-phone detection
  const [dupMatch, setDupMatch] = useState<
    { contact: ExistingContact; exact: boolean } | null
  >(null);
  const [checkingDup, setCheckingDup] = useState(false);

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  useEffect(() => {
    if (open) {
      // Core fields
      setName(contact?.name ?? '');
      setPhone(contact?.phone ?? '');
      setEmail(contact?.email ?? '');
      setCompany(contact?.company ?? '');

      // Location fields
      setState((contact as any)?.state ?? '');
      setLga((contact as any)?.lga ?? '');
      setCity((contact as any)?.city ?? '');
      setAddress((contact as any)?.address ?? '');

      // Personal fields
      setBirthday((contact as any)?.birthday ?? '');
      setOccupation((contact as any)?.occupation ?? '');
      setPreferredLanguage((contact as any)?.preferred_language ?? '');

      // Classification fields
      setContactType((contact as any)?.contact_type ?? '');
      setReferralSource((contact as any)?.referral_source ?? '');

      // Auto-expand sections if contact has data in them
      const hasLocation = !!((contact as any)?.state || (contact as any)?.lga || (contact as any)?.city || (contact as any)?.address);
      const hasPersonal = !!((contact as any)?.birthday || (contact as any)?.occupation || (contact as any)?.preferred_language);
      const hasClassification = !!((contact as any)?.contact_type || (contact as any)?.referral_source);
      setShowLocation(hasLocation);
      setShowPersonal(hasPersonal);
      setShowClassification(hasClassification);

      setSelectedTagIds(contactTags.map((ct) => ct.tag_id));
      setDupMatch(null);
      fetchTags();
      loadStates();
    }
  }, [open, contact]);

  // Load LGAs when state changes
  useEffect(() => {
    if (state) {
      const selectedState = nigerianStates.find(
        (s) => s.name === state || String(s.id) === state
      );
      if (selectedState) {
        setLoadingLgas(true);
        getLGAsByState(selectedState.id).then((data) => {
          setLgas(data);
          setLoadingLgas(false);
        });
      }
    } else {
      setLgas([]);
      setLga('');
    }
  }, [state, nigerianStates]);

  async function loadStates() {
    const states = await getNigerianStates();
    setNigerianStates(states);
  }

  async function checkDuplicate() {
    if (isEdit || !accountId) return;
    const value = phone.trim();
    if (!value) {
      setDupMatch(null);
      return;
    }
    setCheckingDup(true);
    try {
      const existing = await findExistingContact(supabase, accountId, value);
      setDupMatch(
        existing
          ? { contact: existing, exact: isExactMatch(existing, value) }
          : null,
      );
    } finally {
      setCheckingDup(false);
    }
  }

  async function fetchTags() {
    setLoadingTags(true);
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    if (data) setTags(data);
    setLoadingTags(false);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    if (!isEdit && dupMatch?.exact) {
      toast.error('A contact with this phone number already exists');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      if (!accountId) throw new Error('Your profile is not linked to an account.');

      let contactId = contact?.id;

      // Build the extended fields payload
      const extendedFields = {
        state: state.trim() || null,
        lga: lga.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        birthday: birthday || null,
        occupation: occupation.trim() || null,
        preferred_language: preferredLanguage || null,
        contact_type: contactType || null,
        referral_source: referralSource || null,
      };

      if (isEdit && contactId) {
        const { error } = await supabase
          .from('contacts')
          .update({
            name: name.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            company: company.trim() || null,
            ...extendedFields,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            user_id: user.id,
            account_id: accountId,
            name: name.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            company: company.trim() || null,
            ...extendedFields,
          })
          .select('id')
          .single();
        if (error) throw error;
        contactId = data.id;
      }

      // Sync tags
      if (contactId) {
        await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', contactId);

        if (selectedTagIds.length > 0) {
          const tagRows = selectedTagIds.map((tag_id) => ({
            contact_id: contactId!,
            tag_id,
          }));
          const { error: tagError } = await supabase
            .from('contact_tags')
            .insert(tagRows);
          if (tagError) throw tagError;
        }
      }

      toast.success(isEdit ? 'Contact updated' : 'Contact created');
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        toast.error('A contact with this phone number already exists');
        if (!isEdit && accountId) {
          const existing = await findExistingContact(
            supabase,
            accountId,
            phone.trim(),
          );
          if (existing) setDupMatch({ contact: existing, exact: true });
        }
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to save contact';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function SectionToggle({ label, open: isOpen, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-1"
      >
        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {label}
      </button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">
            {isEdit ? 'Edit Contact' : 'Add Contact'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? 'Update the contact details below.'
              : 'Fill in the details to create a new contact.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* === Core Fields === */}
          <div className="space-y-2">
            <Label htmlFor="cf-name" className="text-muted-foreground">
              Name
            </Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-phone" className="text-muted-foreground">
              Phone <span className="text-red-400">*</span>
            </Label>
            <Input
              id="cf-phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (dupMatch) setDupMatch(null);
              }}
              onBlur={checkDuplicate}
              placeholder="+1 234 567 8900"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
            {dupMatch ? (
              <div
                className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs ${
                  dupMatch.exact
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div className="space-y-1">
                  <p>
                    {dupMatch.exact
                      ? 'A contact with this phone number already exists.'
                      : 'A contact with a very similar number already exists.'}
                  </p>
                  {onViewExisting && (
                    <button
                      type="button"
                      onClick={() => onViewExisting(dupMatch.contact.id)}
                      className="font-medium underline underline-offset-2 hover:no-underline"
                    >
                      View {String(dupMatch.contact.name || dupMatch.contact.phone || dupMatch.contact.email || "contact")}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Include country code, e.g. +234 for Nigeria
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-email" className="text-muted-foreground">
              Email
            </Label>
            <Input
              id="cf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-company" className="text-muted-foreground">
              Company
            </Label>
            <Input
              id="cf-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* === Location Section (Collapsible) === */}
          <div className="border border-border/50 rounded-md px-3 py-2">
            <SectionToggle
              label="Location"
              open={showLocation}
              onToggle={() => setShowLocation(!showLocation)}
            />
            {showLocation && (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">State</Label>
                    <Select
                      value={state}
                      onValueChange={(v) => {
                        setState(v === '__none__' ? '' : (v ?? ''));
                        setLga('');
                      }}
                    >
                      <SelectTrigger className="bg-muted border-border text-foreground h-8 text-sm">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {nigerianStates.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">LGA</Label>
                    <Select
                      value={lga}
                      onValueChange={(v) => setLga(v === '__none__' ? '' : (v ?? ''))}
                      disabled={!state || loadingLgas}
                    >
                      <SelectTrigger className="bg-muted border-border text-foreground h-8 text-sm">
                        <SelectValue placeholder={loadingLgas ? 'Loading...' : 'Select LGA'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {lgas.map((l) => (
                          <SelectItem key={l.id} value={l.name}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">City</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Ikeja"
                    className="bg-muted border-border text-foreground h-8 text-sm placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street address"
                    className="bg-muted border-border text-foreground h-8 text-sm placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            )}
          </div>

          {/* === Personal Section (Collapsible) === */}
          <div className="border border-border/50 rounded-md px-3 py-2">
            <SectionToggle
              label="Personal"
              open={showPersonal}
              onToggle={() => setShowPersonal(!showPersonal)}
            />
            {showPersonal && (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Birthday</Label>
                    <Input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Preferred Language</Label>
                    <Select
                      value={preferredLanguage}
                      onValueChange={(v) => setPreferredLanguage(v === '__none__' ? '' : (v ?? ''))}
                    >
                      <SelectTrigger className="bg-muted border-border text-foreground h-8 text-sm">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {PREFERRED_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Occupation</Label>
                  <Input
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Business Owner"
                    className="bg-muted border-border text-foreground h-8 text-sm placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            )}
          </div>

          {/* === Classification Section (Collapsible) === */}
          <div className="border border-border/50 rounded-md px-3 py-2">
            <SectionToggle
              label="Classification"
              open={showClassification}
              onToggle={() => setShowClassification(!showClassification)}
            />
            {showClassification && (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Contact Type</Label>
                    <Select
                      value={contactType}
                      onValueChange={(v) => setContactType(v === '__none__' ? '' : (v ?? ''))}
                    >
                      <SelectTrigger className="bg-muted border-border text-foreground h-8 text-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {CONTACT_TYPES.map((ct) => (
                          <SelectItem key={ct.value} value={ct.value}>
                            {ct.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">Referral Source</Label>
                    <Select
                      value={referralSource}
                      onValueChange={(v) => setReferralSource(v === '__none__' ? '' : (v ?? ''))}
                    >
                      <SelectTrigger className="bg-muted border-border text-foreground h-8 text-sm">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {REFERRAL_SOURCES.map((src) => (
                          <SelectItem key={src} value={src}>
                            {src}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* === Tags === */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Tags</Label>
            {loadingTags ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-3 animate-spin" />
                Loading tags...
              </div>
            ) : tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No tags available. Create tags in Settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'ring-2 ring-primary ring-offset-1 ring-offset-border'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: tag.color + '20',
                        color: tag.color,
                        borderColor: tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="bg-popover border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || checkingDup || (!isEdit && !!dupMatch?.exact)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
