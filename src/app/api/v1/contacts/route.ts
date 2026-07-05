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
 * GET /api/v1/contacts
 * List contacts with pagination and filtering.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request)
  if (!auth.authenticated) return apiError(auth.error!, 401)
  if (!hasPermission(auth, 'read')) return apiError('Insufficient permissions', 403)

  const { page, limit, offset } = parsePagination(request.url)
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const status = searchParams.get('status')

  const db = supabaseAdmin()
  let query = db
    .from('contacts')
    .select('id, name, phone, email, company, status, labels, created_at, updated_at', { count: 'exact' })
    .eq('account_id', auth.accountId!)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (status) {
    query = query.eq('status', status)
  }

  const { data, count, error } = await query

  if (error) return apiError(error.message, 500)

  return apiSuccess(data, { page, limit, total: count ?? 0 })
}

/**
 * POST /api/v1/contacts
 * Create a new contact.
 */
export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request)
  if (!auth.authenticated) return apiError(auth.error!, 401)
  if (!hasPermission(auth, 'write')) return apiError('Insufficient permissions', 403)

  try {
    const body = await request.json()
    const { name, phone, email, company, labels, metadata } = body

    if (!name && !phone) {
      return apiError('name or phone is required', 400)
    }

    const db = supabaseAdmin()
    const { data, error } = await db
      .from('contacts')
      .insert({
        account_id: auth.accountId!,
        name: name || phone || 'Unknown',
        phone: phone || null,
        email: email || null,
        company: company || null,
        labels: labels || [],
        metadata: metadata || {},
        primary_channel: 'whatsapp',
        status: 'active',
      })
      .select()
      .single()

    if (error) return apiError(error.message, 500)

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return apiError(err instanceof Error ? err.message : 'Invalid request', 400)
  }
}
