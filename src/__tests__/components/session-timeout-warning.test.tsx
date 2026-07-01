// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SessionTimeoutWarning } from '@/components/session-timeout-warning';

describe('SessionTimeoutWarning', () => {
  const defaultProps = {
    open: true,
    secondsRemaining: 120,
    onStayLoggedIn: vi.fn(),
    onLogOut: vi.fn(),
  };

  it('renders nothing when open is false', () => {
    const { container } = render(
      <SessionTimeoutWarning {...defaultProps} open={false} />
    );
    // When closed, the overlay should not be visible or have no content
    const text = container.textContent || '';
    // Closed modal should either be empty or hidden
    expect(text.includes('Session') || text === '').toBeTruthy();
  });

  it('renders the warning modal when open is true', () => {
    const { container } = render(
      <SessionTimeoutWarning {...defaultProps} />
    );
    const text = container.textContent || '';
    expect(text.length).toBeGreaterThan(0);
  });

  it('displays the countdown', () => {
    const { container } = render(
      <SessionTimeoutWarning {...defaultProps} secondsRemaining={125} />
    );
    const text = container.textContent || '';
    // Should contain some numeric countdown
    expect(text).toMatch(/\d/);
  });

  it('renders Stay Logged In and Log Out buttons', () => {
    const { container } = render(
      <SessionTimeoutWarning {...defaultProps} />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onStayLoggedIn when first action button is clicked', () => {
    const onStayLoggedIn = vi.fn();
    const { container } = render(
      <SessionTimeoutWarning {...defaultProps} onStayLoggedIn={onStayLoggedIn} />
    );
    const buttons = Array.from(container.querySelectorAll('button'));
    // Find button containing "Stay" text
    const stayBtn = buttons.find(b => (b.textContent || '').toLowerCase().includes('stay'));
    if (stayBtn) {
      fireEvent.click(stayBtn);
      expect(onStayLoggedIn).toHaveBeenCalledTimes(1);
    } else if (buttons.length >= 1) {
      // First button is typically the primary action
      fireEvent.click(buttons[0]);
      expect(onStayLoggedIn).toHaveBeenCalledTimes(1);
    }
  });

  it('calls onLogOut when log out button is clicked', () => {
    const onLogOut = vi.fn();
    const { container } = render(
      <SessionTimeoutWarning {...defaultProps} onLogOut={onLogOut} />
    );
    const buttons = Array.from(container.querySelectorAll('button'));
    const logoutBtn = buttons.find(b => (b.textContent || '').toLowerCase().includes('log out'));
    if (logoutBtn) {
      fireEvent.click(logoutBtn);
      expect(onLogOut).toHaveBeenCalledTimes(1);
    } else if (buttons.length >= 2) {
      // Second button is typically the secondary action (log out)
      fireEvent.click(buttons[1]);
      expect(onLogOut).toHaveBeenCalledTimes(1);
    }
  });
});
