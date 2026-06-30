import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount } from "@/lib/auth/account";
import { createClient } from "@supabase/supabase-js";

const BREVO_API_URL = "https://api.brevo.com/v3/transactionalSMS/sms";
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Simple in-memory rate limiter (per account)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(accountId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(accountId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(accountId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

export async function POST(req: NextRequest) {
  try {
    const account = await getCurrentAccount();
    if (!account) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone, message } = await req.json();

    // Validate phone
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    const cleaned = phone.replace(/[\s\-()]/g, "");
    if (!/^\+234[789]\d{9}$/.test(cleaned)) {
      return NextResponse.json(
        { error: "Invalid Nigerian phone number. Use format: +234XXXXXXXXXX" },
        { status: 400 }
      );
    }

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (message.length > 160) {
      return NextResponse.json({ error: "Message must be 160 characters or less" }, { status: 400 });
    }

    // Rate limit
    const rl = checkRateLimit(account.accountId);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Max ${RATE_LIMIT_MAX} test SMS per hour.` },
        { status: 429 }
      );
    }

    // Check Brevo API key
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      return NextResponse.json(
        { error: "Brevo API key not configured. Set BREVO_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    // Get sender ID from account settings or default
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: settings } = await supabase
      .from("accounts")
      .select("sms_sender_id")
      .eq("id", account.accountId)
      .single();

    const senderId = settings?.sms_sender_id || "M4ECRM";

    // Send via Brevo
    const brevoRes = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        type: "transactional",
        unicodeEnabled: true,
        sender: senderId,
        recipient: cleaned,
        content: message.trim(),
      }),
    });

    const brevoData = await brevoRes.json();

    if (!brevoRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: brevoData.message || brevoData.error || `Brevo API error (${brevoRes.status})`,
          remaining: rl.remaining,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: brevoData.messageId || brevoData.reference || "sent",
      remaining: rl.remaining,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
