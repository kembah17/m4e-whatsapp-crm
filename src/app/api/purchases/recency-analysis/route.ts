import { NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';
import type { RecencyAnalysis } from '@/types';

/**
 * GET /api/purchases/recency-analysis
 * Runs the analyze_purchase_recency RPC and returns statistical
 * analysis of purchase intervals with threshold recommendations.
 */
export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    const { data, error } = await ctx.supabase.rpc('analyze_purchase_recency', {
      p_account_id: ctx.accountId,
    });

    if (error) {
      console.error('[GET /api/purchases/recency-analysis] RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ analysis: data as RecencyAnalysis });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/purchases/recency-analysis
 * Runs analysis AND applies recommendations to settings.
 * Body can include { apply: true } to accept recommendations,
 * or { apply: false } to just store them without changing thresholds.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    const body = await request.json().catch(() => ({ apply: false }));
    const shouldApply = body?.apply === true;

    if (shouldApply) {
      // Use the apply_adaptive_recency RPC which analyzes AND updates
      const { data, error } = await ctx.supabase.rpc('apply_adaptive_recency', {
        p_account_id: ctx.accountId,
      });

      if (error) {
        console.error('[POST /api/purchases/recency-analysis] apply RPC error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Fetch updated settings
      const { data: settings } = await ctx.supabase
        .from('product_score_settings')
        .select('*')
        .eq('account_id', ctx.accountId)
        .single();

      return NextResponse.json({
        analysis: data as RecencyAnalysis,
        settings,
        applied: true,
      });
    } else {
      // Just analyze and store recommendations without changing thresholds
      const { data: analysis, error: analysisErr } = await ctx.supabase.rpc(
        'analyze_purchase_recency',
        { p_account_id: ctx.accountId },
      );

      if (analysisErr) {
        return NextResponse.json({ error: analysisErr.message }, { status: 500 });
      }

      const recs = (analysis as RecencyAnalysis)?.recommendations;
      const confidence = (analysis as RecencyAnalysis)?.confidence ?? 0;
      const intervalStats = (analysis as RecencyAnalysis)?.interval_stats;

      // Store recommendations in settings without changing active thresholds
      if (recs) {
        await ctx.supabase
          .from('product_score_settings')
          .update({
            recommended_hot_days: recs.hot_dormant_days,
            recommended_warm_days: recs.warm_dormant_days,
            recommended_cold_days: recs.cold_dormant_days,
            data_sample_size: intervalStats?.sample_size ?? 0,
            data_confidence: confidence,
            last_analysis_at: new Date().toISOString(),
          })
          .eq('account_id', ctx.accountId);
      }

      return NextResponse.json({
        analysis: analysis as RecencyAnalysis,
        applied: false,
      });
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
