import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { CampaignTemplate } from '@/types/campaigns'

// GET /api/admin/campaign-templates/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id } = await params

    const { data, error } = await db
      .from('campaign_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template: data as CampaignTemplate })
  } catch (err) {
    console.error('[admin/campaign-templates/[id] GET] error:', err)
    return NextResponse.json({ error: 'Failed to get template' }, { status: 500 })
  }
}

// PATCH /api/admin/campaign-templates/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id } = await params
    const body = await request.json()

    const { data, error } = await db
      .from('campaign_templates')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ template: data as CampaignTemplate })
  } catch (err) {
    console.error('[admin/campaign-templates/[id] PATCH] error:', err)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

// DELETE /api/admin/campaign-templates/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id } = await params

    const { error } = await db
      .from('campaign_templates')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/campaign-templates/[id] DELETE] error:', err)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
