import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getSuppliers, createSupplier } from '@/lib/inventory'
import type { CreateSupplierInput } from '@/types/inventory'

// GET /api/inventory/suppliers
export async function GET() {
  try {
    const { accountId } = await getCurrentAccount()
    const suppliers = await getSuppliers(accountId)
    return NextResponse.json({ suppliers })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// POST /api/inventory/suppliers
export async function POST(req: NextRequest) {
  try {
    const { accountId } = await getCurrentAccount()
    const body = (await req.json()) as CreateSupplierInput

    if (!body.name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const supplier = await createSupplier(accountId, body)
    return NextResponse.json({ supplier }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
