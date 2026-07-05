import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processSpreadsheetText } from '@/lib/import/ocr-processor';
import { IMPORT_LIMITS } from '@/lib/import/import-limits';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const rlIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`contactImport:${rlIp}`, RATE_LIMITS.contactImport);
    if (!rl.success) return rateLimitResponse(rl);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { content, headers } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content (string) is required' },
        { status: 400 },
      );
    }

    const result = processSpreadsheetText({
      content,
      headers: headers || undefined,
    });

    const limit = IMPORT_LIMITS.web.csv.perFile;
    let contacts = result.contacts;
    const originalCount = contacts.length;
    let truncated = false;
    let warning: string | undefined;

    if (contacts.length > limit) {
      warning = `File contained ${originalCount.toLocaleString()} contacts. Only the first ${limit.toLocaleString()} were imported. Please upload the remaining contacts in a separate file.`;
      contacts = contacts.slice(0, limit);
      truncated = true;
    }

    return NextResponse.json({
      contacts,
      warnings: result.warnings,
      total: contacts.length,
      originalCount,
      truncated,
      ...(warning && { warning }),
      limit,
      source: 'csv',
    });
  } catch (err) {
    console.error('[csv-import] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'CSV parsing failed' },
      { status: 500 },
    );
  }
}
