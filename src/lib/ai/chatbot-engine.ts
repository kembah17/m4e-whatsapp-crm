// ============================================================
// AI Chatbot Engine — core orchestrator.
//
// Called from the WhatsApp webhook handler between flow dispatch
// and automation triggers. Decides whether to auto-reply with
// an AI-generated response or hand off to a human agent.
//
// Uses engineSendText from the automations layer to send
// WhatsApp messages — this reuses the existing send pipeline
// (config lookup, phone sanitization, Meta API, message
// persistence) rather than duplicating it.
// ============================================================

import { supabaseAdmin } from './admin-client'
import { detectIntentAndRespond } from './intent-detector'
import { searchKnowledgeBase } from './knowledge-base'
import { isWithinBusinessHours } from './business-hours'
import { engineSendText } from '@/lib/automations/meta-send'
import type { AIChatbotConfig, AIChatbotResult } from '@/types/ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { trackAIUsage } from './usage-tracker'

interface ChatbotInput {
  accountId: string
  contactId: string
  conversationId: string
  messageText: string
  contactName: string
}

interface LogInput {
  response: string | null
  intent: string
  confidence: number
  wasAutoReplied: boolean
  wasHandedOff: boolean
  handoffReason?: string
  model: string
  knowledgeEntryId?: string
  tokensUsed?: number
  latencyMs: number
}

/**
 * Main entry point — called from the WhatsApp webhook handler.
 *
 * Returns { handled: true } when the AI sent a reply (or a handoff
 * message), meaning downstream content automations should be
 * suppressed. Returns { handled: false } when the AI should not
 * intervene (disabled, outside business hours, excluded label, etc.)
 */
export async function tryAIChatbotResponse(input: ChatbotInput): Promise<AIChatbotResult> {
  const startTime = Date.now()
  const db = supabaseAdmin()

  // 1. Check if AI chatbot is enabled for this account
  const { data: config } = await db
    .from('ai_chatbot_config')
    .select('*')
    .eq('account_id', input.accountId)
    .single()

  if (!config || !config.is_enabled) {
    return { handled: false }
  }

  const typedConfig = config as AIChatbotConfig

  // Resolve the account owner's userId for audit columns on outbound
  // messages. engineSendText requires a userId for the sender-of-record.
  const { data: waConfig } = await db
    .from('whatsapp_config')
    .select('user_id')
    .eq('account_id', input.accountId)
    .limit(1)
    .single()
  const ownerUserId: string = waConfig?.user_id || 'system'

  // 2. Check business hours (if enabled)
  if (typedConfig.business_hours?.enabled && !isWithinBusinessHours(typedConfig.business_hours)) {
    return { handled: false } // Let automations handle outside business hours
  }

  // 3. Check if contact has excluded labels
  if (typedConfig.excluded_labels?.length > 0) {
    const { data: contact } = await db
      .from('contacts')
      .select('labels')
      .eq('id', input.contactId)
      .eq('account_id', input.accountId)
      .single()

    const contactLabels: string[] = contact?.labels || []
    if (contactLabels.some((l: string) => typedConfig.excluded_labels.includes(l))) {
      return { handled: false }
    }
  }

  // 4. Check max auto-replies in last 24 hours for this contact
  const { count: recentReplyCount } = await db
    .from('ai_conversation_logs')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', input.accountId)
    .eq('contact_id', input.contactId)
    .eq('was_auto_replied', true)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((recentReplyCount || 0) >= typedConfig.max_auto_replies) {
    // Max replies reached — log but don't send, let human handle
    await logAIInteraction(db, input, {
      response: null,
      intent: 'max_replies_exceeded',
      confidence: 1,
      wasAutoReplied: false,
      wasHandedOff: true,
      handoffReason: 'Max auto-replies reached in 24h',
      model: typedConfig.model,
      latencyMs: Date.now() - startTime,
    })
    return { handled: false, handedOff: true }
  }

  // 5. Check for explicit handoff keywords
  const handoffKeywords = [
    'agent', 'human', 'person', 'speak to someone', 'real person',
    'talk to someone', 'representative', 'manager', 'operator',
    'customer service', 'live agent', 'help me',
  ]
  const msgLower = input.messageText.toLowerCase()
  if (handoffKeywords.some(kw => msgLower.includes(kw))) {
    // Send handoff message via WhatsApp
    try {
      await engineSendText({
        accountId: input.accountId,
        userId: ownerUserId,
        conversationId: input.conversationId,
        contactId: input.contactId,
        text: typedConfig.handoff_message,
      })
    } catch (sendErr) {
      console.error('[ai-chatbot] failed to send handoff message:', sendErr)
    }

    await logAIInteraction(db, input, {
      response: typedConfig.handoff_message,
      intent: 'explicit_handoff_request',
      confidence: 1,
      wasAutoReplied: true,
      wasHandedOff: true,
      handoffReason: 'Customer requested human agent',
      model: typedConfig.model,
      latencyMs: Date.now() - startTime,
    })
    return { handled: true, handedOff: true, response: typedConfig.handoff_message }
  }

  // 6. Search knowledge base first (fast, no LLM call needed)
  const kbResult = await searchKnowledgeBase(db, input.accountId, input.messageText)

  // 7. Call LLM for intent detection and response generation
  const aiResult = await detectIntentAndRespond({
    messageText: input.messageText,
    contactName: input.contactName,
    systemPrompt: typedConfig.system_prompt,
    knowledgeContext: kbResult?.answer || null,
    model: typedConfig.model,
    maxTokens: typedConfig.max_tokens,
    temperature: typedConfig.temperature,
  })

  // 8. Check confidence threshold
  if (aiResult.confidence < typedConfig.confidence_threshold) {
    // Low confidence — send fallback message and mark as handoff
    try {
      await engineSendText({
        accountId: input.accountId,
        userId: ownerUserId,
        conversationId: input.conversationId,
        contactId: input.contactId,
        text: typedConfig.fallback_message,
      })
    } catch (sendErr) {
      console.error('[ai-chatbot] failed to send fallback message:', sendErr)
    }

    await logAIInteraction(db, input, {
      response: typedConfig.fallback_message,
      intent: aiResult.intent,
      confidence: aiResult.confidence,
      wasAutoReplied: true,
      wasHandedOff: true,
      handoffReason: `Low confidence: ${aiResult.confidence.toFixed(2)}`,
      model: typedConfig.model,
      knowledgeEntryId: kbResult?.id,
      tokensUsed: aiResult.tokensUsed,
      latencyMs: Date.now() - startTime,
    })
    return {
      handled: true,
      handedOff: true,
      confidence: aiResult.confidence,
      intent: aiResult.intent,
    }
  }

  // 9. High confidence — send AI response
  try {
    await engineSendText({
      accountId: input.accountId,
      userId: ownerUserId,
      conversationId: input.conversationId,
      contactId: input.contactId,
      text: aiResult.response,
    })
  } catch (sendErr) {
    console.error('[ai-chatbot] failed to send AI response:', sendErr)
    // Log the failure but still mark as handled so we don't double-send
    await logAIInteraction(db, input, {
      response: aiResult.response,
      intent: aiResult.intent,
      confidence: aiResult.confidence,
      wasAutoReplied: false,
      wasHandedOff: false,
      handoffReason: `Send failed: ${sendErr instanceof Error ? sendErr.message : 'unknown'}`,
      model: typedConfig.model,
      knowledgeEntryId: kbResult?.id,
      tokensUsed: aiResult.tokensUsed,
      latencyMs: Date.now() - startTime,
    })
    return { handled: false, error: 'Failed to send AI response' }
  }

  await logAIInteraction(db, input, {
    response: aiResult.response,
    intent: aiResult.intent,
    confidence: aiResult.confidence,
    wasAutoReplied: true,
    wasHandedOff: false,
    model: typedConfig.model,
    knowledgeEntryId: kbResult?.id,
    tokensUsed: aiResult.tokensUsed,
    latencyMs: Date.now() - startTime,
  })

  return {
    handled: true,
    response: aiResult.response,
    intent: aiResult.intent,
    confidence: aiResult.confidence,
  }
}

/**
 * Persist an AI interaction log row.
 * Fire-and-forget — errors are logged but never thrown.
 */
async function logAIInteraction(
  db: SupabaseClient,
  input: ChatbotInput,
  log: LogInput,
): Promise<void> {
  try {
    await db.from('ai_conversation_logs').insert({
      account_id: input.accountId,
      contact_id: input.contactId,
      conversation_id: input.conversationId,
      inbound_message: input.messageText,
      detected_intent: log.intent,
      confidence: log.confidence,
      response_text: log.response,
      knowledge_entry_id: log.knowledgeEntryId || null,
      was_auto_replied: log.wasAutoReplied,
      was_handed_off: log.wasHandedOff,
      handoff_reason: log.handoffReason || null,
      model_used: log.model,
      tokens_used: log.tokensUsed || null,
      latency_ms: log.latencyMs,
    })
  } catch (err) {
    console.error('[ai-chatbot] failed to log interaction:', err)
  }
}
