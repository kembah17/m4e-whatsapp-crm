/**
 * AI-powered business insights generation.
 * Analyzes sales, customer, inventory, and payment patterns.
 */

import { createClient } from '@supabase/supabase-js'
import { trackAIUsage } from './usage-tracker'
import type {
  BusinessInsight, InsightCategory, InsightPriority,
} from '@/types/business-growth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: any = null
function supabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const INSIGHTS_MODEL = 'google/gemini-2.0-flash-001'

interface InsightData {
  insight_type: string
  category: InsightCategory
  title: string
  description: string
  metric_name?: string
  metric_value?: number
  comparison_value?: number
  change_percent?: number
  priority: InsightPriority
  suggested_action?: string
  data_points?: number
  confidence?: number
}

/**
 * Gather business data for insight generation.
 */
async function gatherBusinessData(accountId: string) {
  const db = supabaseAdmin()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

  // Parallel data fetching
  const [orders, debts, inventory, contacts, invoices] = await Promise.all([
    // Recent orders
    db.from('orders')
      .select('id, total, status, created_at')
      .eq('account_id', accountId)
      .gte('created_at', sixtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(200),
    // Debt entries
    db.from('debt_entries')
      .select('id, total_amount, amount_paid, status, due_date, created_at')
      .eq('account_id', accountId)
      .limit(200),
    // Products with inventory
    db.from('products')
      .select('id, name, price, stock_quantity, reorder_point, track_inventory')
      .eq('account_id', accountId)
      .eq('track_inventory', true)
      .limit(200),
    // Contact stats
    db.from('contacts')
      .select('id, trust_score, loyalty_points, loyalty_tier, outstanding_balance, total_purchases, last_purchase_at, created_at')
      .eq('account_id', accountId)
      .limit(500),
    // Invoices
    db.from('invoices')
      .select('id, total, amount_paid, status, doc_type, issue_date')
      .eq('account_id', accountId)
      .gte('issue_date', sixtyDaysAgo)
      .limit(200),
  ])

  return {
    orders: orders.data || [],
    debts: debts.data || [],
    inventory: inventory.data || [],
    contacts: contacts.data || [],
    invoices: invoices.data || [],
    thirtyDaysAgo,
    sixtyDaysAgo,
    now: now.toISOString(),
  }
}

/**
 * Generate business insights using AI analysis.
 */
export async function generateInsights(
  accountId: string
): Promise<BusinessInsight[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const db = supabaseAdmin()
  const businessData = await gatherBusinessData(accountId)

  // Prepare summary for AI
  const summary = {
    total_orders_30d: businessData.orders.filter(
      (o: { created_at: string }) => o.created_at >= businessData.thirtyDaysAgo
    ).length,
    total_orders_prev_30d: businessData.orders.filter(
      (o: { created_at: string }) =>
        o.created_at >= businessData.sixtyDaysAgo && o.created_at < businessData.thirtyDaysAgo
    ).length,
    total_revenue_30d: businessData.orders
      .filter((o: { created_at: string; status: string }) => o.created_at >= businessData.thirtyDaysAgo && o.status !== 'cancelled')
      .reduce((sum: number, o: { total: number }) => sum + (o.total || 0), 0),
    outstanding_debts: businessData.debts
      .filter((d: { status: string }) => ['pending', 'overdue', 'partial'].includes(d.status))
      .reduce((sum: number, d: { total_amount: number; amount_paid: number }) => sum + (d.total_amount - d.amount_paid), 0),
    overdue_debts_count: businessData.debts.filter((d: { status: string }) => d.status === 'overdue').length,
    low_stock_count: businessData.inventory.filter(
      (p: { stock_quantity: number; reorder_point: number }) => p.stock_quantity <= (p.reorder_point || 0)
    ).length,
    out_of_stock_count: businessData.inventory.filter(
      (p: { stock_quantity: number }) => p.stock_quantity <= 0
    ).length,
    total_contacts: businessData.contacts.length,
    avg_trust_score: businessData.contacts.length > 0
      ? businessData.contacts.reduce((sum: number, c: { trust_score: number | null }) => sum + (c.trust_score || 50), 0) / businessData.contacts.length
      : 0,
    unpaid_invoices: businessData.invoices
      .filter((i: { status: string; doc_type: string }) => i.doc_type === 'invoice' && !['paid', 'cancelled'].includes(i.status))
      .reduce((sum: number, i: { total: number; amount_paid: number }) => sum + (i.total - i.amount_paid), 0),
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: INSIGHTS_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a business intelligence analyst for a Nigerian SME using a WhatsApp CRM.
Analyze the business data and generate actionable insights.
Return a JSON array of insights, each with:
- insight_type: "trend" | "anomaly" | "opportunity" | "risk" | "recommendation"
- category: "sales" | "customers" | "inventory" | "payments" | "engagement" | "seasonal"
- title: string (short, clear title)
- description: string (2-3 sentences explaining the insight)
- metric_name: string (what metric this relates to)
- metric_value: number (current value)
- comparison_value: number (previous period value if applicable)
- change_percent: number (percentage change)
- priority: "critical" | "high" | "medium" | "low"
- suggested_action: string (specific action the business should take)
- confidence: number (0-1)
Generate 3-8 insights based on the data. Focus on actionable, specific insights.
Return ONLY valid JSON array, no markdown.`,
        },
        {
          role: 'user',
          content: `Business data summary:
${JSON.stringify(summary, null, 2)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`OpenRouter error: ${res.status} ${errBody}`)
  }

  const aiData = await res.json()
  const content = aiData.choices?.[0]?.message?.content || '[]'

  let insights: InsightData[]
  try {
    const cleaned = content.replace(/```json\n?|```\n?/g, '').trim()
    insights = JSON.parse(cleaned)
    if (!Array.isArray(insights)) insights = []
  } catch {
    insights = []
  }

  // Store insights in database
  const stored: BusinessInsight[] = []
  for (const insight of insights) {
    const { data, error } = await db
      .from('business_insights')
      .insert({
        account_id: accountId,
        insight_type: insight.insight_type || 'recommendation',
        category: insight.category || 'sales',
        title: insight.title,
        description: insight.description,
        metric_name: insight.metric_name || null,
        metric_value: insight.metric_value || null,
        comparison_value: insight.comparison_value || null,
        change_percent: insight.change_percent || null,
        priority: insight.priority || 'medium',
        suggested_action: insight.suggested_action || null,
        data_points: insight.data_points || null,
        confidence: insight.confidence || 0.7,
        model_used: INSIGHTS_MODEL,
        cost_usd: (aiData.usage?.total_cost || 0) / Math.max(insights.length, 1),
        valid_from: new Date().toISOString(),
      })
      .select()
      .single()

    if (!error && data) stored.push(data as BusinessInsight)
  }

  // Track usage
  try {
    await trackAIUsage({
      accountId,
      feature: 'business_insights',
      model: INSIGHTS_MODEL,
      inputTokens: aiData.usage?.prompt_tokens || 0,
      outputTokens: aiData.usage?.completion_tokens || 0,
      cost: aiData.usage?.total_cost || 0,
    })
  } catch { /* non-critical */ }

  return stored
}

/**
 * Get active (undismissed) insights for an account.
 */
export async function getActiveInsights(
  accountId: string,
  category?: InsightCategory,
  priority?: InsightPriority
): Promise<BusinessInsight[]> {
  const db = supabaseAdmin()
  let query = db
    .from('business_insights')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_dismissed', false)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)
  if (priority) query = query.eq('priority', priority)

  const { data } = await query.limit(50)
  return (data || []) as BusinessInsight[]
}

/**
 * Dismiss an insight.
 */
export async function dismissInsight(insightId: string): Promise<void> {
  await supabaseAdmin()
    .from('business_insights')
    .update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', insightId)
}

/**
 * Mark action taken on an insight.
 */
export async function markActionTaken(insightId: string): Promise<void> {
  await supabaseAdmin()
    .from('business_insights')
    .update({
      action_taken: true,
      action_taken_at: new Date().toISOString(),
    })
    .eq('id', insightId)
}
