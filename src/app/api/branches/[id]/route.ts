import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await getCurrentAccount();
    const { data, error } = await ctx.supabase
      .from('branches')
      .select('*')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ branch: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requireRole('admin');
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const update: Record<string, unknown> = {};
    const fields = ['name', 'address', 'phone', 'manager_name', 'metadata', 'is_active'] as const;
    for (const k of fields) {
      if (k in body) {
        if (k === 'name' && (!body.name || !String(body.name).trim())) {
          return NextResponse.json({ error: 'Branch name cannot be empty' }, { status: 400 });
        }
        update[k] = typeof body[k] === 'string' ? body[k].trim() : body[k];
      }
    }
    update.updated_at = new Date().toISOString();

    const { data, error } = await ctx.supabase
      .from('branches')
      .update(update)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/branches/:id] update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ branch: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requireRole('admin');
    const { error } = await ctx.supabase
      .from('branches')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId);

    if (error) {
      console.error('[DELETE /api/branches/:id] delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
