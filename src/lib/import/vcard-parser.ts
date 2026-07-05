// ============================================================
// vCard Parser
//
// Parses .vcf vCard files (v2.1, 3.0, 4.0) and extracts contacts.
// Handles: multiple contacts per file, quoted-printable encoding,
// base64 encoding, folded lines, multiple phones per contact.
// ============================================================

import type { ExtractedContact } from '@/lib/import/ocr-processor';
import { normalizeNigerianPhone } from '@/lib/import/ocr-processor';
import { IMPORT_LIMITS } from '@/lib/import/import-limits';

// ── Helpers ─────────────────────────────────────────────────

/** Decode quoted-printable encoded string. */
function decodeQuotedPrintable(input: string): string {
  // Remove soft line breaks (=\r\n or =\n)
  let result = input.replace(/=\r?\n/g, '');
  // Decode =XX hex sequences
  result = result.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  return result;
}

/** Decode base64 encoded string. */
function decodeBase64(input: string): string {
  try {
    return Buffer.from(input, 'base64').toString('utf-8');
  } catch {
    return input;
  }
}

/** Unfold folded lines per RFC 6350 (lines continued with leading whitespace). */
function unfoldLines(text: string): string {
  return text.replace(/\r?\n[ \t]/g, '');
}

/** Extract the value from a vCard property line, handling encoding. */
function extractValue(line: string): string {
  // Split on first colon that isn't inside a parameter value
  const colonIdx = findValueColon(line);
  if (colonIdx < 0) return '';
  const params = line.substring(0, colonIdx).toUpperCase();
  let value = line.substring(colonIdx + 1).trim();

  if (params.includes('ENCODING=QUOTED-PRINTABLE') || params.includes('ENCODING=QP')) {
    value = decodeQuotedPrintable(value);
  } else if (params.includes('ENCODING=BASE64') || params.includes('ENCODING=B')) {
    // Only decode if it looks like text, not binary (photos etc.)
    if (!params.includes('PHOTO') && !params.includes('LOGO')) {
      value = decodeBase64(value);
    }
  }

  return value;
}

/** Find the colon that separates property name/params from value. */
function findValueColon(line: string): number {
  // The property name is everything before the first colon,
  // but we need to handle group prefixes (e.g., "item1.TEL:...")
  const idx = line.indexOf(':');
  return idx;
}

/** Check if a line starts with a given property name (case-insensitive). */
function lineStartsWith(line: string, prop: string): boolean {
  const upper = line.toUpperCase();
  // Match "PROP:" or "PROP;" (with parameters)
  if (upper.startsWith(prop + ':') || upper.startsWith(prop + ';')) {
    return true;
  }
  // Handle grouped properties like "item1.TEL:"
  if (/^[A-Z0-9]+\./.test(upper)) {
    const afterDot = upper.substring(upper.indexOf('.') + 1);
    return afterDot.startsWith(prop + ':') || afterDot.startsWith(prop + ';');
  }
  return false;
}

// ── Main Parser ─────────────────────────────────────────────

export function parseVCard(vcfContent: string): ExtractedContact[] {
  const contacts: ExtractedContact[] = [];

  // Unfold continuation lines
  const unfolded = unfoldLines(vcfContent);

  // Split into individual vCards
  const cards = unfolded.split(/(?=BEGIN:VCARD)/i).filter((block) =>
    block.toUpperCase().includes('BEGIN:VCARD')
  );

  for (const card of cards) {
    const lines = card.split(/\r?\n/).filter(Boolean);

    let formattedName = '';
    let structuredName = '';
    const phones: string[] = [];
    const emails: string[] = [];
    const addresses: string[] = [];
    let org = '';
    let notes = '';

    for (const line of lines) {
      if (lineStartsWith(line, 'FN')) {
        formattedName = extractValue(line);
      } else if (lineStartsWith(line, 'N')) {
        // N:Last;First;Middle;Prefix;Suffix
        const parts = extractValue(line).split(';');
        const last = (parts[0] || '').trim();
        const first = (parts[1] || '').trim();
        const middle = (parts[2] || '').trim();
        structuredName = [first, middle, last].filter(Boolean).join(' ');
      } else if (lineStartsWith(line, 'TEL')) {
        const phone = extractValue(line).trim();
        if (phone) phones.push(phone);
      } else if (lineStartsWith(line, 'EMAIL')) {
        const email = extractValue(line).trim();
        if (email) emails.push(email);
      } else if (lineStartsWith(line, 'ADR')) {
        // ADR:;;Street;City;State;Zip;Country
        const parts = extractValue(line).split(';');
        const addr = parts.filter(Boolean).join(', ').trim();
        if (addr) addresses.push(addr);
      } else if (lineStartsWith(line, 'ORG')) {
        org = extractValue(line).replace(/;/g, ', ').trim();
      } else if (lineStartsWith(line, 'NOTE')) {
        notes = extractValue(line);
      }
    }

    // Determine best name
    const name = formattedName || structuredName || '';

    // If no phones and no emails, skip this card
    if (phones.length === 0 && emails.length === 0) continue;

    // Create a contact for each phone number, or one if no phones
    if (phones.length === 0) {
      contacts.push({
        name,
        phone: '',
        email: emails[0] || '',
        address: addresses[0] || '',
        notes: [org, notes].filter(Boolean).join(' | '),
        confidence: 0.7,
        warnings: ['No phone number found in vCard'],
      });
    } else {
      for (let i = 0; i < phones.length; i++) {
        const { phone, valid } = normalizeNigerianPhone(phones[i]);
        const warnings: string[] = [];
        let confidence = 0.8;

        if (!valid) {
          warnings.push(`Phone "${phones[i]}" may not be a valid Nigerian number`);
          confidence -= 0.2;
        }

        contacts.push({
          name: i === 0 ? name : `${name} (${i + 1})`.trim(),
          phone,
          email: i === 0 ? (emails[0] || '') : (emails[i] || ''),
          address: addresses[0] || '',
          notes: [org, notes].filter(Boolean).join(' | '),
          confidence,
          warnings,
        });
      }
    }
  }

  // Enforce VCF import limit
  const limit = IMPORT_LIMITS.web.vcf.perFile;
  const warnings: string[] = [];
  let truncated = false;

  if (contacts.length > limit) {
    warnings.push(
      `Limit reached: only the first ${limit.toLocaleString()} contacts were imported. ` +
      `Split your file to import the remaining ${(contacts.length - limit).toLocaleString()} contacts.`
    );
    contacts.splice(limit);
    truncated = true;
  }

  return contacts;
}

/**
 * Parse vCard with limit enforcement — returns contacts + warnings.
 */
export function parseVCardWithLimits(vcfContent: string): {
  contacts: ExtractedContact[];
  warnings: string[];
  truncated: boolean;
  originalCount: number;
} {
  const allContacts = parseVCard(vcfContent);
  const limit = IMPORT_LIMITS.web.vcf.perFile;
  const warnings: string[] = [];
  let truncated = false;
  const originalCount = allContacts.length;

  if (allContacts.length > limit) {
    warnings.push(
      `Limit reached: only the first ${limit.toLocaleString()} contacts were imported. ` +
      `Split your file to import the remaining ${(allContacts.length - limit).toLocaleString()} contacts.`
    );
    allContacts.splice(limit);
    truncated = true;
  }

  return { contacts: allContacts, warnings, truncated, originalCount };
}
