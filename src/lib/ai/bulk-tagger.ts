// ============================================================
// AI Bulk Tagger — suggest tags for contacts using OpenRouter
// ============================================================

import { trackAIUsage, extractTokensFromResponse } from './usage-tracker'

export interface ContactForTagging {
  id: string
  name: string | null
  phone: string
  notes?: string | null
  lastMessage?: string | null
  existingTags?: string[]
}

export interface TagSuggestion {
  contactId: string
  contactName: string | null
  suggestedTags: string[]
  confidence: number
  reasoning: string
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.0-flash-001'

/**
 * Suggest tags for a batch of contacts using AI.
 * Processes up to 10 contacts per API call.
 */
export async function suggestTagsForContacts(
  contacts: ContactForTagging[],
  existingTagNames: string[],
  accountId: string,
  industry?: string
): Promise<TagSuggestion[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const allSuggestions: TagSuggestion[] = []

  // Process in batches of 10
  for (let i = 0; i < contacts.length; i += 10) {
    const batch = contacts.slice(i, i + 10)
    const batchSuggestions = await processBatch(batch, existingTagNames, accountId, industry, apiKey)
    allSuggestions.push(...batchSuggestions)
  }

  return allSuggestions
}

async function processBatch(
  contacts: ContactForTagging[],
  existingTagNames: string[],
  accountId: string,
  industry: string | undefined,
  apiKey: string
): Promise<TagSuggestion[]> {
  const contactDescriptions = contacts.map((c, idx) => {
    const parts = [`Contact ${idx + 1} (ID: ${c.id}):`]
    if (c.name) parts.push(`  Name: ${c.name}`)
    parts.push(`  Phone: ${c.phone}`)
    if (c.notes) parts.push(`  Notes: ${c.notes}`)
    if (c.lastMessage) parts.push(`  Last message: ${c.lastMessage}`)
    if (c.existingTags?.length) parts.push(`  Current tags: ${c.existingTags.join(', ')}`)
    return parts.join('\n')
  }).join('\n\n')

  const systemPrompt = `You are a CRM tagging assistant for a ${industry || 'general'} business in Nigeria.
Your job is to suggest relevant tags for contacts based on their available data.

Existing tags in the system: ${existingTagNames.length > 0 ? existingTagNames.join(', ') : 'none yet'}

Rules:
1. Prefer existing tags when they fit
2. Suggest new tags only when no existing tag matches
3. Keep tag names short (1-3 words), lowercase, hyphenated
4. Suggest 1-5 tags per contact
5. Consider Nigerian business context
6. Base suggestions on name patterns, phone prefixes, notes, message content, and existing tags
7. Common useful tags: vip, new-lead, returning-customer, wholesale, retail, lagos, abuja, etc.

Respond with valid JSON only. No markdown, no explanation outside JSON.`

  const userPrompt = `Analyze these contacts and suggest tags for each:

${contactDescriptions}

Respond with this exact JSON format:
{
  "suggestions": [
    {
      "contactId": "<id>",
      "suggestedTags": ["tag1", "tag2"],
      "confidence": 0.85,
      "reasoning": "Brief explanation"
    }
  ]
}`

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://crm.marketing4effect.com',
      'X-Title': 'M4E CRM Bulk Tagger',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`)
  }

  const data = await response.json()

  // Track usage
  const tokens = extractTokensFromResponse(data)
  trackAIUsage({
    accountId,
    feature: 'bulk_tagging',
    model: MODEL,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    metadata: { contactCount: contacts.length },
  })

  // Parse response
  const content = data.choices?.[0]?.message?.content || '{}'
  let parsed: { suggestions?: Array<{
    contactId: string
    suggestedTags: string[]
    confidence: number
    reasoning: string
  }> }

  try {
    parsed = JSON.parse(content)
  } catch {
    console.error('[bulk-tagger] Failed to parse AI response:', content)
    return []
  }

  if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
    return []
  }

  // Map back to our interface, matching contact names
  const contactMap = new Map(contacts.map((c) => [c.id, c]))

  return parsed.suggestions
    .filter((s) => contactMap.has(s.contactId))
    .map((s) => ({
      contactId: s.contactId,
      contactName: contactMap.get(s.contactId)?.name || null,
      suggestedTags: (s.suggestedTags || []).map((t: string) =>
        t.toLowerCase().trim().replace(/\s+/g, '-')
      ),
      confidence: Math.min(1, Math.max(0, s.confidence || 0.5)),
      reasoning: s.reasoning || 'No reasoning provided',
    }))
}
