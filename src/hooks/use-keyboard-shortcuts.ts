"use client";

import { useEffect } from "react";

interface KeyboardShortcutHandlers {
  /** Ctrl/Cmd+N: Open new item form */
  onNew?: () => void;
  /** Escape: Close any open modal/sheet */
  onEscape?: () => void;
  /** Ctrl/Cmd+A: Select all */
  onSelectAll?: () => void;
}

/**
 * Hook that registers global keyboard shortcuts for dashboard pages.
 *
 * - `Ctrl+N` / `Cmd+N` → onNew
 * - `Escape` → onEscape
 * - `Ctrl+A` / `Cmd+A` → onSelectAll
 *
 * Shortcuts are suppressed when the active element is an input, textarea,
 * select, or contenteditable to avoid interfering with normal typing.
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;

      // Don’t intercept when user is typing in a form field
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        // Still allow Escape from inputs
        if (e.key === "Escape" && handlers.onEscape) {
          handlers.onEscape();
          return;
        }
        return;
      }

      const mod = e.metaKey || e.ctrlKey;

      if (e.key === "Escape" && handlers.onEscape) {
        handlers.onEscape();
        return;
      }

      if (mod && e.key.toLowerCase() === "n" && handlers.onNew) {
        e.preventDefault();
        handlers.onNew();
        return;
      }

      if (mod && e.key.toLowerCase() === "a" && handlers.onSelectAll) {
        e.preventDefault();
        handlers.onSelectAll();
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
