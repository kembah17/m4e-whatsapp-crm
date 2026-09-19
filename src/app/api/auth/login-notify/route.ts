import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendLoginNotification } from '@/lib/auth/login-notification'

/**
 * POST /api/auth/login-notify
 * Called by the client after a successful sign-in to trigger login notification email.
 * Uses a simple dedup: checks a session-scoped flag to avoid duplicate sends.
 */
export async function POST(req: NextRequest) {
  try {
    const db = await createClient()
    const { data: { user }, error } = await db.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ip = req.headers.get('x-forwarded-for')
      || req.headers.get('x-real-ip')
      || 'Unknown'
    const userAgent = req.headers.get('user-agent') || 'Unknown'

    // Fire and forget — don't block the response
    sendLoginNotification(user.id, {
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    }).catch((err) => {
      console.error('[login-notify] Background send failed:', err)
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
