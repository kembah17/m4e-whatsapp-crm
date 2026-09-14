import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { Expense, ExpenseCategory } from '@/types/financials'

export interface ExpenseFilters {
  category?: ExpenseCategory
  startDate?: string
  endDate?: string
  branchId?: string
  revenueCenterId?: string
  limit?: number
  offset?: number
}

export async function getExpenses(
  accountId: string,
  filters: ExpenseFilters = {},
) {
  const db = supabaseAdmin()
  const limit = Math.min(filters.limit || 50, 200)
  const offset = filters.offset || 0

  let query = db
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)
    .order('expense_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.category) {
    query = query.eq('category', filters.category)
  }
  if (filters.startDate) {
    query = query.gte('expense_date', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('expense_date', filters.endDate)
  }
  if (filters.branchId) {
    query = query.eq('branch_id', filters.branchId)
  }
  if (filters.revenueCenterId) {
    query = query.eq('revenue_center_id', filters.revenueCenterId)
  }

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { expenses: (data ?? []) as Expense[], count: count ?? 0 }
}

export async function getExpense(accountId: string, expenseId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('expenses')
    .select('*')
    .eq('account_id', accountId)
    .eq('id', expenseId)
    .single()
  if (error) throw new Error(error.message)
  return data as Expense
}

export async function createExpense(
  accountId: string,
  data: Omit<Expense, 'id' | 'account_id' | 'created_at' | 'updated_at'>,
) {
  const db = supabaseAdmin()
  const { data: row, error } = await db
    .from('expenses')
    .insert({ ...data, account_id: accountId })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as Expense
}

export async function updateExpense(
  accountId: string,
  expenseId: string,
  data: Partial<Omit<Expense, 'id' | 'account_id' | 'created_at'>>,
) {
  const db = supabaseAdmin()
  const { data: row, error } = await db
    .from('expenses')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .eq('id', expenseId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return row as Expense
}

export async function deleteExpense(accountId: string, expenseId: string) {
  const db = supabaseAdmin()
  const { error } = await db
    .from('expenses')
    .delete()
    .eq('account_id', accountId)
    .eq('id', expenseId)
  if (error) throw new Error(error.message)
}

export interface ExpenseSummaryItem {
  category: string
  total: number
  count: number
}

export interface ExpenseSummary {
  byCategory: ExpenseSummaryItem[]
  total: number
  currentMonth: number
  previousMonth: number
  monthOverMonthChange: number
}

export async function getExpenseSummary(
  accountId: string,
  period?: { start: string; end: string },
): Promise<ExpenseSummary> {
  const db = supabaseAdmin()
  const now = new Date()
  const start = period?.start ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const end = period?.end ?? now.toISOString().slice(0, 10)

  // Current period by category
  const { data: rows, error } = await db
    .from('expenses')
    .select('category, amount')
    .eq('account_id', accountId)
    .gte('expense_date', start)
    .lte('expense_date', end)

  if (error) throw new Error(error.message)

  const catMap = new Map<string, { total: number; count: number }>()
  let total = 0
  for (const r of rows ?? []) {
    const amt = Number(r.amount) || 0
    total += amt
    const existing = catMap.get(r.category) ?? { total: 0, count: 0 }
    existing.total += amt
    existing.count += 1
    catMap.set(r.category, existing)
  }

  const byCategory: ExpenseSummaryItem[] = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total)

  // Previous month
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const { data: prevRows } = await db
    .from('expenses')
    .select('amount')
    .eq('account_id', accountId)
    .gte('expense_date', prevStart.toISOString().slice(0, 10))
    .lte('expense_date', prevEnd.toISOString().slice(0, 10))

  const previousMonth = (prevRows ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const currentMonth = total
  const monthOverMonthChange = previousMonth > 0
    ? ((currentMonth - previousMonth) / previousMonth) * 100
    : 0

  return { byCategory, total, currentMonth, previousMonth, monthOverMonthChange }
}
