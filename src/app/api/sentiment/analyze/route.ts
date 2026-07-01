import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { analyzeSentiment } from '@/lib/ai/sentiment-analyzer'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`sentimentAnalyze:${rlIp}`, RATE_LIMITS.sentimentAnalyze);
    if (!rl.success) return rateLimitResponse(rl);

    await requireRole('admin')
    const body = await request.json()
    const { messageText, contactName, conversationContext } = body

    if (!messageText) {
      return NextResponse.json({ error: 'messageText is required' }, { status: 400 })
    }

    const result = await analyzeSentiment({ messageText, contactName, conversationContext })
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}
