import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getCurrentAccount()
    const { id } = await params
    const { data, error } = await adminClient
      .from('branch_members').select('id, profile_id, role, created_at').eq('branch_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const profileIds = (data ?? []).map((m) => m.profile_id)
    let profiles: Record<string, { full_name: string; email: string }> = {}
    if (profileIds.length > 0) {
      const { data: pData } = await adminClient
        .from('profiles').select('id, full_name, email').in('id', profileIds)
      profiles = Object.fromEntries((pData ?? []).map((p) => [p.id, p]))
    }
    const members = (data ?? []).map((m) => ({
      id: m.id, profile_id: m.profile_id, role: m.role ?? 'agent',
      full_name: profiles[m.profile_id]?.full_name ?? 'Unknown',
      email: profiles[m.profile_id]?.email ?? '',
    }))
    return NextResponse.json({ members })
  } catch (err) { return toErrorResponse(err) }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    const body = await request.json()
    if (!body.email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const { data: profile } = await ctx.supabase
      .from('profiles').select('id').eq('email', body.email)
      .eq('account_id', ctx.accountId).maybeSingle()
    if (!profile) return NextResponse.json({ error: 'No team member found with that email' }, { status: 404 })

    const { error } = await ctx.supabase.from('branch_members').insert({
      branch_id: id, profile_id: profile.id, role: body.role ?? 'agent',
    })
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Already assigned' }, { status: 409 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) { return toErrorResponse(err) }
}
