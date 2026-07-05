import { createClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: SupabaseClient<any, "public", any> | null = null
function supabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

/** Cached model info to avoid DB hit on every embedding call */
let _cachedModel: { model: string; dimensions: number; fetchedAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get the active embedding model, with fallback chain:
 * 1. Optional parameter
 * 2. DB global_rag_settings
 * 3. EMBEDDING_MODEL env var
 * 4. Default 'openai/text-embedding-3-small'
 */
async function getActiveModel(overrideModel?: string): Promise<{ model: string; dimensions: number }> {
  if (overrideModel) {
    const KNOWN: Record<string, number> = {
      'openai/text-embedding-3-small': 1536,
      'nvidia/llama-3.2-nv-embedqa-1b-v2': 768,
      'perplexity/embed-v1': 768,
      'qwen/qwen3-embedding-8b': 1024,
      'baai/bge-m3': 1024,
    }
    return { model: overrideModel, dimensions: KNOWN[overrideModel] ?? 1536 }
  }

  // Check cache
  if (_cachedModel && Date.now() - _cachedModel.fetchedAt < CACHE_TTL_MS) {
    return { model: _cachedModel.model, dimensions: _cachedModel.dimensions }
  }

  // Try DB
  try {
    const db = supabaseAdmin()
    const { data } = await db
      .from('global_rag_settings')
      .select('active_model, active_dimensions')
      .eq('id', 1)
      .single()
    if (data?.active_model) {
      _cachedModel = {
        model: data.active_model,
        dimensions: data.active_dimensions ?? 1536,
        fetchedAt: Date.now(),
      }
      return { model: data.active_model, dimensions: data.active_dimensions ?? 1536 }
    }
  } catch {
    // DB not available, fall through
  }

  // Env var fallback
  const envModel = process.env.EMBEDDING_MODEL
  if (envModel) {
    return { model: envModel, dimensions: 1536 }
  }

  // Ultimate default
  return { model: 'openai/text-embedding-3-small', dimensions: 1536 }
}

/**
 * Generate embedding vector for text using OpenRouter.
 */
async function generateEmbedding(text: string, overrideModel?: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const { model } = await getActiveModel(overrideModel)

  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`)
  }
  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Chunk text into smaller pieces for embedding.
 * Uses sentence-aware splitting to maintain context.
 */
function chunkText(text: string, maxChunkSize = 500): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ''

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim())
      current = ''
    }
    current += sentence + ' '
  }
  if (current.trim()) {
    chunks.push(current.trim())
  }

  return chunks.length > 0 ? chunks : [text]
}

/**
 * Generate and store embeddings for a knowledge base entry.
 * Called when entries are created or updated.
 */
export async function generateAndStoreEmbeddings(input: {
  accountId: string
  knowledgeEntryId: string
  question: string
  answer: string
}): Promise<{ chunksCreated: number }> {
  const db = supabaseAdmin()
  const { accountId, knowledgeEntryId, question, answer } = input
  const { model } = await getActiveModel()

  // Delete existing embeddings for this entry
  await db
    .from('knowledge_embeddings')
    .delete()
    .eq('knowledge_entry_id', knowledgeEntryId)

  // Create chunks from question + answer
  const fullText = `${question}\n\n${answer}`
  const chunks = chunkText(fullText)

  let chunksCreated = 0

  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await generateEmbedding(chunks[i])

      await db.from('knowledge_embeddings').insert({
        account_id: accountId,
        knowledge_entry_id: knowledgeEntryId,
        chunk_text: chunks[i],
        chunk_index: i,
        embedding: JSON.stringify(embedding),
        model: model.split('/').pop() || model,
      })

      chunksCreated++
    } catch (err) {
      console.error(`[embedding-generator] Failed to embed chunk ${i}:`, err)
    }
  }

  return { chunksCreated }
}

/**
 * Regenerate embeddings for all knowledge base entries of an account.
 * Useful for bulk re-indexing after model changes.
 */
export async function regenerateAllEmbeddings(
  accountId: string,
): Promise<{ entriesProcessed: number; totalChunks: number }> {
  const db = supabaseAdmin()

  const { data: entries, error } = await db
    .from('ai_knowledge_base')
    .select('id, question, answer')
    .eq('account_id', accountId)
    .eq('is_active', true)

  if (error || !entries?.length) {
    return { entriesProcessed: 0, totalChunks: 0 }
  }

  let totalChunks = 0

  for (const entry of entries) {
    const result = await generateAndStoreEmbeddings({
      accountId,
      knowledgeEntryId: entry.id,
      question: entry.question,
      answer: entry.answer,
    })
    totalChunks += result.chunksCreated
  }

  return { entriesProcessed: entries.length, totalChunks }
}
