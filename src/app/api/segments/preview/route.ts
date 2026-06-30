import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { evaluateSegmentSimple } from "@/lib/segments/segment-engine";
import type { SegmentGroup } from "@/lib/segments/segment-engine";

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { rules } = await req.json() as { rules: SegmentGroup };
    if (!rules) return NextResponse.json({ error: "Rules are required" }, { status: 400 });

    const result = await evaluateSegmentSimple(rules, account.accountId, { countOnly: true });
    return NextResponse.json({ count: result.count });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
