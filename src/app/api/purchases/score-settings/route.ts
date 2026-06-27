import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';
import type { ProductScoreSettings } from '@/types';

/**
 * GET /api/purchases/score-settings
 * Returns the account's product score settings (upserts defaults if missing).
 */
export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    // Try to fetch existing settings
    let { data, error } = await ctx.supabase
      .from('product_score_settings')
      .select('*')
      .eq('account_id', ctx.accountId)
      .single();

    // If no row exists, create one with defaults
    if (error?.code === 'PGRST116' || !data) {
      const { data: inserted, error: insertErr } = await ctx.supabase
        .from('product_score_settings')
        .upsert({
          account_id: ctx.accountId,
          weight_reactivation_power: 30,
          weight_revenue_potential: 30,
          weight_margin_score: 20,
          weight_dormant_match: 20,
          lead_magnet_cost_threshold: 0.15,
          dormancy_threshold_days: 90,
          industry: 'retail',
          hot_dormant_days: 60,
          warm_dormant_days: 120,
          cold_dormant_days: 240,
          adaptive_enabled: false,
        }, { onConflict: 'account_id' })
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      data = inserted;
    } else if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data as ProductScoreSettings });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * PUT /api/purchases/score-settings
 * Updates the account's product score settings.
 */
export async function PUT(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    // Whitelist allowed fields
    const allowed: (keyof ProductScoreSettings)[] = [
      'weight_reactivation_power',
      'weight_revenue_potential',
      'weight_margin_score',
      'weight_dormant_match',
      'lead_magnet_cost_threshold',
      'dormancy_threshold_days',
      'industry',
      'hot_dormant_days',
      'warm_dormant_days',
      'cold_dormant_days',
      'adaptive_enabled',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate threshold ordering if any threshold is being updated
    const hot = (updates.hot_dormant_days as number) ?? undefined;
    const warm = (updates.warm_dormant_days as number) ?? undefined;
    const cold = (updates.cold_dormant_days as number) ?? undefined;

    if (hot !== undefined || warm !== undefined || cold !== undefined) {
      // Fetch current values to merge with updates
      const { data: current } = await ctx.supabase
        .from('product_score_settings')
        .select('hot_dormant_days, warm_dormant_days, cold_dormant_days')
        .eq('account_id', ctx.accountId)
        .single();

      const finalHot = hot ?? current?.hot_dormant_days ?? 60;
      const finalWarm = warm ?? current?.warm_dormant_days ?? 120;
      const finalCold = cold ?? current?.cold_dormant_days ?? 240;

      if (finalHot <= 0 || finalWarm <= finalHot || finalCold <= finalWarm) {
        return NextResponse.json(
          { error: 'Thresholds must be in ascending order: hot < warm < cold, all > 0' },
          { status: 400 },
        );
      }
    }

    const { data, error } = await ctx.supabase
      .from('product_score_settings')
      .update(updates)
      .eq('account_id', ctx.accountId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data as ProductScoreSettings });
  } catch (err) {
    return toErrorResponse(err);
  }
}
