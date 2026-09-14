import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { getRevenueCenters, createRevenueCenter } from '@/lib/revenue-centers'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const centers = await getRevenueCenters(ctx.accountId)
    return NextResponse.json({ centers })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin')
    const body = await request.json()
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    const center = await createRevenueCenter(ctx.accountId, body)
    return NextResponse.json(center, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
