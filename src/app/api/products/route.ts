import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';

    let query = ctx.supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('account_id', ctx.accountId)
      .order('created_at', { ascending: false });

    if (search) {
      const term = `%${search}%`;
      query = query.or(`name.ilike.${term},category.ilike.${term},sku.ilike.${term}`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: data ?? [], count: count ?? 0 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { name, price } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }
    if (price == null || isNaN(Number(price)) || Number(price) < 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }

    const payload = {
      account_id: ctx.accountId,
      name: body.name.trim(),
      price: Number(body.price),
      status: body.status || 'active',
      category: body.category?.trim() || null,
      description: body.description?.trim() || null,
      short_pitch: body.short_pitch?.trim() || null,
      cost: body.cost != null ? Number(body.cost) : null,
      image_url: body.image_url?.trim() || null,
      sku: body.sku?.trim() || null,
      lead_magnet_eligible: body.lead_magnet_eligible ?? false,
      lead_magnet_cost: body.lead_magnet_cost != null ? Number(body.lead_magnet_cost) : null,
      upsell_product_id: body.upsell_product_id || null,
      seasonal_start: body.seasonal_start || null,
      seasonal_end: body.seasonal_end || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      ai_generated_fields: body.ai_generated_fields || {},
      // Inventory fields
      track_inventory: body.track_inventory ?? false,
      stock_quantity: body.track_inventory ? (Number(body.stock_quantity) || 0) : 0,
      reorder_point: Number(body.reorder_point) || 5,
      reorder_quantity: Number(body.reorder_quantity) || 20,
      unit_of_measure: body.unit_of_measure || 'pieces',
      supplier_name: body.supplier_name?.trim() || null,
      supplier_phone: body.supplier_phone?.trim() || null,
    };

    const { data, error } = await ctx.supabase
      .from('products')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/products] insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
