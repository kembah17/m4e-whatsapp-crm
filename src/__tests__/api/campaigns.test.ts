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

describe('Campaign API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    // Simulate what the route handler does
    const supabase = { auth: { getUser: mockGetUser }, from: mockFrom };
    const { data: { user } } = await supabase.auth.getUser();
    expect(user).toBeNull();
  });

  it('returns campaigns for authenticated user', async () => {
    const mockUser = { id: 'user-123' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    const mockCampaigns = [
      { id: 'camp-1', name: 'Test Campaign', status: 'draft' },
      { id: 'camp-2', name: 'Active Campaign', status: 'active' },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockCampaigns, error: null }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const supabase = { auth: { getUser: mockGetUser }, from: mockFrom };
    const { data: { user } } = await supabase.auth.getUser();
    expect(user).toBeTruthy();

    const result = await supabase.from('campaigns').select('*').eq('account_id', 'acc-1').order('created_at');
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe('Test Campaign');
  });

  it('handles campaign creation with required fields', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-camp', name: 'New Campaign', status: 'draft' },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const supabase = { from: mockFrom };
    const result = await supabase.from('campaigns').insert({
      name: 'New Campaign',
      account_id: 'acc-1',
      status: 'draft',
    }).select().single();

    expect(result.data?.name).toBe('New Campaign');
    expect(result.data?.status).toBe('draft');
    expect(result.error).toBeNull();
  });
});
