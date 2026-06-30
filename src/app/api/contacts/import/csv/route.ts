import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processSpreadsheetText } from '@/lib/import/ocr-processor';

export async function POST(req: NextRequest) {
  try {
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

    return NextResponse.json(result);
  } catch (err) {
    console.error('[csv-import] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'CSV parsing failed' },
      { status: 500 },
    );
  }
}
