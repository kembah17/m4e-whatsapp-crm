import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'

/** GET: Check if login notifications are enabled */
export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const db = await createClient()

    const { data, error } = await db
      .from('profiles')
      .select('login_notifications')
      .eq('user_id', ctx.userId)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      enabled: data?.login_notifications ?? false,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/** PUT: Toggle login notifications */
export async function PUT(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount()
    const body = await req.json()
    const enabled = Boolean(body.enabled)

    const db = await createClient()

    const { error } = await db
      .from('profiles')
      .update({ login_notifications: enabled })
      .eq('user_id', ctx.userId)

    if (error) throw error

    return NextResponse.json({ enabled })
  } catch (err) {
    return toErrorResponse(err)
  }
}
