import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@supabase/supabase-js";
import { evaluateSegmentSimple } from "@/lib/segments/segment-engine";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const account = await getCurrentAccount();
    if (!account) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getAdmin();

    // Fetch the segment to get its rules
    const { data: segment, error: segError } = await supabase
      .from("segments")
      .select("*")
      .eq("id", id)
      .eq("account_id", account.accountId)
      .single();

    if (segError || !segment) {
      return NextResponse.json({ error: "Segment not found" }, { status: 404 });
    }

    // Parse query params
    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get("limit") ?? "500", 10);
    const fieldsParam = url.searchParams.get("fields");

    // If limit=0, just return the count
    if (limitParam === 0) {
      const result = await evaluateSegmentSimple(segment.rules, account.accountId, {
        countOnly: true,
      });
      return NextResponse.json({ contacts: [], count: result.count });
    }

    // Get matching contact IDs
    const result = await evaluateSegmentSimple(segment.rules, account.accountId, {
      limit: Math.min(limitParam, 10000),
    });

    if (result.contactIds.length === 0) {
      return NextResponse.json({ contacts: [], count: result.count });
    }

    // Determine which fields to select
    const selectFields = fieldsParam
      ? fieldsParam.split(",").map((f) => f.trim()).join(",")
      : "*";

    // Fetch full contact records in batches (Supabase .in() limit ~1000)
    const PAGE = 500;
    const allContacts: Record<string, unknown>[] = [];

    for (let i = 0; i < result.contactIds.length; i += PAGE) {
      const slice = result.contactIds.slice(i, i + PAGE);
      const { data } = await supabase
        .from("contacts")
        .select(selectFields)
        .eq("account_id", account.accountId)
        .in("id", slice);
      if (data) allContacts.push(...data);
    }

    return NextResponse.json({
      contacts: allContacts,
      count: result.count,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
