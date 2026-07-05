import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseVCard } from '@/lib/import/vcard-parser';
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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Upload a .vcf file.' },
        { status: 400 },
      );
    }

    const text = await file.text();
    if (!text.toUpperCase().includes('BEGIN:VCARD')) {
      return NextResponse.json(
        { error: 'Invalid vCard file. Must contain BEGIN:VCARD blocks.' },
        { status: 400 },
      );
    }

    let contacts = parseVCard(text);
    const originalCount = contacts.length;
    const limit = IMPORT_LIMITS.web.vcf.perFile;
    let truncated = false;
    let warning: string | undefined;

    if (contacts.length > limit) {
      warning = `File contained ${originalCount.toLocaleString()} contacts. Only the first ${limit.toLocaleString()} were imported. Please upload the remaining contacts in a separate file.`;
      contacts = contacts.slice(0, limit);
      truncated = true;
    }

    return NextResponse.json({
      contacts,
      total: contacts.length,
      originalCount,
      truncated,
      ...(warning && { warning }),
      source: 'vcf',
    });
  } catch (err) {
    console.error('[vcf-import] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'VCF processing failed' },
      { status: 500 },
    );
  }
}
