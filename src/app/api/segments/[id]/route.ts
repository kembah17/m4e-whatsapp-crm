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

const VALID_INTERVALS: RefreshInterval[] = ['hourly', 'daily', 'weekly'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("segments")
      .select("*")
      .eq("id", id)
      .eq("account_id", account.accountId)
      .single();

    if (error || !data) return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    return NextResponse.json({ segment: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
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

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (rules !== undefined) {
      updates.rules = rules;
      try {
        const result = await evaluateSegmentSimple(rules, account.accountId, { countOnly: true });
        updates.contact_count = result.count;
        updates.last_calculated_at = new Date().toISOString();
      } catch { /* silent */ }
    }

    // Dynamic segment fields
    if (is_dynamic !== undefined) {
      updates.is_dynamic = is_dynamic === true;
      if (is_dynamic) {
        // Set defaults when enabling dynamic
        if (refresh_interval && VALID_INTERVALS.includes(refresh_interval)) {
          updates.refresh_interval = refresh_interval;
        } else if (!refresh_interval) {
          updates.refresh_interval = 'daily';
        }
        updates.auto_enroll = auto_enroll !== false;
        updates.auto_remove = auto_remove !== false;
        updates.last_refreshed_at = new Date().toISOString();
      } else {
        // Clear dynamic fields when disabling
        updates.refresh_interval = null;
        updates.auto_enroll = false;
        updates.auto_remove = false;
      }
    } else {
      // Update individual dynamic fields if provided
      if (refresh_interval !== undefined) {
        if (VALID_INTERVALS.includes(refresh_interval)) {
          updates.refresh_interval = refresh_interval;
        }
      }
      if (auto_enroll !== undefined) updates.auto_enroll = auto_enroll;
      if (auto_remove !== undefined) updates.auto_remove = auto_remove;
    }

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("segments")
      .update(updates)
      .eq("id", id)
      .eq("account_id", account.accountId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    return NextResponse.json({ segment: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount();
    if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabase = getAdmin();
    const { error } = await supabase
      .from("segments")
      .delete()
      .eq("id", id)
      .eq("account_id", account.accountId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
