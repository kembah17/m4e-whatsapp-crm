import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { PackageValidation } from '@/types/packages'

// GET /api/admin/validations - List package validations
export async function GET(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const packageConfigId = searchParams.get('package_config_id')

    let query = db
      .from('package_validations')
      .select('*')
      .order('created_at', { ascending: false })

    if (packageConfigId) {
      query = query.eq('package_config_id', packageConfigId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ validations: data as PackageValidation[] })
  } catch (err) {
    console.error('[admin/validations GET] error:', err)
    return NextResponse.json({ error: 'Failed to list validations' }, { status: 500 })
  }
}

// POST /api/admin/validations - Create validation
export async function POST(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const body = await request.json()

    const { package_config_id, validation_type } = body as {
      package_config_id: string
      validation_type: string
    }

    if (!package_config_id || !validation_type) {
      return NextResponse.json(
        { error: 'package_config_id and validation_type are required' },
        { status: 400 }
      )
    }

    const { data, error } = await db
      .from('package_validations')
      .insert({
        package_config_id,
        validation_type,
        status: 'not_started',
        findings: [],
        metrics_snapshot: {},
        bottlenecks: [],
        time_estimates_validated: false,
        deliverables_produced: false,
        edge_cases_handled: false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ validation: data as PackageValidation }, { status: 201 })
  } catch (err) {
    console.error('[admin/validations POST] error:', err)
    return NextResponse.json({ error: 'Failed to create validation' }, { status: 500 })
  }
}

// PATCH /api/admin/validations - Update validation
export async function PATCH(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const body = await request.json()
    const { id, ...updates } = body as { id: string } & Partial<PackageValidation>

    if (!id) {
      return NextResponse.json(
        { error: 'id is required in request body' },
        { status: 400 }
      )
    }

    const { data, error } = await db
      .from('package_validations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ validation: data as PackageValidation })
  } catch (err) {
    console.error('[admin/validations PATCH] error:', err)
    return NextResponse.json({ error: 'Failed to update validation' }, { status: 500 })
  }
}
