import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import type { CreateOfflinePaymentPayload } from "@/types/offline-operations";

export async function GET(req: NextRequest) {
  try {
    const { accountId, supabase } = await getCurrentAccount();
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const status = url.searchParams.get("status");
    const invoiceId = url.searchParams.get("invoice_id");
    const dealId = url.searchParams.get("deal_id");
    const contactId = url.searchParams.get("contact_id");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("offline_payments")
      .select(
        `*, contact:contacts(id, name, phone, email),
         verified_by_profile:profiles!offline_payments_verified_by_fkey(full_name, email),
         recorded_by_profile:profiles!offline_payments_recorded_by_fkey(full_name, email)`,
        { count: "exact" }
      )
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (invoiceId) query = query.eq("invoice_id", invoiceId);
    if (dealId) query = query.eq("deal_id", dealId);
    if (contactId) query = query.eq("contact_id", contactId);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { accountId, supabase, userId } = await getCurrentAccount();
    const body = (await req.json()) as CreateOfflinePaymentPayload;

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }
    if (!body.payment_method) {
      return NextResponse.json({ error: "Payment method is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("offline_payments")
      .insert({
        account_id: accountId,
        invoice_id: body.invoice_id || null,
        deal_id: body.deal_id || null,
        contact_id: body.contact_id || null,
        branch_id: body.branch_id || null,
        amount: body.amount,
        currency: body.currency || "NGN",
        payment_method: body.payment_method,
        reference_number: body.reference_number || null,
        payment_date: body.payment_date || new Date().toISOString(),
        notes: body.notes || null,
        recorded_by: userId,
        status: "pending",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
