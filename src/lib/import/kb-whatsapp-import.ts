import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Detection: Is this a knowledge base upload?
// ---------------------------------------------------------------------------

const KB_KEYWORDS = [
  'faq',
  'knowledge',
  'add to bot',
  'teach the bot',
  'business info',
  'train the bot',
  'bot should know',
  'add this to',
  'update the bot',
  'for the chatbot',
  'customer question',
  'common question',
]

export function isKnowledgeUpload(message: string, hasDocument: boolean): boolean {
  const lower = message.toLowerCase()

  // Direct keyword match
  for (const kw of KB_KEYWORDS) {
    if (lower.includes(kw)) return true
  }

  // Document with suggestive context
  if (hasDocument) {
    const docKeywords = ['faq', 'knowledge', 'questions', 'answers', 'info', 'policy', 'pricing']
    for (const kw of docKeywords) {
      if (lower.includes(kw)) return true
    }
  }

  return false
}

// ---------------------------------------------------------------------------
// Extract Q&A pairs from content using AI
// ---------------------------------------------------------------------------

export interface KnowledgePair {
  category: 'faq' | 'product' | 'policy' | 'shipping' | 'returns' | 'pricing' | 'general'
  question: string
  answer: string
  keywords: string[]
}

export async function extractKnowledgePairs(
  content: string,
  contentType: 'text' | 'document' | 'voice_transcript',
): Promise<KnowledgePair[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const systemPrompt = `You are a knowledge base extraction assistant for a Nigerian business CRM.
Your job is to extract question-and-answer pairs from business content.

Rules:
1. Each pair must have a clear question and a helpful answer
2. Questions should be phrased as a customer would ask them
3. Answers should be concise but complete
4. Assign each pair to exactly one category: faq, product, policy, shipping, returns, pricing, or general
5. Extract 3-5 relevant keywords per pair
6. If the content is a voice transcript, clean up any transcription errors
7. Extract ALL useful Q&A pairs from the content
8. Use simple, friendly language appropriate for Nigerian customers

Return a JSON array of objects with: category, question, answer, keywords`

  const userPrompt = `Extract Q&A pairs from this ${contentType} content:

---
${content.slice(0, 8000)}
---

Return ONLY a valid JSON array. No markdown, no explanation.`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown')
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? '[]'

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = text.trim()
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  try {
    const pairs = JSON.parse(jsonStr) as KnowledgePair[]

    // Validate and sanitize
    const validCategories = ['faq', 'product', 'policy', 'shipping', 'returns', 'pricing', 'general']
    return pairs
      .filter(p => p.question && p.answer)
      .map(p => ({
        category: validCategories.includes(p.category) ? p.category : 'general',
        question: String(p.question).trim(),
        answer: String(p.answer).trim(),
        keywords: Array.isArray(p.keywords)
          ? p.keywords.map(k => String(k).trim()).filter(Boolean)
          : [],
      })) as KnowledgePair[]
  } catch {
    console.error('[kb-whatsapp-import] Failed to parse AI response:', jsonStr.slice(0, 200))
    return []
  }
}

// ---------------------------------------------------------------------------
// Handle KB Upload from WhatsApp
// ---------------------------------------------------------------------------

export async function handleKBUpload(
  supabase: SupabaseClient,
  accountId: string,
  content: string,
  contentType: 'text' | 'document' | 'voice_transcript',
  senderPhone: string,
): Promise<{ pairs_extracted: number; preview_message: string }> {
  // 1. Extract Q&A pairs using AI
  const pairs = await extractKnowledgePairs(content, contentType)

  if (pairs.length === 0) {
    return {
      pairs_extracted: 0,
      preview_message:
        'Could not extract any Q&A pairs from this content. ' +
        'Please try sending clearer FAQ-style content with questions and answers.',
    }
  }

  // 2. Store as pending (NOT auto-imported)
  const { error } = await supabase.from('kb_pending_uploads').insert({
    account_id: accountId,
    source_type: 'whatsapp',
    source_phone: senderPhone,
    extracted_pairs: pairs,
    status: 'pending',
  })

  if (error) {
    console.error('[kb-whatsapp-import] Failed to save pending upload:', error)
    throw new Error('Failed to save knowledge upload')
  }

  // 3. Build preview message for M4E team
  const categoryCount: Record<string, number> = {}
  for (const p of pairs) {
    categoryCount[p.category] = (categoryCount[p.category] ?? 0) + 1
  }

  const categoryBreakdown = Object.entries(categoryCount)
    .map(([cat, count]) => `  ${cat}: ${count}`)
    .join('\n')

  const samplePairs = pairs
    .slice(0, 3)
    .map((p, i) => `  ${i + 1}. Q: ${p.question.slice(0, 80)}\n     A: ${p.answer.slice(0, 100)}...`)
    .join('\n')

  const preview = [
    `KB Upload received from ${senderPhone}`,
    `Extracted ${pairs.length} Q&A pairs:`,
    '',
    'Categories:',
    categoryBreakdown,
    '',
    'Sample pairs:',
    samplePairs,
    '',
    'Status: PENDING REVIEW',
    'Review in CRM dashboard > AI Chatbot > Pending Uploads',
  ].join('\n')

  return {
    pairs_extracted: pairs.length,
    preview_message: preview,
  }
}
