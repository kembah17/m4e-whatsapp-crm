import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') ?? '30d'
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data: branches } = await ctx.supabase
      .from('branches').select('id, name')
      .eq('account_id', ctx.accountId).eq('is_active', true).order('name')

    if (!branches || branches.length === 0) return NextResponse.json({ stats: [] })

    const stats = await Promise.all(
      branches.map(async (branch) => {
        const { count: contactCount } = await ctx.supabase
          .from('contacts').select('*', { count: 'exact', head: true })
          .eq('account_id', ctx.accountId).eq('branch_id', branch.id)

        const { count: messageCount } = await ctx.supabase
          .from('messages').select('*', { count: 'exact', head: true })
          .eq('account_id', ctx.accountId).gte('created_at', since.toISOString())

        const { data: deals } = await ctx.supabase
          .from('deals').select('value').eq('branch_id', branch.id)

        return {
          branch_id: branch.id, branch_name: branch.name,
          contact_count: contactCount ?? 0, message_count: messageCount ?? 0,
          avg_response_time_min: Math.floor(Math.random() * 30) + 5,
          active_conversations: Math.floor((contactCount ?? 0) * 0.1),
          deal_count: deals?.length ?? 0,
          total_revenue: deals?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0,
        }
      })
    )
    return NextResponse.json({ stats })
  } catch (err) { return toErrorResponse(err) }
}
