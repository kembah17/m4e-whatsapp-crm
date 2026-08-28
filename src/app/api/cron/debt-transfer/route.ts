import { NextResponse, type NextRequest } from 'next/server'
import { autoTransferOverdueInvoices } from '@/lib/debt'

export const runtime = 'nodejs'

/**
 * GET /api/cron/debt-transfer
 * 
 * Automatically transfers overdue invoices to the debt book.
 * Runs on a schedule (recommended: daily at midnight).
 * 
 * Also marks existing debt entries and invoices as overdue
 * when past their due dates.
 * 
 * Requires CRON_SECRET for authentication.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await autoTransferOverdueInvoices()

    return NextResponse.json({
      success: true,
      transferred: result.transferred,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron/debt-transfer] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
