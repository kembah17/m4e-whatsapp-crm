import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateApiRequest,
  hasPermission,
  apiError,
  apiSuccess,
} from '@/lib/api/public-auth'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/v1/webhooks
 * List webhook subscriptions.
 * Note: Webhook subscriptions table not yet created.
 * This is a placeholder for future implementation.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request)
  if (!auth.authenticated) return apiError(auth.error!, 401)
  if (!hasPermission(auth, 'read')) return apiError('Insufficient permissions', 403)

  // Placeholder: webhook subscriptions not yet implemented
  return apiSuccess([], { page: 1, limit: 20, total: 0 })
}

/**
 * POST /api/v1/webhooks
 * Create a webhook subscription.
 * Placeholder for future implementation.
 */
export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request)
  if (!auth.authenticated) return apiError(auth.error!, 401)
  if (!hasPermission(auth, 'admin')) return apiError('Admin permission required', 403)

  try {
    const body = await request.json()
    const { url, events } = body

    if (!url || !events?.length) {
      return apiError('url and events[] are required', 400)
    }

    // Placeholder response
    return NextResponse.json(
      {
        data: {
          id: 'placeholder',
          url,
          events,
          status: 'pending',
          message: 'Webhook subscriptions coming soon. This endpoint is reserved.',
        },
      },
      { status: 201 }
    )
  } catch (err) {
    return apiError(err instanceof Error ? err.message : 'Invalid request', 400)
  }
}
