import { NextResponse } from 'next/server'
import { createApiKey, listApiKeys, revokeApiKey } from '@/lib/api/key-manager'

/**
 * GET /api/settings/api-keys
 * List API keys for the account.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    const keys = await listApiKeys(accountId)
    return NextResponse.json({ keys })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/api-keys
 * Create a new API key.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accountId, userId, name, permissions } = body

    if (!accountId || !userId || !name) {
      return NextResponse.json(
        { error: 'accountId, userId, and name are required' },
        { status: 400 }
      )
    }

    const result = await createApiKey({
      accountId,
      userId,
      name,
      permissions: permissions || ['read'],
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/api-keys
 * Revoke an API key.
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { keyId, accountId } = body

    if (!keyId || !accountId) {
      return NextResponse.json(
        { error: 'keyId and accountId are required' },
        { status: 400 }
      )
    }

    const success = await revokeApiKey(keyId, accountId)
    if (!success) {
      return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
