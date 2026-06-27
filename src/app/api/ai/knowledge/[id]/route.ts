import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import type { KnowledgeCategory } from '@/types/ai'

const VALID_CATEGORIES: KnowledgeCategory[] = [
  'faq', 'product', 'policy', 'shipping', 'returns', 'pricing', 'general',
]

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/ai/knowledge/:id
 * Update a knowledge base entry.
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const { id } = await context.params
    const body = await request.json()

    const allowed: Record<string, unknown> = {}
    const fields = ['category', 'question', 'answer', 'keywords', 'priority', 'is_active']
    for (const f of fields) {
      if (f in body) allowed[f] = body[f]
    }

    if (allowed.category && !VALID_CATEGORIES.includes(allowed.category as KnowledgeCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('ai_knowledge_base')
      .update(allowed)
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
    return NextResponse.json({ entry: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/ai/knowledge/:id
 * Delete a knowledge base entry.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const { id } = await context.params

    const { error } = await supabase
      .from('ai_knowledge_base')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
