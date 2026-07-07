import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { PackageConfig } from '@/types/packages'

// GET /api/admin/packages/[id] - Get single package config
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id } = await params

    const { data, error } = await db
      .from('package_configs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    return NextResponse.json({ package: data as PackageConfig })
  } catch (err) {
    console.error('[admin/packages/[id] GET] error:', err)
    return NextResponse.json({ error: 'Failed to get package' }, { status: 500 })
  }
}

// PATCH /api/admin/packages/[id] - Update package config
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id } = await params
    const body = await request.json()

    const { data, error } = await db
      .from('package_configs')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ package: data as PackageConfig })
  } catch (err) {
    console.error('[admin/packages/[id] PATCH] error:', err)
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
  }
}

// DELETE /api/admin/packages/[id] - Delete package config
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id } = await params

    const { error } = await db
      .from('package_configs')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[admin/packages/[id] DELETE] error:', err)
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 })
  }
}
