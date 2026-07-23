import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { TicketPriority } from '@/types/business-growth'
import { createTicket } from './tickets'
import { getCategories } from './categories'
import { seedDefaultCategories } from './categories'
import { seedDefaultSLAs } from './sla'

// ============================================================
// AI Triage — detect category + priority from message text
// ============================================================
export interface TriageResult {
  suggestedCategory: string | null
  suggestedPriority: TicketPriority
  confidence: number
  subject: string
}

export async function triageTicket(
  messageText: string,
  contactName?: string
): Promise<TriageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    // Fallback if no API key
    return {
      suggestedCategory: null,
      suggestedPriority: 'normal',
      confidence: 0,
      subject: messageText.slice(0, 80),
    }
  }

  const prompt = `You are a customer support triage AI for a Nigerian business CRM.
Analyze the following customer message and determine:
1. The most appropriate category from: General Inquiry, Technical Issue, Billing, Complaint, Feature Request, Order Issue
2. The priority level: critical, high, normal, or low
3. A short subject line (max 80 chars) summarizing the issue
4. Your confidence level (0.0 to 1.0)

IMPORTANT: You understand Nigerian Pidgin English. Examples:
- "Wetin happen to my order" = Order Issue, normal priority
- "This thing no dey work at all!" = Technical Issue, high priority
- "Abeg I wan know about pricing" = Billing, low priority
- "My money don go, but I never receive anything" = Billing, critical priority
- "E don tey wey I order, nothing don come" = Order Issue, high priority
- "I no fit login" = Technical Issue, high priority
- "Una service no good at all, I wan complain" = Complaint, high priority

Customer${contactName ? ` (${contactName})` : ''}: "${messageText}"

Respond ONLY with valid JSON:
{"category": "...", "priority": "...", "subject": "...", "confidence": 0.0}
`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: 'You are a support ticket triage assistant. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ''

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[^}]+\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      suggestedCategory: parsed.category ?? null,
      suggestedPriority: (['critical', 'high', 'normal', 'low'].includes(parsed.priority)
        ? parsed.priority
        : 'normal') as TicketPriority,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      subject: (parsed.subject ?? messageText.slice(0, 80)).slice(0, 80),
    }
  } catch (err) {
    console.error('[triage] AI triage failed:', err)
    return {
      suggestedCategory: null,
      suggestedPriority: 'normal',
      confidence: 0,
      subject: messageText.slice(0, 80),
    }
  }
}

// ============================================================
// Auto-create ticket from AI chatbot handoff
// ============================================================
export async function autoCreateTicketFromHandoff(
  accountId: string,
  contactId: string,
  conversationId: string,
  messageText: string,
  contactName?: string
): Promise<string> {
  // Ensure defaults exist
  await seedDefaultCategories(accountId).catch(() => {})
  await seedDefaultSLAs(accountId).catch(() => {})

  // Run AI triage
  const triage = await triageTicket(messageText, contactName)

  // Match suggested category to actual category
  let categoryId: string | undefined
  if (triage.suggestedCategory) {
    try {
      const categories = await getCategories(accountId)
      const match = categories.find(
        (c) => c.name.toLowerCase() === triage.suggestedCategory!.toLowerCase()
      )
      if (match) categoryId = match.id
    } catch {
      // Category matching is best-effort
    }
  }

  // Find auto-assign target from category
  let assignTo: string | undefined
  if (categoryId) {
    const db = supabaseAdmin()
    const { data: cat } = await db
      .from('ticket_categories')
      .select('auto_assign_to')
      .eq('id', categoryId)
      .single()
    if (cat?.auto_assign_to) assignTo = cat.auto_assign_to
  }

  const ticket = await createTicket(accountId, {
    subject: triage.subject,
    description: messageText,
    contact_id: contactId,
    conversation_id: conversationId,
    category_id: categoryId,
    priority: triage.suggestedPriority,
    source: 'ai_handoff',
    assigned_to: assignTo,
    ai_suggested_category: triage.suggestedCategory ?? undefined,
    ai_suggested_priority: triage.suggestedPriority,
    ai_confidence: triage.confidence,
  })

  return ticket.id
}

// ============================================================
// Auto-create ticket from negative sentiment
// ============================================================
export async function autoCreateTicketFromSentiment(
  accountId: string,
  contactId: string,
  conversationId: string,
  messageText: string,
  sentimentScore: number
): Promise<string> {
  // Ensure defaults exist
  await seedDefaultCategories(accountId).catch(() => {})
  await seedDefaultSLAs(accountId).catch(() => {})

  // Determine priority based on sentiment severity
  let priority: TicketPriority = 'normal'
  if (sentimentScore <= -0.8) {
    priority = 'critical'
  } else if (sentimentScore <= -0.5) {
    priority = 'high'
  } else if (sentimentScore <= -0.3) {
    priority = 'normal'
  }

  // Try to find the Complaint category
  let categoryId: string | undefined
  try {
    const categories = await getCategories(accountId)
    const complaint = categories.find(
      (c) => c.name.toLowerCase() === 'complaint'
    )
    if (complaint) categoryId = complaint.id
  } catch {
    // Best-effort
  }

  const ticket = await createTicket(accountId, {
    subject: `Negative sentiment detected (score: ${sentimentScore.toFixed(2)})`,
    description: messageText,
    contact_id: contactId,
    conversation_id: conversationId,
    category_id: categoryId,
    priority,
    source: 'sentiment_escalation',
    sentiment_score: sentimentScore,
  })

  return ticket.id
}
