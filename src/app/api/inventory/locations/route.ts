import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { getLocations, createLocation } from '@/lib/inventory'
import type { CreateLocationInput } from '@/types/inventory'

// GET /api/inventory/locations - tree of locations
export async function GET() {
  try {
    const { accountId } = await getCurrentAccount()
    const locations = await getLocations(accountId)
    return NextResponse.json({ locations })
  } catch (err) {
    return toErrorResponse(err)
  }
}

// POST /api/inventory/locations - create a location
export async function POST(req: NextRequest) {
  try {
    const { accountId } = await getCurrentAccount()
    const body = (await req.json()) as CreateLocationInput

    if (!body.name || !body.location_type) {
      return NextResponse.json(
        { error: 'name and location_type are required' },
        { status: 400 }
      )
    }

    const location = await createLocation(accountId, body)
    return NextResponse.json({ location }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
