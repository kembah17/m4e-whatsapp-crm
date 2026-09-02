/**
 * Meta Embedded Signup — server-side orchestration.
 *
 * Handles the OAuth code exchange, WABA/phone discovery, Cloud API
 * registration, and app subscription that complete the Embedded Signup
 * flow initiated by the Facebook SDK on the client.
 *
 * Every function follows the named-params convention established in
 * meta-api.ts to prevent swapped-argument bugs.
 */

import { encrypt } from './encryption'
import {
  type MetaPhoneInfo,
  registerPhoneNumber,
  subscribeWabaToApp,
  verifyPhoneNumber,
} from './meta-api'

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

// ============================================================
// Types
// ============================================================

export interface TokenExchangeResult {
  accessToken: string
  tokenType: string
  /** Seconds until expiry — 0 or absent means long-lived. */
  expiresIn?: number
}

export interface WabaBusinessInfo {
  id: string
  name: string
  currency?: string
  timezoneId?: string
  messageTemplateNamespace?: string
}

export interface PhoneNumberInfo {
  id: string
  displayPhoneNumber: string
  verifiedName?: string
  qualityRating?: string
  messagingLimitTier?: string
}

export interface EmbeddedSignupResult {
  success: boolean
  encryptedAccessToken: string
  tokenExpiresAt: string | null
  businessInfo: WabaBusinessInfo
  phoneInfo: PhoneNumberInfo
  registered: boolean
  registrationError?: string
  subscribedApps: boolean
}

// ============================================================
// Helpers
// ============================================================

interface MetaErrorEnvelope {
  error?: { message?: string; code?: number; type?: string }
}

async function throwEmbeddedSignupError(
  response: Response,
  fallback: string,
): Promise<never> {
  let message = fallback
  try {
    const data = (await response.json()) as MetaErrorEnvelope
    if (data.error?.message) message = data.error.message
  } catch {
    // response body wasn't JSON — keep the fallback
  }
  throw new Error(message)
}

/** Convert snake_case MetaPhoneInfo to our camelCase PhoneNumberInfo. */
function toPhoneNumberInfo(meta: MetaPhoneInfo): PhoneNumberInfo {
  return {
    id: meta.id,
    displayPhoneNumber: meta.display_phone_number,
    verifiedName: meta.verified_name,
    qualityRating: meta.quality_rating,
  }
}

// ============================================================
// 1. Exchange authorization code for access token
// ============================================================

export interface ExchangeCodeArgs {
  code: string
  appId: string
  appSecret: string
  /** The origin URL of the page where FB.login() was called. Required for JS SDK OAuth code exchange. */
  redirectUri: string
}

/**
 * Exchange the short-lived authorization code from FB.login() for a
 * business access token via Meta's OAuth endpoint.
 */
export async function exchangeCodeForToken(
  args: ExchangeCodeArgs,
): Promise<TokenExchangeResult> {
  const { code, appId, appSecret, redirectUri } = args
  const url = `${META_API_BASE}/oauth/access_token`
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  })

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    await throwEmbeddedSignupError(
      response,
      `Token exchange failed: ${response.status}`,
    )
  }

  const data = await response.json()
  if (!data.access_token) {
    throw new Error('Token exchange succeeded but no access_token returned.')
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type ?? 'bearer',
    expiresIn: data.expires_in ? Number(data.expires_in) : undefined,
  }
}

// ============================================================
// 2. Get WABA business info
// ============================================================

export interface GetBusinessInfoArgs {
  accessToken: string
  wabaId: string
}

/**
 * Fetch WABA metadata — name, currency, timezone, template namespace.
 */
export async function getBusinessInfo(
  args: GetBusinessInfoArgs,
): Promise<WabaBusinessInfo> {
  const { accessToken, wabaId } = args
  const fields = 'name,currency,timezone_id,message_template_namespace'
  const url = `${META_API_BASE}/${wabaId}?fields=${fields}`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    await throwEmbeddedSignupError(
      response,
      `Failed to fetch WABA info: ${response.status}`,
    )
  }

  const data = await response.json()
  return {
    id: data.id,
    name: data.name ?? 'Unknown Business',
    currency: data.currency,
    timezoneId: data.timezone_id,
    messageTemplateNamespace: data.message_template_namespace,
  }
}

// ============================================================
// 3. Get phone numbers for a WABA
// ============================================================

export interface GetPhoneNumbersArgs {
  accessToken: string
  wabaId: string
}

/**
 * List phone numbers registered under a WABA. The Embedded Signup
 * flow typically provisions exactly one, but we return the full list
 * so the caller can match by phone_number_id.
 */
export async function getPhoneNumbers(
  args: GetPhoneNumbersArgs,
): Promise<PhoneNumberInfo[]> {
  const { accessToken, wabaId } = args
  const fields =
    'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier'
  const url = `${META_API_BASE}/${wabaId}/phone_numbers?fields=${fields}`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    await throwEmbeddedSignupError(
      response,
      `Failed to fetch phone numbers: ${response.status}`,
    )
  }

  const data = await response.json()
  const phones: PhoneNumberInfo[] = (data.data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => ({
      id: String(p.id),
      displayPhoneNumber: String(p.display_phone_number ?? ''),
      verifiedName: p.verified_name ? String(p.verified_name) : undefined,
      qualityRating: p.quality_rating ? String(p.quality_rating) : undefined,
      messagingLimitTier: p.messaging_limit_tier
        ? String(p.messaging_limit_tier)
        : undefined,
    }),
  )
  return phones
}

// ============================================================
// 4. Register phone for Cloud API
// ============================================================

export interface RegisterPhoneArgs {
  accessToken: string
  phoneNumberId: string
  pin?: string
}

/**
 * Register a phone number for Cloud API inbound webhooks.
 *
 * For Embedded Signup, Meta often pre-registers the number, so we
 * treat "already registered" as success. If no PIN is provided
 * (common for newly provisioned numbers), we skip registration and
 * just verify the phone is reachable.
 */
export async function registerPhoneForCloudAPI(
  args: RegisterPhoneArgs,
): Promise<{ success: boolean; error?: string }> {
  const { accessToken, phoneNumberId, pin } = args

  // If no PIN provided, skip /register — Embedded Signup numbers are
  // often pre-registered by Meta. Just verify the phone is reachable.
  if (!pin) {
    try {
      await verifyPhoneNumber({ phoneNumberId, accessToken })
      return { success: true }
    } catch {
      return {
        success: false,
        error:
          'Phone verification failed and no PIN provided for registration. ' +
          'You can add a PIN later in Manual Setup to complete registration.',
      }
    }
  }

  try {
    const result = await registerPhoneNumber({
      phoneNumberId,
      accessToken,
      pin,
    })
    return { success: result.success }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Registration failed',
    }
  }
}

// ============================================================
// 5. Subscribe app to WABA
// ============================================================

export interface SubscribeAppArgs {
  accessToken: string
  wabaId: string
}

/**
 * Subscribe this Meta app to the WABA's webhook events. Idempotent.
 */
export async function subscribeAppToWaba(
  args: SubscribeAppArgs,
): Promise<{ success: boolean; error?: string }> {
  const { accessToken, wabaId } = args
  try {
    await subscribeWabaToApp({ wabaId, accessToken })
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Subscription failed',
    }
  }
}

// ============================================================
// 5b. Discover WABA and Phone Numbers (for scope-based OAuth)
// ============================================================

export interface DiscoveredBusiness {
  id: string
  name: string
}

export interface DiscoveredWaba {
  id: string
  name: string
  currency?: string
}

/**
 * Discover the user's businesses via the Graph API.
 * Used when the frontend doesn't provide waba_id/phone_number_id
 * (scope-based OAuth without config_id).
 */
export async function discoverBusinesses(
  args: { accessToken: string },
): Promise<DiscoveredBusiness[]> {
  const { accessToken } = args
  const url = `${META_API_BASE}/me/businesses?fields=id,name`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    await throwEmbeddedSignupError(
      response,
      `Failed to discover businesses: ${response.status}`,
    )
  }

  const data = await response.json()
  return (data.data ?? []).map((b: { id: string; name: string }) => ({
    id: String(b.id),
    name: String(b.name ?? 'Unknown'),
  }))
}

/**
 * Discover WABAs owned by a business.
 */
export async function discoverWabas(
  args: { accessToken: string; businessId: string },
): Promise<DiscoveredWaba[]> {
  const { accessToken, businessId } = args
  const url = `${META_API_BASE}/${businessId}/owned_whatsapp_business_accounts?fields=id,name,currency`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    await throwEmbeddedSignupError(
      response,
      `Failed to discover WABAs: ${response.status}`,
    )
  }

  const data = await response.json()
  return (data.data ?? []).map((w: { id: string; name: string; currency?: string }) => ({
    id: String(w.id),
    name: String(w.name ?? 'Unknown'),
    currency: w.currency ? String(w.currency) : undefined,
  }))
}

/**
 * Auto-discover WABA and phone number when not provided by the frontend.
 * This handles the scope-based OAuth flow where Meta doesn't return
 * WABA/phone selection in the popup response.
 *
 * Returns { wabaId, phoneNumberId } or throws if discovery fails.
 */
export async function autoDiscoverWabaAndPhone(
  args: { accessToken: string },
): Promise<{ wabaId: string; phoneNumberId: string }> {
  const { accessToken } = args

  // Step 1: Find businesses
  const businesses = await discoverBusinesses({ accessToken })
  if (businesses.length === 0) {
    throw new Error(
      'No Meta Business accounts found. Ensure your Meta account has a Business portfolio ' +
      'with a WhatsApp Business Account attached.',
    )
  }

  // Step 2: Find WABAs across all businesses
  let allWabas: Array<DiscoveredWaba & { businessId: string }> = []
  for (const biz of businesses) {
    try {
      const wabas = await discoverWabas({ accessToken, businessId: biz.id })
      allWabas = allWabas.concat(wabas.map(w => ({ ...w, businessId: biz.id })))
    } catch {
      // Business might not have WABAs — continue to next
      continue
    }
  }

  if (allWabas.length === 0) {
    throw new Error(
      `Found ${businesses.length} business(es) but no WhatsApp Business Accounts. ` +
      'Create a WABA in your Meta Business Suite first, or use Manual Setup.',
    )
  }

  // Step 3: Find phone numbers across all WABAs
  let allPhones: Array<PhoneNumberInfo & { wabaId: string }> = []
  for (const waba of allWabas) {
    try {
      const phones = await getPhoneNumbers({ accessToken, wabaId: waba.id })
      allPhones = allPhones.concat(phones.map(p => ({ ...p, wabaId: waba.id })))
    } catch {
      continue
    }
  }

  if (allPhones.length === 0) {
    throw new Error(
      `Found ${allWabas.length} WABA(s) but no phone numbers. ` +
      'Add a phone number to your WhatsApp Business Account first, or use Manual Setup.',
    )
  }

  // Auto-select: if exactly one phone, use it. If multiple, use the first.
  // Future enhancement: return options to frontend for user selection.
  const selectedPhone = allPhones[0]
  console.log(
    `[Embedded Signup] Auto-discovered WABA ${selectedPhone.wabaId} ` +
    `phone ${selectedPhone.id} (${selectedPhone.displayPhoneNumber}) ` +
    `from ${allPhones.length} phone(s) across ${allWabas.length} WABA(s)`,
  )

  return {
    wabaId: selectedPhone.wabaId,
    phoneNumberId: selectedPhone.id,
  }
}

// ============================================================
// 6. Complete Embedded Signup — full orchestration
// ============================================================

export interface CompleteEmbeddedSignupArgs {
  code: string
  wabaId: string
  phoneNumberId: string
  appId: string
  appSecret: string
  /** The origin URL of the page where FB.login() was called. Required for JS SDK OAuth code exchange. */
  redirectUri: string
  /** Optional 6-digit PIN for phone registration. */
  pin?: string
}

/**
 * End-to-end orchestration of the Embedded Signup completion:
 *   1. Exchange code for token
 *   2. Get business info
 *   3. Get phone info
 *   4. Register phone for Cloud API
 *   5. Subscribe app to WABA
 *   6. Encrypt token for storage
 *
 * Returns all data needed to persist to whatsapp_config.
 */
export async function completeEmbeddedSignup(
  args: CompleteEmbeddedSignupArgs,
): Promise<EmbeddedSignupResult> {
  const { code, wabaId, phoneNumberId, appId, appSecret, redirectUri, pin } = args

  // Step 1: Exchange code for token
  const tokenResult = await exchangeCodeForToken({ code, appId, appSecret, redirectUri })
  const { accessToken } = tokenResult

  // Calculate token expiry
  let tokenExpiresAt: string | null = null
  if (tokenResult.expiresIn && tokenResult.expiresIn > 0) {
    tokenExpiresAt = new Date(
      Date.now() + tokenResult.expiresIn * 1000,
    ).toISOString()
  }

  // Step 2: Get business info
  const businessInfo = await getBusinessInfo({ accessToken, wabaId })

  // Step 3: Get phone info — try WABA phone list first, fall back to direct
  let phoneInfo: PhoneNumberInfo
  const phones = await getPhoneNumbers({ accessToken, wabaId })
  const matchedPhone = phones.find((p) => p.id === phoneNumberId)
  if (matchedPhone) {
    phoneInfo = matchedPhone
  } else if (phones.length > 0) {
    // Fallback to first phone if the specific ID wasn't found
    // (can happen if Meta returns a different ID format)
    phoneInfo = phones[0]
  } else {
    // No phones found via WABA list — try direct verification
    const directInfo = await verifyPhoneNumber({
      phoneNumberId,
      accessToken,
    })
    phoneInfo = toPhoneNumberInfo(directInfo)
  }

  // Step 4: Register phone for Cloud API
  const registration = await registerPhoneForCloudAPI({
    accessToken,
    phoneNumberId: phoneInfo.id,
    pin,
  })

  // Step 5: Subscribe app to WABA
  const subscription = await subscribeAppToWaba({ accessToken, wabaId })

  // Step 6: Encrypt token
  const encryptedAccessToken = encrypt(accessToken)

  return {
    success: true,
    encryptedAccessToken,
    tokenExpiresAt,
    businessInfo,
    phoneInfo,
    registered: registration.success,
    registrationError: registration.error,
    subscribedApps: subscription.success,
  }
}
