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

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.account_id) {
      return NextResponse.json(
        { error: 'No account found' },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'A Google Sheets URL is required' },
        { status: 400 },
      );
    }

    // Validate it looks like a Google Sheets URL
    if (!url.includes('docs.google.com/spreadsheets')) {
      return NextResponse.json(
        { error: 'URL must be a Google Sheets link (docs.google.com/spreadsheets/...)' },
        { status: 400 },
      );
    }

    // Extract the spreadsheet ID and build CSV export URL
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      return NextResponse.json(
        { error: 'Could not extract spreadsheet ID from URL. Make sure the sheet is shared publicly.' },
        { status: 400 },
      );
    }

    const spreadsheetId = match[1];
    // Try to extract gid for specific sheet tab
    const gidMatch = url.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    // Fetch the CSV
    const csvResponse = await fetch(csvUrl, {
      headers: { 'Accept': 'text/csv' },
      signal: AbortSignal.timeout(15000),
    });

    if (!csvResponse.ok) {
      return NextResponse.json(
        {
          error: csvResponse.status === 404
            ? 'Spreadsheet not found. Make sure it exists and is shared publicly (Anyone with the link can view).'
            : `Failed to fetch spreadsheet (HTTP ${csvResponse.status}). Ensure the sheet is shared publicly.`,
        },
        { status: 400 },
      );
    }

    const csvText = await csvResponse.text();

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: 'The spreadsheet appears to be empty' },
        { status: 400 },
      );
    }

    const result = processSpreadsheetText(csvText);
    const limit = IMPORT_LIMITS.web.googleSheets.perSheet;
    let contacts = result.contacts;
    const originalCount = contacts.length;
    let truncated = false;
    let warning: string | undefined;

    if (contacts.length > limit) {
      warning = `Sheet contained ${originalCount.toLocaleString()} rows. Only the first ${limit.toLocaleString()} were imported. Split your data across multiple sheets for the rest.`;
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
      source: 'google-sheets',
    });
  } catch (err) {
    console.error('[google-sheets-import] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Google Sheets import failed' },
      { status: 500 },
    );
  }
}
