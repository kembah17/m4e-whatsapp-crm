import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { createLocation } from '@/lib/inventory'
import { getPreset } from '@/lib/inventory/presets'
import type { PresetLocation } from '@/types/inventory'

// POST /api/inventory/setup - apply an industry preset
export async function POST(req: NextRequest) {
  try {
    const { accountId } = await getCurrentAccount()
    const body = await req.json()
    const { industry } = body as { industry: string }

    if (!industry) {
      return NextResponse.json(
        { error: 'industry is required' },
        { status: 400 }
      )
    }

    const preset = getPreset(industry)
    if (!preset) {
      return NextResponse.json(
        { error: `Unknown industry: ${industry}` },
        { status: 400 }
      )
    }

    // Recursively create locations from preset
    const createdLocations: string[] = []

    async function createLocationsRecursive(
      locations: PresetLocation[],
      parentId: string | null
    ) {
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i]
        const created = await createLocation(accountId, {
          name: loc.name,
          location_type: loc.type,
          parent_id: parentId,
          sort_order: i,
        })
        createdLocations.push(created.id)

        if (loc.children && loc.children.length > 0) {
          await createLocationsRecursive(loc.children, created.id)
        }
      }
    }

    await createLocationsRecursive(preset.defaultLocations, null)

    return NextResponse.json({
      success: true,
      industry: preset.industry,
      description: preset.description,
      locations_created: createdLocations.length,
      defaults: {
        unit_of_measure: preset.unitOfMeasure,
        reorder_point: preset.reorderDefaults.point,
        reorder_quantity: preset.reorderDefaults.quantity,
        batch_tracking: preset.batchTrackingEnabled,
        expiry_tracking: preset.expiryTrackingEnabled,
        categories: preset.defaultCategories,
      },
    }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
