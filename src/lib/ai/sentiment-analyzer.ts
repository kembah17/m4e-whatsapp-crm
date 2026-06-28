/**
 * AI-powered sentiment analysis using OpenRouter.
 * Same pattern as intent-detector.ts.
 * Includes Nigerian Pidgin awareness.
 */

import { createClient } from '@supabase/supabase-js'
import { keywordBasedSentiment } from './sentiment-keywords'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
  score: number
  confidence: number
  keywords: string[]
  suggestedAction?: string
}

interface AnalyzeOpts {
  messageText: string
  contactName?: string
  conversationContext?: string
}

const SENTIMENT_PROMPT = `You are a sentiment analysis engine for a Nigerian business WhatsApp CRM.
Analyze the customer message and return JSON with:
- sentiment: "positive" | "neutral" | "negative" | "urgent"
- score: number from -1 (very negative) to 1 (very positive), 0 for neutral
- confidence: number from 0 to 1
- keywords: array of key emotional words/phrases found
- suggestedAction: optional string suggesting what the business should do

IMPORTANT:
- Understand Nigerian Pidgin English (e.g., "wahala" = trouble, "abeg" = please, "una" = you all)
- "urgent" sentiment is for messages needing immediate attention (threats, emergencies, legal)
- Consider cultural context of Nigerian business communication
- Short messages like "ok" or "yes" are neutral
- Be accurate with confidence scores

Return ONLY valid JSON, no other text.`

/**
 * Analyze sentiment of a message using AI (OpenRouter).
 * Falls back to keyword-based detection if AI fails.
 */
export async function analyzeSentiment(opts: AnalyzeOpts): Promise<SentimentResult> {
  const { messageText, contactName, conversationContext } = opts
  const apiKey = process.env.OPENROUTER_API_KEY

  // Skip very short messages
  if (messageText.trim().length < 3) {
    return { sentiment: 'neutral', score: 0, confidence: 0.9, keywords: [] }
  }

  // Try AI analysis first
  if (apiKey) {
    try {
      let userMessage = `Analyze this customer message:\n"${messageText}"`
      if (contactName) userMessage += `\nFrom: ${contactName}`
      if (conversationContext) userMessage += `\nContext: ${conversationContext}`

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://m4e-crm.vercel.app',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: SENTIMENT_PROMPT },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 300,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content
        if (content) {
          const parsed = JSON.parse(content)
          return {
            sentiment: parsed.sentiment || 'neutral',
            score: typeof parsed.score === 'number' ? parsed.score : 0,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
            suggestedAction: parsed.suggestedAction || parsed.suggested_action || undefined,
          }
        }
      }
    } catch (err) {
      console.error('[sentiment] AI analysis failed, falling back to keywords:', err)
    }
  }

  // Fallback to keyword-based
  return keywordBasedSentiment(messageText)
}

/**
 * Analyze multiple messages in batch.
 */
export async function analyzeSentimentBatch(
  messages: Array<{ text: string; contactName?: string }>
): Promise<SentimentResult[]> {
  return Promise.all(
    messages.map((m) => analyzeSentiment({ messageText: m.text, contactName: m.contactName }))
  )
}

/**
 * Fire-and-forget sentiment analysis for webhook.
 * Handles DB lookup + analysis + insert internally.
 */
export async function triggerSentimentAnalysis(opts: {
  accountId: string
  messageMetaId: string
  conversationId: string
  contactId: string
  contactName?: string
  messageText: string
}) {
  const { accountId, messageMetaId, conversationId, contactId, contactName, messageText } = opts

  // Find the message row by meta ID
  const { data: msgRow } = await supabaseAdmin()
    .from('messages')
    .select('id')
    .eq('message_id', messageMetaId)
    .eq('conversation_id', conversationId)
    .maybeSingle()

  // Analyze
  const result = await analyzeSentiment({ messageText, contactName })

  // Insert sentiment record
  const { error } = await supabaseAdmin().from('message_sentiments').insert({
    account_id: accountId,
    message_id: msgRow?.id || null,
    conversation_id: conversationId,
    contact_id: contactId,
    sentiment: result.sentiment,
    score: result.score,
    confidence: result.confidence,
    keywords: result.keywords,
    suggested_action: result.suggestedAction || null,
  })

  if (error) {
    console.error('[sentiment] insert failed:', error)
  }
}
