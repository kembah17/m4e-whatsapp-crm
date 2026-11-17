import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { CampaignTemplate } from '@/types/campaigns'

// GET /api/admin/campaign-templates - List all campaign templates
export async function GET() {
  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('campaign_templates')
      .select('*')
      .order('tier', { ascending: true })
      .order('sort_order', { ascending: true })

    if (error) throw error

    return NextResponse.json({ templates: (data ?? []) as CampaignTemplate[] })
  } catch (err) {
    console.error('[admin/campaign-templates GET] error:', err)
    return NextResponse.json({ error: 'Failed to list campaign templates' }, { status: 500 })
  }
}

// POST /api/admin/campaign-templates - Create new campaign template
export async function POST(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const body = await request.json()

    // Generate slug from name if not provided
    if (!body.slug && body.name) {
      body.slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    }

    const { data, error } = await db
      .from('campaign_templates')
      .insert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ template: data as CampaignTemplate }, { status: 201 })
  } catch (err) {
    console.error('[admin/campaign-templates POST] error:', err)
    return NextResponse.json({ error: 'Failed to create campaign template' }, { status: 500 })
  }
}
