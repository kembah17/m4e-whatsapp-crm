import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { createCategory, getCategories } from '@/lib/support/categories'
import { getSLAPolicies, createSLAPolicy } from '@/lib/support/sla'
import { SUPPORT_INDUSTRY_PRESETS } from '@/lib/support/presets'
import type { TicketPriority } from '@/types/business-growth'

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await getCurrentAccount()
    const { industry, selectedCategories } = await req.json() as {
      industry: string
      selectedCategories?: string[] // optional: only load selected category names
    }

    const preset = SUPPORT_INDUSTRY_PRESETS.find(p => p.industry === industry)
    if (!preset) {
      return NextResponse.json({ error: 'Unknown industry' }, { status: 400 })
    }

    // Get existing categories
    const existing = await getCategories(accountId)
    const existingNames = new Set(existing.map(c => c.name.toLowerCase()))

    // Filter categories if user selected specific ones
    const categoriesToCreate = selectedCategories
      ? preset.categories.filter(c => selectedCategories.includes(c.name))
      : preset.categories

    // Create categories (skip duplicates by name)
    let created = 0
    let skipped = 0
    for (let i = 0; i < categoriesToCreate.length; i++) {
      const cat = categoriesToCreate[i]
      if (!existingNames.has(cat.name.toLowerCase())) {
        await createCategory(accountId, {
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          position: existing.length + created,
        })
        created++
      } else {
        skipped++
      }
    }

    // Apply SLA adjustments if preset has them
    let slaCreated = 0
    if (preset.slaAdjustments) {
      const existingSLAs = await getSLAPolicies(accountId)

      // Only create adjusted SLAs if none exist yet
      if (existingSLAs.length === 0) {
        const baseSLAs: {
          name: string
          priority: TicketPriority
          firstResponse: number
          resolution: number
          escalation: number
        }[] = [
          { name: 'Critical SLA', priority: 'critical', firstResponse: 60, resolution: 240, escalation: 120 },
          { name: 'High Priority SLA', priority: 'high', firstResponse: 240, resolution: 480, escalation: 360 },
          { name: 'Normal SLA', priority: 'normal', firstResponse: 1440, resolution: 2880, escalation: 2160 },
          { name: 'Low Priority SLA', priority: 'low', firstResponse: 2880, resolution: 5760, escalation: 4320 },
        ]

        for (const sla of baseSLAs) {
          await createSLAPolicy(accountId, {
            name: sla.name,
            description: `${preset.label} adjusted SLA`,
            priority: sla.priority,
            first_response_minutes: Math.round(sla.firstResponse * preset.slaAdjustments.responseMultiplier),
            resolution_minutes: Math.round(sla.resolution * preset.slaAdjustments.resolutionMultiplier),
            escalation_minutes: Math.round(sla.escalation * preset.slaAdjustments.responseMultiplier),
            is_default: true,
          })
          slaCreated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      categories_created: created,
      categories_skipped: skipped,
      sla_policies_created: slaCreated,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
