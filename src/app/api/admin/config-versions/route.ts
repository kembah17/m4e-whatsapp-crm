import { NextResponse, type NextRequest } from 'next/server'
import { listVersions, getVersion } from '@/lib/admin/version-history'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

// GET /api/admin/config-versions?entity_type=...&entity_id=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type') as 'package_config' | 'campaign_template' | null
    const entityId = searchParams.get('entity_id')
    const versionId = searchParams.get('version_id')

    // Get a specific version by ID
    if (versionId) {
      const version = await getVersion(versionId)
      if (!version) {
        return NextResponse.json({ error: 'Version not found' }, { status: 404 })
      }
      return NextResponse.json({ version })
    }

    // List versions for an entity
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      )
    }

    const versions = await listVersions(entityType, entityId)
    return NextResponse.json({ versions })
  } catch (err) {
    console.error('[admin/config-versions GET] error:', err)
    return NextResponse.json({ error: 'Failed to list versions' }, { status: 500 })
  }
}

// POST /api/admin/config-versions/restore
// Restores an entity to a previous version
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { version_id } = body

    if (!version_id) {
      return NextResponse.json({ error: 'version_id is required' }, { status: 400 })
    }

    const version = await getVersion(version_id)
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    const db = supabaseAdmin()
    const tableName = version.entity_type === 'package_config'
      ? 'package_configs'
      : 'campaign_templates'

    // Remove fields that shouldn't be restored
    const snapshot = { ...version.snapshot } as Record<string, unknown>
    delete snapshot.id
    delete snapshot.created_at
    snapshot.updated_at = new Date().toISOString()

    const { data, error } = await db
      .from(tableName)
      .update(snapshot)
      .eq('id', version.entity_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      restored_to_version: version.version_number,
      entity: data,
    })
  } catch (err) {
    console.error('[admin/config-versions POST] error:', err)
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 })
  }
}
