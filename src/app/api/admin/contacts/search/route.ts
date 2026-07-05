import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = supabaseAdmin()
    const { data: profile } = await db
      .from('profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single()
    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    if (q.length < 2) {
      return NextResponse.json({ contacts: [] })
    }

    const { data, error } = await db
      .from('contacts')
      .select('id, name, phone, email, bsuid, whatsapp_username, tags, status, account_id')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(20)

    if (error) throw error
    return NextResponse.json({ contacts: data ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
