import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';
import {
  getOrCreateFeatureAccess,
  updateAccountTier,
  getUsageLimits,
  getFeatureList,
} from '@/lib/tier-gating';
import type { FeatureTier } from '@/types/business-growth';

export async function GET() {
  try {
    const { accountId } = await getCurrentAccount();

    const config = await getOrCreateFeatureAccess(accountId);
    const limits = await getUsageLimits(accountId);
    const features = getFeatureList(config.current_tier);

    return NextResponse.json({ config, limits, features });
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    requireRole(ctx, ['owner', 'admin']);

    const body = await req.json();
    const { tier, overrides } = body as { tier: FeatureTier; overrides?: Record<string, unknown> };

    const validTiers: FeatureTier[] = ['starter', 'professional', 'business', 'enterprise'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const updated = await updateAccountTier(ctx.accountId, tier, overrides);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 });
    }

    return NextResponse.json({ config: updated });
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
