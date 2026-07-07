import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { PackageConfig } from '@/types/packages'

// GET /api/admin/packages - List all package configs
export async function GET() {
  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('package_configs')
      .select('*')
      .order('tier', { ascending: true })
      .order('price_naira', { ascending: true })

    if (error) throw error

    return NextResponse.json({ packages: data as PackageConfig[] })
  } catch (err) {
    console.error('[admin/packages GET] error:', err)
    return NextResponse.json({ error: 'Failed to list packages' }, { status: 500 })
  }
}

// POST /api/admin/packages - Create new package config
export async function POST(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const body = await request.json()

    const { data, error } = await db
      .from('package_configs')
      .insert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ package: data as PackageConfig }, { status: 201 })
  } catch (err) {
    console.error('[admin/packages POST] error:', err)
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
  }
}
