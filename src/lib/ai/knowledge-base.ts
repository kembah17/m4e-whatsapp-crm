import type { SupabaseClient } from '@supabase/supabase-js'

interface KnowledgeMatch {
  id: string
  question: string
  answer: string
  similarity?: number
}

/**
 * Generate embedding for text using OpenRouter.
 * Uses a lightweight embedding model.
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
    const errText = await response.text().catch(() => 'unknown')
    throw new Error(`Embedding API error: ${response.status} ${errText}`)
  }
  const data = await response.json()
  return data.data[0].embedding
}

/**
 * Search knowledge base using vector similarity (RAG).
 * Falls back to keyword matching if embeddings are unavailable.
 */
export async function searchKnowledgeBase(
  db: SupabaseClient,
  accountId: string,
  messageText: string,
): Promise<KnowledgeMatch | null> {
  // Try RAG-based search first
  try {
    const embedding = await generateEmbedding(messageText)

    // Use Supabase vector similarity search via RPC
    const { data: matches, error } = await db.rpc('match_knowledge_embeddings', {
      p_account_id: accountId,
      p_embedding: JSON.stringify(embedding),
      p_match_threshold: 0.7,
      p_match_count: 3,
    })

    if (!error && matches?.length > 0) {
      // Get the full knowledge entry
      const { data: entry } = await db
        .from('ai_knowledge_base')
        .select('id, question, answer')
        .eq('id', matches[0].knowledge_entry_id)
        .single()

      if (entry) {
        return {
          id: entry.id,
          question: entry.question,
          answer: entry.answer,
          similarity: matches[0].similarity,
        }
      }
    }
  } catch (err) {
    console.warn('[knowledge-base] RAG search failed, falling back to keyword:', err)
  }

  // Fallback: original keyword matching
  return keywordSearch(db, accountId, messageText)
}

/**
 * Original keyword + word-overlap scoring algorithm.
 * Used as fallback when RAG is unavailable.
 */
async function keywordSearch(
  db: SupabaseClient,
  accountId: string,
  messageText: string,
): Promise<KnowledgeMatch | null> {
  const { data: entries, error } = await db
    .from('ai_knowledge_base')
    .select('id, question, answer, keywords, priority')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  if (error || !entries?.length) return null

  const messageLower = messageText.toLowerCase()
  const messageWords = messageLower.split(/\s+/).filter(w => w.length > 3)

  let bestMatch: (KnowledgeMatch & { score: number }) | null = null

  for (const entry of entries) {
    let score = 0

    // Keyword matching — each keyword hit is worth 2 points
    const keywords: string[] = entry.keywords || []
    for (const keyword of keywords) {
      if (messageLower.includes(keyword.toLowerCase())) {
        score += 2
      }
    }

    // Question word overlap — each shared word (>3 chars) is 1 point
    const questionWords = entry.question
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
    const overlap = messageWords.filter(w => questionWords.includes(w)).length
    score += overlap

    // Priority bonus (0.5 per priority level)
    score += (entry.priority || 0) * 0.5

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
        score,
      }
    }
  }

  return bestMatch && bestMatch.score >= 2
    ? { id: bestMatch.id, question: bestMatch.question, answer: bestMatch.answer }
    : null
}
