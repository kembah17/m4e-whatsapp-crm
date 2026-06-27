import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import type { KnowledgeCategory } from '@/types/ai'

const VALID_CATEGORIES: KnowledgeCategory[] = [
  'faq', 'product', 'policy', 'shipping', 'returns', 'pricing', 'general',
]

/**
 * GET /api/ai/knowledge
 * List knowledge base entries with optional category filter.
 */
export async function GET(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const activeOnly = searchParams.get('active') !== 'false'

    let query = supabase
      .from('ai_knowledge_base')
      .select('*')
      .eq('account_id', accountId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (category && VALID_CATEGORIES.includes(category as KnowledgeCategory)) {
      query = query.eq('category', category)
    }
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    if (search) {
      query = query.or(
        `question.ilike.%${search}%,answer.ilike.%${search}%`,
      )
    }

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ entries: data ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/ai/knowledge
 * Create a new knowledge base entry.
 */
export async function POST(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const body = await request.json()

    const { category, question, answer, keywords, priority } = body

    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 },
      )
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('ai_knowledge_base')
      .insert({
        account_id: accountId,
        category: category || 'general',
        question: question.trim(),
        answer: answer.trim(),
        keywords: Array.isArray(keywords) ? keywords : [],
        priority: typeof priority === 'number' ? priority : 0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ entry: data }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
