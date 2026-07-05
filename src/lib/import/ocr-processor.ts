// ============================================================
// OCR & Text Import Processor
//
// Extracts contacts from images (OCR via OpenRouter vision) and
// from pasted CSV/text content. Returns a unified OCRResult.
// ============================================================

import { trackAIUsage, extractTokensFromResponse } from '@/lib/ai/usage-tracker';

// ── Interfaces ──────────────────────────────────────────────

export interface ExtractedContact {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  confidence: number; // 0–1
  warnings: string[];
}

export interface OCRResult {
  contacts: ExtractedContact[];
  rawText: string;
  confidence: number; // overall 0–1
  warnings: string[];
}

interface ProcessImageInput {
  imageBase64: string;
  mimeType: string;
  accountId: string;
}

interface ProcessTextInput {
  content: string;
  headers?: string[];
}

// ── Helpers ─────────────────────────────────────────────────

/** Normalise a Nigerian phone number to +234 format. */
export function normalizeNigerianPhone(raw: string): { phone: string; valid: boolean } {
  // Strip everything except digits and leading +
  let digits = raw.replace(/[^\d+]/g, '');

  // Handle various Nigerian formats
  if (digits.startsWith('+234')) {
    digits = '+234' + digits.slice(4);
  } else if (digits.startsWith('234') && digits.length >= 13) {
    digits = '+' + digits;
  } else if (digits.startsWith('0') && digits.length >= 11) {
    digits = '+234' + digits.slice(1);
  } else if (digits.length === 10 && /^[789]/.test(digits)) {
    // 10-digit without leading 0 (e.g. 8012345678)
    digits = '+234' + digits;
  }

  // Validate: +234 followed by 10 digits
  const valid = /^\+234\d{10}$/.test(digits);
  return { phone: digits, valid };
}

/** Try to extract a phone number from a string. */
function extractPhone(text: string): string | null {
  // Match common phone patterns
  const patterns = [
    /\+?234[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}/,
    /0[789]0[\s-]?\d{3,4}[\s-]?\d{4}/,
    /0[789]\d{9}/,
    /\+?\d{10,15}/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return null;
}

/** Try to extract an email from a string. */
function extractEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

// ── Image OCR via OpenRouter Vision ─────────────────────────

export async function processImageForContacts(
  input: ProcessImageInput
): Promise<OCRResult> {
  const { imageBase64, mimeType, accountId } = input;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const model = 'google/gemini-2.0-flash-001';
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const systemPrompt = `You are a contact extraction specialist. Analyse the image and extract every contact you can find.

Return ONLY valid JSON (no markdown fences) in this exact format:
{
  "contacts": [
    {
      "name": "Full Name or empty string",
      "phone": "Phone number as written or empty string",
      "email": "Email or empty string",
      "address": "Address or empty string",
      "notes": "Any extra info (role, company, etc.) or empty string"
    }
  ],
  "rawText": "The full text you can read in the image"
}

Rules:
- Extract ALL contacts visible in the image
- Keep phone numbers exactly as written (we normalise later)
- If a field is not visible, use an empty string
- For business cards, flyers, spreadsheets, handwritten lists — extract everything
- rawText should contain all readable text from the image`;

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all contacts from this image.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://crm.marketing4effect.com',
      'X-Title': 'M4E CRM OCR Import',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  // Track AI usage (fire-and-forget)
  const tokens = extractTokensFromResponse(data);
  trackAIUsage({
    accountId,
    feature: 'ocr_import',
    model,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    metadata: { source: 'image_ocr', mimeType },
  });

  // Parse AI response
  const content = data.choices?.[0]?.message?.content || '';
  let parsed: { contacts: Array<Record<string, string>>; rawText: string };

  try {
    // Strip markdown code fences if present
    const cleaned = content.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // If JSON parsing fails, try to extract contacts from raw text
    return {
      contacts: [],
      rawText: content,
      confidence: 0.2,
      warnings: ['AI response was not valid JSON. Raw text returned for manual review.'],
    };
  }

  const warnings: string[] = [];
  const contacts: ExtractedContact[] = [];

  for (const raw of parsed.contacts || []) {
    const contact: ExtractedContact = {
      name: (raw.name || '').trim(),
      phone: '',
      email: (raw.email || '').trim(),
      address: (raw.address || '').trim(),
      notes: (raw.notes || '').trim(),
      confidence: 0.5,
      warnings: [],
    };

    // Normalise phone
    if (raw.phone) {
      const { phone, valid } = normalizeNigerianPhone(raw.phone);
      contact.phone = phone;
      if (!valid) {
        contact.warnings.push(`Phone "${raw.phone}" may not be a valid Nigerian number`);
        contact.confidence = Math.max(0.3, contact.confidence - 0.2);
      } else {
        contact.confidence = Math.min(1, contact.confidence + 0.3);
      }
    }

    // Boost confidence for more fields
    if (contact.name) contact.confidence = Math.min(1, contact.confidence + 0.1);
    if (contact.email) contact.confidence = Math.min(1, contact.confidence + 0.1);

    // Must have at least phone or email
    if (!contact.phone && !contact.email) {
      contact.warnings.push('No phone or email found — contact may be incomplete');
      contact.confidence = 0.2;
    }

    contacts.push(contact);
  }

  if (contacts.length === 0) {
    warnings.push('No contacts could be extracted from the image');
  }

  const avgConfidence =
    contacts.length > 0
      ? contacts.reduce((s, c) => s + c.confidence, 0) / contacts.length
      : 0;

  return {
    contacts,
    rawText: parsed.rawText || content,
    confidence: Math.round(avgConfidence * 100) / 100,
    warnings,
  };
}

// ── CSV / Text Parsing ──────────────────────────────────────

export function processSpreadsheetText(input: ProcessTextInput): OCRResult {
  const { content, headers } = input;
  const warnings: string[] = [];
  const contacts: ExtractedContact[] = [];

  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { contacts: [], rawText: content, confidence: 0, warnings: ['No content to parse'] };
  }

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t')
    ? '\t'
    : firstLine.includes(',')
      ? ','
      : firstLine.includes(';')
        ? ';'
        : firstLine.includes('|')
          ? '|'
          : null;

  if (delimiter) {
    // Structured CSV/TSV parsing
    const headerRow = headers?.length
      ? headers.map((h) => h.toLowerCase().trim())
      : lines[0].split(delimiter).map((h) => h.toLowerCase().trim().replace(/["']/g, ''));

    const dataStart = headers?.length ? 0 : 1;

    // Map column indices
    const nameIdx = headerRow.findIndex((h) =>
      /^(name|full.?name|contact.?name|customer)$/i.test(h)
    );
    const phoneIdx = headerRow.findIndex((h) =>
      /^(phone|mobile|tel|telephone|phone.?number|whatsapp)$/i.test(h)
    );
    const emailIdx = headerRow.findIndex((h) =>
      /^(email|e-?mail|email.?address)$/i.test(h)
    );
    const addressIdx = headerRow.findIndex((h) =>
      /^(address|location|city)$/i.test(h)
    );
    const notesIdx = headerRow.findIndex((h) =>
      /^(notes?|comment|remarks?|description)$/i.test(h)
    );

    if (phoneIdx === -1 && emailIdx === -1) {
      warnings.push(
        'Could not detect phone or email columns. Attempting best-effort extraction.'
      );
    }

    for (let i = dataStart; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const contact: ExtractedContact = {
        name: nameIdx >= 0 ? (cols[nameIdx] || '') : '',
        phone: '',
        email: emailIdx >= 0 ? (cols[emailIdx] || '') : '',
        address: addressIdx >= 0 ? (cols[addressIdx] || '') : '',
        notes: notesIdx >= 0 ? (cols[notesIdx] || '') : '',
        confidence: 0.7,
        warnings: [],
      };

      // Phone handling
      const rawPhone = phoneIdx >= 0 ? (cols[phoneIdx] || '') : '';
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

      // If no phone column detected, try to find phone in any column
      if (!contact.phone) {
        for (const col of cols) {
          const found = extractPhone(col);
          if (found) {
            const { phone, valid } = normalizeNigerianPhone(found);
            contact.phone = phone;
            if (!valid) contact.confidence -= 0.1;
            break;
          }
        }
      }

      // If no email column detected, try to find email in any column
      if (!contact.email) {
        for (const col of cols) {
          const found = extractEmail(col);
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

      contacts.push(contact);
    }
  } else {
    // Unstructured text — line-by-line extraction
    for (const line of lines) {
      const phone = extractPhone(line);
      const email = extractEmail(line);

      if (!phone && !email) continue;

      const contact: ExtractedContact = {
        name: '',
        phone: '',
        email: email || '',
        address: '',
        notes: '',
        confidence: 0.5,
        warnings: [],
      };

      if (phone) {
        const { phone: normalized, valid } = normalizeNigerianPhone(phone);
        contact.phone = normalized;
        if (!valid) {
          contact.warnings.push(`Phone "${phone}" may not be valid`);
          contact.confidence -= 0.1;
        }
      }

      // Try to extract name: text before the phone/email
      let remaining = line;
      if (phone) remaining = remaining.replace(phone, '');
      if (email) remaining = remaining.replace(email, '');
      remaining = remaining.replace(/[,;|\-–—]/g, ' ').trim();
      if (remaining && remaining.length > 1 && remaining.length < 60) {
        contact.name = remaining;
        contact.confidence = Math.min(1, contact.confidence + 0.1);
      }

      contacts.push(contact);
    }

    if (contacts.length === 0) {
      warnings.push('No phone numbers or emails found in the text');
    }
  }

  const avgConfidence =
    contacts.length > 0
      ? contacts.reduce((s, c) => s + c.confidence, 0) / contacts.length
      : 0;

  return {
    contacts,
    rawText: content,
    confidence: Math.round(avgConfidence * 100) / 100,
    warnings,
  };
}
