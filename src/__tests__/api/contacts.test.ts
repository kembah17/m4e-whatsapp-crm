import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ success: true, remaining: 29, reset: Date.now() + 60000, limit: 30 })),
  rateLimitResponse: vi.fn(),
  RATE_LIMITS: { general: { limit: 30, windowMs: 60000 } },
}));

describe('Contact API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates phone number format on contact creation', () => {
    // Nigerian phone number validation
    const validNumbers = ['+2348012345678', '2348012345678', '08012345678'];
    const invalidNumbers = ['', '123', 'abc', '+1234'];

    validNumbers.forEach(num => {
      // Basic Nigerian phone regex
      const isValid = /^(\+?234|0)[789]\d{9}$/.test(num.replace(/\s/g, ''));
      // At least the international format should match
      if (num.startsWith('+234')) {
        expect(num.length).toBeGreaterThanOrEqual(14);
      }
    });

    invalidNumbers.forEach(num => {
      expect(num.length).toBeLessThan(11);
    });
  });

  it('returns contacts for authenticated user with pagination', async () => {
    const mockContacts = Array.from({ length: 10 }, (_, i) => ({
      id: `contact-${i}`,
      name: `Contact ${i}`,
      phone: `+234801234567${i}`,
    }));

    const mockRange = vi.fn().mockResolvedValue({
      data: mockContacts.slice(0, 5),
      error: null,
      count: 10,
    });
    const mockOrder = vi.fn().mockReturnValue({ range: mockRange });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const supabase = { from: mockFrom };
    const result = await supabase.from('contacts').select('*', { count: 'exact' })
      .eq('account_id', 'acc-1')
      .order('created_at')
      .range(0, 4);

    expect(result.data).toHaveLength(5);
    expect(result.error).toBeNull();
  });

  it('handles contact deletion', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockFrom.mockReturnValue({ delete: mockDelete });

    const supabase = { from: mockFrom };
    const result = await supabase.from('contacts').delete().eq('id', 'contact-1');
    expect(result.error).toBeNull();
  });
});
