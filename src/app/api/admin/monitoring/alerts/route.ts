import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function GET() {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('system_alerts')
    .select('*')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ alerts: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { alertId: string; resolved: boolean }

    if (!body.alertId) {
      return NextResponse.json({ error: 'alertId is required' }, { status: 400 })
    }

    const db = supabaseAdmin()

    if (body.resolved) {
      const { error } = await db
        .from('system_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', body.alertId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 }
    )
  }
}
