/**
 * CSV parsing for the contacts import modal. Shared + unit-tested so
 * tag-column handling stays aligned with phone/name/email/company/branch.
 *
 * Dual-identifier support: rows may have phone, email, or both.
 * Rows with neither are skipped.
 */

export type PrimaryChannel = 'whatsapp' | 'email' | 'sms';

export interface ParsedContactRow {
  phone: string;
  name?: string;
  email?: string;
  company?: string;
  /** Tag names from the optional `tags` column (comma/semicolon separated). */
  tagNames: string[];
  /** Branch name from the optional `branch` column. */
  branchName?: string;
  /** Auto-assigned based on available identifiers. */
  primaryChannel: PrimaryChannel;
}

/** Split a CSV cell into unique tag names (case-insensitive de-dupe). */
export function parseTagCell(value: string | undefined): string[] {
  if (!value?.trim()) return [];

  const seen = new Set<string>();
  const names: string[] = [];

  for (const part of value.split(/[,;]/)) {
    const name = part.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  return names;
}

export interface ChannelBreakdown {
  whatsapp: number; // has phone (with or without email)
  email: number;    // email only (no phone)
  skipped: number;  // neither phone nor email
}

export interface ParseContactCsvResult {
  rows: ParsedContactRow[];
  /** True when the CSV header includes a `tags` column. */
  hasTagsColumn: boolean;
  /** True when the CSV header includes a `company` column. */
  hasCompanyColumn: boolean;
  /** True when the CSV header includes a `branch` column. */
  hasBranchColumn: boolean;
  /** Breakdown of rows by channel classification. */
  channelBreakdown: ChannelBreakdown;
}

export function parseContactCsv(text: string): ParseContactCsvResult {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return {
      rows: [],
      hasTagsColumn: false,
      hasCompanyColumn: false,
      hasBranchColumn: false,
      channelBreakdown: { whatsapp: 0, email: 0, skipped: 0 },
    };
  }

  const headers = lines[0]
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/["']/g, ''));

  const phoneIdx = headers.indexOf('phone');
  const nameIdx = headers.indexOf('name');
  const emailIdx = headers.indexOf('email');
  const companyIdx = headers.indexOf('company');
  const tagsIdx = headers.indexOf('tags');
  const branchIdx = headers.indexOf('branch');

  // Must have at least phone or email column
  if (phoneIdx === -1 && emailIdx === -1) {
    return {
      rows: [],
      hasTagsColumn: tagsIdx >= 0,
      hasCompanyColumn: companyIdx >= 0,
      hasBranchColumn: branchIdx >= 0,
      channelBreakdown: { whatsapp: 0, email: 0, skipped: 0 },
    };
  }

  const rows: ParsedContactRow[] = [];
  const channelBreakdown: ChannelBreakdown = { whatsapp: 0, email: 0, skipped: 0 };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const phone = phoneIdx >= 0 ? values[phoneIdx]?.replace(/["']/g, '').trim() : '';
    const email = emailIdx >= 0 ? values[emailIdx]?.replace(/["']/g, '').trim() : '';

    // Skip rows with neither phone nor email
    if (!phone && !email) {
      channelBreakdown.skipped++;
      continue;
    }

    // Determine primary channel
    let primaryChannel: PrimaryChannel;
    if (phone) {
      primaryChannel = 'whatsapp';
      channelBreakdown.whatsapp++;
    } else {
      primaryChannel = 'email';
      channelBreakdown.email++;
    }

    rows.push({
      phone: phone || '',
      name:
        nameIdx >= 0
          ? values[nameIdx]?.replace(/["']/g, '').trim() || undefined
          : undefined,
      email: email || undefined,
      company:
        companyIdx >= 0
          ? values[companyIdx]?.replace(/["']/g, '').trim() || undefined
          : undefined,
      tagNames:
        tagsIdx >= 0 ? parseTagCell(values[tagsIdx]?.replace(/["']/g, '')) : [],
      branchName:
        branchIdx >= 0
          ? values[branchIdx]?.replace(/["']/g, '').trim() || undefined
          : undefined,
      primaryChannel,
    });
  }

  return {
    rows,
    hasTagsColumn: tagsIdx >= 0,
    hasCompanyColumn: companyIdx >= 0,
    hasBranchColumn: branchIdx >= 0,
    channelBreakdown,
  };
}

/** Simple CSV line parse (handles quoted fields). */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}
