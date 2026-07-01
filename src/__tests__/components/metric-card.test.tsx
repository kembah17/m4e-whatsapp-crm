// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MetricCard } from '@/components/dashboard/metric-card';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MessageSquare: () => <svg data-testid="icon" />,
  UserPlus: () => <svg data-testid="icon" />,
  DollarSign: () => <svg data-testid="icon" />,
  Send: () => <svg data-testid="icon" />,
  TrendingUp: () => <svg data-testid="icon" />,
  TrendingDown: () => <svg data-testid="icon" />,
  ArrowUp: () => <svg data-testid="icon" />,
  ArrowDown: () => <svg data-testid="icon" />,
}));

import { vi } from 'vitest';

describe('MetricCard', () => {
  it('renders with basic props', () => {
    const { container } = render(
      <MetricCard
        title="Total Contacts"
        value="1,234"
        icon="users"
      />
    );
    const text = container.textContent || '';
    expect(text).toContain('Total Contacts');
    expect(text).toContain('1,234');
  });

  it('renders with change indicator', () => {
    const { container } = render(
      <MetricCard
        title="Revenue"
        value="₦500,000"
        icon="revenue"
        change={12.5}
      />
    );
    const text = container.textContent || '';
    expect(text).toContain('Revenue');
    expect(text).toContain('500,000');
  });
});
