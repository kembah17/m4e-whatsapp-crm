import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'crypto'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: SupabaseClient<any, "public", any> | null = null
function supabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

/**
 * Generate a new API key.
 * Format: m4e_<32 random hex chars>
 * Returns the raw key (shown once) and the hash (stored in DB).
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const random = randomBytes(32).toString('hex')
  const rawKey = `m4e_${random}`
  const keyHash = hashApiKey(rawKey)
  const keyPrefix = rawKey.substring(0, 12) // "m4e_" + first 8 hex chars
  return { rawKey, keyHash, keyPrefix }
}

/**
 * Hash an API key for storage.
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Create and store a new API key.
 */
export async function createApiKey(input: {
  accountId: string
  userId: string
  name: string
  permissions?: string[]
  expiresAt?: string
}): Promise<{ rawKey: string; id: string; keyPrefix: string }> {
  const db = supabaseAdmin()
  const { rawKey, keyHash, keyPrefix } = generateApiKey()

  const { data, error } = await db
    .from('public_api_keys')
    .insert({
      account_id: input.accountId,
      name: input.name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      permissions: input.permissions || ['read'],
      expires_at: input.expiresAt || null,
      created_by: input.userId,
    })
    .select('id, key_prefix')
    .single()

  if (error || !data) {
    throw new Error(`Failed to create API key: ${error?.message}`)
  }

  return { rawKey, id: data.id, keyPrefix: data.key_prefix }
}

/**
 * Validate an API key and return the associated account.
 */
export async function validateApiKey(
  rawKey: string,
): Promise<{ valid: boolean; accountId?: string; permissions?: string[]; keyId?: string }> {
  if (!rawKey || !rawKey.startsWith('m4e_')) {
    return { valid: false }
  }

  const db = supabaseAdmin()
  const keyHash = hashApiKey(rawKey)

  const { data, error } = await db
    .from('public_api_keys')
    .select('id, account_id, permissions, is_active, expires_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error || !data) {
    return { valid: false }
  }

  // Check if key is active
  if (!data.is_active) {
    return { valid: false }
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false }
  }

  // Update last_used_at
  // Update last_used_at (non-critical)
  const { error: updateErr } = await db
    .from('public_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
  if (updateErr) console.warn('[api-key] last_used_at update failed:', updateErr.message)

  return {
    valid: true,
    accountId: data.account_id,
    permissions: data.permissions as string[],
    keyId: data.id,
  }
}

/**
 * Revoke (deactivate) an API key.
 */
export async function revokeApiKey(keyId: string, accountId: string): Promise<boolean> {
  const db = supabaseAdmin()
  const { error } = await db
    .from('public_api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .eq('account_id', accountId)

  return !error
}

/**
 * List API keys for an account (without hashes).
 */
export async function listApiKeys(accountId: string) {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('public_api_keys')
    .select('id, name, key_prefix, permissions, is_active, last_used_at, expires_at, created_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list API keys: ${error.message}`)
  return data ?? []
}
