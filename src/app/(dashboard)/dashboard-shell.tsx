"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionTimeoutWarning } from "@/components/session-timeout-warning";

// Auth-gated dashboard shell. Extracted from the layout so the layout
// itself can stay a server component and export metadata (noindex) —
// client components can't export Next's metadata object.

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Session timeout — auto-logout after 30 min of inactivity
  const handleSessionTimeout = useCallback(async () => {
    await signOut();
    router.push("/login?reason=timeout");
  }, [signOut, router]);

  const { showWarning, secondsRemaining, stayLoggedIn, logOutNow } =
    useSessionTimeout({
      onTimeout: handleSessionTimeout,
      enabled: !!user && !loading,
    });

  // Sidebar drawer state — only used on mobile. On lg+ the sidebar is
  // always visible and this stays at `false` (ignored by the component).
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Onboarding redirect — cached so we don't re-fetch on every navigation.
  const onboardingChecked = useRef(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Auth redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Onboarding check — runs once after auth succeeds
  useEffect(() => {
    if (loading || !user) return;
    if (onboardingChecked.current) return;
    onboardingChecked.current = true;

    async function checkOnboarding() {
      try {
        const res = await fetch("/api/onboarding");
        if (!res.ok) {
          // If the API fails (e.g. columns not yet migrated), assume done
          setOnboardingDone(true);
          return;
        }
        const data = await res.json();
        const completed = data.onboarding_completed === true;
        setOnboardingDone(completed);

        if (!completed && !pathname.startsWith("/onboarding")) {
          router.push("/onboarding");
        }
      } catch {
        // Network error — don't block the dashboard
        setOnboardingDone(true);
      }
    }

    checkOnboarding();
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // While checking onboarding status, show a brief loader (only on
  // non-onboarding pages to avoid flash).
  if (onboardingDone === null && !pathname.startsWith("/onboarding")) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          {/* Thinner horizontal padding on mobile so cards have room to breathe. */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
      <SessionTimeoutWarning
        open={showWarning}
        secondsRemaining={secondsRemaining}
        onStayLoggedIn={stayLoggedIn}
        onLogOut={logOutNow}
      />
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthProvider>
  );
}
