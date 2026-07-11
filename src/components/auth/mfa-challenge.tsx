"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Loader2, KeyRound, AlertTriangle } from "lucide-react";

interface MfaChallengeProps {
  /** Called when MFA verification succeeds — parent should navigate away. */
  onVerified: () => void;
  /** Called when user wants to go back to the login form. */
  onCancel?: () => void;
}

export function MfaChallenge({ onVerified, onCancel }: MfaChallengeProps) {
  const supabase = createClient();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve the TOTP factor on mount
  useEffect(() => {
    async function loadFactor() {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        console.error("[MFA] listFactors error:", error);
        return;
      }
      const totp = data.totp?.find((f) => f.status === "verified");
      if (totp) {
        setFactorId(totp.id);
      }
    }
    loadFactor();
  }, [supabase]);

  // Countdown timer for TOTP code refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [useRecovery]);

  const verifyTotp = useCallback(async () => {
    if (!factorId || code.length !== 6) return;
    setLoading(true);
    setError(null);

    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) {
        setError(challengeError.message || "Challenge failed");
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        setError("Invalid code. Please try again.");
        setCode("");
        inputRef.current?.focus();
        return;
      }

      onVerified();
    } catch (err) {
      console.error("[MFA] verify error:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [factorId, code, supabase, onVerified]);

  const verifyRecoveryCode = useCallback(async () => {
    if (!recoveryCode.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/mfa/verify-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: recoveryCode.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid recovery code");
        setRecoveryCode("");
        inputRef.current?.focus();
        return;
      }

      // Recovery code verified — the API unenrolls MFA, so we can proceed
      onVerified();
    } catch (err) {
      console.error("[MFA] recovery verify error:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [recoveryCode, onVerified]);

  // Submit on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (useRecovery) {
        verifyRecoveryCode();
      } else {
        verifyTotp();
      }
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#0C0B22] px-4"
      style={{
        background:
          "radial-gradient(ellipse at center top, #1E1B4B 0%, #151338 35%, #0C0B22 70%)",
      }}
    >
      <Card className="w-full max-w-md border border-[#C9A96E]/20 bg-[#151338]/80 shadow-[0_0_40px_-10px_rgba(201,169,110,0.15)] backdrop-blur-xl">
        <CardHeader className="items-center text-center">
          <div className="mb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl text-white font-heading">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-slate-400">
            {useRecovery
              ? "Enter one of your recovery codes"
              : "Enter the 6-digit code from your authenticator app"}
          </CardDescription>
        </CardHeader>

        <div className="mx-6 mb-2 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/40 to-transparent" />

        <CardContent>
          <div className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {!useRecovery ? (
              /* TOTP Code Input */
              <div className="flex flex-col gap-3">
                <Label htmlFor="mfa-code" className="text-slate-300">
                  Authentication Code
                </Label>
                <Input
                  ref={inputRef}
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  onKeyDown={handleKeyDown}
                  className="border-slate-700 bg-slate-800 text-center font-mono text-2xl tracking-[0.3em] text-white placeholder:text-slate-600 focus-visible:border-primary focus-visible:ring-primary/20"
                  autoFocus
                  autoComplete="one-time-code"
                />

                {/* Countdown timer */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <div
                    className="h-1 w-16 overflow-hidden rounded-full bg-slate-700"
                    role="progressbar"
                    aria-valuenow={secondsLeft}
                    aria-valuemin={0}
                    aria-valuemax={30}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000"
                      style={{ width: `${(secondsLeft / 30) * 100}%` }}
                    />
                  </div>
                  <span>Code refreshes in {secondsLeft}s</span>
                </div>

                <Button
                  onClick={verifyTotp}
                  disabled={loading || code.length !== 6}
                  className="mt-2 h-11 w-full rounded-lg bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  Verify
                </Button>
              </div>
            ) : (
              /* Recovery Code Input */
              <div className="flex flex-col gap-3">
                <Label htmlFor="recovery-code" className="text-slate-300">
                  Recovery Code
                </Label>
                <Input
                  ref={inputRef}
                  id="recovery-code"
                  type="text"
                  placeholder="ABCD-1234"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  className="border-slate-700 bg-slate-800 text-center font-mono text-lg tracking-wider text-white placeholder:text-slate-600 focus-visible:border-primary focus-visible:ring-primary/20"
                  autoFocus
                />
                <p className="text-xs text-slate-500">
                  Recovery codes are in the format XXXX-XXXX
                </p>

                <Button
                  onClick={verifyRecoveryCode}
                  disabled={loading || !recoveryCode.trim()}
                  className="mt-2 h-11 w-full rounded-lg bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Verify Recovery Code
                </Button>
              </div>
            )}

            {/* Toggle between TOTP and recovery */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setUseRecovery(!useRecovery);
                  setError(null);
                  setCode("");
                  setRecoveryCode("");
                }}
                className="text-sm text-primary hover:text-primary/80"
              >
                {useRecovery
                  ? "Use authenticator app instead"
                  : "Use a recovery code"}
              </button>
            </div>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-sm text-slate-500 hover:text-slate-400"
              >
                Back to login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
