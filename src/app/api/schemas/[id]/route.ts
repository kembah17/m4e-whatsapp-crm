// =============================================================================
// GET /api/schemas/[id] — Get a single schema object
// PATCH /api/schemas/[id] — Update a schema object
// DELETE /api/schemas/[id] — Delete a schema object
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/ecommerce/admin-client';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;

    const { data, error } = await admin
      .from('schema_objects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;
    const body = await req.json();

    // Only allow updating specific fields
    const allowedFields = [
      'data',
      'lifecycle_status',
      'confidence_score',
      'confidence_level',
      'approved_by',
      'approved_at',
      'tags',
      'schema_version',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    // Auto-increment object_version on data changes
    if ('data' in updates) {
      const { data: current } = await admin
        .from('schema_objects')
        .select('object_version')
        .eq('id', id)
        .single();

      if (current) {
        updates.object_version = current.object_version + 1;
      }
    }

    const { data, error } = await admin
      .from('schema_objects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const admin = supabaseAdmin();
    const { id } = await params;

    const { error } = await admin
      .from('schema_objects')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
