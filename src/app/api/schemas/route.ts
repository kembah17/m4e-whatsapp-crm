// =============================================================================
// GET /api/schemas — List schema objects with filters
// POST /api/schemas — Create a new schema object
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/ecommerce/admin-client';

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const accountId = searchParams.get('account_id');
    const schemaType = searchParams.get('schema_type');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const parentId = searchParams.get('parent_id');
    const tag = searchParams.get('tag');

    let query = admin
      .from('schema_objects')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (accountId) query = query.eq('account_id', accountId);
    if (schemaType) query = query.eq('schema_type', schemaType);
    if (status) query = query.eq('lifecycle_status', status);
    if (parentId) query = query.eq('parent_id', parentId);
    if (tag) query = query.contains('tags', [tag]);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, count, limit, offset });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const body = await req.json();

    const {
      account_id,
      schema_type,
      schema_version = '1.0.0',
      data,
      lifecycle_status = 'draft',
      confidence_score,
      confidence_level,
      parent_id,
      created_by = 'system',
      tags = [],
    } = body;

    if (!account_id || !schema_type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: account_id, schema_type, data' },
        { status: 400 }
      );
    }

    const { data: created, error } = await admin
      .from('schema_objects')
      .insert({
        account_id,
        schema_type,
        schema_version,
        data,
        lifecycle_status,
        confidence_score,
        confidence_level,
        parent_id,
        created_by,
        tags,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
