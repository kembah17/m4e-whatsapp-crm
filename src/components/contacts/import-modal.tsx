'use client';

import { useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  dedupeByPhone,
  isUniqueViolation,
  normalizeKey,
} from '@/lib/contacts/dedupe';
import {
  parseContactCsv,
  type ParsedContactRow,
  type ChannelBreakdown,
} from '@/lib/contacts/parse-contact-csv';
import {
  assignImportedContactTags,
  resolveImportTagIds,
  type ContactTagAssignment,
} from '@/lib/contacts/resolve-import-tags';
import { cn } from '@/lib/utils';
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
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Tag,
  MessageCircle,
  Mail,
  Phone,
} from 'lucide-react';

const DEFAULT_TAG_COLOR = '#3b82f6';
const PREVIEW_LIMIT = 5;

function truncateFilename(name: string, max = 48): string {
  if (name.length <= max) return name;
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const base = name.slice(0, name.length - ext.length);
  const keep = max - ext.length - 1;
  return `${base.slice(0, Math.max(keep, 12))}…${ext}`;
}

function PreviewCell({
  value,
  mono,
  maxWidth = 'max-w-[9rem]',
}: {
  value: string;
  mono?: boolean;
  maxWidth?: string;
}) {
  return (
    <span
      className={cn(
        'block truncate',
        maxWidth,
        mono && 'font-mono text-[11px]'
      )}
      title={value}
    >
      {value}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  switch (channel) {
    case 'whatsapp':
      return (
        <Badge variant="outline" className="gap-1 text-[10px] border-green-500/30 text-green-400">
          <MessageCircle className="size-2.5" /> WhatsApp
        </Badge>
      );
    case 'email':
      return (
        <Badge variant="outline" className="gap-1 text-[10px] border-blue-500/30 text-blue-400">
          <Mail className="size-2.5" /> Email
        </Badge>
      );
    case 'sms':
      return (
        <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/30 text-amber-400">
          <Phone className="size-2.5" /> SMS
        </Badge>
      );
    default:
      return null;
  }
}

function ImportPreviewTags({
  tagNames,
  tagColorByKey,
}: {
  tagNames: string[];
  tagColorByKey: Map<string, string>;
}) {
  if (tagNames.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex min-w-[4.5rem] flex-wrap gap-1">
      {tagNames.map((name) => {
        const color =
          tagColorByKey.get(name.trim().toLowerCase()) ?? DEFAULT_TAG_COLOR;
        const isKnown = tagColorByKey.has(name.trim().toLowerCase());
        return (
          <span
            key={name}
            className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] leading-none font-medium"
            style={{
              backgroundColor: `${color}18`,
              color,
              border: `1px solid ${color}${isKnown ? '55' : '30'}`,
            }}
            title={isKnown ? name : `${name} (will be created on import)`}
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="truncate">{name}</span>
          </span>
        );
      })}
    </div>
  );
}

function ChannelBreakdownBar({ breakdown }: { breakdown: ChannelBreakdown }) {
  const total = breakdown.whatsapp + breakdown.email + breakdown.skipped;
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      {breakdown.whatsapp > 0 && (
        <span className="inline-flex items-center gap-1 text-green-400">
          <MessageCircle className="size-3" />
          {breakdown.whatsapp} WhatsApp
        </span>
      )}
      {breakdown.email > 0 && (
        <span className="inline-flex items-center gap-1 text-blue-400">
          <Mail className="size-3" />
          {breakdown.email} Email-only
        </span>
      )}
      {breakdown.skipped > 0 && (
        <span className="inline-flex items-center gap-1 text-amber-400">
          <AlertTriangle className="size-3" />
          {breakdown.skipped} skipped (no identifier)
        </span>
      )}
    </div>
  );
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportModal({
  open,
  onOpenChange,
  onImported,
}: ImportModalProps) {
  const supabase = createClient();
  const { accountId, canEditSettings } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedContactRow[]>([]);
  const [hasTagsColumn, setHasTagsColumn] = useState(false);
  const [hasCompanyColumn, setHasCompanyColumn] = useState(false);
  const [hasBranchColumn, setHasBranchColumn] = useState(false);
  const [channelBreakdown, setChannelBreakdown] = useState<ChannelBreakdown>({
    whatsapp: 0,
    email: 0,
    skipped: 0,
  });
  const [tagColorByKey, setTagColorByKey] = useState<Map<string, string>>(
    new Map()
  );
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    failed: number;
    tagsAssigned: number;
  } | null>(null);

  function reset() {
    setFile(null);
    setParsedRows([]);
    setHasTagsColumn(false);
    setHasCompanyColumn(false);
    setHasBranchColumn(false);
    setChannelBreakdown({ whatsapp: 0, email: 0, skipped: 0 });
    setTagColorByKey(new Map());
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setResult(null);

    const text = await selected.text();
    const {
      rows,
      hasTagsColumn: csvHasTags,
      hasCompanyColumn: csvHasCompany,
      hasBranchColumn: csvHasBranch,
      channelBreakdown: breakdown,
    } = parseContactCsv(text);

    if (rows.length === 0) {
      toast.error(
        'No valid rows found. Ensure CSV has a "phone" and/or "email" column header.'
      );
      setParsedRows([]);
      setHasTagsColumn(false);
      setHasCompanyColumn(false);
      setHasBranchColumn(false);
      setChannelBreakdown({ whatsapp: 0, email: 0, skipped: 0 });
      setTagColorByKey(new Map());
      return;
    }

    setParsedRows(rows);
    setHasTagsColumn(csvHasTags);
    setHasCompanyColumn(csvHasCompany);
    setHasBranchColumn(csvHasBranch);
    setChannelBreakdown(breakdown);

    if (csvHasTags && accountId) {
      const { data: tags } = await supabase
        .from('tags')
        .select('name, color')
        .eq('account_id', accountId);

      const colors = new Map<string, string>();
      for (const tag of tags ?? []) {
        const key = tag.name.trim().toLowerCase();
        if (!colors.has(key)) colors.set(key, tag.color);
      }
      setTagColorByKey(colors);
    } else {
      setTagColorByKey(new Map());
    }
  }

  /** Resolve branch names to IDs, creating new branches as needed. */
  async function resolveBranchIds(
    branchNames: string[],
    acctId: string
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (branchNames.length === 0) return map;

    const uniqueNames = [...new Set(branchNames.map((n) => n.trim().toLowerCase()))];

    // Fetch existing branches
    const { data: existing } = await supabase
      .from('branches')
      .select('id, name')
      .eq('account_id', acctId);

    for (const branch of existing ?? []) {
      map.set(branch.name.trim().toLowerCase(), branch.id);
    }

    // Create missing branches
    for (const name of uniqueNames) {
      if (map.has(name)) continue;
      // Find original casing from the CSV
      const originalName = branchNames.find(
        (n) => n.trim().toLowerCase() === name
      ) ?? name;
      const { data: created } = await supabase
        .from('branches')
        .insert({ account_id: acctId, name: originalName.trim() })
        .select('id')
        .single();
      if (created) {
        map.set(name, created.id);
      }
    }

    return map;
  }

  async function handleImport() {
    if (parsedRows.length === 0) return;
    setImporting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      if (!accountId)
        throw new Error('Your profile is not linked to an account.');

      let imported = 0;
      let skipped = 0;
      let failed = 0;

      // 1) De-dupe within the file by normalized phone/email (keep first).
      const { unique, duplicates: inFileDupes } = dedupeByPhone(parsedRows);
      skipped += inFileDupes;

      // 2) Skip contacts already in this account by phone or email.
      const { data: existingPhoneRows } = await supabase
        .from('contacts')
        .select('phone_normalized')
        .eq('account_id', accountId)
        .not('phone_normalized', 'is', null);
      const existingPhones = new Set(
        (existingPhoneRows ?? [])
          .map((r) => (r as { phone_normalized: string | null }).phone_normalized)
          .filter((p): p is string => !!p)
      );

      const { data: existingEmailRows } = await supabase
        .from('contacts')
        .select('email')
        .eq('account_id', accountId)
        .not('email', 'is', null);
      const existingEmails = new Set(
        (existingEmailRows ?? [])
          .map((r) => (r as { email: string | null }).email?.toLowerCase())
          .filter((e): e is string => !!e)
      );

      const toInsert = unique.filter((row) => {
        if (row.phone && existingPhones.has(normalizeKey(row.phone))) {
          skipped++;
          return false;
        }
        if (!row.phone && row.email && existingEmails.has(row.email.toLowerCase())) {
          skipped++;
          return false;
        }
        return true;
      });

      // 3) Resolve tag names → ids.
      const allTagNames = toInsert.flatMap((row) => row.tagNames);
      let tagIdByKey = new Map<string, string>();
      let skippedNames: string[] = [];
      if (allTagNames.length > 0) {
        ({ tagIdByKey, skippedNames } = await resolveImportTagIds(supabase, {
          accountId,
          userId: user.id,
          tagNames: allTagNames,
          canCreateTags: canEditSettings,
        }));
      }

      // 4) Resolve branch names → ids.
      const allBranchNames = toInsert
        .map((row) => row.branchName)
        .filter((n): n is string => !!n);
      const branchIdByKey = await resolveBranchIds(allBranchNames, accountId);

      const tagAssignments: ContactTagAssignment[] = [];

      // 5) Batch insert in chunks of 50.
      const chunkSize = 50;

      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const rows = chunk.map((row) => ({
          user_id: user.id,
          account_id: accountId,
          phone: row.phone || null,
          name: row.name || null,
          email: row.email || null,
          company: row.company || null,
          primary_channel: row.primaryChannel,
          branch_id: row.branchName
            ? branchIdByKey.get(row.branchName.trim().toLowerCase()) ?? null
            : null,
        }));

        const { data, error } = await supabase
          .from('contacts')
          .insert(rows)
          .select('id');

        if (error) {
          // Retry individually so one bad/duplicate row doesn't sink
          // the whole chunk.
          for (let j = 0; j < rows.length; j++) {
            const row = rows[j];
            const source = chunk[j];
            const { data: singleData, error: singleErr } = await supabase
              .from('contacts')
              .insert(row)
              .select('id')
              .single();

            if (!singleErr && singleData) {
              imported++;
              if (source.tagNames.length > 0) {
                tagAssignments.push({
                  contactId: singleData.id,
                  tagNames: source.tagNames,
                });
              }
            } else if (isUniqueViolation(singleErr)) {
              skipped++;
            } else {
              failed++;
            }
          }
        } else {
          const inserted = data ?? [];
          imported += inserted.length;
          for (let j = 0; j < inserted.length; j++) {
            const source = chunk[j];
            if (!source || source.tagNames.length === 0) continue;
            tagAssignments.push({
              contactId: inserted[j].id,
              tagNames: source.tagNames,
            });
          }
        }
      }

      // 6) Wire tags onto the contacts we just created.
      let tagsAssigned = 0;
      try {
        tagsAssigned = await assignImportedContactTags(
          supabase,
          tagAssignments,
          tagIdByKey
        );
      } catch {
        toast.warning('Contacts imported, but some tag assignments failed.');
      }

      setResult({ imported, skipped, failed, tagsAssigned });
      if (imported > 0) {
        toast.success(
          `${imported} contact${imported !== 1 ? 's' : ''} imported`
        );
        onImported();
      }
      if (tagsAssigned > 0) {
        toast.success(
          `${tagsAssigned} tag assignment${tagsAssigned !== 1 ? 's' : ''} applied`
        );
      }
      if (skippedNames.length > 0) {
        const sample = skippedNames.slice(0, 3).join(', ');
        const more =
          skippedNames.length > 3 ? ` (+${skippedNames.length - 3} more)` : '';
        toast.info(
          `Unknown tags skipped (create them in Settings first): ${sample}${more}`
        );
      }
      if (skipped > 0) {
        toast.info(`${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped`);
      }
      if (failed > 0) {
        toast.error(
          `${failed} contact${failed !== 1 ? 's' : ''} failed to import`
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Import failed';
      toast.error(message);
    } finally {
      setImporting(false);
    }
  }

  const preview = parsedRows.slice(0, PREVIEW_LIMIT);
  const previewHasTags =
    hasTagsColumn || preview.some((row) => row.tagNames.length > 0);
  const previewHasCompany =
    hasCompanyColumn && preview.some((row) => row.company?.trim());
  const previewHasBranch =
    hasBranchColumn && preview.some((row) => row.branchName?.trim());

  const tagStats = useMemo(() => {
    const names = new Set<string>();
    let rowsWithTags = 0;
    for (const row of parsedRows) {
      if (row.tagNames.length === 0) continue;
      rowsWithTags++;
      for (const name of row.tagNames) names.add(name.trim().toLowerCase());
    }
    return { unique: names.size, rowsWithTags };
  }, [parsedRows]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden border-border/80 bg-popover p-0 text-popover-foreground sm:max-w-2xl">
        <div className="shrink-0 space-y-4 border-b border-border/80 px-6 pt-6 pb-5">
          <DialogHeader className="gap-1.5">
            <DialogTitle className="text-lg text-popover-foreground">
              Import Contacts
            </DialogTitle>
            <DialogDescription className="leading-relaxed text-muted-foreground">
              Upload a CSV with{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-muted-foreground">
                phone
              </code>{' '}
              and/or{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-muted-foreground">
                email
              </code>{' '}
              columns (at least one required). Optional:{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-muted-foreground">
                name
              </code>
              ,{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-muted-foreground">
                company
              </code>
              ,{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-muted-foreground">
                tags
              </code>
              ,{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-muted-foreground">
                branch
              </code>
              .
            </DialogDescription>
          </DialogHeader>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ')
                fileInputRef.current?.click();
            }}
            className={cn(
              'group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 transition-all',
              file
                ? 'border-primary/35 bg-primary/[0.04]'
                : 'hover:border-primary/40 border-border/80 bg-background/40 hover:bg-background/70'
            )}
          >
            {file ? (
              <>
                <div className="bg-primary/15 ring-primary/25 flex size-10 items-center justify-center rounded-lg ring-1">
                  <FileText className="text-primary size-5" />
                </div>
                <p
                  className="max-w-full truncate px-2 text-sm font-medium text-popover-foreground"
                  title={file.name}
                >
                  {truncateFilename(file.name)}
                </p>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {parsedRows.length} row{parsedRows.length !== 1 ? 's' : ''}{' '}
                  ready
                </span>
              </>
            ) : (
              <>
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted/80 ring-1 ring-border/80 transition-colors group-hover:bg-muted">
                  <Upload className="size-5 text-muted-foreground group-hover:text-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Click to choose a CSV file
                </p>
                <p className="text-[11px] text-muted-foreground">
                  .csv up to your browser limit
                </p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {preview.length > 0 && !result && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Preview · first {preview.length}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {tagStats.rowsWithTags > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted/90 px-2 py-0.5 text-[11px] text-muted-foreground">
                      <Tag className="text-primary/80 size-3" />
                      {tagStats.unique} tag{tagStats.unique !== 1 ? 's' : ''} ·{' '}
                      {tagStats.rowsWithTags} contact
                      {tagStats.rowsWithTags !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Channel breakdown */}
              <ChannelBreakdownBar breakdown={channelBreakdown} />

              <div className="overflow-hidden rounded-xl border border-border ring-1 ring-border/50">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-xs">
                    <thead>
                      <tr className="border-b border-border bg-background/60">
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                          Channel
                        </th>
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                          Phone
                        </th>
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                          Name
                        </th>
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                          Email
                        </th>
                        {previewHasCompany && (
                          <th className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                            Company
                          </th>
                        )}
                        {previewHasBranch && (
                          <th className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                            Branch
                          </th>
                        )}
                        {previewHasTags && (
                          <th className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground">
                            Tags
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {preview.map((row, i) => (
                        <tr
                          key={i}
                          className="bg-popover/40 transition-colors hover:bg-muted/30"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <ChannelBadge channel={row.primaryChannel} />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            <PreviewCell
                              value={row.phone || '—'}
                              mono
                              maxWidth="max-w-[7.5rem]"
                            />
                          </td>
                          <td className="px-3 py-2 text-popover-foreground">
                            <PreviewCell
                              value={row.name || '—'}
                              maxWidth="max-w-[8.5rem]"
                            />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            <PreviewCell
                              value={row.email || '—'}
                              maxWidth="max-w-[10rem]"
                            />
                          </td>
                          {previewHasCompany && (
                            <td className="px-3 py-2 text-muted-foreground">
                              <PreviewCell
                                value={row.company || '—'}
                                maxWidth="max-w-[7rem]"
                              />
                            </td>
                          )}
                          {previewHasBranch && (
                            <td className="px-3 py-2 text-muted-foreground">
                              <PreviewCell
                                value={row.branchName || '—'}
                                maxWidth="max-w-[7rem]"
                              />
                            </td>
                          )}
                          {previewHasTags && (
                            <td className="px-3 py-2 align-top">
                              <ImportPreviewTags
                                tagNames={row.tagNames}
                                tagColorByKey={tagColorByKey}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {parsedRows.length > PREVIEW_LIMIT && (
                <p className="text-center text-[11px] text-muted-foreground">
                  + {parsedRows.length - PREVIEW_LIMIT} more row
                  {parsedRows.length - PREVIEW_LIMIT !== 1 ? 's' : ''} not shown
                </p>
              )}
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <p className="text-sm font-medium text-popover-foreground">Import complete</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {result.imported > 0 && (
                  <div className="text-primary flex items-center gap-1.5 text-sm">
                    <CheckCircle className="size-4 shrink-0" />
                    {result.imported} imported
                  </div>
                )}
                {result.tagsAssigned > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-cyan-400">
                    <CheckCircle className="size-4 shrink-0" />
                    {result.tagsAssigned} tag
                    {result.tagsAssigned !== 1 ? 's' : ''} assigned
                  </div>
                )}
                {result.skipped > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-amber-400">
                    <AlertTriangle className="size-4 shrink-0" />
                    {result.skipped} skipped
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-red-400">
                    <XCircle className="size-4 shrink-0" />
                    {result.failed} failed
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-0 shrink-0 gap-2 border-t border-border/80 bg-background/50 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              type="button"
              disabled={parsedRows.length === 0 || importing}
              onClick={handleImport}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {importing && <Loader2 className="size-4 animate-spin" />}
              Import {parsedRows.length > 0 ? parsedRows.length : ''} contact
              {parsedRows.length !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
