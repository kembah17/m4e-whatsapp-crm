import { NextResponse, type NextRequest } from 'next/server'
import { runHealthChecks } from '@/lib/monitoring/health'

export const runtime = 'nodejs'

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 30

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  rateLimitMap.set(ip, recent)

  // Cleanup old entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [key, vals] of rateLimitMap.entries()) {
      const filtered = vals.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
      if (filtered.length === 0) {
        rateLimitMap.delete(key)
      } else {
        rateLimitMap.set(key, filtered)
      }
    }
  }

  return recent.length > RATE_LIMIT_MAX
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retry_after_seconds: 60 },
      { status: 429 }
    )
  }

  try {
    const snapshot = await runHealthChecks()

    const statusCode = snapshot.status === 'healthy' ? 200
      : snapshot.status === 'degraded' ? 200
      : 503

    return NextResponse.json(
      {
        status: snapshot.status,
        checks: snapshot.checks,
        timestamp: snapshot.created_at,
        uptime_seconds: snapshot.uptime_seconds,
        response_time_ms: snapshot.response_time_ms,
        memory_used_mb: snapshot.memory_used_mb,
      },
      { status: statusCode }
    )
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: err instanceof Error ? err.message : 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
