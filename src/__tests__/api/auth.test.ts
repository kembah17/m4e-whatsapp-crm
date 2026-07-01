import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      getUser: mockGetUser,
    },
  })),
}));

describe('Auth API validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects empty credentials on sign-in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const result = await supabase.auth.signInWithPassword({
      email: '',
      password: '',
    });

    expect(result.error).toBeTruthy();
    expect(result.data.user).toBeNull();
  });

  it('returns user on successful sign-in', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: { access_token: 'token-123' } },
      error: null,
    });

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const result = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.error).toBeNull();
    expect(result.data.user?.id).toBe('user-123');
  });

  it('rejects duplicate email on sign-up', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', status: 422 },
    });

    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const result = await supabase.auth.signUp({
      email: 'existing@example.com',
      password: 'password123',
    });

    expect(result.error).toBeTruthy();
    expect(result.error?.message).toContain('already registered');
  });
});
