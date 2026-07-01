# Backup and Disaster Recovery Plan

> **Last updated:** 2026-07-01  
> **Platform:** M4E WhatsApp CRM  
> **Infrastructure:** Vercel (hosting) + Supabase (database) + GitHub (code)

---

## Table of Contents

1. [Backup Architecture Overview](#backup-architecture-overview)
2. [Automatic Backups](#automatic-backups)
3. [Manual Backup Procedures](#manual-backup-procedures)
4. [Recovery Procedures](#recovery-procedures)
5. [Disaster Scenarios & Response](#disaster-scenarios--response)
6. [Recommended Backup Schedule](#recommended-backup-schedule)
7. [Testing & Verification](#testing--verification)

---

## Backup Architecture Overview

The M4E CRM platform has three independent backup layers:

```
┌─────────────────────────────────────────────────────────┐
│                    BACKUP LAYERS                         │
├─────────────────┬──────────────────┬────────────────────┤
│   CODE LAYER    │  DATABASE LAYER  │  DEPLOYMENT LAYER  │
│                 │                  │                    │
│  GitHub Repo    │  Supabase Auto   │  Vercel History    │
│  (kembah17/     │  Backups (daily) │  (deployment       │
│   m4e-whatsapp- │                  │   snapshots)       │
│   crm)          │  Point-in-Time   │                    │
│                 │  Recovery (Pro)  │  Instant Rollback  │
│  Branch History │                  │  to any previous   │
│  Tag Releases   │  Manual pg_dump  │  deployment        │
│  PR History     │  exports         │                    │
└─────────────────┴──────────────────┴────────────────────┘
```

---

## Automatic Backups

### 1. Supabase Database Backups

| Feature | Free Plan | Pro Plan ($25/mo) |
|---------|-----------|-------------------|
| Daily Backups | ✅ 7-day retention | ✅ 14-day retention |
| Point-in-Time Recovery | ❌ | ✅ Any point in last 7 days |
| Backup Frequency | Daily | Continuous WAL archiving |
| Backup Location | Supabase infrastructure | Supabase infrastructure |

**Current Plan:** Check Supabase dashboard → Settings → Billing

**What's backed up:**
- All tables (contacts, campaigns, messages, automations, flows, etc.)
- Row Level Security policies
- Database functions and triggers
- Stored procedures (RPC functions)
- Indexes and constraints

**What's NOT backed up automatically:**
- Supabase Storage files (uploaded media)
- Edge Functions (stored in Git)
- Auth configuration (stored in dashboard)

### 2. GitHub Repository

- **Repository:** `kembah17/m4e-whatsapp-crm`
- **Branch:** `main` (production)
- **Auto-deploy:** Vercel deploys on every push to `main`
- **History:** Full Git history of all code changes
- **Includes:** Source code, migrations, configuration, documentation

### 3. Vercel Deployment History

- **Every deployment** is preserved as an immutable snapshot
- **Instant rollback** to any previous deployment via Vercel dashboard
- **Preview deployments** for every PR/branch push
- **Build logs** retained for debugging

---

## Manual Backup Procedures

### Database Export (pg_dump)

For a complete database backup independent of Supabase:

```bash
# 1. Get connection string from Supabase Dashboard → Settings → Database
# Format: postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres

# 2. Full database dump (schema + data)
pg_dump "postgresql://postgres.[ref]:[password]@[host]:5432/postgres" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file=m4e_crm_backup_$(date +%Y%m%d_%H%M%S).dump

# 3. Schema-only dump (for migration reference)
pg_dump "postgresql://postgres.[ref]:[password]@[host]:5432/postgres" \
  --schema-only \
  --file=m4e_crm_schema_$(date +%Y%m%d).sql

# 4. Data-only dump (for data migration)
pg_dump "postgresql://postgres.[ref]:[password]@[host]:5432/postgres" \
  --data-only \
  --file=m4e_crm_data_$(date +%Y%m%d).sql
```

### Supabase CLI Backup

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref bxryvqxrcujrqipvcjoa

# Dump schema
supabase db dump --file=schema_backup.sql

# Dump data
supabase db dump --data-only --file=data_backup.sql
```

### Code Repository Backup

```bash
# Clone with full history
git clone --mirror https://github.com/kembah17/m4e-whatsapp-crm.git

# Create compressed archive
tar -czf m4e_crm_code_$(date +%Y%m%d).tar.gz m4e-whatsapp-crm.git/
```

### Environment Variables Backup

```bash
# Export from Vercel (requires Vercel CLI)
vercel env pull .env.backup

# Or manually document from Vercel Dashboard → Settings → Environment Variables
# Store securely (encrypted) — NEVER commit to Git
```

---

## Recovery Procedures

### Scenario 1: Deployment Failure (Bad Code Push)

**Severity:** Low | **Recovery Time:** < 5 minutes

1. Go to [Vercel Dashboard](https://vercel.com) → Project → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"
4. Verify the site is working
5. Fix the code issue in a branch, test, then merge

### Scenario 2: Database Data Loss (Accidental Deletion)

**Severity:** Medium | **Recovery Time:** 15-60 minutes

#### Option A: Supabase Dashboard Restore (Pro Plan)
1. Go to Supabase Dashboard → Database → Backups
2. Select the backup point before the data loss
3. Click "Restore" (this replaces the current database)
4. Verify data integrity

#### Option B: Point-in-Time Recovery (Pro Plan)
1. Go to Supabase Dashboard → Database → Backups → PITR
2. Select the exact timestamp before the incident
3. Restore to that point
4. Verify data integrity

#### Option C: Manual Restore from pg_dump
```bash
# Restore from custom format dump
pg_restore --clean --if-exists \
  --dbname="postgresql://postgres.[ref]:[password]@[host]:5432/postgres" \
  m4e_crm_backup_YYYYMMDD_HHMMSS.dump
```

### Scenario 3: Supabase Project Unavailable

**Severity:** High | **Recovery Time:** 1-4 hours

1. Check [Supabase Status](https://status.supabase.com/) for outages
2. If prolonged outage:
   a. Create new Supabase project
   b. Apply all migrations: `supabase db push`
   c. Restore data from latest pg_dump backup
   d. Update environment variables in Vercel with new credentials
   e. Redeploy: `vercel --prod`
   f. Update DNS if project URL changed

### Scenario 4: GitHub Repository Loss

**Severity:** Medium | **Recovery Time:** 30 minutes

1. Restore from local clone or mirror backup
2. Create new repository if needed
3. Push code: `git push --mirror https://github.com/kembah17/m4e-whatsapp-crm.git`
4. Update Vercel Git integration to point to new repo
5. Verify auto-deploy works

### Scenario 5: Vercel Account Issues

**Severity:** Medium | **Recovery Time:** 1-2 hours

1. Code is safe in GitHub
2. Database is safe in Supabase
3. Deploy to alternative platform:
   ```bash
   # Option A: Deploy to another Vercel account
   vercel --prod

   # Option B: Deploy to Netlify
   netlify deploy --prod

   # Option C: Self-host with Docker
   docker build -t m4e-crm .
   docker run -p 3000:3000 m4e-crm
   ```
4. Update DNS records to point to new deployment

### Scenario 6: Complete Infrastructure Failure

**Severity:** Critical | **Recovery Time:** 2-6 hours

1. **Code:** Restore from GitHub or local mirror backup
2. **Database:** Create new Supabase project, apply migrations, restore from pg_dump
3. **Hosting:** Deploy to Vercel (or alternative) from restored code
4. **Environment:** Restore environment variables from encrypted backup
5. **DNS:** Update `crm.marketing4effect.com` CNAME to new deployment
6. **Verify:** Test all critical flows (login, messaging, campaigns)

---

## Disaster Scenarios & Response

| Scenario | Probability | Impact | Recovery Time | Mitigation |
|----------|------------|--------|---------------|------------|
| Bad code deploy | High | Low | < 5 min | Vercel instant rollback |
| Accidental data deletion | Medium | Medium | 15-60 min | Supabase daily backups |
| Supabase outage | Low | High | 1-4 hours | Manual pg_dump backups |
| GitHub outage | Very Low | Low | Minutes | Local clones exist |
| Vercel outage | Very Low | Medium | 1-2 hours | Can deploy elsewhere |
| Complete failure | Extremely Low | Critical | 2-6 hours | All three layers independent |
| Data breach | Low | Critical | Varies | RLS, encryption, audit logs |

---

## Recommended Backup Schedule

### Daily (Automatic)
- ✅ Supabase automatic database backup
- ✅ GitHub preserves all code pushes
- ✅ Vercel preserves all deployments

### Weekly (Manual)
- [ ] Export database via pg_dump to secure storage
- [ ] Verify Supabase backup status in dashboard
- [ ] Review Vercel deployment history

### Monthly (Manual)
- [ ] Full database export (schema + data) to encrypted external storage
- [ ] Git mirror backup to secondary location
- [ ] Environment variables backup (encrypted)
- [ ] Test restore procedure with a staging environment
- [ ] Review and update this document

### Quarterly (Manual)
- [ ] Full disaster recovery drill
- [ ] Restore database to staging from backup
- [ ] Deploy code to staging from Git backup
- [ ] Verify all integrations work (WhatsApp, Brevo, OpenRouter)
- [ ] Update recovery time estimates based on drill results

---

## Testing & Verification

### Backup Verification Checklist

```markdown
- [ ] Supabase dashboard shows recent backup (< 24 hours)
- [ ] pg_dump export completes without errors
- [ ] Export file size is reasonable (growing over time)
- [ ] GitHub repo is accessible and up-to-date
- [ ] Vercel shows recent successful deployment
- [ ] Environment variables are documented and backed up
```

### Recovery Test Procedure

1. Create a staging Supabase project
2. Restore latest backup to staging
3. Deploy code to Vercel preview
4. Point preview at staging database
5. Verify:
   - [ ] Login works
   - [ ] Contacts load correctly
   - [ ] Campaign data is intact
   - [ ] WhatsApp configuration preserved
   - [ ] Automation rules intact
   - [ ] AI chatbot configuration preserved
6. Document any issues and update procedures

---

## Emergency Contacts

| Service | Status Page | Support |
|---------|------------|--------|
| Supabase | [status.supabase.com](https://status.supabase.com) | support@supabase.io |
| Vercel | [vercel-status.com](https://www.vercel-status.com) | support@vercel.com |
| GitHub | [githubstatus.com](https://www.githubstatus.com) | support@github.com |
| Bluehost (DNS) | [bluehost.com/help](https://www.bluehost.com/help) | 888-401-4678 |

---

## Revision History

| Date | Version | Changes |
|------|---------|--------|
| 2026-07-01 | 1.0 | Initial backup and disaster recovery plan |
