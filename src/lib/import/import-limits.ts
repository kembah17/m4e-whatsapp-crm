// ============================================================
// Import Limits — Single Source of Truth
//
// All import limits for every import route (WhatsApp, Web, Email).
// Import this file wherever limits need to be checked or displayed.
// ============================================================

export const IMPORT_LIMITS = {
  // WhatsApp import limits
  whatsapp: {
    contactCards: { perMessage: 20, description: '20 contact cards per message (WhatsApp API limit)' },
    vcfFile: { perFile: 5_000, description: 'Up to 5,000 contacts per .vcf file' },
    excelFile: { perFile: 10_000, description: 'Up to 10,000 contacts per Excel file' },
    csvFile: { perFile: 10_000, description: 'Up to 10,000 contacts per CSV file' },
    photoOcr: { perImage: 50, description: 'Up to 50 contacts per photo (AI reads handwriting)' },
    textMessage: { perMessage: 100, description: 'Up to 100 contacts per text message' },
  },
  // Web UI import limits
  web: {
    csv: { perFile: 10_000, description: 'Up to 10,000 contacts per CSV file' },
    excel: { perFile: 10_000, description: 'Up to 10,000 contacts per Excel file' },
    vcf: { perFile: 5_000, description: 'Up to 5,000 contacts per .vcf file' },
    googleSheets: { perSheet: 10_000, description: 'Up to 10,000 rows per Google Sheet' },
    photoOcr: { perImage: 50, description: 'Up to 50 contacts per photo' },
    textPaste: { perPaste: 200, description: 'Up to 200 contacts per text paste' },
  },
  // Email import limits
  email: {
    perAttachment: 10_000,
    description: 'Up to 10,000 contacts per email attachment',
  },
  // Session limits
  session: {
    maxContactsPerSession: 10_000,
    maxSessionsPerDay: 10,
    sessionTimeoutMinutes: 30,
    description: 'Up to 10,000 contacts per import session, 10 sessions per day',
  },
} as const;

// Helper to format limit for display
export function formatLimit(limit: number): string {
  return limit >= 1000 ? `${(limit / 1000).toFixed(0)}K` : `${limit}`;
}

// Summary table for UI display
export const IMPORT_LIMITS_SUMMARY = [
  { method: 'WhatsApp — Contact Cards', limit: '20 per message', notes: 'Send multiple messages for more. No daily cap.' },
  { method: 'WhatsApp — VCF File', limit: '5,000 per file', notes: 'Export contacts from your phone as .vcf' },
  { method: 'WhatsApp — Excel/CSV File', limit: '10,000 per file', notes: 'Send spreadsheet directly on WhatsApp' },
  { method: 'WhatsApp — Photo of List', limit: '50 per photo', notes: 'AI reads handwriting. Take clear, well-lit photos.' },
  { method: 'WhatsApp — Text Message', limit: '100 per message', notes: 'Type or paste names and numbers' },
  { method: 'Web — CSV Upload', limit: '10,000 per file', notes: 'Standard CSV with name and phone columns' },
  { method: 'Web — Excel Upload', limit: '10,000 per file', notes: '.xlsx or .xls files' },
  { method: 'Web — vCard Upload', limit: '5,000 per file', notes: '.vcf files from phone or Google Contacts' },
  { method: 'Web — Google Sheets', limit: '10,000 rows', notes: 'Paste your Google Sheets URL' },
  { method: 'Web — Photo (OCR)', limit: '50 per photo', notes: 'Upload photo of handwritten or printed list' },
  { method: 'Web — Text Paste', limit: '200 per paste', notes: 'Copy-paste from any source' },
  { method: 'Email Attachment', limit: '10,000 per file', notes: 'Send CSV, Excel, or VCF to your import email' },
] as const;
