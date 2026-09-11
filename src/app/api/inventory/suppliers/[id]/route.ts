import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { updateSupplier, deleteSupplier } from '@/lib/inventory'
import type { UpdateSupplierInput } from '@/types/inventory'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/inventory/suppliers/[id]
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await getCurrentAccount()
    const { id } = await ctx.params
    const body = (await req.json()) as UpdateSupplierInput

    const supplier = await updateSupplier(id, body)
    return NextResponse.json({ supplier })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// DELETE /api/inventory/suppliers/[id]
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    await getCurrentAccount()
    const { id } = await ctx.params

    await deleteSupplier(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
