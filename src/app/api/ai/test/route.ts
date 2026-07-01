import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { detectIntentAndRespond } from '@/lib/ai/intent-detector'
import { searchKnowledgeBase } from '@/lib/ai/knowledge-base'
import { supabaseAdmin } from '@/lib/ai/admin-client'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/ai/test
 * Test the AI chatbot with a message.
 * Does NOT send any WhatsApp messages — just returns what the AI would respond.
 *
 * Body: { message: string, contactName?: string }
 */
export async function POST(request: Request) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`ai:${rlIp}`, RATE_LIMITS.ai);
    if (!rl.success) return rateLimitResponse(rl);

    const { accountId, supabase } = await getCurrentAccount()
    const body = await request.json()

    const message = body.message?.trim()
    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    const contactName = body.contactName?.trim() || 'Test User'

    // Get config
    const { data: config } = await supabase
      .from('ai_chatbot_config')
      .select('*')
      .eq('account_id', accountId)
      .maybeSingle()

    if (!config) {
      return NextResponse.json(
        { error: 'AI chatbot not configured. Please save settings first.' },
        { status: 404 },
      )
    }

    const startTime = Date.now()
    const db = supabaseAdmin()

    // Search knowledge base
    const kbResult = await searchKnowledgeBase(db, accountId, message)

    // Call LLM
    const aiResult = await detectIntentAndRespond({
      messageText: message,
      contactName,
      systemPrompt: config.system_prompt,
      knowledgeContext: kbResult?.answer || null,
      model: config.model,
      maxTokens: config.max_tokens,
      temperature: config.temperature,
    })

    const latencyMs = Date.now() - startTime

    return NextResponse.json({
      intent: aiResult.intent,
      confidence: aiResult.confidence,
      response: aiResult.response,
      knowledgeMatch: kbResult
        ? { question: kbResult.question, answer: kbResult.answer }
        : null,
      model: config.model,
      latencyMs,
      tokensUsed: aiResult.tokensUsed,
      meetsThreshold: aiResult.confidence >= config.confidence_threshold,
      confidenceThreshold: config.confidence_threshold,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
