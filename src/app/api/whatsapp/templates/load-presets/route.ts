import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { STARTER_TEMPLATE_PRESETS } from '@/lib/whatsapp/template-presets';

/**
 * POST /api/whatsapp/templates/load-presets
 *
 * Bulk-loads starter template presets by submitting each one through
 * the existing /api/whatsapp/templates/submit route. This reuses all
 * validation, Meta API submission, and DB upsert logic.
 *
 * Skips presets whose name already exists in the account's templates
 * (checked via the submit route's upsert-on-conflict behaviour, but
 * we also pre-filter to avoid unnecessary network calls).
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, accountId } = await getCurrentAccount();

    // Check which presets already exist (by name) for this account
    const { data: existing } = await supabase
      .from('message_templates')
      .select('name')
      .eq('account_id', accountId);

    const existingNames = new Set((existing ?? []).map((t) => t.name));
    const toSubmit = STARTER_TEMPLATE_PRESETS.filter(
      (p) => !existingNames.has(p.name),
    );

    if (toSubmit.length === 0) {
      return NextResponse.json({
        submitted: 0,
        skipped: existingNames.size,
        message: 'All starter templates already exist',
      });
    }

    // Submit each preset through the existing template submission endpoint
    // to reuse all validation, Meta API calls, and DB upsert logic.
    let submitted = 0;
    const errors: string[] = [];

    for (const preset of toSubmit) {
      try {
        const submitUrl = new URL(
          '/api/whatsapp/templates/submit',
          req.url,
        );
        const res = await fetch(submitUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: req.headers.get('cookie') || '',
          },
          body: JSON.stringify({
            name: preset.name,
            category: preset.category,
            language: preset.language,
            body_text: preset.body_text,
            header_type: preset.header_type,
            header_content: preset.header_content,
            footer_text: preset.footer_text,
            buttons: preset.buttons,
          }),
        });

        if (res.ok) {
          submitted++;
        } else {
          const data = await res.json().catch(() => ({}));
          errors.push(
            `${preset.name}: ${data.error || `HTTP ${res.status}`}`,
          );
        }
      } catch (err) {
        errors.push(
          `${preset.name}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    }

    return NextResponse.json({
      submitted,
      skipped: existingNames.size,
      total: STARTER_TEMPLATE_PRESETS.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
