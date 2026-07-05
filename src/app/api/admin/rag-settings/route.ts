import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { createClient } from '@/lib/supabase/server'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const db = supabaseAdmin()
  const { data: profile } = await db
    .from('profiles')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .single()
  if (!profile?.is_super_admin) throw new Error('Forbidden')
  return { userId: user.id, db }
}

export async function GET() {
  try {
    const { db } = await requireSuperAdmin()
    const { data, error } = await db
      .from('global_rag_settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (error) throw error
    return NextResponse.json({ settings: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, db } = await requireSuperAdmin()
    const body = await request.json()
    const { active_model, active_dimensions } = body

    if (!active_model || !active_dimensions) {
      return NextResponse.json({ error: 'active_model and active_dimensions required' }, { status: 400 })
    }

    const { data, error } = await db
      .from('global_rag_settings')
      .update({
        active_model,
        active_dimensions,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', 1)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ settings: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
