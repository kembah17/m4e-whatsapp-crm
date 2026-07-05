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
    const contactId = searchParams.get('id')
    if (!contactId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const [convRes, msgRes, dealRes] = await Promise.all([
      db.from('conversations').select('*', { count: 'exact', head: true }).eq('contact_id', contactId),
      db.from('messages').select('*', { count: 'exact', head: true }).eq('contact_id', contactId),
      db.from('deals').select('*', { count: 'exact', head: true }).eq('contact_id', contactId),
    ])

    return NextResponse.json({
      conversations: convRes.count ?? 0,
      messages: msgRes.count ?? 0,
      deals: dealRes.count ?? 0,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
