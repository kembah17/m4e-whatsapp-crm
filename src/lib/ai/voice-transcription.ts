/**
 * Voice note transcription using OpenRouter AI.
 * Transcribes WhatsApp voice notes, extracts action items.
 */

import { createClient } from '@supabase/supabase-js'
import { trackAIUsage } from './usage-tracker'
import type { VoiceTranscription } from '@/types/business-growth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: any = null
function supabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const TRANSCRIPTION_MODEL = 'google/gemini-2.0-flash-001'

interface TranscribeResult {
  transcript: string
  summary: string
  action_items: Array<{ text: string; priority?: string }>
  sentiment: string
  key_phrases: string[]
  language: string
  confidence: number
}

/**
 * Transcribe a voice note using AI.
 */
export async function transcribeVoiceNote(
  mediaUrl: string,
  accountId: string,
  messageId: string,
  contactId?: string | null
): Promise<VoiceTranscription> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const db = supabaseAdmin()

  // Create pending record
  const { data: record, error: insertErr } = await db
    .from('voice_transcriptions')
    .insert({
      account_id: accountId,
      message_id: messageId,
      contact_id: contactId || null,
      media_url: mediaUrl,
      status: 'processing',
    })
    .select()
    .single()

  if (insertErr) throw new Error(`Failed to create transcription record: ${insertErr.message}`)

  const startTime = Date.now()

  try {
    // Download audio and convert to base64
    const audioResponse = await fetch(mediaUrl)
    if (!audioResponse.ok) throw new Error('Failed to download audio')
    const audioBuffer = await audioResponse.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const mimeType = audioResponse.headers.get('content-type') || 'audio/ogg'

    // Send to AI for transcription + analysis
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TRANSCRIPTION_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a voice note transcription and analysis engine for a Nigerian business WhatsApp CRM.
Transcribe the audio accurately, understanding Nigerian English, Pidgin, and local accents.
Return JSON with:
- transcript: string (full transcription)
- summary: string (1-2 sentence summary)
- action_items: array of { text: string, priority: "high" | "medium" | "low" }
- sentiment: "positive" | "neutral" | "negative" | "urgent"
- key_phrases: string[] (important terms/names/amounts mentioned)
- language: string (detected language e.g. "English", "Pidgin", "Yoruba")
- confidence: number (0-1 transcription confidence)
Return ONLY valid JSON, no markdown.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Transcribe and analyze this voice note:' },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64Audio}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`OpenRouter error: ${res.status} ${errBody}`)
    }

    const aiData = await res.json()
    const content = aiData.choices?.[0]?.message?.content || ''
    const processingTime = Date.now() - startTime

    // Parse AI response
    let parsed: TranscribeResult
    try {
      const cleaned = content.replace(/```json\n?|```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      // Fallback: treat entire content as transcript
      parsed = {
        transcript: content,
        summary: content.substring(0, 100),
        action_items: [],
        sentiment: 'neutral',
        key_phrases: [],
        language: 'English',
        confidence: 0.5,
      }
    }

    // Update record with results
    const { data: updated, error: updateErr } = await db
      .from('voice_transcriptions')
      .update({
        transcript: parsed.transcript,
        summary: parsed.summary,
        action_items: parsed.action_items || [],
        sentiment: parsed.sentiment,
        key_phrases: parsed.key_phrases || [],
        language: parsed.language || 'English',
        confidence: parsed.confidence || 0.5,
        status: 'completed',
        processing_time_ms: processingTime,
        model_used: TRANSCRIPTION_MODEL,
        cost_usd: aiData.usage?.total_cost || null,
      })
      .eq('id', record.id)
      .select()
      .single()

    if (updateErr) throw new Error(`Failed to update transcription: ${updateErr.message}`)

    // Track AI usage
    try {
      await trackAIUsage({
        accountId,
        feature: 'voice_transcription',
        model: TRANSCRIPTION_MODEL,
        inputTokens: aiData.usage?.prompt_tokens || 0,
        outputTokens: aiData.usage?.completion_tokens || 0,
        cost: aiData.usage?.total_cost || 0,
      })
    } catch { /* non-critical */ }

    return updated as VoiceTranscription
  } catch (err) {
    // Mark as failed
    await db
      .from('voice_transcriptions')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        processing_time_ms: Date.now() - startTime,
      })
      .eq('id', record.id)

    throw err
  }
}

/**
 * Get existing transcription for a message.
 */
export async function getTranscription(
  messageId: string
): Promise<VoiceTranscription | null> {
  const { data } = await supabaseAdmin()
    .from('voice_transcriptions')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as VoiceTranscription | null
}

/**
 * Search transcriptions by text query.
 */
export async function searchTranscriptions(
  accountId: string,
  query: string,
  limit = 20
): Promise<VoiceTranscription[]> {
  const { data } = await supabaseAdmin()
    .from('voice_transcriptions')
    .select('*')
    .eq('account_id', accountId)
    .eq('status', 'completed')
    .ilike('transcript', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []) as VoiceTranscription[]
}

/**
 * Extract action items from a transcript using AI.
 */
export async function extractActionItems(
  transcript: string
): Promise<Array<{ text: string; priority?: string }>> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return []

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'system',
            content: 'Extract action items from this transcript. Return JSON array of { text: string, priority: "high" | "medium" | "low" }. Return ONLY valid JSON array.',
          },
          { role: 'user', content: transcript },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    })

    if (!res.ok) return []
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || '[]'
    const cleaned = content.replace(/```json\n?|```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return []
  }
}
