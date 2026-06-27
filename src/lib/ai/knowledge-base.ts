import type { SupabaseClient } from '@supabase/supabase-js'

interface KnowledgeMatch {
  id: string
  question: string
  answer: string
}

/**
 * Search the knowledge base for the best-matching entry.
 *
 * Uses a simple keyword + word-overlap scoring algorithm.
 * Returns the highest-scoring entry if it meets the minimum
 * threshold (score >= 2), or null if nothing matches.
 */
export async function searchKnowledgeBase(
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
  // Filter out short/common words for overlap scoring
  const messageWords = messageLower
    .split(/\s+/)
    .filter(w => w.length > 3)

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

  // Require a minimum score of 2 to avoid false positives
  return bestMatch && bestMatch.score >= 2
    ? { id: bestMatch.id, question: bestMatch.question, answer: bestMatch.answer }
    : null
}
