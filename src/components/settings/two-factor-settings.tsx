"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Loader2,
  Copy,
  CheckCircle,
  AlertTriangle,
  KeyRound,
  Smartphone,
  Eye,
  EyeOff,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type MfaStep =
  | "idle"
  | "enrolling"
  | "verifying"
  | "showing-recovery"
  | "disabling";

interface EnrollmentData {
  factorId: string;
  qrCodeDataUrl: string;
  secret: string;
  totpUri: string;
}

export function TwoFactorSettings() {
  const supabase = createClient();

  const [step, setStep] = useState<MfaStep>("idle");
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCodesRemaining, setRecoveryCodesRemaining] = useState<number | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);

  // Check current MFA status on mount
  const checkMfaStatus = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        console.error("[2FA] listFactors error:", error);
        return;
      }
      const totpFactors = data.totp ?? [];
      const verifiedFactor = totpFactors.find(
        (f) => f.status === "verified"
      );
      if (verifiedFactor) {
        setIsEnabled(true);
        setFactorId(verifiedFactor.id);
      } else {
        setIsEnabled(false);
        setFactorId(null);
      }

      // Check remaining recovery codes
      const { count } = await supabase
        .from("mfa_recovery_codes")
        .select("id", { count: "exact", head: true })
        .is("used_at", null);
      setRecoveryCodesRemaining(count);
    } catch (err) {
      console.error("[2FA] checkMfaStatus error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    checkMfaStatus();
  }, [checkMfaStatus]);

  // Step 1: Start enrollment
  const startEnrollment = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });
      if (error) {
        toast.error(error.message || "Failed to start 2FA enrollment");
        return;
      }

      // Generate QR code data URL from the TOTP URI
      const qrDataUrl = await QRCode.toDataURL(data.totp.uri, {
        width: 200,
        margin: 2,
        color: { dark: "#ffffff", light: "#00000000" },
      });

      setEnrollment({
        factorId: data.id,
        qrCodeDataUrl: qrDataUrl,
        secret: data.totp.secret,
        totpUri: data.totp.uri,
      });
      setStep("enrolling");
    } catch (err) {
      console.error("[2FA] enroll error:", err);
      toast.error("Failed to start 2FA enrollment");
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Verify the TOTP code to complete enrollment
  const verifyEnrollment = async () => {
    if (!enrollment || verifyCode.length !== 6) return;
    setBusy(true);
    try {
      // Create a challenge for the newly enrolled factor
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: enrollment.factorId });
      if (challengeError) {
        toast.error(challengeError.message || "Challenge failed");
        return;
      }

      // Verify with the user-provided code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) {
        toast.error("Invalid code. Please try again.");
        setVerifyCode("");
        return;
      }

      // Generate recovery codes via API
      const res = await fetch("/api/auth/mfa/recovery-codes", {
        method: "POST",
      });
      if (res.ok) {
        const { codes } = await res.json();
        setRecoveryCodes(codes);
        setStep("showing-recovery");
      } else {
        // 2FA is enabled but recovery codes failed — still success
        toast.success("Two-factor authentication enabled!");
        toast.warning("Recovery codes could not be generated. Contact support.");
        resetState();
        await checkMfaStatus();
      }

      toast.success("Two-factor authentication enabled!");
    } catch (err) {
      console.error("[2FA] verify error:", err);
      toast.error("Verification failed");
    } finally {
      setBusy(false);
    }
  };

  // Disable 2FA
  const disableMfa = async () => {
    if (!factorId || disableCode.length !== 6) return;
    setBusy(true);
    try {
      // Verify current code first
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) {
        toast.error(challengeError.message || "Challenge failed");
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: disableCode,
      });
      if (verifyError) {
        toast.error("Invalid code. Please enter the correct 6-digit code.");
        setDisableCode("");
        return;
      }

      // Unenroll the factor
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      if (unenrollError) {
        toast.error(unenrollError.message || "Failed to disable 2FA");
        return;
      }

      toast.success("Two-factor authentication disabled");
      resetState();
      await checkMfaStatus();
    } catch (err) {
      console.error("[2FA] disable error:", err);
      toast.error("Failed to disable 2FA");
    } finally {
      setBusy(false);
    }
  };

  const resetState = () => {
    setStep("idle");
    setEnrollment(null);
    setVerifyCode("");
    setDisableCode("");
    setRecoveryCodes([]);
    setShowSecret(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Checking 2FA status...
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isEnabled
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isEnabled ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <Shield className="h-5 w-5" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${
              isEnabled
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ---- IDLE: Show enable/disable buttons ---- */}
        {step === "idle" && !isEnabled && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Protect your account with a time-based one-time password (TOTP)
              from an authenticator app like Google Authenticator, Authy, or
              1Password.
            </p>
            <Button onClick={startEnrollment} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Smartphone className="mr-2 h-4 w-4" />
              )}
              Enable Two-Factor Authentication
            </Button>
          </div>
        )}

        {step === "idle" && isEnabled && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              <span>Your account is protected with 2FA</span>
            </div>
            {recoveryCodesRemaining !== null && (
              <p className="text-sm text-muted-foreground">
                Recovery codes remaining:{" "}
                <span
                  className={`font-medium ${
                    recoveryCodesRemaining <= 2
                      ? "text-red-400"
                      : recoveryCodesRemaining <= 5
                        ? "text-amber-400"
                        : "text-foreground"
                  }`}
                >
                  {recoveryCodesRemaining}
                </span>
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("disabling")}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Disable 2FA
              </Button>
            </div>
          </div>
        )}

        {/* ---- ENROLLING: Show QR code ---- */}
        {step === "enrolling" && enrollment && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <h4 className="mb-3 text-sm font-medium text-foreground">
                Step 1: Scan QR Code
              </h4>
              <p className="mb-4 text-sm text-muted-foreground">
                Open your authenticator app and scan this QR code:
              </p>
              <div className="flex justify-center rounded-lg bg-card p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={enrollment.qrCodeDataUrl}
                  alt="2FA QR Code"
                  width={200}
                  height={200}
                  className="rounded"
                />
              </div>

              {/* Manual entry secret */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                  {showSecret ? "Hide" : "Show"} manual entry key
                </button>
                {showSecret && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded bg-card px-3 py-2 font-mono text-xs text-foreground">
                      {enrollment.secret}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(enrollment.secret, "Secret key")
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <h4 className="mb-3 text-sm font-medium text-foreground">
                Step 2: Enter Verification Code
              </h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app:
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) =>
                    setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-32 text-center font-mono text-lg tracking-widest"
                  autoFocus
                />
                <Button
                  onClick={verifyEnrollment}
                  disabled={busy || verifyCode.length !== 6}
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Verify & Enable
                </Button>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={resetState}>
              Cancel
            </Button>
          </div>
        )}

        {/* ---- SHOWING RECOVERY CODES ---- */}
        {step === "showing-recovery" && recoveryCodes.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <h4 className="text-sm font-medium">Save Your Recovery Codes</h4>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Store these codes in a safe place. Each code can only be used
                once. If you lose access to your authenticator app, you can use
                these codes to sign in.
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-card p-3">
                {recoveryCodes.map((code, i) => (
                  <code
                    key={i}
                    className="rounded bg-muted px-2 py-1 text-center font-mono text-sm text-foreground"
                  >
                    {code}
                  </code>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      recoveryCodes.join("\n"),
                      "Recovery codes"
                    )
                  }
                >
                  <Copy className="mr-2 h-3 w-3" />
                  Copy All
                </Button>
              </div>
            </div>
            <Button
              onClick={() => {
                resetState();
                checkMfaStatus();
              }}
            >
              I have saved my recovery codes
            </Button>
          </div>
        )}

        {/* ---- DISABLING ---- */}
        {step === "disabling" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <h4 className="text-sm font-medium">Disable Two-Factor Authentication</h4>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Enter your current 6-digit authenticator code to confirm:
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={disableCode}
                  onChange={(e) =>
                    setDisableCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  className="w-32 text-center font-mono text-lg tracking-widest"
                  autoFocus
                />
                <Button
                  variant="destructive"
                  onClick={disableMfa}
                  disabled={busy || disableCode.length !== 6}
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldOff className="mr-2 h-4 w-4" />
                  )}
                  Disable 2FA
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={resetState}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
