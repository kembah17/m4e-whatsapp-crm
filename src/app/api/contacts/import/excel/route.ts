import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseExcel } from '@/lib/import/excel-parser';
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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Upload an .xlsx or .xls file.' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = parseExcel(buffer);

    return NextResponse.json({
      contacts: result.contacts,
      warnings: result.warnings,
      total: result.contacts.length,
      source: 'excel',
    });
  } catch (err) {
    console.error('[excel-import] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Excel processing failed' },
      { status: 500 },
    );
  }
}
