import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contact_id') || '';

    let query = ctx.supabase
      .from('purchase_history')
      .select('*, contact:contacts(*), product:products(*)')
      .eq('account_id', ctx.accountId)
      .order('purchase_date', { ascending: false });

    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ purchases: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { contact_id, product_name, amount, purchase_date } = body;
    if (!contact_id) return NextResponse.json({ error: 'contact_id is required' }, { status: 400 });
    if (!product_name || typeof product_name !== 'string') {
      return NextResponse.json({ error: 'product_name is required' }, { status: 400 });
    }
    if (amount == null || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }
    if (!purchase_date) return NextResponse.json({ error: 'purchase_date is required' }, { status: 400 });

    const payload = {
      account_id: ctx.accountId,
      contact_id: body.contact_id,
      product_id: body.product_id || null,
      product_name: body.product_name.trim(),
      amount: Number(body.amount),
      purchase_date: body.purchase_date,
      quantity: Number(body.quantity) || 1,
      channel: body.channel?.trim() || null,
      notes: body.notes?.trim() || null,
      import_batch_id: body.import_batch_id || null,
    };

    const { data, error } = await ctx.supabase
      .from('purchase_history')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/purchases] insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ purchase: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
