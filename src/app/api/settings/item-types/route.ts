import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';

export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    const { data, error } = await ctx.supabase
      .from('account_item_type_config')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('sort_order', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ configs: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { item_type, is_enabled, display_label, display_label_plural, sort_order } = body;
    if (!item_type) return NextResponse.json({ error: 'item_type is required' }, { status: 400 });

    // Upsert: update if exists, insert if not
    const { data: existing } = await ctx.supabase
      .from('account_item_type_config')
      .select('id')
      .eq('account_id', ctx.accountId)
      .eq('item_type', item_type)
      .maybeSingle();

    if (existing) {
      const { data, error } = await ctx.supabase
        .from('account_item_type_config')
        .update({
          is_enabled: is_enabled ?? true,
          display_label: display_label?.trim() || null,
          display_label_plural: display_label_plural?.trim() || null,
          sort_order: sort_order ?? 0,
        })
        .eq('id', existing.id)
        .eq('account_id', ctx.accountId)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ config: data });
    } else {
      const { data, error } = await ctx.supabase
        .from('account_item_type_config')
        .insert({
          account_id: ctx.accountId,
          item_type,
          is_enabled: is_enabled ?? true,
          display_label: display_label?.trim() || null,
          display_label_plural: display_label_plural?.trim() || null,
          sort_order: sort_order ?? 0,
          metadata_schema: {},
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ config: data }, { status: 201 });
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
