import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/mfa/verify-recovery
 *
 * Verifies a recovery code for the authenticated user.
 * If valid, marks the code as used and unenrolls MFA so the user
 * can log in without 2FA (they should re-enable it afterwards).
 *
 * Body: { code: string }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body as { code?: string };

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { error: "Recovery code is required" },
        { status: 400 }
      );
    }

    // Normalise: uppercase, trim, ensure dash format
    const normalised = code.trim().toUpperCase();

    // Use service role to read and update recovery codes
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all unused recovery codes for this user
    const { data: storedCodes, error: fetchError } = await admin
      .from("mfa_recovery_codes")
      .select("id, code_hash")
      .eq("user_id", user.id)
      .is("used_at", null);

    if (fetchError) {
      console.error("[MFA] fetch recovery codes error:", fetchError);
      return NextResponse.json(
        { error: "Failed to verify recovery code" },
        { status: 500 }
      );
    }

    if (!storedCodes || storedCodes.length === 0) {
      return NextResponse.json(
        { error: "No recovery codes available" },
        { status: 400 }
      );
    }

    // Check each stored hash against the provided code
    let matchedId: string | null = null;
    for (const stored of storedCodes) {
      const isMatch = await bcrypt.compare(normalised, stored.code_hash);
      if (isMatch) {
        matchedId = stored.id;
        break;
      }
    }

    if (!matchedId) {
      return NextResponse.json(
        { error: "Invalid recovery code" },
        { status: 400 }
      );
    }

    // Mark the code as used
    const { error: updateError } = await admin
      .from("mfa_recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", matchedId);

    if (updateError) {
      console.error("[MFA] mark code used error:", updateError);
      // Don't fail — the code was valid, proceed with unenroll
    }

    // Unenroll all TOTP factors so the user can log in
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactors = factors?.totp ?? [];
    for (const factor of totpFactors) {
      if (factor.status === "verified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Recovery code accepted. MFA has been disabled. Please re-enable 2FA.",
      remaining: storedCodes.length - 1,
    });
  } catch (err) {
    console.error("[MFA] verify-recovery error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
