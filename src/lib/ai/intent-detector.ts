// ============================================================
// Intent detection + response generation via OpenRouter LLM.
//
// Called by the chatbot engine after knowledge-base lookup.
// Returns a structured { intent, confidence, response } object
// that the engine uses to decide whether to auto-reply or
// hand off to a human agent.
// ============================================================

import { trackAIUsage } from './usage-tracker'

interface DetectionInput {
  messageText: string
  contactName: string
  systemPrompt: string
  knowledgeContext: string | null
  model: string
  maxTokens: number
  temperature: number
}

interface DetectionOutput {
  intent: string
  confidence: number
  response: string
  tokensUsed: number
}

/**
 * Call OpenRouter to detect intent and generate a response.
 *
 * The LLM is instructed to return JSON with { intent, confidence, response }.
 * If the API call fails or the response is malformed, we return a
 * low-confidence fallback so the engine hands off to a human.
 */
export async function detectIntentAndRespond(input: DetectionInput): Promise<DetectionOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.error('[ai-intent] OPENROUTER_API_KEY not configured')
    return {
      intent: 'error',
      confidence: 0,
      response: '',
      tokensUsed: 0,
    }
  }

  const systemContent = buildSystemPrompt(input.systemPrompt, input.knowledgeContext)

  const messages = [
    { role: 'system' as const, content: systemContent },
    {
      role: 'user' as const,
      content: `Customer name: ${input.contactName}
Customer message: ${input.messageText}`,
    },
  ]

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://m4e-crm.vercel.app',
      },
      body: JSON.stringify({
        model: input.model,
        messages,
        max_tokens: input.maxTokens,
        temperature: input.temperature,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown')
      console.error(`[ai-intent] OpenRouter ${response.status}: ${errText}`)
      return { intent: 'api_error', confidence: 0, response: '', tokensUsed: 0 }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const tokensUsed =
      (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0)

    // Parse the JSON response from the LLM
    const parsed = parseAIResponse(content)

    return {
      intent: parsed.intent,
      confidence: parsed.confidence,
      response: parsed.response,
      tokensUsed,
    }
  } catch (err) {
    console.error('[ai-intent] fetch error:', err)
    return { intent: 'network_error', confidence: 0, response: '', tokensUsed: 0 }
  }
}

/**
 * Build the system prompt with knowledge context and JSON format instructions.
 */
function buildSystemPrompt(basePrompt: string, knowledgeContext: string | null): string {
  let prompt = basePrompt + '\n\n'
  prompt += 'IMPORTANT: You must respond in valid JSON format with exactly these fields:\n'
  prompt += '- "intent": a short snake_case label for the customer\'s intent (e.g., "product_inquiry", "order_status", "complaint", "greeting", "pricing", "shipping", "returns", "general_question", "out_of_scope")\n'
  prompt += '- "confidence": a number between 0 and 1 indicating how confident you are in your response\n'
  prompt += '- "response": your response to the customer (plain text, not JSON, keep it concise and friendly)\n\n'

  if (knowledgeContext) {
    prompt += 'KNOWLEDGE BASE CONTEXT (use this to answer if relevant):\n'
    prompt += knowledgeContext + '\n\n'
  }

  prompt += 'If you cannot answer confidently, set confidence below 0.5 and suggest connecting with a human agent.\n'
  prompt += 'Keep responses under 300 words. Use simple English appropriate for WhatsApp messaging.'

  return prompt
}

/**
 * Parse the LLM's JSON response, handling malformed output gracefully.
 */
function parseAIResponse(content: string): { intent: string; confidence: number; response: string } {
  try {
    // Try direct JSON parse first
    const parsed = JSON.parse(content)
    return {
      intent: typeof parsed.intent === 'string' ? parsed.intent : 'unknown',
      confidence: typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
      response: typeof parsed.response === 'string' ? parsed.response : content,
    }
  } catch {
    // If JSON parse fails, try to extract JSON from the content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          intent: typeof parsed.intent === 'string' ? parsed.intent : 'unknown',
          confidence: typeof parsed.confidence === 'number'
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0.5,
          response: typeof parsed.response === 'string' ? parsed.response : content,
        }
      } catch {
        // Fall through to default
      }
    }

    // Last resort: treat the whole content as the response with low confidence
    return {
      intent: 'parse_error',
      confidence: 0.3,
      response: content.slice(0, 500),
    }
  }
}
