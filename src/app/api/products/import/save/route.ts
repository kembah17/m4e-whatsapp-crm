import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';

interface ProductToSave {
  name: string;
  price: number;
  category?: string;
  description?: string;
  short_pitch?: string;
  cost?: number;
  sku?: string;
  image_url?: string;
  status?: string;
  unit_of_measure?: string;
  track_inventory?: boolean;
  stock_quantity?: number;
  reorder_point?: number;
  supplier_name?: string;
  supplier_phone?: string;
  tags?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole('admin');
    const body = await req.json();
    const { products } = body as { products: ProductToSave[] };

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'products array is required' },
        { status: 400 },
      );
    }

    if (products.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 products per import' },
        { status: 400 },
      );
    }

    const rows = products.map((p) => ({
      account_id: ctx.accountId,
      name: p.name.trim(),
      price: Number(p.price) || 0,
      status: p.status || 'active',
      category: p.category?.trim() || null,
      description: p.description?.trim() || null,
      short_pitch: p.short_pitch?.trim() || null,
      cost: p.cost != null ? Number(p.cost) : null,
      sku: p.sku?.trim() || null,
      image_url: p.image_url?.trim() || null,
      unit_of_measure: p.unit_of_measure?.trim() || 'pieces',
      track_inventory: p.track_inventory ?? false,
      stock_quantity: p.stock_quantity ?? 0,
      reorder_point: p.reorder_point ?? 5,
      supplier_name: p.supplier_name?.trim() || null,
      supplier_phone: p.supplier_phone?.trim() || null,
      tags: p.tags || [],
    }));

    const { data, error } = await ctx.supabase
      .from('products')
      .insert(rows)
      .select('id, name');

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      imported: data?.length ?? 0,
      products: data ?? [],
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
