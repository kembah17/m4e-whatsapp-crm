import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase } = await getCurrentAccount();
    const { id } = await params;
    const body = (await req.json()) as { proof_url: string; proof_storage_path: string };

    if (!body.proof_url) {
      return NextResponse.json({ error: "proof_url is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("offline_payments")
      .update({
        proof_url: body.proof_url,
        proof_storage_path: body.proof_storage_path || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}
