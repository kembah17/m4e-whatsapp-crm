import { NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { checkBrevoSmsHealth } from "@/lib/sms/brevo-health";

export async function GET() {
  try {
    const account = await getCurrentAccount();
    if (!account) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const health = await checkBrevoSmsHealth();
    return NextResponse.json(health);
  } catch {
    return NextResponse.json(
      { connected: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
