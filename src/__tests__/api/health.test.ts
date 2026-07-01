import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the health check module
vi.mock('@/lib/monitoring/health', () => ({
  runHealthChecks: vi.fn(),
}));

import { GET } from '@/app/api/health/route';
import { runHealthChecks } from '@/lib/monitoring/health';

const mockedRunHealthChecks = vi.mocked(runHealthChecks);

function makeRequest(ip = '127.0.0.1') {
  return new Request('http://localhost:3000/api/health', {
    headers: { 'x-forwarded-for': ip },
  }) as any;
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with healthy status when all checks pass', async () => {
    mockedRunHealthChecks.mockResolvedValue({
      status: 'healthy',
      checks: { database: 'ok', auth: 'ok' },
      created_at: new Date().toISOString(),
      uptime_seconds: 3600,
      response_time_ms: 42,
      memory_used_mb: 128,
    } as any);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.uptime_seconds).toBe(3600);
    expect(body.response_time_ms).toBe(42);
  });

  it('returns 503 when health checks indicate unhealthy', async () => {
    mockedRunHealthChecks.mockResolvedValue({
      status: 'unhealthy',
      checks: { database: 'error' },
      created_at: new Date().toISOString(),
      uptime_seconds: 100,
      response_time_ms: 5000,
      memory_used_mb: 512,
    } as any);

    const response = await GET(makeRequest());
    expect(response.status).toBe(503);
  });

  it('returns 200 with degraded status', async () => {
    mockedRunHealthChecks.mockResolvedValue({
      status: 'degraded',
      checks: { database: 'ok', cache: 'slow' },
      created_at: new Date().toISOString(),
      uptime_seconds: 7200,
      response_time_ms: 200,
      memory_used_mb: 256,
    } as any);

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('degraded');
  });

  it('returns 503 when health check throws', async () => {
    mockedRunHealthChecks.mockRejectedValue(new Error('Connection refused'));

    const response = await GET(makeRequest());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe('unhealthy');
    expect(body.error).toContain('Connection refused');
  });
});
