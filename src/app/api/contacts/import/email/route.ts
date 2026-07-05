import { NextRequest, NextResponse } from 'next/server';

/**
 * Brevo inbound email webhook handler (stub).
 *
 * When fully implemented, this will:
 * 1. Receive inbound emails forwarded by Brevo
 * 2. Parse attachments (vCard, Excel, CSV)
 * 3. Process through document-processor
 * 4. Create import sessions for the account
 *
 * For now, it logs the payload and returns 200 so Brevo
 * doesn't retry.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[email-import] Inbound email received:', {
      from: body?.From,
      subject: body?.Subject,
      attachmentCount: body?.Attachments?.length ?? 0,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ status: 'received' });
  } catch (err) {
    console.error('[email-import] error:', err);
    // Always return 200 to prevent Brevo retries
    return NextResponse.json({ status: 'error', message: 'Parse failed' });
  }
}
