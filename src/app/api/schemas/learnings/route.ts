// =============================================================================
// GET /api/schemas/learnings — List creative learnings
// POST /api/schemas/learnings — Create a new creative learning
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/ecommerce/admin-client';

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const accountId = searchParams.get('account_id');
    const scope = searchParams.get('scope');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = admin
      .from('creative_learnings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (accountId) query = query.eq('account_id', accountId);
    if (scope) query = query.eq('scope', scope);

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
      schema_object_id,
      scope,
      observation,
      finding,
      winning_pattern,
      losing_pattern,
      diagnosis,
      commercial_effect,
      confidence_score,
      applicability,
      source_performance_ids = [],
    } = body;

    if (!account_id || !scope || !observation || !finding) {
      return NextResponse.json(
        { error: 'Missing required fields: account_id, scope, observation, finding' },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from('creative_learnings')
      .insert({
        account_id,
        schema_object_id,
        scope,
        observation,
        finding,
        winning_pattern,
        losing_pattern,
        diagnosis,
        commercial_effect,
        confidence_score,
        applicability,
        source_performance_ids,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
