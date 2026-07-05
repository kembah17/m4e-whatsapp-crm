// ============================================================
// WhatsApp Import Bridge
//
// Main orchestrator for importing contacts via WhatsApp.
// Routes incoming messages to appropriate parsers, manages
// import sessions, and handles the confirmation flow.
// ============================================================

import { sendTextMessage } from '@/lib/whatsapp/meta-api';
import { getMediaUrl, downloadMedia } from '@/lib/whatsapp/meta-api';
import type { ExtractedContact } from '@/lib/import/ocr-processor';
import { processSpreadsheetText, processImageForContacts } from '@/lib/import/ocr-processor';
import { parseContactCards, type WhatsAppContactCard } from '@/lib/import/contact-card-parser';
import { processDocument } from '@/lib/import/document-processor';
import {
  getActiveSession,
  createSession,
  addContacts,
  generatePreview,
  confirmSession,
  cancelSession,
  type ImportSession,
  type ValidationSummary,
} from '@/lib/import/import-session';
import { createClient } from '@supabase/supabase-js';
import { normalizeNigerianPhone } from '@/lib/import/ocr-processor';

// ── Admin Client (singleton) ────────────────────────────────

let _adminClient: ReturnType<typeof createClient> | null = null;
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminClient;
}

// ── Types ────────────────────────────────────────────────────

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
  audio?: { id: string; mime_type: string };
  contacts?: WhatsAppContactCard[];
  [key: string]: unknown;
}

export interface HandleImportParams {
  accountId: string;
  conversationId: string;
  contactId: string;
  message: WhatsAppMessage;
  accessToken: string;
  phoneNumberId: string;
  senderPhone: string;
}

// ── Import Trigger Detection ────────────────────────────────

const IMPORT_KEYWORDS = [
  'import',
  'import contacts',
  'add contacts',
  'upload contacts',
  'bulk import',
  'import list',
];

export function isImportTrigger(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return IMPORT_KEYWORDS.some((kw) => lower === kw || lower.startsWith(kw + ' '));
}

// ── Confirmation Commands ───────────────────────────────────

const CONFIRM_COMMANDS = ['yes', 'confirm', 'ok', 'proceed', 'go', 'save', 'done'];
const CANCEL_COMMANDS = ['no', 'cancel', 'stop', 'abort', 'exit', 'quit'];
const ADD_MORE_COMMANDS = ['more', 'add more', 'continue', 'another'];

function isConfirmCommand(text: string): boolean {
  return CONFIRM_COMMANDS.includes(text.toLowerCase().trim());
}

function isCancelCommand(text: string): boolean {
  return CANCEL_COMMANDS.includes(text.toLowerCase().trim());
}

function isAddMoreCommand(text: string): boolean {
  return ADD_MORE_COMMANDS.some((cmd) => text.toLowerCase().trim().startsWith(cmd));
}

// ── Reply Helper ────────────────────────────────────────────

async function reply(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<void> {
  try {
    await sendTextMessage({ phoneNumberId, accessToken, to, text });
  } catch (err) {
    console.error('[import-bridge] reply error:', err);
  }
}

// ── Bulk Import Logic ───────────────────────────────────────

async function bulkImportContacts(
  session: ImportSession,
  accountId: string
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const contacts: ExtractedContact[] = session.collected_contacts || [];
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const phoneSet = new Set<string>();

  for (const c of contacts) {
    try {
      // Skip invalid contacts
      if (!c.phone && !c.email) {
        skipped++;
        continue;
      }

      // Skip duplicates within this batch
      if (c.phone && phoneSet.has(c.phone)) {
        skipped++;
        continue;
      }
      if (c.phone) phoneSet.add(c.phone);

      // Check if contact already exists in DB
      if (c.phone) {
        const { data: existing } = await supabaseAdmin()
          .from('contacts')
          .select('id')
          .eq('account_id', accountId)
          .eq('phone', c.phone)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }
      }

      // Insert new contact
      const { error: insertErr } = await supabaseAdmin()
        .from('contacts')
        .insert({
          account_id: accountId,
          name: c.name || 'Imported Contact',
          phone: c.phone || null,
          email: c.email || null,
          address: c.address || null,
          notes: c.notes || null,
          status: 'active',
          tags: ['imported', `import-${new Date().toISOString().slice(0, 10)}`],
        });

      if (insertErr) {
        errors.push(`Failed to import ${c.name || c.phone}: ${insertErr.message}`);
      } else {
        imported++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Error importing ${c.name || c.phone}: ${msg}`);
    }
  }

  return { imported, skipped, errors };
}

// ── Format Preview Message ──────────────────────────────────

function formatPreview(summary: ValidationSummary): string {
  const lines = [
    `\u{1F4CB} *Import Preview*`,
    ``,
    `Total contacts: ${summary.total}`,
    `\u{2705} Valid: ${summary.valid}`,
    `\u{1F501} Duplicates: ${summary.duplicates}`,
    `\u{274C} Invalid: ${summary.invalid}`,
    ``,
    `Confidence:`,
    `  \u{1F7E2} High: ${summary.byConfidence.high}`,
    `  \u{1F7E1} Medium: ${summary.byConfidence.medium}`,
    `  \u{1F534} Low: ${summary.byConfidence.low}`,
    ``,
    `Reply *YES* to import ${summary.valid} contacts`,
    `Reply *MORE* to add more contacts`,
    `Reply *CANCEL* to discard`,
  ];
  return lines.join('\n');
}

// ── Main Handler ────────────────────────────────────────────

export async function handleImportMessage(params: HandleImportParams): Promise<void> {
  const {
    accountId,
    conversationId,
    contactId,
    message,
    accessToken,
    phoneNumberId,
    senderPhone,
  } = params;

  const send = (text: string) => reply(phoneNumberId, accessToken, senderPhone, text);

  try {
    // Get or create session
    let session = await getActiveSession(accountId, conversationId);

    // ── Handle text commands for existing sessions ──────────
    if (session && message.type === 'text' && message.text?.body) {
      const text = message.text.body.trim();

      // Confirmation flow
      if (session.status === 'previewing') {
        if (isConfirmCommand(text)) {
          await confirmSession(session.id);
          await send('\u{23F3} Importing contacts... Please wait.');

          const result = await bulkImportContacts(session, accountId);

          const lines = [
            `\u{2705} *Import Complete!*`,
            ``,
            `Imported: ${result.imported}`,
            `Skipped: ${result.skipped}`,
          ];
          if (result.errors.length > 0) {
            lines.push(`Errors: ${result.errors.length}`);
            lines.push(``);
            // Show first 3 errors
            for (const e of result.errors.slice(0, 3)) {
              lines.push(`\u{26A0} ${e}`);
            }
          }
          await send(lines.join('\n'));
          return;
        }

        if (isCancelCommand(text)) {
          await cancelSession(session.id);
          await send('\u{274C} Import cancelled. All collected contacts have been discarded.');
          return;
        }

        if (isAddMoreCommand(text)) {
          // Move back to collecting
          await supabaseAdmin()
            .from('import_sessions')
            .update({ status: 'collecting', updated_at: new Date().toISOString() })
            .eq('id', session.id);
          await send('\u{1F4E5} Send more contacts — photos, files, contact cards, or text.');
          return;
        }
      }

      // Check for DONE command during collecting
      if (session.status === 'collecting' && text.toLowerCase() === 'done') {
        if ((session.collected_contacts || []).length === 0) {
          await send('\u{26A0} No contacts collected yet. Send contacts first, then type *DONE*.');
          return;
        }
        const summary = await generatePreview(session.id);
        if (summary) {
          await send(formatPreview(summary));
        } else {
          await send('\u{26A0} Error generating preview. Please try again.');
        }
        return;
      }

      // Check for cancel during collecting
      if (session.status === 'collecting' && isCancelCommand(text)) {
        await cancelSession(session.id);
        await send('\u{274C} Import cancelled.');
        return;
      }
    }

    // ── Create new session if this is a trigger ─────────────
    if (!session) {
      if (message.type === 'text' && message.text?.body && isImportTrigger(message.text.body)) {
        session = await createSession(accountId, conversationId, contactId, 'whatsapp');
        if (!session) {
          await send('\u{26A0} Could not start import session. Please try again.');
          return;
        }
        await send(
          `\u{1F4E5} *Import Mode Active*\n\n` +
          `Send me contacts in any format:\n` +
          `\u{1F4F7} Photos of contact lists or business cards\n` +
          `\u{1F4CE} Excel, CSV, or vCard files\n` +
          `\u{1F464} WhatsApp contact cards\n` +
          `\u{1F4DD} Typed or pasted text\n\n` +
          `Type *DONE* when finished, or *CANCEL* to abort.\n` +
          `Session expires in 30 minutes.`
        );
        return;
      }

      // Contact cards without an active session — auto-create session
      if (message.type === 'contacts' && message.contacts) {
        session = await createSession(accountId, conversationId, contactId, 'whatsapp');
        if (!session) {
          await send('\u{26A0} Could not start import session. Please try again.');
          return;
        }
        await send('\u{1F4E5} *Import Mode Active* — Processing contact cards...');
        // Fall through to contact processing below
      }

      if (!session) return;
    }

    // ── Route by message type ───────────────────────────────

    // Contact cards
    if (message.type === 'contacts' && message.contacts) {
      const contacts = parseContactCards(message.contacts);
      if (contacts.length === 0) {
        await send('\u{26A0} No valid contacts found in the shared contact cards.');
        return;
      }
      const result = await addContacts(session.id, contacts, 'contact-card');
      await send(
        `\u{2705} Extracted ${contacts.length} contact(s) from card(s).\n` +
        `Total collected: ${result?.total || contacts.length}\n\n` +
        `Send more or type *DONE* to preview.`
      );
      return;
    }

    // Document (Excel, CSV, vCard, PDF)
    if (message.type === 'document' && message.document) {
      const { id: mediaId, mime_type: mimeType, filename } = message.document;
      await send(`\u{1F4CE} Processing ${filename || 'document'}...`);

      try {
        const { url } = await getMediaUrl({ mediaId, accessToken });
        const { buffer, contentType } = await downloadMedia({ downloadUrl: url, accessToken });
        const { contacts, warnings } = await processDocument(
          buffer,
          contentType || mimeType,
          accountId
        );

        if (contacts.length === 0) {
          const msg = warnings.length > 0
            ? `\u{26A0} No contacts found. ${warnings[0]}`
            : '\u{26A0} No contacts could be extracted from this document.';
          await send(msg);
          return;
        }

        const result = await addContacts(session.id, contacts, `document:${mimeType}`);
        let msg = `\u{2705} Extracted ${contacts.length} contact(s) from ${filename || 'document'}.\n` +
          `Total collected: ${result?.total || contacts.length}`;
        if (warnings.length > 0) {
          msg += `\n\u{26A0} ${warnings[0]}`;
        }
        msg += `\n\nSend more or type *DONE* to preview.`;
        await send(msg);
      } catch (err) {
        console.error('[import-bridge] document processing error:', err);
        await send('\u{26A0} Error processing document. Please try a different format.');
      }
      return;
    }

    // Image (OCR)
    if (message.type === 'image' && message.image) {
      const { id: mediaId, mime_type: mimeType } = message.image;
      await send('\u{1F50D} Scanning image for contacts...');

      try {
        const { url } = await getMediaUrl({ mediaId, accessToken });
        const { buffer } = await downloadMedia({ downloadUrl: url, accessToken });
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;
        const contacts = await processImageForContacts(dataUrl, accountId);

        if (contacts.length === 0) {
          await send('\u{26A0} No contacts found in this image. Try a clearer photo.');
          return;
        }

        const result = await addContacts(session.id, contacts, 'image-ocr');
        await send(
          `\u{2705} Extracted ${contacts.length} contact(s) from image.\n` +
          `Total collected: ${result?.total || contacts.length}\n\n` +
          `Send more or type *DONE* to preview.`
        );
      } catch (err) {
        console.error('[import-bridge] image OCR error:', err);
        await send('\u{26A0} Error scanning image. Please try again with a clearer photo.');
      }
      return;
    }

    // Text (try to parse as contacts)
    if (message.type === 'text' && message.text?.body) {
      const text = message.text.body.trim();

      // Skip if it's a command we already handled
      if (isImportTrigger(text) || isConfirmCommand(text) || isCancelCommand(text) ||
          isAddMoreCommand(text) || text.toLowerCase() === 'done') {
        return;
      }

      // Try to parse as contact data
      const contacts = processSpreadsheetText(text);
      if (contacts.length === 0) {
        // Check if it looks like it might contain phone numbers
        const phoneRegex = /(?:\+?234|0)[789]0?\d{7,8}/g;
        const phones = text.match(phoneRegex);
        if (phones && phones.length > 0) {
          const extracted: ExtractedContact[] = phones.map((p) => {
            const { phone, valid } = normalizeNigerianPhone(p);
            return {
              name: '',
              phone,
              email: '',
              address: '',
              notes: '',
              confidence: valid ? 0.6 : 0.3,
              warnings: valid ? [] : [`Phone "${p}" may not be valid`],
            };
          });
          const result = await addContacts(session.id, extracted, 'text-phones');
          await send(
            `\u{2705} Found ${extracted.length} phone number(s).\n` +
            `Total collected: ${result?.total || extracted.length}\n\n` +
            `Send more or type *DONE* to preview.`
          );
        } else {
          await send(
            '\u{26A0} Could not extract contacts from that text.\n' +
            'Try sending:\n' +
            '\u{2022} Contact cards\n' +
            '\u{2022} Photos of contact lists\n' +
            '\u{2022} Excel/CSV files\n' +
            '\u{2022} Text with phone numbers'
          );
        }
        return;
      }

      const result = await addContacts(session.id, contacts, 'text-paste');
      await send(
        `\u{2705} Extracted ${contacts.length} contact(s) from text.\n` +
        `Total collected: ${result?.total || contacts.length}\n\n` +
        `Send more or type *DONE* to preview.`
      );
      return;
    }

    // Unsupported message type in import mode
    await send(
      '\u{26A0} This message type is not supported for import.\n' +
      'Send contacts, photos, documents, or text.'
    );
  } catch (err) {
    console.error('[import-bridge] handleImportMessage error:', err);
    // Don\'t send error to user — let it fall through to normal processing
    throw err;
  }
}
