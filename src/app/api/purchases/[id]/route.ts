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
      .from('purchase_history')
      .select('*, contact:contacts(*), product:products(*)')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ purchase: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ctx = await requireRole('admin');
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const update: Record<string, unknown> = {};
    const fields = [
      'contact_id', 'product_id', 'product_name', 'amount',
      'purchase_date', 'quantity', 'channel', 'notes',
    ] as const;
    for (const k of fields) {
      if (k in body) update[k] = body[k];
    }

    const { data, error } = await ctx.supabase
      .from('purchase_history')
      .update(update)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/purchases/:id] update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ purchase: data });
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
      .from('purchase_history')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId);

    if (error) {
      console.error('[DELETE /api/purchases/:id] delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
