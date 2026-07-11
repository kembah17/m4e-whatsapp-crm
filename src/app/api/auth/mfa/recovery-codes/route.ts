import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Generate a single recovery code in XXXX-XXXX format.
 * Uses crypto.randomBytes for cryptographic randomness.
 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * POST /api/auth/mfa/recovery-codes
 *
 * Generates 10 new recovery codes for the authenticated user.
 * Deletes any existing unused codes first, then stores hashed versions.
 * Returns the plaintext codes (only time they're visible).
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user actually has MFA enrolled
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTotp = factors?.totp?.some(
      (f) => f.status === "verified"
    );
    if (!hasVerifiedTotp) {
      return NextResponse.json(
        { error: "MFA is not enabled on this account" },
        { status: 400 }
      );
    }

    // Use service role to manage recovery codes (bypasses RLS)
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete existing unused recovery codes for this user
    await admin
      .from("mfa_recovery_codes")
      .delete()
      .eq("user_id", user.id)
      .is("used_at", null);

    // Generate 10 new codes
    const codes: string[] = [];
    const rows: { user_id: string; code_hash: string }[] = [];

    for (let i = 0; i < 10; i++) {
      const code = generateCode();
      codes.push(code);
      // Hash with bcrypt (cost 10 is sufficient for recovery codes)
      const hash = await bcrypt.hash(code, 10);
      rows.push({ user_id: user.id, code_hash: hash });
    }

    // Insert all hashed codes
    const { error: insertError } = await admin
      .from("mfa_recovery_codes")
      .insert(rows);

    if (insertError) {
      console.error("[MFA] insert recovery codes error:", insertError);
      return NextResponse.json(
        { error: "Failed to store recovery codes" },
        { status: 500 }
      );
    }

    // Return plaintext codes — this is the only time they're visible
    return NextResponse.json({ codes });
  } catch (err) {
    console.error("[MFA] recovery-codes error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/mfa/recovery-codes
 *
 * Returns the count of remaining (unused) recovery codes.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { count, error } = await supabase
      .from("mfa_recovery_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("used_at", null);

    if (error) {
      console.error("[MFA] count recovery codes error:", error);
      return NextResponse.json(
        { error: "Failed to count recovery codes" },
        { status: 500 }
      );
    }

    return NextResponse.json({ remaining: count ?? 0 });
  } catch (err) {
    console.error("[MFA] recovery-codes GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
