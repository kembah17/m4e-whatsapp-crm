import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import type { KnowledgePair } from '@/lib/import/kb-whatsapp-import'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ---------------------------------------------------------------------------
// Generate embedding for a text string
// ---------------------------------------------------------------------------

async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`)
  }
  const data = await response.json()
  return data.data[0].embedding
}

// ---------------------------------------------------------------------------
// GET /api/ai/knowledge/pending — List pending KB uploads
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = checkRateLimit(`kb-pending:${rlIp}`, RATE_LIMITS.ai)
    if (!rl.success) return rateLimitResponse(rl)

    const { accountId, supabase } = await getCurrentAccount()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'pending'

    let query = supabase
      .from('kb_pending_uploads')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ uploads: data ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// ---------------------------------------------------------------------------
// POST /api/ai/knowledge/pending — Approve/reject uploads
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = checkRateLimit(`kb-pending:${rlIp}`, RATE_LIMITS.ai)
    if (!rl.success) return rateLimitResponse(rl)

    const { accountId, supabase, userId } = await getCurrentAccount()
    const admin = getAdmin()
    const body = await request.json()

    const { upload_id, action, approved_indices } = body as {
      upload_id: string
      action: 'approve_all' | 'reject_all' | 'approve_selected'
      approved_indices?: number[]
    }

    if (!upload_id || !action) {
      return NextResponse.json(
        { error: 'upload_id and action are required' },
        { status: 400 },
      )
    }

    // Fetch the pending upload
    const { data: upload, error: fetchError } = await supabase
      .from('kb_pending_uploads')
      .select('*')
      .eq('id', upload_id)
      .eq('account_id', accountId)
      .single()

    if (fetchError || !upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }

    const allPairs = upload.extracted_pairs as KnowledgePair[]
    let pairsToApprove: KnowledgePair[] = []
    let newStatus: string = 'pending'

    switch (action) {
      case 'approve_all':
        pairsToApprove = allPairs
        newStatus = 'approved'
        break
      case 'reject_all':
        pairsToApprove = []
        newStatus = 'rejected'
        break
      case 'approve_selected':
        if (!approved_indices || approved_indices.length === 0) {
          return NextResponse.json(
            { error: 'approved_indices required for approve_selected' },
            { status: 400 },
          )
        }
        pairsToApprove = approved_indices
          .filter(i => i >= 0 && i < allPairs.length)
          .map(i => allPairs[i])
        newStatus = pairsToApprove.length === allPairs.length ? 'approved' : 'partial'
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Insert approved pairs into ai_knowledge_base
    let insertedCount = 0
    const errors: string[] = []

    for (const pair of pairsToApprove) {
      try {
        // Generate embedding for the question
        const embeddingText = `${pair.question} ${pair.answer}`
        let embedding: number[] | null = null
        try {
          embedding = await generateEmbedding(embeddingText)
        } catch (embErr) {
          console.warn('[kb-pending] Embedding generation failed, inserting without:', embErr)
        }

        // Insert into knowledge base
        const { error: insertError } = await admin
          .from('ai_knowledge_base')
          .insert({
            account_id: accountId,
            category: pair.category,
            question: pair.question,
            answer: pair.answer,
            keywords: pair.keywords,
            is_active: true,
          })

        if (insertError) {
          errors.push(`Failed to insert: ${pair.question.slice(0, 50)} - ${insertError.message}`)
          continue
        }

        // If we have an embedding, store it
        if (embedding) {
          // Get the just-inserted entry ID
          const { data: entry } = await admin
            .from('ai_knowledge_base')
            .select('id')
            .eq('account_id', accountId)
            .eq('question', pair.question)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (entry) {
            await admin.from('ai_knowledge_embeddings').insert({
              knowledge_entry_id: entry.id,
              account_id: accountId,
              embedding: JSON.stringify(embedding),
              model_used: 'openai/text-embedding-3-small',
            }).then(() => { /* ignore errors */ })
          }
        }

        insertedCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Error processing: ${pair.question.slice(0, 50)} - ${msg}`)
      }
    }

    // Update the pending upload status
    await supabase
      .from('kb_pending_uploads')
      .update({
        status: newStatus,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', upload_id)

    return NextResponse.json({
      success: true,
      action,
      pairs_approved: insertedCount,
      pairs_total: allPairs.length,
      status: newStatus,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
