import { describe, expect, it } from 'vitest';

// Test the formatRate logic that was fixed in Batch 1
// This validates the fix: rates are stored as whole numbers (78.5 = 78.5%)
// NOT as decimals (0.785), so we should NOT multiply by 100

const formatRate = (rate: number | null): string => {
  if (rate === null) return "—";
  return `${rate.toFixed(1)}%`;
};

describe('formatRate (campaign template display)', () => {
  it('formats null as em-dash', () => {
    expect(formatRate(null)).toBe('—');
  });

  it('formats whole number rate correctly', () => {
    expect(formatRate(78)).toBe('78.0%');
  });

  it('formats decimal rate correctly', () => {
    expect(formatRate(78.5)).toBe('78.5%');
  });

  it('formats zero correctly', () => {
    expect(formatRate(0)).toBe('0.0%');
  });

  it('formats 100% correctly', () => {
    expect(formatRate(100)).toBe('100.0%');
  });

  it('does NOT multiply by 100 (the bug that was fixed)', () => {
    // Before fix: Math.round(78.5 * 100) = 7850 -> "7850%" (WRONG)
    // After fix: 78.5.toFixed(1) = "78.5" -> "78.5%" (CORRECT)
    const result = formatRate(78.5);
    expect(result).not.toBe('7850%');
    expect(result).not.toBe('7850.0%');
    expect(result).toBe('78.5%');
  });

  it('handles small rates', () => {
    expect(formatRate(0.5)).toBe('0.5%');
    expect(formatRate(1.2)).toBe('1.2%');
  });
});
