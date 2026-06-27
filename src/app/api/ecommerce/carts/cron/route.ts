import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { detectAbandonedCarts } from '@/lib/ecommerce/cart-abandonment'

/**
 * POST /api/ecommerce/carts/cron
 * Detect abandoned carts and fire campaign triggers.
 * Called by an external cron service (e.g., Vercel Cron, GitHub Actions).
 */
export async function POST(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = supabaseAdmin()
    const abandonedCount = await detectAbandonedCarts(db)

    return NextResponse.json({
      success: true,
      abandoned_carts_detected: abandonedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[carts/cron] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
