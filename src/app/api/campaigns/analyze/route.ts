import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user's account_id
  const { data: member } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!member) return NextResponse.json({ error: 'No account found' }, { status: 404 })

  const { data, error } = await supabase.rpc('analyze_database_for_reactivation', {
    p_account_id: member.account_id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ analysis: data })
}
