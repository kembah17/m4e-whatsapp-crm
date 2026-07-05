/**
 * FIRECRAWL SECURITY AUDIT
 *
 * Decision: API-only integration (no npm package installed)
 *
 * Rationale:
 * - AGPL-3.0 license: self-hosted modifications must be open-sourced
 * - We use the hosted API only, avoiding license obligations
 * - No code from Firecrawl runs in our process
 * - API calls are sandboxed: we send URLs, receive markdown/JSON
 * - No file system access, no code execution, no network pivoting
 *
 * Security measures:
 * - API key stored in environment variable only
 * - All requests logged to firecrawl_audit_log table
 * - Rate limited to prevent abuse
 * - URLs validated before sending (SSRF protection)
 * - Response size capped
 *
 * Risk assessment: LOW
 * - Attack surface: HTTP API calls only
 * - Data exposure: URLs we choose to scrape
 * - No dependency supply chain risk (no npm package)
 */
export const FIRECRAWL_SECURITY_AUDIT = {
  date: '2026-07-04',
  decision: 'API-only, no npm package',
  license: 'AGPL-3.0 (avoided via API usage)',
  riskLevel: 'LOW' as const,
  measures: [
    'Environment variable API key',
    'Audit logging to database',
    'URL validation (SSRF protection)',
    'Response size cap',
    'Rate limiting',
    'No npm dependency (zero supply chain risk)',
  ],
} as const

export type FirecrawlSecurityAudit = typeof FIRECRAWL_SECURITY_AUDIT
