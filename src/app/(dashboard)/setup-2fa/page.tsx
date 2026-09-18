"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";

/**
 * Mandatory 2FA setup page.
 * Users are redirected here from the DashboardShell if they haven't
 * enrolled in MFA. There is NO skip option — 2FA is required.
 */
export default function Setup2FAPage() {
  const supabase = createClient();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [alreadyEnabled, setAlreadyEnabled] = useState(false);

  // Poll MFA status — when user completes enrollment, redirect to dashboard
  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function checkMfa() {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) {
          setChecking(false);
          return;
        }
        const hasVerified = data.totp?.some((f) => f.status === "verified") ?? false;
        if (hasVerified) {
          setAlreadyEnabled(true);
          // Give a moment for the success toast to show
          setTimeout(() => router.push("/dashboard"), 1500);
        }
      } catch {
        // Ignore
      } finally {
        setChecking(false);
      }
    }

    checkMfa();
    // Re-check every 2 seconds in case user completes enrollment
    interval = setInterval(checkMfa, 2000);

    return () => clearInterval(interval);
  }, [supabase, router]);

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking security status...</p>
        </div>
      </div>
    );
  }

  if (alreadyEnabled) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <ShieldCheck className="h-12 w-12 text-emerald-400" />
          <h2 className="text-lg font-semibold text-foreground">
            Two-Factor Authentication Enabled
          </h2>
          <p className="text-sm text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Secure Your Account
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Two-factor authentication is required for all Business Growth Engine
          accounts. This protects your client data and business information.
        </p>
      </div>

      {/* Why 2FA is required */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <h3 className="text-sm font-medium text-amber-400 mb-2">
          Why is this required?
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Your account contains sensitive client business data</li>
          <li>• 2FA prevents unauthorized access even if your password is compromised</li>
          <li>• Industry best practice for platforms handling business communications</li>
        </ul>
      </div>

      {/* The actual 2FA enrollment component */}
      <TwoFactorSettings />

      {/* No skip button — this is mandatory */}
      <p className="text-center text-xs text-muted-foreground">
        You need an authenticator app like Google Authenticator, Authy, or
        1Password to complete setup.
      </p>
    </div>
  );
}
