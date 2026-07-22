import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account';
import { canAccessFeature, showUpsellPrompt, recordUpsellShown } from '@/lib/tier-gating';

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await getCurrentAccount();

    const body = await req.json();
    const { feature, record_upsell } = body as { feature: string; record_upsell?: boolean };

    if (!feature) {
      return NextResponse.json({ error: 'Feature name required' }, { status: 400 });
    }

    const access = await canAccessFeature(accountId, feature);

    let upsell = null;
    if (!access.allowed) {
      upsell = await showUpsellPrompt(accountId, feature);
      if (record_upsell && upsell.show) {
        await recordUpsellShown(accountId, feature);
      }
    }

    return NextResponse.json({
      allowed: access.allowed,
      tier_required: access.tier_required,
      preview: access.preview,
      reason: access.reason,
      upsell: upsell ? { show: upsell.show, tier_required: upsell.tier_required } : null,
    });
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
