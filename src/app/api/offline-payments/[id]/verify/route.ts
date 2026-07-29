import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, requireRole, toErrorResponse } from "@/lib/auth/account";
import type { VerifyOfflinePaymentPayload } from "@/types/offline-operations";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, userId } = await getCurrentAccount();
    await requireRole("admin");
    const { id } = await params;
    const body = (await req.json()) as VerifyOfflinePaymentPayload;

    if (!body.action || !['verify', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: "Action must be 'verify' or 'reject'" },
        { status: 400 }
      );
    }

    // Check current status
    const { data: existing, error: fetchErr } = await supabase
      .from("offline_payments")
      .select("status")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot ${body.action} a payment with status '${existing.status}'` },
        { status: 400 }
      );
    }

    const updatePayload =
      body.action === "verify"
        ? {
            status: "verified" as const,
            verified_by: userId,
            verified_at: new Date().toISOString(),
          }
        : {
            status: "rejected" as const,
            verified_by: userId,
            verified_at: new Date().toISOString(),
            rejection_reason: body.rejection_reason || null,
          };

    const { data, error } = await supabase
      .from("offline_payments")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}
