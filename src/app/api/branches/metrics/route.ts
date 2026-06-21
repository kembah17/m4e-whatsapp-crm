import { NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';

export async function GET() {
  try {
    const ctx = await getCurrentAccount();

    const { data, error } = await ctx.supabase
      .rpc('get_branch_metrics', { p_account_id: ctx.accountId });

    if (error) {
      console.error('[GET /api/branches/metrics] rpc error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ metrics: data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
}
