/**
 * WhatsApp Catalog API helpers.
 * Named-params convention matching meta-api.ts.
 */

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

interface CatalogListOpts {
  wabaId: string
  accessToken: string
}

interface CatalogProductsOpts {
  catalogId: string
  accessToken: string
  limit?: number
}

interface CatalogProductOpts {
  catalogId: string
  accessToken: string
  product: {
    name: string
    description?: string
    price: number // in kobo (smallest currency unit)
    currency?: string
    imageUrl?: string
    sku?: string
    availability?: 'in stock' | 'out of stock'
  }
}

interface CatalogUpdateOpts {
  productId: string
  accessToken: string
  updates: Record<string, unknown>
}

interface CatalogDeleteOpts {
  productId: string
  accessToken: string
}

interface SendProductOpts {
  phoneNumberId: string
  accessToken: string
  to: string
  catalogId: string
  productRetailerId: string
  bodyText?: string
  footerText?: string
}

interface SendProductListOpts {
  phoneNumberId: string
  accessToken: string
  to: string
  catalogId: string
  productRetailerIds: string[]
  headerText?: string
  bodyText?: string
  footerText?: string
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
    throw new Error(`Meta Catalog API error (${res.status}): ${msg}`)
  }
  return res.json()
}

/** List catalogs for a WABA. */
export async function getCatalogs({ wabaId, accessToken }: CatalogListOpts) {
  return metaFetch(
    `${META_API_BASE}/${wabaId}/product_catalogs?fields=id,name,product_count`,
    accessToken
  )
}

/** List products in a catalog. */
export async function getCatalogProducts({ catalogId, accessToken, limit = 100 }: CatalogProductsOpts) {
  return metaFetch(
    `${META_API_BASE}/${catalogId}/products?fields=id,name,description,price,currency,image_url,retailer_id,availability&limit=${limit}`,
    accessToken
  )
}

/** Create a product in a catalog. */
export async function createProduct({ catalogId, accessToken, product }: CatalogProductOpts) {
  const payload: Record<string, unknown> = {
    name: product.name,
    price: product.price,
    currency: product.currency || 'NGN',
    availability: product.availability || 'in stock',
  }
  if (product.description) payload.description = product.description
  if (product.imageUrl) payload.image_url = product.imageUrl
  if (product.sku) payload.retailer_id = product.sku

  return metaFetch(`${META_API_BASE}/${catalogId}/products`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** Update a product. */
export async function updateProduct({ productId, accessToken, updates }: CatalogUpdateOpts) {
  return metaFetch(`${META_API_BASE}/${productId}`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
}

/** Delete a product. */
export async function deleteProduct({ productId, accessToken }: CatalogDeleteOpts) {
  return metaFetch(`${META_API_BASE}/${productId}`, accessToken, { method: 'DELETE' })
}

/**
 * Sync a CRM product to a Meta catalog.
 * Maps CRM fields → Meta format: name→name, price in kobo, description, image_url, sku→retailer_id
 */
export async function syncProductToCatalog({
  catalogId,
  accessToken,
  crmProduct,
}: {
  catalogId: string
  accessToken: string
  crmProduct: {
    name: string
    price: number
    description?: string
    image_url?: string
    sku?: string
    status?: string
  }
}) {
  return createProduct({
    catalogId,
    accessToken,
    product: {
      name: crmProduct.name,
      price: Math.round(crmProduct.price * 100), // Convert to kobo
      currency: 'NGN',
      description: crmProduct.description,
      imageUrl: crmProduct.image_url,
      sku: crmProduct.sku,
      availability: crmProduct.status === 'active' ? 'in stock' : 'out of stock',
    },
  })
}

/** Send a single product message. */
export async function sendProductMessage(opts: SendProductOpts) {
  const { phoneNumberId, accessToken, to, catalogId, productRetailerId, bodyText, footerText } = opts
  return metaFetch(`${META_API_BASE}/${phoneNumberId}/messages`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'product',
        body: bodyText ? { text: bodyText } : undefined,
        footer: footerText ? { text: footerText } : undefined,
        action: {
          catalog_id: catalogId,
          product_retailer_id: productRetailerId,
        },
      },
    }),
  })
}

/** Send a multi-product list message. */
export async function sendProductListMessage(opts: SendProductListOpts) {
  const { phoneNumberId, accessToken, to, catalogId, productRetailerIds, headerText, bodyText, footerText } = opts
  return metaFetch(`${META_API_BASE}/${phoneNumberId}/messages`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'product_list',
        header: headerText ? { type: 'text', text: headerText } : undefined,
        body: bodyText ? { text: bodyText } : { text: 'Check out our products' },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          catalog_id: catalogId,
          sections: [
            {
              title: 'Products',
              product_items: productRetailerIds.map((id) => ({ product_retailer_id: id })),
            },
          ],
        },
      },
    }),
  })
}
