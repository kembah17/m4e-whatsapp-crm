import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import type { KnowledgeCategory } from '@/types/ai'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

const VALID_CATEGORIES: KnowledgeCategory[] = [
  'faq', 'product', 'policy', 'shipping', 'returns', 'pricing', 'general',
]

/**
 * GET /api/ai/knowledge
 * List knowledge base entries with optional category filter.
 */
export async function GET(request: Request) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`ai:${rlIp}`, RATE_LIMITS.ai);
    if (!rl.success) return rateLimitResponse(rl);

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
    // Include quota info if requested
    const includeQuota = searchParams.get('include_quota') === 'true'
    let quota = null
    if (includeQuota) {
      const { count } = await supabase
        .from('ai_knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)
      const { data: acct } = await supabase
        .from('accounts')
        .select('pricing_tier, knowledge_entry_limit')
        .eq('id', accountId)
        .single()
      const TIER_LIMITS: Record<string, number> = { starter: 100, professional: 200, business: 500 }
      const limit = acct?.knowledge_entry_limit ?? TIER_LIMITS[acct?.pricing_tier ?? 'starter'] ?? 100
      quota = { current: count ?? 0, limit, tier: acct?.pricing_tier ?? 'starter' }
    }

    return NextResponse.json({ entries: data ?? [], ...(quota ? { quota } : {}) })
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
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`ai:${rlIp}`, RATE_LIMITS.ai);
    if (!rl.success) return rateLimitResponse(rl);

    const { accountId, supabase } = await getCurrentAccount()

    // Check knowledge entry limit
    const { count: currentCount } = await supabase
      .from('ai_knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)

    const { data: accountData } = await supabase
      .from('accounts')
      .select('pricing_tier, knowledge_entry_limit')
      .eq('id', accountId)
      .single()

    const TIER_LIMITS: Record<string, number> = {
      starter: 100,
      professional: 200,
      business: 500,
    }
    const limit = accountData?.knowledge_entry_limit
      ?? TIER_LIMITS[accountData?.pricing_tier ?? 'starter']
      ?? 100

    if ((currentCount ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: `Knowledge entry limit reached (${currentCount}/${limit}). Upgrade your plan for more entries.`,
          limit,
          current: currentCount,
        },
        { status: 403 }
      )
    }

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
