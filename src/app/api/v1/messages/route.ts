import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  authenticateApiRequest,
  hasPermission,
  apiError,
  apiSuccess,
  parsePagination,
} from '@/lib/api/public-auth'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/v1/messages
 * List messages for a conversation.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request)
  if (!auth.authenticated) return apiError(auth.error!, 401)
  if (!hasPermission(auth, 'read')) return apiError('Insufficient permissions', 403)

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')

  if (!conversationId) {
    return apiError('conversation_id query parameter required', 400)
  }

  const { page, limit, offset } = parsePagination(request.url)
  const db = supabaseAdmin()

  // Verify conversation belongs to account
  const { data: conv } = await db
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('account_id', auth.accountId!)
    .maybeSingle()

  if (!conv) return apiError('Conversation not found', 404)

  const { data, count, error } = await db
    .from('messages')
    .select('id, conversation_id, sender_type, content_type, content_text, status, message_id, created_at', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return apiError(error.message, 500)

  return apiSuccess(data, { page, limit, total: count ?? 0 })
}

/**
 * POST /api/v1/messages
 * Send a message via the public API.
 */
export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request)
  if (!auth.authenticated) return apiError(auth.error!, 401)
  if (!hasPermission(auth, 'write')) return apiError('Insufficient permissions', 403)

  try {
    const body = await request.json()
    const { conversation_id, text, template_name, template_params } = body

    if (!conversation_id) {
      return apiError('conversation_id is required', 400)
    }
    if (!text && !template_name) {
      return apiError('text or template_name is required', 400)
    }

    // Proxy to internal send API
    const internalUrl = new URL('/api/whatsapp/send', request.url)
    const internalResponse = await fetch(internalUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id,
        message_type: template_name ? 'template' : 'text',
        text,
        template_name,
        template_params,
        account_id: auth.accountId,
      }),
    })

    const result = await internalResponse.json()

    if (!internalResponse.ok) {
      return apiError(result.error || 'Send failed', internalResponse.status)
    }

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    return apiError(err instanceof Error ? err.message : 'Invalid request', 400)
  }
}
