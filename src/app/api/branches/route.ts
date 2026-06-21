import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');

    let query = ctx.supabase
      .from('branches')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('name');

    if (isActive === 'true') {
      query = query.eq('is_active', true);
    } else if (isActive === 'false') {
      query = query.eq('is_active', false);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ branches: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { name } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    }

    const payload = {
      account_id: ctx.accountId,
      name: name.trim(),
      address: body.address?.trim() || null,
      phone: body.phone?.trim() || null,
      manager_name: body.manager_name?.trim() || null,
      metadata: body.metadata || {},
      is_active: body.is_active ?? true,
    };

    const { data, error } = await ctx.supabase
      .from('branches')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/branches] insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ branch: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
