// =============================================================================
// GET /api/schemas/patterns — List creative patterns with filters
// POST /api/schemas/patterns — Create a new creative pattern
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/ecommerce/admin-client';

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin();
    const { searchParams } = new URL(req.url);

    const accountId = searchParams.get('account_id');
    const patternType = searchParams.get('pattern_type');
    const industry = searchParams.get('industry');
    const channel = searchParams.get('channel');
    const trend = searchParams.get('trend');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = admin
      .from('creative_patterns')
      .select('*', { count: 'exact' })
      .order('frequency', { ascending: false })
      .range(offset, offset + limit - 1);

    if (accountId) query = query.eq('account_id', accountId);
    if (patternType) query = query.eq('pattern_type', patternType);
    if (industry) query = query.eq('industry', industry);
    if (channel) query = query.eq('channel', channel);
    if (trend) query = query.eq('trend', trend);

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
      pattern_type,
      name,
      description,
      frequency = 1,
      trend = 'unknown',
      saturation = 'medium',
      effectiveness_evidence = {},
      audience_fit = {},
      strengths = [],
      weaknesses = [],
      opportunity,
      recommended_use,
      industry,
      channel,
    } = body;

    if (!account_id || !pattern_type || !name || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: account_id, pattern_type, name, description' },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from('creative_patterns')
      .insert({
        account_id,
        schema_object_id,
        pattern_type,
        name,
        description,
        frequency,
        trend,
        saturation,
        effectiveness_evidence,
        audience_fit,
        strengths,
        weaknesses,
        opportunity,
        recommended_use,
        industry,
        channel,
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
