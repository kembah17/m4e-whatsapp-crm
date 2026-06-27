import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

/**
 * GET /api/ai/analytics
 * AI chatbot performance metrics.
 *
 * Query params:
 *   - days: number of days to look back (default 30, max 90)
 */
export async function GET(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Fetch all logs in the period
    const { data: logs, error } = await supabase
      .from('ai_conversation_logs')
      .select('detected_intent, confidence, was_auto_replied, was_handed_off, latency_ms, created_at')
      .eq('account_id', accountId)
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    if (error) throw error

    const allLogs = logs ?? []
    const totalInteractions = allLogs.length
    const autoReplied = allLogs.filter(l => l.was_auto_replied).length
    const handedOff = allLogs.filter(l => l.was_handed_off).length

    // Average confidence (only for entries that have a confidence value)
    const withConfidence = allLogs.filter(l => l.confidence != null)
    const avgConfidence = withConfidence.length > 0
      ? withConfidence.reduce((sum, l) => sum + Number(l.confidence), 0) / withConfidence.length
      : 0

    // Average latency
    const withLatency = allLogs.filter(l => l.latency_ms != null)
    const avgLatencyMs = withLatency.length > 0
      ? Math.round(withLatency.reduce((sum, l) => sum + (l.latency_ms || 0), 0) / withLatency.length)
      : 0

    // Top intents
    const intentCounts: Record<string, number> = {}
    for (const l of allLogs) {
      const intent = l.detected_intent || 'unknown'
      intentCounts[intent] = (intentCounts[intent] || 0) + 1
    }
    const topIntents = Object.entries(intentCounts)
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Daily volume
    const dailyMap: Record<string, { count: number; auto_replied: number; handed_off: number }> = {}
    for (const l of allLogs) {
      const date = l.created_at.slice(0, 10) // YYYY-MM-DD
      if (!dailyMap[date]) {
        dailyMap[date] = { count: 0, auto_replied: 0, handed_off: 0 }
      }
      dailyMap[date].count++
      if (l.was_auto_replied) dailyMap[date].auto_replied++
      if (l.was_handed_off) dailyMap[date].handed_off++
    }
    const dailyVolume = Object.entries(dailyMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Confidence distribution
    const buckets = [
      { label: '0-0.3', min: 0, max: 0.3, count: 0 },
      { label: '0.3-0.5', min: 0.3, max: 0.5, count: 0 },
      { label: '0.5-0.7', min: 0.5, max: 0.7, count: 0 },
      { label: '0.7-0.9', min: 0.7, max: 0.9, count: 0 },
      { label: '0.9-1.0', min: 0.9, max: 1.01, count: 0 },
    ]
    for (const l of withConfidence) {
      const c = Number(l.confidence)
      for (const b of buckets) {
        if (c >= b.min && c < b.max) { b.count++; break }
      }
    }

    return NextResponse.json({
      totalInteractions,
      autoReplied,
      handedOff,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      avgLatencyMs,
      topIntents,
      dailyVolume,
      confidenceDistribution: buckets.map(b => ({ label: b.label, count: b.count })),
      period: { days, since },
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
