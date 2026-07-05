// ============================================================
// Excel Parser
//
// Parses .xlsx and .xls files using the xlsx package.
// Auto-detects header row and maps columns to contact fields
// using fuzzy header matching. Handles Nigerian phone formats.
// ============================================================

import * as XLSX from 'xlsx';
import type { ExtractedContact } from '@/lib/import/ocr-processor';
import { normalizeNigerianPhone } from '@/lib/import/ocr-processor';
import { IMPORT_LIMITS } from '@/lib/import/import-limits';

// ── Header Matching ─────────────────────────────────────────

const NAME_PATTERNS = /^(name|full[_\s-]?name|contact[_\s-]?name|customer|client|person)$/i;
const PHONE_PATTERNS = /^(phone|mobile|tel|telephone|phone[_\s-]?number|whatsapp|cell|gsm|number)$/i;
const EMAIL_PATTERNS = /^(email|e-?mail|email[_\s-]?address|mail)$/i;
const ADDRESS_PATTERNS = /^(address|location|city|street|area|lga|state)$/i;
const NOTES_PATTERNS = /^(notes?|comment|remarks?|description|info|details?)$/i;

function matchHeader(header: string): 'name' | 'phone' | 'email' | 'address' | 'notes' | null {
  const h = header.trim();
  if (NAME_PATTERNS.test(h)) return 'name';
  if (PHONE_PATTERNS.test(h)) return 'phone';
  if (EMAIL_PATTERNS.test(h)) return 'email';
  if (ADDRESS_PATTERNS.test(h)) return 'address';
  if (NOTES_PATTERNS.test(h)) return 'notes';
  return null;
}

// ── Phone extraction fallback ───────────────────────────────

function extractPhoneFromCell(value: string): string | null {
  const patterns = [
    /\+?234[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/,
    /0[789]0[\s-]?\d{3,4}[\s-]?\d{4}/,
    /0[789]\d{9}/,
    /\+?\d{10,15}/,
  ];
  for (const p of patterns) {
    const m = value.match(p);
    if (m) return m[0];
  }
  return null;
}

function extractEmailFromCell(value: string): string | null {
  const m = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

// ── Main Parser ─────────────────────────────────────────────

export function parseExcel(
  buffer: Buffer
): { contacts: ExtractedContact[]; warnings: string[] } {
  const warnings: string[] = [];
  const contacts: ExtractedContact[] = [];

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    return {
      contacts: [],
      warnings: [`Failed to parse Excel file: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  if (workbook.SheetNames.length === 0) {
    return { contacts: [], warnings: ['Excel file has no sheets'] };
  }

  // Process first sheet (or all sheets if multiple)
  const sheetsToProcess = workbook.SheetNames.length > 3
    ? [workbook.SheetNames[0]]
    : workbook.SheetNames;

  for (const sheetName of sheetsToProcess) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convert to array of arrays
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (rows.length < 2) {
      warnings.push(`Sheet "${sheetName}" has fewer than 2 rows — skipping`);
      continue;
    }

    // Auto-detect header row (first row with recognizable headers)
    let headerRowIdx = -1;
    let columnMap: Record<string, number> = {};

    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      const map: Record<string, number> = {};
      let matchCount = 0;

      for (let j = 0; j < row.length; j++) {
        const cellValue = String(row[j] || '').trim();
        if (!cellValue) continue;
        const field = matchHeader(cellValue);
        if (field && !map[field]) {
          map[field] = j;
          matchCount++;
        }
      }

      // Accept if we matched at least 1 field (phone or name)
      if (matchCount >= 1 && (map.phone !== undefined || map.name !== undefined)) {
        headerRowIdx = i;
        columnMap = map;
        break;
      }
    }

    if (headerRowIdx < 0) {
      // No header detected — try treating first row as header anyway
      warnings.push(
        `Sheet "${sheetName}": could not detect column headers. Attempting positional mapping.`
      );
      headerRowIdx = 0;
      // Assume: col 0 = name, col 1 = phone, col 2 = email
      const firstRow = rows[0];
      if (firstRow.length >= 2) {
        columnMap = { name: 0, phone: 1 };
        if (firstRow.length >= 3) columnMap.email = 2;
        if (firstRow.length >= 4) columnMap.address = 3;
        if (firstRow.length >= 5) columnMap.notes = 4;
      }
    }

    const dataStart = headerRowIdx + 1;

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => !String(c).trim())) continue; // skip empty rows

      const contact: ExtractedContact = {
        name: columnMap.name !== undefined ? String(row[columnMap.name] || '').trim() : '',
        phone: '',
        email: columnMap.email !== undefined ? String(row[columnMap.email] || '').trim() : '',
        address: columnMap.address !== undefined ? String(row[columnMap.address] || '').trim() : '',
        notes: columnMap.notes !== undefined ? String(row[columnMap.notes] || '').trim() : '',
        confidence: 0.7,
        warnings: [],
      };

      // Phone handling
      const rawPhone = columnMap.phone !== undefined ? String(row[columnMap.phone] || '').trim() : '';
      if (rawPhone) {
        const { phone, valid } = normalizeNigerianPhone(rawPhone);
        contact.phone = phone;
        if (!valid) {
          contact.warnings.push(`Phone "${rawPhone}" may not be valid`);
          contact.confidence -= 0.1;
        } else {
          contact.confidence = Math.min(1, contact.confidence + 0.1);
        }
      }

      // Fallback: scan all cells for phone if no phone column matched
      if (!contact.phone) {
        for (const cell of row) {
          const found = extractPhoneFromCell(String(cell || ''));
          if (found) {
            const { phone, valid } = normalizeNigerianPhone(found);
            contact.phone = phone;
            if (!valid) contact.confidence -= 0.1;
            break;
          }
        }
      }

      // Fallback: scan for email
      if (!contact.email) {
        for (const cell of row) {
          const found = extractEmailFromCell(String(cell || ''));
          if (found) {
            contact.email = found;
            break;
          }
        }
      }

      // Must have phone or email
      if (!contact.phone && !contact.email) {
        contact.warnings.push('No phone or email — skipping');
        contact.confidence = 0.1;
      }

      if (contact.name) contact.confidence = Math.min(1, contact.confidence + 0.05);

      contacts.push(contact);
    }

    if (sheetsToProcess.length > 1 && contacts.length > 0) {
      warnings.push(`Processed sheet "${sheetName}": ${contacts.length} contacts found`);
    }
  }

  if (contacts.length === 0) {
    warnings.push('No contacts could be extracted from the Excel file');
  }

  // Enforce Excel import limit
  const limit = IMPORT_LIMITS.web.excel.perFile;
  let truncated = false;
  const originalCount = contacts.length;

  if (contacts.length > limit) {
    warnings.push(
      `Limit reached: only the first ${limit.toLocaleString()} contacts were imported. ` +
      `Your file contained ${originalCount.toLocaleString()} contacts. ` +
      `Split your file to import the remaining ${(originalCount - limit).toLocaleString()} contacts.`
    );
    contacts.splice(limit);
    truncated = true;
  }

  return { contacts, warnings, truncated, originalCount };
}
