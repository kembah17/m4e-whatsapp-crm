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
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product: data });
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
      'name', 'price', 'status', 'category', 'description', 'short_pitch',
      'cost', 'image_url', 'sku', 'lead_magnet_eligible', 'lead_magnet_cost',
      'upsell_product_id', 'seasonal_start', 'seasonal_end', 'tags',
      'ai_generated_fields',
    ] as const;
    for (const k of fields) {
      if (k in body) update[k] = body[k];
    }

    const { data, error } = await ctx.supabase
      .from('products')
      .update(update)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/products/:id] update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ product: data });
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
      .from('products')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId);

    if (error) {
      console.error('[DELETE /api/products/:id] delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
