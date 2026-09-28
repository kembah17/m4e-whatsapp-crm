import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import {
  recordConsent,
  withdrawConsent,
  getContactConsents,
} from '@/lib/compliance/consent'
import type { ConsentType, ConsentSource } from '@/lib/compliance/consent'

const VALID_CONSENT_TYPES: ConsentType[] = [
  'whatsapp_marketing',
  'whatsapp_transactional',
  'email_marketing',
  'sms_marketing',
  'data_processing',
  'ndpr_explicit',
]

const VALID_SOURCES: ConsentSource[] = [
  'import',
  'flow_completion',
  'manual_entry',
  'whatsapp_optin',
  'web_form',
  'api',
]

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: contactId } = await params

    const consents = await getContactConsents({
      accountId: account.id,
      contactId,
    })

    return NextResponse.json({ consents })
  } catch (err) {
    console.error('[contacts/[id]/consents] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: contactId } = await params
    const body = await req.json()

    const { consentType, source, action, evidence } = body as {
      consentType: ConsentType
      source?: ConsentSource
      action: 'grant' | 'withdraw'
      evidence?: string
    }

    if (!consentType || !VALID_CONSENT_TYPES.includes(consentType)) {
      return NextResponse.json(
        { error: `Invalid consent type. Must be one of: ${VALID_CONSENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (action === 'withdraw') {
      await withdrawConsent({
        accountId: account.id,
        contactId,
        consentType,
      })
      return NextResponse.json({ success: true, action: 'withdrawn' })
    }

    // Default: grant
    const consentSource = source && VALID_SOURCES.includes(source) ? source : 'manual_entry'

    const result = await recordConsent({
      accountId: account.id,
      contactId,
      consentType,
      source: consentSource,
      evidence,
    })

    return NextResponse.json({ success: true, action: 'granted', id: result.id }, { status: 201 })
  } catch (err) {
    console.error('[contacts/[id]/consents] POST error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
