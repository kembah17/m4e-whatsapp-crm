import { NextResponse } from 'next/server'
import { validateApiKey } from './key-manager'

export interface ApiAuthResult {
  authenticated: boolean
  accountId?: string
  permissions?: string[]
  keyId?: string
  error?: string
}

/**
 * Authenticate a public API request.
 * Expects: Authorization: Bearer m4e_xxxx
 */
export async function authenticateApiRequest(
  request: Request,
): Promise<ApiAuthResult> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: 'Missing or invalid Authorization header. Expected: Bearer m4e_xxxx',
    }
  }

  const token = authHeader.substring(7).trim()

  if (!token.startsWith('m4e_')) {
    return {
      authenticated: false,
      error: 'Invalid API key format. Keys start with m4e_',
    }
  }

  const result = await validateApiKey(token)

  if (!result.valid) {
    return {
      authenticated: false,
      error: 'Invalid or expired API key',
    }
  }

  return {
    authenticated: true,
    accountId: result.accountId,
    permissions: result.permissions,
    keyId: result.keyId,
  }
}

/**
 * Check if the authenticated key has a specific permission.
 */
export function hasPermission(auth: ApiAuthResult, permission: string): boolean {
  if (!auth.authenticated || !auth.permissions) return false
  return auth.permissions.includes(permission) || auth.permissions.includes('admin')
}

/**
 * Standard error response for public API.
 */
export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      error: { message, ...(details ? { details } : {}) },
      status,
    },
    { status }
  )
}

/**
 * Standard success response with pagination.
 */
export function apiSuccess(
  data: unknown,
  pagination?: { page: number; limit: number; total: number },
) {
  return NextResponse.json({
    data,
    ...(pagination
      ? {
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            pages: Math.ceil(pagination.total / pagination.limit),
          },
        }
      : {}),
  })
}

/**
 * Parse pagination params from URL.
 */
export function parsePagination(url: string): { page: number; limit: number; offset: number } {
  const { searchParams } = new URL(url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}
