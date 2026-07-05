// ============================================================
// WhatsApp Contact Card Parser
//
// Parses WhatsApp Cloud API `contacts` message type into
// ExtractedContact[]. When wa_id is present, confidence is high.
// ============================================================

import type { ExtractedContact } from '@/lib/import/ocr-processor';
import { normalizeNigerianPhone } from '@/lib/import/ocr-processor';

// ── Types ────────────────────────────────────────────────────

export interface WhatsAppContactCard {
  name: { formatted_name?: string; first_name?: string; last_name?: string };
  phones?: Array<{ phone?: string; type?: string; wa_id?: string }>;
  emails?: Array<{ email?: string; type?: string }>;
  addresses?: Array<{ street?: string; city?: string; state?: string; country?: string }>;
  org?: { company?: string };
}

// ── Parser ───────────────────────────────────────────────────

export function parseContactCards(cards: WhatsAppContactCard[]): ExtractedContact[] {
  const contacts: ExtractedContact[] = [];

  for (const card of cards) {
    // Build name
    const name =
      card.name.formatted_name ||
      [card.name.first_name, card.name.last_name].filter(Boolean).join(' ') ||
      '';

    // Build address
    const addr = card.addresses?.[0];
    const address = addr
      ? [addr.street, addr.city, addr.state, addr.country].filter(Boolean).join(', ')
      : '';

    // Build org/notes
    const notes = card.org?.company || '';

    // Collect emails
    const emails = (card.emails || []).map((e) => e.email || '').filter(Boolean);

    // Collect phones
    const phones = card.phones || [];

    if (phones.length === 0 && emails.length === 0) {
      // No contact info — skip
      continue;
    }

    if (phones.length === 0) {
      // Email-only contact
      contacts.push({
        name,
        phone: '',
        email: emails[0] || '',
        address,
        notes,
        confidence: 0.7,
        warnings: ['No phone number in contact card'],
      });
      continue;
    }

    // Create a contact for each phone
    for (let i = 0; i < phones.length; i++) {
      const p = phones[i];
      const rawPhone = p.wa_id || p.phone || '';
      const warnings: string[] = [];
      let confidence = 0.7;

      // wa_id presence means WhatsApp-verified number
      if (p.wa_id) {
        confidence = 0.95;
      }

      let phone = rawPhone;
      if (rawPhone) {
        const normalized = normalizeNigerianPhone(rawPhone);
        phone = normalized.phone;
        if (!normalized.valid) {
          warnings.push(`Phone "${rawPhone}" may not be a valid Nigerian number`);
          // Only reduce confidence if no wa_id
          if (!p.wa_id) confidence -= 0.2;
        }
      }

      if (name) confidence = Math.min(1, confidence + 0.05);

      contacts.push({
        name: i === 0 ? name : `${name} (${i + 1})`.trim(),
        phone,
        email: i === 0 ? (emails[0] || '') : (emails[i] || ''),
        address,
        notes,
        confidence,
        warnings,
      });
    }
  }

  return contacts;
}
