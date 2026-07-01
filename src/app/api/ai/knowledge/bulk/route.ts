import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import type { KnowledgeCategory } from '@/types/ai'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const VALID_CATEGORIES: KnowledgeCategory[] = [
  'faq', 'product', 'policy', 'shipping', 'returns', 'pricing', 'general',
]

interface BulkEntry {
  category?: string
  question: string
  answer: string
  keywords?: string[]
  priority?: number
}

/**
 * POST /api/ai/knowledge/bulk
 * Bulk import knowledge base entries.
 * Expects { entries: BulkEntry[] }
 */
export async function POST(request: Request) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`ai:${rlIp}`, RATE_LIMITS.ai);
    if (!rl.success) return rateLimitResponse(rl);

    const { accountId, supabase } = await getCurrentAccount()
    const body = await request.json()

    const entries: BulkEntry[] = body.entries
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'entries must be a non-empty array' },
        { status: 400 },
      )
    }

    if (entries.length > 200) {
      return NextResponse.json(
        { error: 'Maximum 200 entries per bulk import' },
        { status: 400 },
      )
    }

    // Validate and prepare rows
    const rows = []
    const errors: string[] = []

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      if (!e.question?.trim() || !e.answer?.trim()) {
        errors.push(`Entry ${i + 1}: question and answer are required`)
        continue
      }
      if (e.category && !VALID_CATEGORIES.includes(e.category as KnowledgeCategory)) {
        errors.push(`Entry ${i + 1}: invalid category "${e.category}"`)
        continue
      }
      rows.push({
        account_id: accountId,
        category: e.category || 'general',
        question: e.question.trim(),
        answer: e.answer.trim(),
        keywords: Array.isArray(e.keywords) ? e.keywords : [],
        priority: typeof e.priority === 'number' ? e.priority : 0,
      })
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid entries to import', details: errors },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('ai_knowledge_base')
      .insert(rows)
      .select()

    if (error) throw error

    return NextResponse.json({
      imported: data?.length ?? 0,
      skipped: entries.length - rows.length,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
