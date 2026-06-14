"use client";

import { useState } from "react";
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
import { CheckCircle, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0C0B22] px-4" style={{ background: 'radial-gradient(ellipse at center top, #1E1B4B 0%, #151338 35%, #0C0B22 70%)' }}>
        <Card className="w-full max-w-md border border-[#C9A96E]/20 bg-[#151338]/80 shadow-[0_0_40px_-10px_rgba(201,169,110,0.15)] backdrop-blur-xl">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-white font-heading">
              Check your email
            </CardTitle>
            <CardDescription className="text-slate-400">
              We&apos;ve sent a password reset link to{" "}
              <span className="text-white">{email}</span>. Please check your
              inbox.
            </CardDescription>
          </CardHeader>
          <div className="mx-6 mb-2 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/40 to-transparent" />
          <CardContent>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Back to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
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
          <CardTitle className="text-xl text-white font-heading">Customer Reactivation Manager</CardTitle>
          <CardDescription className="text-slate-400">
            Your dormant customer reclamation Engine!
          </CardDescription>
          <p className="mt-2 text-sm font-medium text-slate-300">Reset password</p>
        </CardHeader>
        <div className="mx-6 mb-2 h-px bg-gradient-to-r from-transparent via-[#C9A96E]/40 to-transparent" />
        <CardContent>
          <form onSubmit={handleReset} className="flex flex-col gap-4">
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

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-lg bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
