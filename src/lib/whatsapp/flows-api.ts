/**
 * WhatsApp Flows API helpers.
 *
 * Same named-params convention as meta-api.ts.
 */

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

interface FlowCreateOpts {
  wabaId: string
  accessToken: string
  name: string
  categories?: string[]
}

interface FlowUpdateJSONOpts {
  flowId: string
  accessToken: string
  flowJSON: object
}

interface FlowPublishOpts {
  flowId: string
  accessToken: string
}

interface FlowGetOpts {
  flowId: string
  accessToken: string
}

interface FlowListOpts {
  wabaId: string
  accessToken: string
}

interface FlowDeleteOpts {
  flowId: string
  accessToken: string
}

interface FlowSendOpts {
  phoneNumberId: string
  accessToken: string
  to: string
  flowId: string
  flowToken: string
  flowCTA: string
  headerText?: string
  bodyText?: string
  screenId?: string
}

export interface FlowMeta {
  id: string
  name: string
  status: string
  categories: string[]
  validation_errors?: Array<{ error: string; error_type: string }>
}

async function metaFetch(url: string, accessToken: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...((options?.headers as Record<string, string>) || {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.error?.message || res.statusText
    throw new Error(`Meta API error (${res.status}): ${msg}`)
  }
  return res.json()
}

/** Create a new WhatsApp Flow on Meta. */
export async function createFlow({ wabaId, accessToken, name, categories }: FlowCreateOpts): Promise<FlowMeta> {
  const body: Record<string, unknown> = { name }
  if (categories?.length) body.categories = JSON.stringify(categories)
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(body)) params.set(k, String(v))
  return metaFetch(`${META_API_BASE}/${wabaId}/flows`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
}

/** Upload / update the JSON body of a flow. */
export async function updateFlowJSON({ flowId, accessToken, flowJSON }: FlowUpdateJSONOpts) {
  const formData = new FormData()
  const blob = new Blob([JSON.stringify(flowJSON)], { type: 'application/json' })
  formData.append('file', blob, 'flow.json')
  return metaFetch(`${META_API_BASE}/${flowId}/assets`, accessToken, {
    method: 'POST',
    body: formData,
  })
}

/** Publish a DRAFT flow so it can be sent to users. */
export async function publishFlow({ flowId, accessToken }: FlowPublishOpts) {
  return metaFetch(`${META_API_BASE}/${flowId}/publish`, accessToken, {
    method: 'POST',
  })
}

/** Get a single flow's details. */
export async function getFlow({ flowId, accessToken }: FlowGetOpts): Promise<FlowMeta> {
  return metaFetch(`${META_API_BASE}/${flowId}?fields=id,name,status,categories,validation_errors`, accessToken)
}

/** List all flows for a WABA. */
export async function listFlows({ wabaId, accessToken }: FlowListOpts): Promise<{ data: FlowMeta[] }> {
  return metaFetch(`${META_API_BASE}/${wabaId}/flows?fields=id,name,status,categories`, accessToken)
}

/** Delete a DRAFT flow. */
export async function deleteFlow({ flowId, accessToken }: FlowDeleteOpts) {
  return metaFetch(`${META_API_BASE}/${flowId}`, accessToken, { method: 'DELETE' })
}

/** Send a flow message to a user. */
export async function sendFlowMessage(opts: FlowSendOpts) {
  const { phoneNumberId, accessToken, to, flowId, flowToken, flowCTA, headerText, bodyText, screenId } = opts
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: headerText ? { type: 'text', text: headerText } : undefined,
      body: bodyText ? { text: bodyText } : { text: 'Please complete this form' },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_id: flowId,
          flow_token: flowToken,
          flow_cta: flowCTA,
          flow_action: 'navigate',
          flow_action_payload: {
            screen: screenId || 'SCREEN_1',
          },
        },
      },
    },
  }
  return metaFetch(`${META_API_BASE}/${phoneNumberId}/messages`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
