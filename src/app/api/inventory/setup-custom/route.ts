import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { createLocation } from '@/lib/inventory'

// POST /api/inventory/setup-custom - create custom locations
export async function POST(req: NextRequest) {
  try {
    const { accountId } = await getCurrentAccount()
    const { locations } = await req.json() as {
      locations: { name: string; type: string }[]
    }

    if (!locations?.length) {
      return NextResponse.json(
        { error: 'At least one location is required' },
        { status: 400 }
      )
    }

    if (locations.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 locations per setup' },
        { status: 400 }
      )
    }

    const created: string[] = []
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i]
      if (!loc.name?.trim() || !loc.type?.trim()) continue
      const result = await createLocation(accountId, {
        name: loc.name.trim(),
        location_type: loc.type as 'warehouse' | 'store' | 'zone' | 'shelf' | 'bin' | 'transit' | 'virtual',
        parent_id: null,
        sort_order: i,
      })
      created.push(result.id)
    }

    return NextResponse.json(
      { success: true, locations_created: created.length },
      { status: 201 }
    )
  } catch (err) {
    return toErrorResponse(err)
  }
}
