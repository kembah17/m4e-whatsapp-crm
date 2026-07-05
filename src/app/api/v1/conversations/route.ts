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
 * GET /api/v1/conversations
 * List conversations with pagination.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request)
  if (!auth.authenticated) return apiError(auth.error!, 401)
  if (!hasPermission(auth, 'read')) return apiError('Insufficient permissions', 403)

  const { page, limit, offset } = parsePagination(request.url)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const contactId = searchParams.get('contact_id')

  const db = supabaseAdmin()
  let query = db
    .from('conversations')
    .select(`
      id, contact_id, status, channel, assigned_to,
      last_message_text, last_message_at,
      created_at, updated_at,
      contacts!inner(id, name, phone)
    `, { count: 'exact' })
    .eq('account_id', auth.accountId!)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (contactId) query = query.eq('contact_id', contactId)

  const { data, count, error } = await query

  if (error) return apiError(error.message, 500)

  return apiSuccess(data, { page, limit, total: count ?? 0 })
}
