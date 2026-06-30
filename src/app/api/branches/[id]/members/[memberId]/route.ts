import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { memberId } = await params
    const { error } = await ctx.supabase.from('branch_members').delete().eq('id', memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) { return toErrorResponse(err) }
}
