import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { updateLocation, deleteLocation } from '@/lib/inventory'
import type { UpdateLocationInput } from '@/types/inventory'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/inventory/locations/[id]
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    await getCurrentAccount()
    const { id } = await ctx.params
    const body = (await req.json()) as UpdateLocationInput

    const location = await updateLocation(id, body)
    return NextResponse.json({ location })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// DELETE /api/inventory/locations/[id]
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    await getCurrentAccount()
    const { id } = await ctx.params

    await deleteLocation(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
