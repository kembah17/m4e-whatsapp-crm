// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonCard } from '@/components/dashboard/skeleton';

describe('SkeletonCard', () => {
  it('renders skeleton placeholder elements', () => {
    const { container } = render(<SkeletonCard />);
    // Skeleton cards typically render div elements with animation classes
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });

  it('renders multiple skeleton cards', () => {
    const { container } = render(
      <>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </>
    );
    // Should have multiple skeleton elements
    const allDivs = container.querySelectorAll('div');
    expect(allDivs.length).toBeGreaterThan(3);
  });
});
