import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since') || undefined

    let query = ctx.supabase
      .from('message_sentiments')
      .select('sentiment, score, confidence, analyzed_at')
      .eq('account_id', ctx.accountId)
      .order('analyzed_at', { ascending: false })
      .limit(1000)

    if (since) query = query.gte('analyzed_at', since)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const sentiments = data || []
    const distribution = {
      positive: sentiments.filter((s) => s.sentiment === 'positive').length,
      neutral: sentiments.filter((s) => s.sentiment === 'neutral').length,
      negative: sentiments.filter((s) => s.sentiment === 'negative').length,
      urgent: sentiments.filter((s) => s.sentiment === 'urgent').length,
    }
    const total = sentiments.length
    const avgScore = total > 0
      ? Math.round((sentiments.reduce((sum, s) => sum + (s.score || 0), 0) / total) * 100) / 100
      : 0

    // Flagged conversations (negative + urgent)
    const flaggedQuery = ctx.supabase
      .from('message_sentiments')
      .select('conversation_id, sentiment, score, analyzed_at, contact_id')
      .eq('account_id', ctx.accountId)
      .in('sentiment', ['negative', 'urgent'])
      .order('analyzed_at', { ascending: false })
      .limit(20)

    const { data: flagged } = await flaggedQuery

    return NextResponse.json({
      distribution,
      total,
      avgScore,
      flagged: flagged || [],
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
