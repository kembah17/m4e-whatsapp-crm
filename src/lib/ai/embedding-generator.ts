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

/**
 * Generate embedding vector for text using OpenRouter.
 */
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
        model: 'text-embedding-3-small',
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
