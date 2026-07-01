// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

describe('useSessionTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with showWarning false', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: true })
    );
    expect(result.current.showWarning).toBe(false);
  });

  it('returns expected interface shape', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: true })
    );
    expect(typeof result.current.showWarning).toBe('boolean');
    expect(typeof result.current.secondsRemaining).toBe('number');
    expect(typeof result.current.stayLoggedIn).toBe('function');
    expect(typeof result.current.logOutNow).toBe('function');
  });

  it('secondsRemaining is a non-negative number', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        onTimeout,
        enabled: true,
        timeoutMs: 60_000,
      })
    );
    // secondsRemaining may be 0 initially (only counts down during warning)
    expect(result.current.secondsRemaining).toBeGreaterThanOrEqual(0);
  });

  it('does not activate when enabled is false', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({ onTimeout, enabled: false })
    );

    act(() => {
      vi.advanceTimersByTime(60_000 * 31);
    });

    expect(onTimeout).not.toHaveBeenCalled();
    expect(result.current.showWarning).toBe(false);
  });

  it('stayLoggedIn can be called without error', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        onTimeout,
        enabled: true,
        timeoutMs: 10_000,
      })
    );

    // stayLoggedIn should be callable without throwing
    act(() => {
      result.current.stayLoggedIn();
    });

    expect(result.current.showWarning).toBe(false);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('logOutNow can be called without error', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        onTimeout,
        enabled: true,
        timeoutMs: 10_000,
      })
    );

    // logOutNow should trigger the onTimeout callback
    act(() => {
      result.current.logOutNow();
    });

    // After logOutNow, onTimeout should have been called
    expect(onTimeout).toHaveBeenCalled();
  });
});
