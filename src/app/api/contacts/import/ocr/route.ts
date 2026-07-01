import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processImageForContacts } from '@/lib/import/ocr-processor';
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

    // Get account_id from profile
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
    const { imageBase64, mimeType } = body;

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: 'imageBase64 and mimeType are required' },
        { status: 400 },
      );
    }

    const result = await processImageForContacts({
      imageBase64,
      mimeType,
      accountId: profile.account_id,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[ocr-import] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'OCR processing failed' },
      { status: 500 },
    );
  }
}
