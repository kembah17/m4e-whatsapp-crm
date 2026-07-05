import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      accountId,
      message,
      knowledgeContext,
      model = 'google/gemini-2.0-flash-001',
      temperature = 0.7,
      maxTokens = 1024,
      systemPrompt,
    } = body

    if (!accountId || !message) {
      return NextResponse.json(
        { error: 'accountId and message are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Build system prompt with optional knowledge context
    let fullSystemPrompt = systemPrompt || 'You are a helpful business assistant.'
    if (knowledgeContext) {
      fullSystemPrompt += `

Relevant knowledge base information:
${knowledgeContext}`
    }

    // Call OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: fullSystemPrompt },
          { role: 'user', content: message },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown')
      return NextResponse.json(
        { error: `AI API error: ${response.status}`, details: errText },
        { status: 502 }
      )
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 'No response generated'
    const usage = data.usage || {}

    return NextResponse.json({
      reply,
      model: data.model,
      usage: {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
      },
    })
  } catch (err) {
    console.error('[ai/playground] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// Save/load playground sessions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const { data: sessions, error } = await db
      .from('ai_playground_sessions')
      .select('id, name, updated_at')
      .eq('account_id', accountId)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: sessions ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
