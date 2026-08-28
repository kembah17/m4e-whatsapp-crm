"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { Eye, EyeOff } from "lucide-react";
import { MfaChallenge } from "@/components/auth/mfa-challenge";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const navigateAfterLogin = () => {
    if (inviteToken) {
      router.push(`/join/${encodeURIComponent(inviteToken)}`);
    } else {
      router.push("/dashboard");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Check if MFA verification is needed
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      aalData &&
      aalData.currentLevel === "aal1" &&
      aalData.nextLevel === "aal2"
    ) {
      // User has MFA enrolled but hasn't completed the challenge yet
      setShowMfaChallenge(true);
      setLoading(false);
      return;
    }

    // No MFA required — proceed to dashboard
    navigateAfterLogin();
  };

  // Show MFA challenge screen
  if (showMfaChallenge) {
    return (
      <MfaChallenge
        onVerified={navigateAfterLogin}
        onCancel={() => {
          // Sign out and go back to login form
          supabase.auth.signOut();
          setShowMfaChallenge(false);
          setEmail("");
          setPassword("");
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0C0B22] px-4" style={{ background: 'radial-gradient(ellipse at center top, #1E1B4B 0%, #151338 35%, #0C0B22 70%)' }}>
      <Card className="w-full max-w-md border border-[#C9A96E]/20 bg-[#151338]/80 shadow-[0_0_40px_-10px_rgba(201,169,110,0.15)] backdrop-blur-xl">
        <CardHeader className="items-center text-center">
          <div className="mb-4">
            <Image
              src="/logo-m4e-200.png"
              alt="Marketing4Effect"
              width={80}
              height={80}
              className="rounded-full"
              priority
            />
          </div>
          <CardTitle className="text-xl text-white font-heading">
            {inviteToken ? "Sign in to accept" : "Business Growth Engine"}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {inviteToken
              ? "Sign in and we\u2019ll take you to the invitation."
              : "Your Dormant Customer Reclamation Engine!"}
          </CardDescription>
          {!inviteToken && (
            <p className="mt-2 text-sm font-medium text-slate-300">Sign in</p>
          )}
        </CardHeader>
        <div className="mx-6 mb-2 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/40 to-transparent" />
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus-visible:border-primary focus-visible:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-lg bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href={
                inviteToken
                  ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                  : "/signup"
              }
              className="text-primary hover:text-primary/80"
            >
              Create account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
