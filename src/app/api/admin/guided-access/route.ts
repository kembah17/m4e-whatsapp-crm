import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { GuidedAccessConfig } from '@/types/packages'

// GET /api/admin/guided-access - Get guided access configs
export async function GET(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('account_id')

    if (!accountId) {
      return NextResponse.json(
        { error: 'account_id query parameter is required' },
        { status: 400 }
      )
    }

    const { data, error } = await db
      .from('guided_access_configs')
      .select('*')
      .eq('account_id', accountId)
      .order('feature_key', { ascending: true })

    if (error) throw error

    return NextResponse.json({ configs: data as GuidedAccessConfig[] })
  } catch (err) {
    console.error('[admin/guided-access GET] error:', err)
    return NextResponse.json({ error: 'Failed to get guided access configs' }, { status: 500 })
  }
}

// POST /api/admin/guided-access - Set guided access (upsert)
export async function POST(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const body = await request.json()

    const {
      account_id,
      feature_key,
      access_level,
      package_config_id,
      is_highlighted,
      upgrade_prompt,
    } = body as {
      account_id: string
      feature_key: string
      access_level: string
      package_config_id?: string
      is_highlighted?: boolean
      upgrade_prompt?: string
    }

    if (!account_id || !feature_key || !access_level) {
      return NextResponse.json(
        { error: 'account_id, feature_key, and access_level are required' },
        { status: 400 }
      )
    }

    const { data, error } = await db
      .from('guided_access_configs')
      .upsert(
        {
          account_id,
          feature_key,
          access_level,
          package_config_id: package_config_id ?? null,
          is_highlighted: is_highlighted ?? false,
          upgrade_prompt: upgrade_prompt ?? null,
        },
        { onConflict: 'account_id,feature_key' }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ config: data as GuidedAccessConfig })
  } catch (err) {
    console.error('[admin/guided-access POST] error:', err)
    return NextResponse.json({ error: 'Failed to set guided access config' }, { status: 500 })
  }
}
