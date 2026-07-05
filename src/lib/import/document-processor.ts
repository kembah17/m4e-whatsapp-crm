// ============================================================
// Document Processor
//
// Routes documents by MIME type to the appropriate parser.
// Supports: vCard, CSV/TSV, Excel, PDF, images.
// ============================================================

import type { ExtractedContact } from '@/lib/import/ocr-processor';
import { processSpreadsheetText, processImageForContacts } from '@/lib/import/ocr-processor';
import { parseVCard } from '@/lib/import/vcard-parser';
import { parseExcel } from '@/lib/import/excel-parser';

// ── Types ────────────────────────────────────────────────────

export interface DocumentProcessResult {
  contacts: ExtractedContact[];
  warnings: string[];
}

// ── MIME Type Routing ───────────────────────────────────────

const VCARD_TYPES = new Set([
  'text/vcard',
  'text/x-vcard',
  'text/directory',
]);

const CSV_TYPES = new Set([
  'text/csv',
  'text/tab-separated-values',
  'text/plain',
  'text/tsv',
]);

const EXCEL_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/x-excel',
  'application/x-msexcel',
]);

const IMAGE_TYPES_PREFIX = 'image/';

const PDF_TYPES = new Set([
  'application/pdf',
]);

// ── Main Processor ──────────────────────────────────────────

export async function processDocument(
  buffer: Buffer,
  mimeType: string,
  accountId: string,
): Promise<DocumentProcessResult> {
  const mime = mimeType.toLowerCase().trim();
  const warnings: string[] = [];

  try {
    // ── vCard ──────────────────────────────────────────────
    if (VCARD_TYPES.has(mime) || mime.includes('vcard')) {
      const text = buffer.toString('utf-8');
      const contacts = parseVCard(text);
      return { contacts, warnings };
    }

    // ── CSV / TSV / Plain Text ─────────────────────────────
    if (CSV_TYPES.has(mime)) {
      const text = buffer.toString('utf-8');
      const contacts = processSpreadsheetText(text);
      return { contacts, warnings };
    }

    // ── Excel ──────────────────────────────────────────────
    if (EXCEL_TYPES.has(mime)) {
      return parseExcel(buffer);
    }

    // ── PDF / Images → OCR ─────────────────────────────────
    if (PDF_TYPES.has(mime) || mime.startsWith(IMAGE_TYPES_PREFIX)) {
      // Convert buffer to base64 for OCR processing
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      const contacts = await processImageForContacts(dataUrl, accountId);
      return { contacts, warnings };
    }

    // ── Unknown type ───────────────────────────────────────
    // Try to detect by content
    const textContent = buffer.toString('utf-8');

    // Check if it looks like a vCard
    if (textContent.trimStart().toUpperCase().startsWith('BEGIN:VCARD')) {
      const contacts = parseVCard(textContent);
      warnings.push(`Detected vCard content despite MIME type "${mimeType}"`);
      return { contacts, warnings };
    }

    // Check if it looks like CSV
    const lines = textContent.split('\n').filter(Boolean);
    if (lines.length >= 2 && (lines[0].includes(',') || lines[0].includes('\t'))) {
      const contacts = processSpreadsheetText(textContent);
      warnings.push(`Treated as CSV/TSV despite MIME type "${mimeType}"`);
      return { contacts, warnings };
    }

    return {
      contacts: [],
      warnings: [`Unsupported document type: ${mimeType}`],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      contacts: [],
      warnings: [`Error processing document (${mimeType}): ${message}`],
    };
  }
}
