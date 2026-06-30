'use client';

import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Camera,
  FileSpreadsheet,
  FileText,
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Upload,
  Trash2,
  Pencil,
  Sparkles,
} from 'lucide-react';
import type { ExtractedContact } from '@/lib/import/ocr-processor';
import type { Tag } from '@/types';

// ── Types ───────────────────────────────────────────────────

type ImportSource = 'csv' | 'ocr' | 'text' | 'google';
type WizardStep = 1 | 2 | 3 | 4;

interface ReviewContact extends ExtractedContact {
  selected: boolean;
  isDuplicate: boolean;
  editing: boolean;
}

interface ImportResult {
  imported: number;
  duplicates: number;
  failed: number;
}

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

// ── Confidence Dot ──────────────────────────────────────────

function ConfidenceDot({ value }: { value: number }) {
  const color =
    value >= 0.8
      ? 'bg-emerald-500'
      : value >= 0.5
        ? 'bg-amber-500'
        : 'bg-red-500';
  const label =
    value >= 0.8 ? 'High' : value >= 0.5 ? 'Medium' : 'Low';
  return (
    <span className="inline-flex items-center gap-1.5" title={`Confidence: ${Math.round(value * 100)}%`}>
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

// ── Source Cards ────────────────────────────────────────────

const SOURCES: {
  id: ImportSource;
  label: string;
  description: string;
  icon: typeof FileSpreadsheet;
  disabled?: boolean;
}[] = [
  {
    id: 'csv',
    label: 'CSV / Excel',
    description: 'Upload a CSV or Excel file with contacts',
    icon: FileSpreadsheet,
  },
  {
    id: 'ocr',
    label: 'Photo / Camera',
    description: 'Snap a photo of a business card, list, or spreadsheet',
    icon: Camera,
  },
  {
    id: 'text',
    label: 'Paste Text',
    description: 'Paste contact data from any source',
    icon: FileText,
  },
  {
    id: 'google',
    label: 'Google Contacts',
    description: 'Import from Google — coming soon',
    icon: Globe,
    disabled: true,
  },
];

// ── Main Component ──────────────────────────────────────────

export function ImportWizard({ open, onOpenChange, onImported }: ImportWizardProps) {
  const { accountId } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState<WizardStep>(1);
  const [source, setSource] = useState<ImportSource | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Data state
  const [contacts, setContacts] = useState<ReviewContact[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [tagName, setTagName] = useState('');
  const [existingTags, setExistingTags] = useState<Tag[]>([]);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ── Reset ─────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep(1);
    setSource(null);
    setProcessing(false);
    setProcessingMessage('');
    setContacts([]);
    setWarnings([]);
    setPastedText('');
    setTagName('');
    setImporting(false);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  // ── Fetch existing tags ───────────────────────────────────

  const loadTags = useCallback(async () => {
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setExistingTags(data);
  }, [supabase]);

  // ── Check duplicates against existing contacts ────────────

  const checkDuplicates = useCallback(
    async (extracted: ExtractedContact[]): Promise<ReviewContact[]> => {
      // Fetch all existing phone numbers for this account
      const { data: existing } = await supabase
        .from('contacts')
        .select('phone, phone_normalized')
        .not('phone', 'is', null);

      const existingPhones = new Set(
        (existing || []).map((c) =>
          (c.phone_normalized || c.phone || '').replace(/\D/g, ''),
        ),
      );

      return extracted.map((c) => {
        const normalized = c.phone.replace(/\D/g, '');
        const isDuplicate = normalized.length > 0 && existingPhones.has(normalized);
        return {
          ...c,
          selected: !isDuplicate,
          isDuplicate,
          editing: false,
        };
      });
    },
    [supabase],
  );

  // ── Process CSV ───────────────────────────────────────────

  const processCSV = useCallback(
    async (content: string) => {
      setProcessing(true);
      setProcessingMessage('Parsing CSV data…');
      setStep(2);

      try {
        const res = await fetch('/api/contacts/import/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) throw new Error('Failed to parse CSV');

        const data = await res.json();
        const reviewed = await checkDuplicates(data.contacts || []);
        setContacts(reviewed);
        setWarnings(data.warnings || []);
        await loadTags();
        setStep(3);
      } catch (err) {
        toast.error('Failed to parse CSV', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
        setStep(1);
      } finally {
        setProcessing(false);
      }
    },
    [checkDuplicates, loadTags],
  );

  // ── Process Image (OCR) ───────────────────────────────────

  const processImage = useCallback(
    async (file: File) => {
      setProcessing(true);
      setProcessingMessage('Analysing image with AI…');
      setStep(2);

      try {
        // Convert to base64
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            '',
          ),
        );

        const res = await fetch('/api/contacts/import/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type,
          }),
        });

        if (!res.ok) throw new Error('OCR processing failed');

        const data = await res.json();
        const reviewed = await checkDuplicates(data.contacts || []);
        setContacts(reviewed);
        setWarnings(data.warnings || []);
        await loadTags();
        setStep(3);
      } catch (err) {
        toast.error('OCR processing failed', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
        setStep(1);
      } finally {
        setProcessing(false);
      }
    },
    [checkDuplicates, loadTags],
  );

  // ── Process Text ──────────────────────────────────────────

  const processText = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        toast.error('Please paste some text first');
        return;
      }
      setProcessing(true);
      setProcessingMessage('Extracting contacts from text…');
      setStep(2);

      try {
        const res = await fetch('/api/contacts/import/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text }),
        });

        if (!res.ok) throw new Error('Text parsing failed');

        const data = await res.json();
        const reviewed = await checkDuplicates(data.contacts || []);
        setContacts(reviewed);
        setWarnings(data.warnings || []);
        await loadTags();
        setStep(3);
      } catch (err) {
        toast.error('Text parsing failed', {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
        setStep(1);
      } finally {
        setProcessing(false);
      }
    },
    [checkDuplicates, loadTags],
  );

  // ── Bulk Import ───────────────────────────────────────────

  const runImport = useCallback(async () => {
    const selected = contacts.filter((c) => c.selected && !c.isDuplicate);
    if (selected.length === 0) {
      toast.error('No contacts selected for import');
      return;
    }

    setImporting(true);
    setStep(4);
    setImportProgress(10);

    try {
      const payload = selected.map((c) => ({
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        notes: c.notes,
      }));

      setImportProgress(30);

      const res = await fetch('/api/contacts/import/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: payload, tagName: tagName.trim() || undefined }),
      });

      setImportProgress(80);

      if (!res.ok) throw new Error('Bulk import failed');

      const result: ImportResult = await res.json();
      setImportResult(result);
      setImportProgress(100);

      toast.success(`Imported ${result.imported} contacts`, {
        description: result.duplicates > 0
          ? `${result.duplicates} duplicates skipped`
          : undefined,
      });

      onImported();
    } catch (err) {
      toast.error('Import failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      setImportProgress(0);
    } finally {
      setImporting(false);
    }
  }, [contacts, tagName, onImported]);

  // ── File handlers ─────────────────────────────────────────

  const handleCSVFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          processCSV(reader.result);
        }
      };
      reader.readAsText(file);
    },
    [processCSV],
  );

  const handleImageFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      processImage(file);
    },
    [processImage],
  );

  // ── Contact editing helpers ───────────────────────────────

  const toggleSelect = (idx: number) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)),
    );
  };

  const toggleEdit = (idx: number) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, editing: !c.editing } : c)),
    );
  };

  const updateField = (idx: number, field: keyof ExtractedContact, value: string) => {
    setContacts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  };

  const removeContact = (idx: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== idx));
  };

  const selectAll = () => {
    setContacts((prev) => prev.map((c) => ({ ...c, selected: !c.isDuplicate })));
  };

  const deselectAll = () => {
    setContacts((prev) => prev.map((c) => ({ ...c, selected: false })));
  };

  // ── Counts ────────────────────────────────────────────────

  const selectedCount = contacts.filter((c) => c.selected && !c.isDuplicate).length;
  const duplicateCount = contacts.filter((c) => c.isDuplicate).length;
  const totalCount = contacts.length;

  // ── Step Labels ───────────────────────────────────────────

  const stepLabels = ['Choose Source', 'Processing', 'Review & Edit', 'Import'];

  // ── Render ────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Smart Import
          </DialogTitle>
          <DialogDescription>
            Import contacts from photos, spreadsheets, or text — powered by AI.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  step > i + 1
                    ? 'bg-emerald-500/20 text-emerald-500'
                    : step === i + 1
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > i + 1 ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={`hidden text-xs sm:inline ${
                  step === i + 1 ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {i < 3 && (
                <div className="h-px w-4 bg-border sm:w-8" />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1: Choose Source ─────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Source selection */}
            {!source && (
              <div className="grid grid-cols-2 gap-3">
                {SOURCES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={s.disabled}
                    onClick={() => setSource(s.id)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors ${
                      s.disabled
                        ? 'cursor-not-allowed border-border/50 opacity-50'
                        : 'border-border hover:border-amber-500/50 hover:bg-amber-500/5'
                    }`}
                  >
                    <s.icon className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{s.label}</span>
                    <span className="text-xs text-muted-foreground">{s.description}</span>
                    {s.disabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        Coming Soon
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* CSV upload */}
            {source === 'csv' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSource(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <div
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-8 hover:border-amber-500/50 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-foreground">Click to upload CSV file</p>
                  <p className="text-xs text-muted-foreground">
                    Supports .csv, .tsv, and .txt files
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={handleCSVFile}
                />
              </div>
            )}

            {/* OCR / Photo upload */}
            {source === 'ocr' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSource(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <div
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-8 hover:border-amber-500/50 cursor-pointer"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Camera className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-foreground">Upload or take a photo</p>
                  <p className="text-xs text-muted-foreground">
                    Business cards, handwritten lists, printed spreadsheets
                  </p>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageFile}
                />
              </div>
            )}

            {/* Text paste */}
            {source === 'text' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSource(null)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Paste contacts here…\n\nExamples:\nJohn Doe, 08012345678, john@email.com\nJane Smith\t09087654321\tjane@email.com\n\nOr just a list of phone numbers:\n08012345678\n09087654321`}
                  className="h-40 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                />
                <Button
                  onClick={() => processText(pastedText)}
                  disabled={!pastedText.trim()}
                  className="w-full"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Extract Contacts
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Processing ────────────────────────────── */}
        {step === 2 && processing && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            <p className="text-sm text-foreground">{processingMessage}</p>
            <p className="text-xs text-muted-foreground">
              This may take a few seconds…
            </p>
          </div>
        )}

        {/* ── Step 3: Review & Edit ────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                {warnings.map((w, i) => (
                  <p key={i} className="flex items-start gap-2 text-xs text-amber-500">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {w}
                  </p>
                ))}
              </div>
            )}

            {/* Summary bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{totalCount} found</Badge>
              <Badge variant="secondary" className="text-emerald-500">
                {selectedCount} selected
              </Badge>
              {duplicateCount > 0 && (
                <Badge variant="secondary" className="text-amber-500">
                  {duplicateCount} duplicates
                </Badge>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Deselect all
                </Button>
              </div>
            </div>

            {/* Contacts table */}
            <div className="max-h-64 overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-20">Confidence</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c, idx) => (
                    <TableRow
                      key={idx}
                      className={c.isDuplicate ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={c.selected}
                          disabled={c.isDuplicate}
                          onChange={() => toggleSelect(idx)}
                          className="h-4 w-4 rounded border-border"
                        />
                      </TableCell>
                      <TableCell>
                        {c.editing ? (
                          <Input
                            value={c.name}
                            onChange={(e) => updateField(idx, 'name', e.target.value)}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="text-sm">{c.name || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.editing ? (
                          <Input
                            value={c.phone}
                            onChange={(e) => updateField(idx, 'phone', e.target.value)}
                            className="h-7 font-mono text-xs"
                          />
                        ) : (
                          <span className="font-mono text-xs">
                            {c.phone || '—'}
                            {c.isDuplicate && (
                              <Badge variant="secondary" className="ml-1 text-[10px] text-amber-500">
                                Duplicate
                              </Badge>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.editing ? (
                          <Input
                            value={c.email}
                            onChange={(e) => updateField(idx, 'email', e.target.value)}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="text-xs">{c.email || '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ConfidenceDot value={c.confidence} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => toggleEdit(idx)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeContact(idx)}
                            className="rounded p-1 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {contacts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No contacts extracted. Try a different source.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Tag input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                Tag imported contacts (optional)
              </label>
              <Input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="e.g. trade-show-2026, referral-list"
                className="h-8 text-sm"
              />
              {existingTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {existingTags.slice(0, 10).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTagName(t.name)}
                      className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-amber-500/50 hover:text-foreground"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Import ────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4 py-4">
            {!importResult ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <p className="text-sm text-foreground">Importing contacts…</p>
                <Progress value={importProgress} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {importProgress}% complete
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
                <p className="text-lg font-medium text-foreground">Import Complete</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-emerald-500">
                      {importResult.imported}
                    </p>
                    <p className="text-xs text-muted-foreground">Imported</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-500">
                      {importResult.duplicates}
                    </p>
                    <p className="text-xs text-muted-foreground">Duplicates</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-500">
                      {importResult.failed}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────── */}
        <DialogFooter>
          {step === 3 && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setSource(null);
                  setContacts([]);
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={runImport}
                disabled={selectedCount === 0 || importing}
              >
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Import {selectedCount} Contact{selectedCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}
          {step === 4 && importResult && (
            <Button onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
