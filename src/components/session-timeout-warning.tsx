"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, LogOut, RefreshCw } from "lucide-react";

interface SessionTimeoutWarningProps {
  /** Whether the modal is visible. */
  open: boolean;
  /** Seconds until auto-logout. */
  secondsRemaining: number;
  /** Reset the inactivity timer and dismiss the modal. */
  onStayLoggedIn: () => void;
  /** Immediately sign out. */
  onLogOut: () => void;
}

/**
 * Full-screen overlay warning the user that their session is about
 * to expire. Renders a centered card with a countdown, a "Stay
 * Logged In" button (primary) and a "Log Out Now" button (ghost).
 */
export function SessionTimeoutWarning({
  open,
  secondsRemaining,
  onStayLoggedIn,
  onLogOut,
}: SessionTimeoutWarningProps) {
  const stayBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the "Stay Logged In" button when the modal opens
  // so keyboard users can press Enter immediately.
  useEffect(() => {
    if (open) stayBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeStr =
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, "0")}`
      : `${seconds}s`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-desc"
    >
      <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>

        {/* Title */}
        <h2
          id="session-timeout-title"
          className="text-center text-lg font-semibold text-foreground"
        >
          Session Expiring Soon
        </h2>

        {/* Description */}
        <p
          id="session-timeout-desc"
          className="mt-2 text-center text-sm text-muted-foreground"
        >
          Your session will expire in{" "}
          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
            {timeStr}
          </span>{" "}
          due to inactivity. Any unsaved changes may be lost.
        </p>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            ref={stayBtnRef}
            onClick={onStayLoggedIn}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            Stay Logged In
          </button>
          <button
            onClick={onLogOut}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <LogOut className="h-4 w-4" />
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
