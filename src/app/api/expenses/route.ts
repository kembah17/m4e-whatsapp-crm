import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getExpenses, createExpense } from '@/lib/expenses'
import type { ExpenseCategory } from '@/types/financials'

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as ExpenseCategory | null
    const startDate = searchParams.get('start') || undefined
    const endDate = searchParams.get('end') || undefined
    const branchId = searchParams.get('branch_id') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await getExpenses(ctx.accountId, {
      category: category || undefined,
      startDate,
      endDate,
      branchId,
      limit,
      offset,
    })
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin')
    const body = await request.json()
    const expense = await createExpense(ctx.accountId, {
      ...body,
      recorded_by: ctx.userId,
    })
    return NextResponse.json(expense, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
