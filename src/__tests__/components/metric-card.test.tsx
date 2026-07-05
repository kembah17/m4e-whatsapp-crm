// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MetricCard } from '@/components/dashboard/metric-card';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MessageSquare: (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />,
  UserPlus: (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />,
  DollarSign: (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />,
  Send: (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />,
  TrendingUp: (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />,
  TrendingDown: (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />,
  ArrowUp: (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />,
  ArrowDown: (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />,
  Users: (props: Record<string, unknown>) => <svg data-testid="icon" {...props} />,
}));

import { Users, DollarSign } from 'lucide-react';

describe('MetricCard', () => {
  it('renders with basic props', () => {
    const { container } = render(
      <MetricCard
        title="Total Contacts"
        value="1,234"
        icon={Users}
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
        icon={DollarSign}
        delta={{ sign: 1, label: "+12.5% vs last week" }}
      />
    );
    const text = container.textContent || '';
    expect(text).toContain('Revenue');
    expect(text).toContain('500,000');
  });
});
