# M4E WhatsApp CRM — Software Update Guide

> **Version**: 1.0  
> **Last Updated**: 2026-07-01  
> **Audience**: Developers, DevOps, System Administrators  
> **Platform**: Next.js 16 · React 19 · Supabase · Vercel

---

## Table of Contents

1. [Overview](#1-overview)
2. [Pre-Update Checklist](#2-pre-update-checklist)
3. [Node.js Runtime](#3-nodejs-runtime)
4. [npm Package Dependencies](#4-npm-package-dependencies)
5. [Next.js Framework](#5-nextjs-framework)
6. [Supabase Platform](#6-supabase-platform)
7. [Vercel Deployment Platform](#7-vercel-deployment-platform)
8. [Development Tools](#8-development-tools)
9. [System-Level Packages](#9-system-level-packages)
10. [Security Updates](#10-security-updates)
11. [Automated Update Monitoring](#11-automated-update-monitoring)
12. [Rollback Procedures](#12-rollback-procedures)
13. [Update Schedule](#13-update-schedule)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Overview

This guide covers updating all software components of the M4E WhatsApp CRM platform. The system comprises:

| Component | Current Version | Update Frequency |
|-----------|----------------|------------------|
| Node.js | ≥20.0.0 | Every LTS release (April/October) |
| Next.js | 16.2.6 | Monthly minor, quarterly major |
| React | 19.2.4 | As released |
| TypeScript | ^6 | Quarterly |
| Supabase JS | ^2.107.0 | Monthly |
| Vitest | ^4.1.9 | Monthly |
| Tailwind CSS | ^4 | As released |
| Vercel CLI | Latest | Monthly |

### Update Priority Levels

- **🔴 Critical**: Security vulnerabilities (CVE), data loss risks → Update within 24 hours
- **🟠 High**: Breaking bug fixes, performance regressions → Update within 1 week
- **🟡 Medium**: Feature updates, non-critical fixes → Update within 1 month
- **🟢 Low**: Dev tooling, cosmetic improvements → Next scheduled maintenance window

---

## 2. Pre-Update Checklist

Before performing ANY update:

```bash
# 1. Ensure you're on the main branch with clean working tree
git checkout main
git pull origin main
git status  # Must show "nothing to commit"

# 2. Create an update branch
git checkout -b update/$(date +%Y%m%d)-dependencies

# 3. Run the full test suite (baseline)
npm run test
npm run typecheck
npm run build

# 4. Record current dependency versions
npm list --depth=0 > /tmp/deps-before.txt

# 5. Verify Supabase migrations are current
npx supabase db diff  # Should show no pending changes
```

### Backup Before Major Updates

```bash
# Database backup (see BACKUP_AND_DISASTER_RECOVERY.md for full procedures)
npx supabase db dump -f backup-pre-update-$(date +%Y%m%d).sql

# Lock file backup
cp package-lock.json package-lock.json.bak
```

---

## 3. Node.js Runtime

### Current Requirement

```json
// package.json
"engines": {
  "node": ">=20.0.0"
}
```

### Checking Current Version

```bash
node --version
npm --version
```

### Updating Node.js

#### Option A: Using nvm (Recommended)

```bash
# List available LTS versions
nvm ls-remote --lts

# Install latest LTS
nvm install --lts

# Set as default
nvm alias default lts/*

# Verify
node --version
```

#### Option B: Using NodeSource (Ubuntu/Debian servers)

```bash
# For Node.js 22.x LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

#### Option C: Vercel Runtime

Vercel automatically uses the Node.js version specified in:
1. `.nvmrc` file (if present)
2. `engines.node` in `package.json`
3. Vercel project settings → General → Node.js Version

To update on Vercel:
1. Go to Vercel Dashboard → Project Settings → General
2. Under "Node.js Version", select the desired version
3. Redeploy

### Post-Update Verification

```bash
# Reinstall dependencies with new Node.js
rm -rf node_modules package-lock.json
npm install
npm run test
npm run build
```

### Node.js LTS Schedule

| Version | Status | End of Life |
|---------|--------|-------------|
| 18.x | Maintenance | April 2025 |
| 20.x | Active LTS | April 2026 |
| 22.x | Active LTS | April 2027 |
| 24.x | Current | October 2027 |

> ⚠️ Always use **Active LTS** versions in production.

---

## 4. npm Package Dependencies

### Checking for Updates

```bash
# Check outdated packages
npm outdated

# Interactive update tool (recommended)
npx npm-check-updates

# Check for security vulnerabilities
npm audit
```

### Update Strategies

#### Strategy 1: Patch/Minor Updates (Safe — Weekly)

```bash
# Update within semver ranges defined in package.json
npm update

# Verify nothing broke
npm run test
npm run typecheck
npm run build
```

#### Strategy 2: Targeted Major Updates (Monthly)

```bash
# Check what would change
npx npm-check-updates

# Update specific packages
npm install @supabase/supabase-js@latest
npm install @supabase/ssr@latest

# Or update all (review changes carefully)
npx npm-check-updates -u
npm install

# Full verification
npm run test
npm run typecheck
npm run build
```

#### Strategy 3: Security-Only Updates (As Needed)

```bash
# View vulnerabilities
npm audit

# Auto-fix what's safe
npm audit fix

# Force fix (may include breaking changes — test thoroughly)
npm audit fix --force
```

### Key Dependencies — Update Notes

#### Next.js

```bash
# Check current vs latest
npm info next version

# Update Next.js + ESLint config together
npm install next@latest eslint-config-next@latest

# Read the upgrade guide first:
# https://nextjs.org/docs/upgrading
```

**Breaking change risks**: App Router API changes, middleware changes, config format changes.

#### React

```bash
npm install react@latest react-dom@latest
npm install -D @types/react@latest @types/react-dom@latest
```

**Breaking change risks**: Hook behavior changes, concurrent mode changes.

#### Supabase

```bash
npm install @supabase/supabase-js@latest @supabase/ssr@latest
```

**Breaking change risks**: Auth API changes, realtime channel changes, RLS behavior.

#### Tailwind CSS

```bash
npm install -D tailwindcss@latest @tailwindcss/postcss@latest
```

**Breaking change risks**: Class name changes, config format (v3→v4 was major).

#### Vitest

```bash
npm install -D vitest@latest @testing-library/react@latest happy-dom@latest
```

**Breaking change risks**: Config changes, matcher API changes.

### Dependency Lock File

Always commit `package-lock.json` after updates:

```bash
git add package.json package-lock.json
git commit -m "chore(deps): update dependencies $(date +%Y-%m-%d)"
```

---

## 5. Next.js Framework

### Major Version Upgrades

Next.js major versions (e.g., 15→16) require careful migration:

```bash
# 1. Read the official migration guide
# https://nextjs.org/docs/upgrading

# 2. Use the automated codemod (if available)
npx @next/codemod@latest upgrade

# 3. Update package
npm install next@latest

# 4. Check for deprecated APIs
npm run build 2>&1 | grep -i "deprecat"

# 5. Run full test suite
npm run test
npm run typecheck
npm run build
```

### Configuration Updates

After Next.js updates, review:

- `next.config.ts` — New/changed options
- `middleware.ts` — API changes
- `tsconfig.json` — Compiler option changes
- `.env.local` — New required environment variables

### Vercel Compatibility

Next.js and Vercel are tightly coupled. After updating Next.js:

1. Push to a preview branch first
2. Check the Vercel deployment logs for warnings
3. Test the preview deployment thoroughly
4. Merge to main only after verification

---

## 6. Supabase Platform

### Supabase Dashboard Updates

Supabase cloud platform updates automatically. Monitor:
- [Supabase Status](https://status.supabase.com/)
- [Supabase Changelog](https://supabase.com/changelog)

### Supabase CLI

```bash
# Check current version
npx supabase --version

# Update CLI
npm install -D supabase@latest
# Or globally:
npm install -g supabase@latest

# Verify
npx supabase --version
```

### Database Migrations

After Supabase updates, check for:

```bash
# Check migration status
npx supabase migration list

# Check for schema drift
npx supabase db diff

# Apply pending migrations
npx supabase db push
```

### Supabase JS Client

```bash
# Update client libraries
npm install @supabase/supabase-js@latest @supabase/ssr@latest

# Check for breaking changes in:
# - Auth methods (signIn, signUp, signOut)
# - Realtime subscriptions
# - Storage API
# - RPC function calls
```

### PostgREST / GoTrue Updates

These are managed by Supabase cloud but affect API behavior:
- Monitor [Supabase Releases](https://github.com/supabase/supabase/releases)
- Test RPC functions after platform updates
- Verify RLS policies still work as expected

---

## 7. Vercel Deployment Platform

### Vercel CLI

```bash
# Install/update Vercel CLI
npm install -g vercel@latest

# Verify
vercel --version
```

### Vercel Project Settings

Periodically review in Vercel Dashboard:

1. **Build Settings**: Ensure build command and output directory are correct
2. **Environment Variables**: Verify all required vars are set (see ENVIRONMENT_VARIABLES.md)
3. **Node.js Version**: Match your local development version
4. **Framework Preset**: Should be "Next.js"
5. **Root Directory**: Should be `m4e-whatsapp-crm` (or project root)

### Vercel Platform Updates

Vercel updates automatically. Monitor:
- [Vercel Changelog](https://vercel.com/changelog)
- [Vercel Status](https://www.vercel-status.com/)

---

## 8. Development Tools

### TypeScript

```bash
# Update TypeScript
npm install -D typescript@latest

# Check for new strict options in tsconfig.json
npx tsc --init  # Compare with current config

# Verify
npm run typecheck
```

### ESLint

```bash
# Update ESLint + Next.js config
npm install -D eslint@latest eslint-config-next@latest

# Run lint check
npm run lint
```

### Prettier

```bash
# Update Prettier + Tailwind plugin
npm install -D prettier@latest prettier-plugin-tailwindcss@latest

# Verify formatting
npm run format:check
```

### Testing Libraries

```bash
# Update test framework and utilities
npm install -D vitest@latest \
  @testing-library/react@latest \
  @testing-library/jest-dom@latest \
  @testing-library/user-event@latest \
  happy-dom@latest

# Run tests
npm run test
```

---

## 9. System-Level Packages

### Development Server (if self-hosted)

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update specific tools
sudo apt install -y git curl wget

# Update Docker (if used)
sudo apt install -y docker-ce docker-ce-cli containerd.io
docker --version
```

### SSL Certificates

Vercel handles SSL automatically for deployed sites. For local development:

```bash
# If using mkcert for local HTTPS
brew install mkcert  # macOS
# or
sudo apt install mkcert  # Linux

mkcert -install
mkcert localhost 127.0.0.1
```

### Git

```bash
# Update Git
sudo apt install -y git
git --version

# Update Git hooks (if using husky)
npx husky install
```

---

## 10. Security Updates

### Automated Vulnerability Scanning

```bash
# npm audit (run weekly)
npm audit

# Generate detailed report
npm audit --json > audit-report.json

# Fix automatically where safe
npm audit fix
```

### GitHub Dependabot

The project has Dependabot configured at `.github/dependabot.yml`. It automatically:
- Scans for vulnerable dependencies weekly
- Creates PRs for security updates
- Groups minor/patch updates

To review Dependabot PRs:
1. Go to GitHub → Pull Requests → Filter by "dependabot"
2. Review the changelog and breaking changes
3. Check CI passes
4. Merge if safe

### Security Headers

The middleware (`src/middleware.ts`) sets security headers. Review periodically:

```typescript
// Current security headers:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// X-XSS-Protection: 1; mode=block
// Referrer-Policy: strict-origin-when-cross-origin
// Permissions-Policy: camera=(), microphone=(), geolocation=()
// Strict-Transport-Security: max-age=31536000; includeSubDomains
// Content-Security-Policy: [configured for Supabase + OpenRouter + Meta]
```

Test headers at: https://securityheaders.com/?q=crm.marketing4effect.com

### Supabase Security

```bash
# Review RLS policies
npx supabase db diff

# Check for exposed functions
npx supabase functions list
```

---

## 11. Automated Update Monitoring

### GitHub Actions (CI/CD)

The project uses GitHub Actions for CI. Ensure workflows are current:

```bash
# Check workflow files
ls -la .github/workflows/

# Update action versions in workflow files
# e.g., actions/checkout@v4, actions/setup-node@v4
```

### Recommended Monitoring Setup

1. **Dependabot** (GitHub) — Automatic dependency PRs
2. **npm audit** — Run in CI pipeline
3. **Snyk** (optional) — Deep vulnerability scanning
4. **Vercel Deployment Notifications** — Slack/email alerts

### Monitoring Script

Create a script to check all component versions:

```bash
#!/bin/bash
# scripts/check-versions.sh
echo "=== M4E CRM Version Check ==="
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Next.js: $(npx next --version 2>/dev/null || node -e "console.log(require('next/package.json').version)")"
echo "TypeScript: $(npx tsc --version)"
echo "React: $(node -e "console.log(require('react/package.json').version)")"
echo "Supabase JS: $(node -e "console.log(require('@supabase/supabase-js/package.json').version)")"
echo ""
echo "=== Outdated Packages ==="
npm outdated 2>/dev/null || echo "All packages up to date"
echo ""
echo "=== Security Audit ==="
npm audit --audit-level=moderate 2>/dev/null || echo "No vulnerabilities found"
```

---

## 12. Rollback Procedures

### npm Package Rollback

```bash
# Restore previous lock file
git checkout HEAD~1 -- package-lock.json
npm install

# Or restore from backup
cp package-lock.json.bak package-lock.json
npm install
```

### Vercel Deployment Rollback

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

Or via CLI:

```bash
# List recent deployments
vercel ls

# Promote a specific deployment
vercel promote <deployment-url>
```

### Git Rollback

```bash
# Revert the update commit
git revert <commit-hash>
git push origin main

# Or hard reset (destructive — use with caution)
git reset --hard <last-good-commit>
git push --force origin main
```

### Database Rollback

See `BACKUP_AND_DISASTER_RECOVERY.md` for full database rollback procedures.

```bash
# Restore from backup
npx supabase db reset
psql -h <host> -U postgres -d postgres < backup-pre-update.sql
```

---

## 13. Update Schedule

### Recommended Cadence

| Task | Frequency | Day | Owner |
|------|-----------|-----|-------|
| `npm audit` | Weekly | Monday | Developer |
| Patch/minor updates | Bi-weekly | 1st & 15th | Developer |
| Dependabot PR review | Weekly | Wednesday | Developer |
| Major dependency updates | Monthly | Last Friday | Lead Developer |
| Node.js LTS updates | Semi-annually | April/October | DevOps |
| Next.js major updates | As released | — | Lead Developer |
| Security header review | Quarterly | Q start | Security |
| Full stack audit | Quarterly | Q start | Team |

### Monthly Update Procedure

```bash
# 1. Create update branch
git checkout -b update/$(date +%Y%m)-monthly

# 2. Update all safe dependencies
npm update

# 3. Check for major updates
npx npm-check-updates

# 4. Update specific major versions (after reviewing changelogs)
npx npm-check-updates -u --target minor  # Safe: minor + patch only
npm install

# 5. Full verification
npm run test        # 466 tests must pass
npm run typecheck   # Zero TypeScript errors
npm run build       # Clean production build
npm run lint        # No lint errors

# 6. Commit and create PR
git add -A
git commit -m "chore(deps): monthly dependency update $(date +%Y-%m)"
git push origin update/$(date +%Y%m)-monthly
# Create PR on GitHub, wait for CI, merge
```

---

## 14. Troubleshooting

### Common Issues After Updates

#### "Module not found" errors

```bash
# Clear all caches and reinstall
rm -rf node_modules .next package-lock.json
npm install
npm run build
```

#### TypeScript errors after update

```bash
# Check for type definition mismatches
npm install -D @types/node@latest @types/react@latest @types/react-dom@latest
npm run typecheck
```

#### Build failures on Vercel

1. Check Vercel build logs for specific errors
2. Ensure Node.js version matches between local and Vercel
3. Verify all environment variables are set
4. Try: `vercel build` locally to reproduce

#### Test failures after update

```bash
# Run specific failing test with verbose output
npx vitest run src/path/to/failing.test.ts --reporter=verbose

# Check for breaking API changes in test libraries
npm info @testing-library/react changelog
```

#### Supabase connection issues after update

```bash
# Verify Supabase client initialization
node -e "const { createClient } = require('@supabase/supabase-js'); console.log('OK');"

# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### Lock file conflicts

```bash
# Regenerate lock file
rm package-lock.json
npm install

# If merge conflicts in package-lock.json
git checkout --theirs package-lock.json
npm install
```

---

## Quick Reference Commands

```bash
# === Check Everything ===
npm outdated                    # Outdated packages
npm audit                       # Security vulnerabilities
npm run test                    # Run 466 tests
npm run typecheck               # TypeScript validation
npm run build                   # Production build
npm run lint                    # ESLint check

# === Update Everything (Safe) ===
npm update                      # Patch + minor within ranges
npm audit fix                   # Security fixes

# === Update Everything (Aggressive) ===
npx npm-check-updates -u        # Update package.json to latest
npm install                     # Install updated versions
npm run test && npm run build   # Verify

# === Nuclear Option (Clean Slate) ===
rm -rf node_modules .next package-lock.json
npm install
npm run build
```

---

*For database backup and disaster recovery procedures, see [BACKUP_AND_DISASTER_RECOVERY.md](./BACKUP_AND_DISASTER_RECOVERY.md).*  
*For environment variable documentation, see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md).*
