# Environment Variables Reference

> **Last updated:** 2026-07-01 
> **Total variables:** 20 
> **Auto-generated** from codebase scan of `src/` directory

## Quick Start

1. Copy `.env.local.example` to `.env.local`
2. Fill in the **Required** variables (app won't start without them)
3. Add **Recommended** variables for production deployments
4. Add **Optional** variables only for features you use

```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

---

## Required Variables

These must be set or the application will not start.

| Variable | Description | Example | Used By |
|----------|-------------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Project Settings → API) | `https://xxxx.supabase.co` | Auth, Database, Realtime (29 files) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIs...` | Client-side Supabase client (4 files) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — bypasses RLS. **Keep secret, never expose to client.** | `eyJhbGciOiJIUzI1NiIs...` | Server-side admin operations, webhooks, automations (25 files) |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) for AES-256-GCM encryption of WhatsApp tokens | `a1b2c3...` (64 hex chars) | WhatsApp token encryption (2 files) |
| `META_APP_SECRET` | Meta App Secret for HMAC-SHA256 webhook signature verification | `abc123def456...` | Webhook verification, template uploads (3 files) |

### Generating ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ **Warning:** Rotating `ENCRYPTION_KEY` orphans all previously encrypted WhatsApp tokens. Users must re-save their WhatsApp settings to reconnect.

---

## Recommended Variables

Safe defaults exist, but you should set these for production.

| Variable | Description | Example | Used By |
|----------|-------------|---------|--------|
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL (scheme + host, no trailing slash). Used for sitemap, OG images, and self-referential URLs in cron jobs. | `https://crm.example.com` | Sitemap, OG images (1 file) |
| `NEXT_PUBLIC_APP_URL` | Application URL used for internal link generation | `https://crm.example.com` | Link generation, redirects (3 files) |
| `NODE_ENV` | Node.js environment. Set automatically by Next.js. | `production` | Conditional logic (1 file) |

---

## Optional Variables

Only needed if you use the specific feature.

### WhatsApp & Meta Integration

| Variable | Description | Example | Used By |
|----------|-------------|---------|--------|
| `META_APP_ID` | Meta App ID for image-header template uploads (Resumable Upload API) | `123456789012345` | Template submission with image headers (3 files) |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Meta Embedded Signup configuration ID for self-service WhatsApp onboarding | `123456789` | Embedded signup flow (1 file) |
| `WHATSAPP_TEMPLATES_DRY_RUN` | When `"true"`, template submission skips Meta API and stores with synthetic ID. Use in CI/dev. | `true` | Template submission dry run (2 files) |

### AI & Language Models

| Variable | Description | Example | Used By |
|----------|-------------|---------|--------|
| `OPENROUTER_API_KEY` | OpenRouter API key for AI chatbot (Gemini 2.0 Flash), OCR, and sentiment analysis | `sk-or-v1-...` | AI chatbot, OCR import, sentiment analysis (4 files) |

### Email & SMS

| Variable | Description | Example | Used By |
|----------|-------------|---------|--------|
| `BREVO_API_KEY` | Brevo (formerly Sendinblue) API key for transactional email sending | `xkeysib-...` | Email notifications, campaign emails (2 files) |
| `MESSAGING_PROVIDER` | Messaging provider selection | `whatsapp` | Channel routing (1 file) |

### Cron & Automation Security

| Variable | Description | Example | Used By |
|----------|-------------|---------|--------|
| `AUTOMATION_CRON_SECRET` | Shared secret protecting `GET /api/automations/cron`. Required for Wait steps in automations. | `<random 64 hex chars>` | Automation cron endpoint auth (3 files) |
| `CRON_SECRET` | General cron job authentication secret | `<random 64 hex chars>` | Cron endpoint protection (3 files) |

### Generating Cron Secrets

```bash
openssl rand -hex 32
```

### Chatwoot Integration (Future)

| Variable | Description | Example | Used By |
|----------|-------------|---------|--------|
| `CHATWOOT_BASE_URL` | Chatwoot instance base URL | `https://chatwoot.example.com` | Chatwoot API integration (1 file) |
| `CHATWOOT_API_TOKEN` | Chatwoot API access token | `abc123...` | Chatwoot API authentication (1 file) |
| `CHATWOOT_ACCOUNT_ID` | Chatwoot account identifier | `1` | Chatwoot account scoping (1 file) |

### Security

| Variable | Description | Example | Used By |
|----------|-------------|---------|--------|
| `ALLOWED_INVITE_HOSTS` | Comma-separated hostnames allowed for invite URLs. Defense-in-depth against Host header spoofing. | `crm.example.com,staging.example.com` | Invitation URL generation (1 file) |

---

## Variable Categories Summary

| Category | Count | Variables |
|----------|-------|-----------|
| **Auth & Database** | 3 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Security & Encryption** | 3 | `ENCRYPTION_KEY`, `ALLOWED_INVITE_HOSTS`, `META_APP_SECRET` |
| **Meta/WhatsApp** | 3 | `META_APP_ID`, `META_EMBEDDED_SIGNUP_CONFIG_ID`, `WHATSAPP_TEMPLATES_DRY_RUN` |
| **AI & ML** | 1 | `OPENROUTER_API_KEY` |
| **Email & SMS** | 2 | `BREVO_API_KEY`, `MESSAGING_PROVIDER` |
| **Cron & Automation** | 2 | `AUTOMATION_CRON_SECRET`, `CRON_SECRET` |
| **URLs & Environment** | 3 | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV` |
| **Chatwoot (Future)** | 3 | `CHATWOOT_BASE_URL`, `CHATWOOT_API_TOKEN`, `CHATWOOT_ACCOUNT_ID` |

---

## Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/kembah17/m4e-whatsapp-crm.git
cd m4e-whatsapp-crm

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.local.example .env.local

# 4. Fill in minimum required variables:
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - SUPABASE_SERVICE_ROLE_KEY
#    - ENCRYPTION_KEY
#    - META_APP_SECRET

# 5. Optional: Enable template dry-run for local dev
echo 'WHATSAPP_TEMPLATES_DRY_RUN=true' >> .env.local

# 6. Start development server
npm run dev
```

## Vercel Deployment Setup

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add each required variable for the **Production** environment
3. Add recommended variables for production
4. For preview/development environments, consider:
   - Setting `WHATSAPP_TEMPLATES_DRY_RUN=true`
   - Using separate Supabase project credentials
   - Using test API keys where available

### Vercel Environment Scoping

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Production DB | ✅ Staging DB | ✅ Local DB |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Production key | ✅ Staging key | ✅ Local key |
| `ENCRYPTION_KEY` | ✅ Production key | ✅ Same or different | ✅ Dev key |
| `META_APP_SECRET` | ✅ Production | ✅ Test app | ✅ Test app |
| `WHATSAPP_TEMPLATES_DRY_RUN` | ❌ Not set | ✅ `true` | ✅ `true` |
| `OPENROUTER_API_KEY` | ✅ Production | ✅ Same (with budget) | ✅ Same |

---

## Security Notes

1. **Never commit `.env.local`** — it's in `.gitignore`
2. **`SUPABASE_SERVICE_ROLE_KEY`** bypasses Row Level Security — only use server-side
3. **`NEXT_PUBLIC_*`** variables are exposed to the browser — only put public values here
4. **Rotate secrets** if you suspect compromise — especially `ENCRYPTION_KEY` and `META_APP_SECRET`
5. **Use different credentials** for production vs. development environments
