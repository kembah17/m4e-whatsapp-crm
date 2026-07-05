/**
 * Minimal Firecrawl API client — no npm dependency.
 * Uses only fetch() to call Firecrawl's REST API.
 * Conditional: only used when FIRECRAWL_API_KEY is set.
 */
export class FirecrawlClient {
  private apiKey: string
  private baseUrl: string

  constructor() {
    const key = process.env.FIRECRAWL_API_KEY
    if (!key) throw new Error('FIRECRAWL_API_KEY not configured')
    this.apiKey = key
    this.baseUrl = process.env.FIRECRAWL_BASE_URL || 'https://api.firecrawl.dev/v1'
  }

  /**
   * Check if Firecrawl is available (API key configured).
   */
  static isAvailable(): boolean {
    return !!process.env.FIRECRAWL_API_KEY
  }

  /**
   * Scrape a single URL and return markdown/HTML content.
   */
  async scrape(
    url: string,
    options?: { formats?: ('markdown' | 'html' | 'rawHtml')[] },
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    this.validateUrl(url)

    const response = await fetch(`${this.baseUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: options?.formats || ['markdown'],
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown')
      return { success: false, error: `Firecrawl API error: ${response.status} ${errText}` }
    }

    const data = await response.json()
    return { success: true, data }
  }

  /**
   * Extract structured data from URLs using a schema.
   */
  async extract(
    urls: string[],
    schema: Record<string, unknown>,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    for (const url of urls) this.validateUrl(url)

    const response = await fetch(`${this.baseUrl}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ urls, schema }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown')
      return { success: false, error: `Firecrawl API error: ${response.status} ${errText}` }
    }

    const data = await response.json()
    return { success: true, data }
  }

  /**
   * Validate URL to prevent SSRF and other attacks.
   */
  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP/HTTPS URLs allowed')
      }
      // Block internal/private IPs
      const hostname = parsed.hostname.toLowerCase()
      const blocked = [
        'localhost', '127.0.0.1', '0.0.0.0', '::1',
        '169.254.', '10.', '172.16.', '172.17.', '172.18.',
        '172.19.', '172.20.', '172.21.', '172.22.', '172.23.',
        '172.24.', '172.25.', '172.26.', '172.27.', '172.28.',
        '172.29.', '172.30.', '172.31.', '192.168.',
      ]
      if (blocked.some((b) => hostname.startsWith(b) || hostname === b)) {
        throw new Error('Internal/private URLs not allowed')
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('not allowed')) throw err
      throw new Error(`Invalid URL: ${url}`)
    }
  }
}
