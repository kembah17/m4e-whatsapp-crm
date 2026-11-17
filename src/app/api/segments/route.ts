import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@supabase/supabase-js";
import { evaluateSegmentSimple } from "@/lib/segments/segment-engine";
import type { RefreshInterval } from "@/lib/segments/dynamic-segment";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("segments")
      .select("*")
      .eq("account_id", account.accountId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Refresh counts for each segment
    const segments = await Promise.all(
      (data ?? []).map(async (seg) => {
        try {
          const result = await evaluateSegmentSimple(seg.rules, account.accountId, { countOnly: true });
          return { ...seg, contact_count: result.count };
        } catch {
          return seg;
        }
      })
    );

    return NextResponse.json({ segments });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const VALID_INTERVALS: RefreshInterval[] = ['hourly', 'daily', 'weekly'];

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      name,
      description,
      rules,
      is_dynamic,
      refresh_interval,
      auto_enroll,
      auto_remove,
    } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!rules) return NextResponse.json({ error: "Rules are required" }, { status: 400 });

    // Validate refresh_interval if provided
    if (refresh_interval && !VALID_INTERVALS.includes(refresh_interval)) {
      return NextResponse.json({ error: "Invalid refresh interval" }, { status: 400 });
    }

    // Count matching contacts
    let contactCount = 0;
    try {
      const result = await evaluateSegmentSimple(rules, account.accountId, { countOnly: true });
      contactCount = result.count;
    } catch { /* silent */ }

    const now = new Date().toISOString();
    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("segments")
      .insert({
        account_id: account.accountId,
        name: name.trim(),
        description: description?.trim() || null,
        rules,
        contact_count: contactCount,
        last_calculated_at: now,
        // Dynamic segment fields
        is_dynamic: is_dynamic === true,
        refresh_interval: is_dynamic ? (refresh_interval || 'daily') : null,
        last_refreshed_at: is_dynamic ? now : null,
        auto_enroll: is_dynamic ? (auto_enroll !== false) : false,
        auto_remove: is_dynamic ? (auto_remove !== false) : false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ segment: data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
