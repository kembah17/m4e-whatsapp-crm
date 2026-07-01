"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // Show warning 5 min before logout
const STORAGE_KEY = "m4e_session_timeout_ms";

interface UseSessionTimeoutOptions {
  /** Called when the session expires. Typically triggers signOut. */
  onTimeout: () => void;
  /** Override the default 30-minute timeout (in ms). */
  timeoutMs?: number;
  /** Whether the hook is active. Set to false to disable (e.g. while loading). */
  enabled?: boolean;
}

interface UseSessionTimeoutReturn {
  /** True when the warning modal should be shown. */
  showWarning: boolean;
  /** Seconds remaining until auto-logout. Only meaningful when showWarning is true. */
  secondsRemaining: number;
  /** Call this to dismiss the warning and reset the inactivity timer. */
  stayLoggedIn: () => void;
  /** Call this to immediately trigger the timeout callback. */
  logOutNow: () => void;
}

/**
 * Tracks user activity and triggers auto-logout after a configurable
 * period of inactivity. Shows a warning modal before logging out.
 *
 * Activity events: mousemove, mousedown, keydown, scroll, touchstart.
 */
export function useSessionTimeout({
  onTimeout,
  timeoutMs: timeoutMsProp,
  enabled = true,
}: UseSessionTimeoutOptions): UseSessionTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Resolve timeout: prop > localStorage > default
  const getTimeoutMs = useCallback(() => {
    if (timeoutMsProp) return timeoutMsProp;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return DEFAULT_TIMEOUT_MS;
  }, [timeoutMsProp]);

  const timeoutMs = getTimeoutMs();
  const warningAtMs = timeoutMs - WARNING_BEFORE_MS;

  // Refs to hold timer IDs so we can clear them
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warningTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const startTimers = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);

    // Timer to show warning
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      const logoutTime = Date.now() + WARNING_BEFORE_MS;
      setSecondsRemaining(Math.ceil(WARNING_BEFORE_MS / 1000));

      // Countdown every second
      countdownRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((logoutTime - Date.now()) / 1000));
        setSecondsRemaining(remaining);
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
        }
      }, 1000);
    }, warningAtMs);

    // Timer to actually log out
    logoutTimerRef.current = setTimeout(() => {
      clearAllTimers();
      setShowWarning(false);
      onTimeoutRef.current();
    }, timeoutMs);
  }, [clearAllTimers, warningAtMs, timeoutMs]);

  const stayLoggedIn = useCallback(() => {
    startTimers();
  }, [startTimers]);

  const logOutNow = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    onTimeoutRef.current();
  }, [clearAllTimers]);

  // Set up activity listeners
  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      return;
    }

    const ACTIVITY_EVENTS = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ] as const;

    // Throttle activity resets to avoid excessive timer restarts
    let lastActivity = Date.now();
    const THROTTLE_MS = 30_000; // Only reset every 30s of activity

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity < THROTTLE_MS) return;
      lastActivity = now;
      // Only reset if warning is NOT showing — once the warning
      // appears, only the "Stay Logged In" button resets.
      if (!warningTimerRef.current) return;
      startTimers();
    };

    startTimers();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearAllTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, startTimers, clearAllTimers]);

  return { showWarning, secondsRemaining, stayLoggedIn, logOutNow };
}

/**
 * Persist a custom timeout value so it survives page reloads.
 * Admins can call this from a settings panel.
 */
export function setSessionTimeoutMs(ms: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(ms));
  }
}
