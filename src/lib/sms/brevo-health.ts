export interface BrevoSmsHealthResult {
  connected: boolean;
  accountInfo?: { credits: number; plan: string };
  error?: string;
}

export async function checkBrevoSmsHealth(): Promise<BrevoSmsHealthResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { connected: false, error: "BREVO_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: {
        accept: "application/json",
        "api-key": apiKey,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        connected: false,
        error: body.message || `Brevo API returned ${res.status}`,
      };
    }

    const data = await res.json();

    // Extract SMS credits from the plan array
    let smsCredits = 0;
    let planName = "Unknown";
    if (Array.isArray(data.plan)) {
      const smsPlan = data.plan.find(
        (p: { type: string }) => p.type === "sms"
      );
      if (smsPlan) {
        smsCredits = smsPlan.credits ?? 0;
        planName = smsPlan.planType ?? "sms";
      }
    }

    return {
      connected: true,
      accountInfo: {
        credits: smsCredits,
        plan: planName,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    return { connected: false, error: message };
  }
}
