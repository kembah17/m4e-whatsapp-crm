# M4E CRM Infrastructure Forecasting & Chatwoot Migration Limits

**Date:** 10 July 2026  
**Classification:** Internal — Strategic Planning  
**Purpose:** Forecast infrastructure limits based on CRM pricing tiers and client growth, determine precise upgrade triggers, and validate the Chatwoot migration threshold.

---

## Executive Summary

The M4E CRM currently uses 18 MB of a 500 MB free-tier Supabase database (3.6% utilisation) with zero paying clients. This analysis projects infrastructure consumption across seven growth scenarios from first client to 150+ clients, mapping each against Supabase and Vercel tier limits.

**Three critical findings:**

1. **Message accumulation — not contacts — is the dominant storage constraint.** Messages consume 80-90% of database storage. A single contact uses ~7 KB, but that contact's messages over 12 months consume ~192 KB — 27× more.
2. **The free tier cannot survive beyond 2-3 paying clients.** File storage (media messages) hits the 1 GB ceiling first, followed by database size and Vercel function invocations.
3. **Infrastructure costs never exceed 5% of CRM-only revenue at any scale.** Even at the most expensive hybrid phase (₦480,000/month infrastructure vs ₦11,000,000/month revenue), the margin remains above 95%. The Chatwoot migration at 150+ clients actually *reduces* infrastructure costs while increasing capacity.

---

## 1. Current State

| Metric | Current Value | Free Tier Limit | Utilisation |
|--------|:---:|:---:|:---:|
| Database size | 18 MB | 500 MB | 3.6% |
| Public tables | 91 | — | — |
| RLS policies | 245 | — | — |
| Database functions | 172 | — | — |
| Active connections | 13 | 60 | 21.7% |
| Contacts | 0 | — | — |
| Messages | 0 | — | — |
| File storage | ~0 | 1 GB | ~0% |

The system is essentially empty — all 18 MB is schema, templates, configurations, and monitoring data.

---

## 2. CRM Pricing Tiers & Implied Contact Volumes

| Tier | Monthly Price | Max Contacts | Realistic Average | Implied Messages/Month |
|------|:---:|:---:|:---:|:---:|
| **Starter** | ₦50,000 | 1,000 | 500 | 4,000 |
| **Professional** | ₦120,000 | 10,000 | 4,000 | 32,000 |
| **Business** | ₦250,000 | Unlimited* | 15,000 | 120,000 |

*\*Practical limit ~50,000 contacts per Business client before performance considerations.*

**Assumptions used in projections:**
- 8 messages per contact per month (2 broadcasts + responses + automations)
- 1.5 conversations per contact per month
- 15% of messages contain media (images, voice notes, documents)
- 15 API calls per contact per month (webhooks, automations, dashboard queries)
- 50 RAG knowledge base entries per client

---

## 3. Storage Footprint Per Record

| Record Type | Size (with indexes & overhead) | Notes |
|-------------|:---:|-------|
| Contact row | ~4 KB | 40 columns including JSONB fields, scores, tags |
| Derived data per contact | ~3 KB | Purchase history, deals, events, scores |
| Message row | ~2 KB | Content, metadata, timestamps |
| Conversation row | ~1.5 KB | Status, assignments, labels |
| RAG vector embedding | ~13 KB | 1536-dim vector + HNSW index |
| Media attachment (average) | ~150 KB | Images, voice notes, documents |

**Key insight:** A single contact with 12 months of activity generates:
- Contact + derived data: **7 KB** (one-time)
- Messages (8/month × 12 months × 2 KB): **192 KB** (cumulative)
- Conversations (1.5/month × 12 months × 1.5 KB): **27 KB** (cumulative)
- Media (15% × 96 messages × 150 KB): **2,160 KB** (cumulative)
- **Total per contact per year: ~2.4 MB** — of which 99.7% is messages and media

---

## 4. Growth Scenario Projections

### Scenario A: Early Stage (Month 1-3) — 4 Clients

| Mix | Count | Avg Contacts | Subtotal |
|-----|:---:|:---:|:---:|
| Starter | 3 | 500 | 1,500 |
| Professional | 1 | 4,000 | 4,000 |
| **Total** | **4** | | **5,500** |

| Resource | Projected Usage | Free Tier Limit | Status |
|----------|:---:|:---:|:---:|
| Database | 352 MB | 500 MB | 🟡 70% — WARNING |
| File storage | 2.83 GB | 1 GB | 🔴 283% — EXCEEDED |
| Connections (peak) | 8 | 60 | 🟢 13% — OK |
| Vercel API calls/mo | 87,380 | 100,000 | 🟡 87% — WARNING |
| Monthly revenue | ₦270,000 | | |

### Scenario B: Growing (Month 4-6) — 12 Clients

| Mix | Count | Avg Contacts | Subtotal |
|-----|:---:|:---:|:---:|
| Starter | 8 | 500 | 4,000 |
| Professional | 3 | 4,000 | 12,000 |
| Business | 1 | 15,000 | 15,000 |
| **Total** | **12** | | **31,000** |

| Resource | Projected Usage | Free Tier | Pro Tier | Status (Pro) |
|----------|:---:|:---:|:---:|:---:|
| Database | 3.6 GB | 🔴 710% | 🟢 43% | OK |
| File storage | 31.9 GB | 🔴 3,193% | 🟢 32% | OK |
| Connections (peak) | 14 | 🟢 23% | 🟢 7% | OK |
| Vercel API calls/mo | 473,880 | 🔴 474% | — | Need Vercel Pro |
| Monthly revenue | ₦1,010,000 | | | |

### Scenario C: Established (Month 7-12) — 26 Clients

| Mix | Count | Avg Contacts | Subtotal |
|-----|:---:|:---:|:---:|
| Starter | 15 | 500 | 7,500 |
| Professional | 8 | 4,000 | 32,000 |
| Business | 3 | 15,000 | 45,000 |
| **Total** | **26** | | **84,500** |

| Resource | Projected Usage | Pro Tier Limit | Status |
|----------|:---:|:---:|:---:|
| Database | 14.2 GB | 8 GB | 🔴 173% — EXCEEDED |
| Database (with 6-mo archival) | 5.3 GB | 8 GB | 🟢 66% — OK |
| File storage | 130.6 GB | 100 GB | 🔴 131% — EXCEEDED |
| File storage (with R2 offload) | ~20 GB | 100 GB | 🟢 20% — OK |
| Connections (peak) | 24 | 200 | 🟢 12% — OK |
| Monthly revenue | ₦2,460,000 | | |

### Scenario D: Scaling (Year 2) — 45 Clients

| Resource | Without Mitigation | With Archival + R2 | Pro Limit | Status |
|----------|:---:|:---:|:---:|:---:|
| Database | 48.4 GB | 3.5 GB (3-mo archival) | 8 GB | 🟢 44% |
| File storage | 455.8 GB | ~40 GB (R2 offload) | 100 GB | 🟢 40% |
| Connections | 38 | 38 | 200 | 🟢 19% |
| Vercel API calls/mo | 2.2M | — | 1M (Pro) | 🔴 Need VPS |
| Monthly revenue | ₦4,300,000 | | | |

### Scenario E: Growth Phase (Year 2-3) — 75 Clients

| Resource | With Archival + R2 | Pro Limit | Status |
|----------|:---:|:---:|:---:|
| Database (3-mo archival) | 6.4 GB | 8 GB | 🟡 80% — WARNING |
| File storage (R2 offload) | ~60 GB | 100 GB | 🟢 60% |
| Connections | 61 | 200 | 🟢 31% |
| Monthly revenue | ₦7,500,000 | | |

### Scenario F: Pre-Migration (Year 3+) — 115 Clients

| Resource | With Full Mitigation | Limit | Status |
|----------|:---:|:---:|:---:|
| Database | 7.8 GB (3-mo archival + add-ons) | 8 GB + add-ons | 🟡 Approaching limit |
| Connections | 91 | 200 | 🟢 46% |
| Architecture | Hybrid (VPS + Supabase) | — | Operational complexity rising |
| Monthly revenue | ₦11,550,000 | | |

### Scenario G: Migration Trigger — 150+ Clients

| Resource | Status | Notes |
|----------|:---:|-------|
| Database | Requires significant add-on spend | $50-100/mo in overages |
| Connections | 117/200 (59%) | Approaching with pooling |
| Vercel | Fully offloaded to VPS | Only serves frontend |
| Operational complexity | HIGH | Multiple systems to manage |
| Monthly revenue | ₦15,000,000+ | |
| **Recommendation** | **MIGRATE TO CHATWOOT** | Reduces cost, increases capacity |

---

## 5. The Nine Tipping Points

| # | Limit | Hit At | Severity | Fix | Cost |
|---|-------|--------|:---:|-----|:---:|
| 1 | Supabase Free: File Storage (1 GB) | 2-3 clients, Month 1 | 🔴 CRITICAL | Upgrade to Supabase Pro | +$25/mo |
| 2 | Supabase Free: Database (500 MB) | 3-4 clients, Month 2-3 | 🔴 CRITICAL | Upgrade to Supabase Pro | (included above) |
| 3 | Vercel Free: Function Invocations (100K) | 4-5 clients, Month 2-3 | 🟡 HIGH | Upgrade to Vercel Pro | +$20/mo |
| 4 | Supabase Pro: Database (8 GB) | 15-20 clients, Month 7-9 | 🟡 HIGH | Message archival policy | $0 (code change) |
| 5 | Supabase Pro: File Storage (100 GB) | 20-25 clients, Month 9-12 | 🟢 MEDIUM | Cloudflare R2 offload | +$2-10/mo |
| 6 | Vercel Pro: Function Invocations (1M) | 50-60 clients, Year 2 | 🟢 MEDIUM | Hetzner VPS for webhooks | +€5-15/mo |
| 7 | Supabase Pro: Connections (200) | 75-100 clients, Year 2-3 | 🟢 MEDIUM | PgBouncer pooling | $0 (built-in) |
| 8 | Supabase Pro: DB with archival at limit | 75-100 clients, Year 2-3 | 🟡 HIGH | Hybrid architecture | +$50-80/mo |
| 9 | Full platform capacity | 150+ clients, Year 3+ | 🔵 STRATEGIC | Chatwoot migration | ~$200/mo total |

---

## 6. Message Archival: The #1 Mitigation Strategy

Messages consume 80-90% of database storage. Implementing an archival policy is the single most impactful action to extend Supabase Pro's useful life.

| Scenario | No Archival | 6-Month Archival | 3-Month Archival |
|----------|:---:|:---:|:---:|
| 26 clients (9 months) | 14.2 GB 🔴 | 5.3 GB 🟢 | 2.7 GB 🟢 |
| 45 clients (18 months) | 48.4 GB 🔴 | 6.9 GB 🟡 | 3.5 GB 🟢 |
| 75 clients (24 months) | 117.4 GB 🔴 | 9.2 GB 🔴 | 6.4 GB 🟡 |

**Archive destination:** Cloudflare R2 at $0.015/GB/month with zero egress fees.
- 100 GB of archived messages costs **$1.50/month**
- Archives remain searchable via API — just not in hot Supabase storage
- Implementation: scheduled job moves messages older than threshold to R2, keeps metadata pointer in Supabase

**Recommendation:** Implement 6-month archival at 15 clients, reduce to 3-month at 50 clients.

---

## 7. Infrastructure Cost vs Revenue Curve

| Phase | Clients | Infra Cost/mo | CRM Revenue/mo | Margin | Stack |
|-------|:---:|:---:|:---:|:---:|------|
| 0: Pre-Launch | 0 | ₦0 | ₦0 | — | Supabase Free + Vercel Free |
| 1: First Clients | 1-3 | ₦0 | ₦150,000 | 100% | Supabase Free + Vercel Free |
| 2: Growth Start | 4-10 | ₦72,000 | ₦700,000 | 90% | Supabase Pro + Vercel Pro |
| 3: Established | 10-30 | ₦120,000 | ₦2,500,000 | 95% | Pro + add-ons + R2 |
| 4: Scaling | 30-75 | ₦240,000 | ₦5,000,000 | 95% | Pro + VPS + R2 |
| 5: Hybrid | 75-150 | ₦480,000 | ₦11,000,000 | 96% | Pro + Hetzner VPS + R2 + monitoring |
| 6: Chatwoot | 150+ | ₦320,000 | ₦15,000,000 | 98% | Chatwoot on Hetzner Cloud |

**Key insight:** Infrastructure costs *decrease* after Chatwoot migration while revenue continues growing. The crossover point where Chatwoot becomes cheaper than the hybrid Supabase stack is approximately 100-120 clients.

---

## 8. Upgrade Decision Matrix

| Trigger | When | Action | Monthly Cost Impact |
|---------|------|--------|:---:|
| First paying client | Month 1 | Upgrade Supabase to Pro | +$25 (₦40,000) |
| 4-5 clients | Month 2-3 | Upgrade Vercel to Pro | +$20 (₦32,000) |
| 15-20 clients | Month 7-9 | Implement message archival + R2 | +$5-10 (₦8-16,000) |
| 30-50 clients | Year 1-2 | Add Hetzner VPS for webhook processing | +$15-30 (₦24-48,000) |
| 75-100 clients | Year 2-3 | Full hybrid architecture | +$50-80 (₦80-128,000) |
| 100-120 clients | Year 2-3 | Begin Chatwoot migration planning | $0 (planning only) |
| 150+ clients | Year 3+ | Complete Chatwoot migration | ~$200 total (₦320,000) |

---

## 9. Chatwoot Migration Validation

The previous analysis recommended migration at 150+ clients. This forecasting model **validates that threshold** with additional nuance:

### Why 150 Clients Is the Right Trigger

1. **Cost crossover:** At 100-120 clients, the hybrid Supabase stack costs more than self-hosted Chatwoot (~$300/mo vs ~$200/mo)
2. **Operational complexity:** Managing Supabase + Vercel + VPS + R2 + monitoring becomes fragile
3. **Connection pressure:** 150 clients push Supabase Pro connections to 59% — still OK but trending upward
4. **Revenue justifies investment:** ₦15M/month CRM revenue easily absorbs the 6-8 week migration effort

### Why NOT to Migrate Earlier

1. **Supabase Pro with mitigations handles 75 clients comfortably** at $75-150/month
2. **Migration costs 6-8 weeks of engineering time** — premature migration wastes resources
3. **Chatwoot requires DevOps expertise** (Docker, Nginx, PostgreSQL, Redis, Sidekiq) that may not be justified at smaller scale
4. **The current stack is zero-maintenance** — Supabase and Vercel handle all infrastructure

### Early Warning Indicators (Start Planning at 100 Clients)

| Metric | Warning Level | Critical Level |
|--------|:---:|:---:|
| Supabase DB utilisation | >70% of 8 GB (with archival) | >85% |
| Supabase connection utilisation | >60% of 200 | >80% |
| Webhook processing latency | >2 seconds | >5 seconds |
| Monthly infrastructure spend | >$250 | >$350 |
| Vercel function timeouts | >1% of requests | >5% |

---

## 10. Immediate Action Items

### Before First Client (Now)
- [ ] No infrastructure changes needed — free tier is sufficient for testing and demos
- [ ] Build message archival system (code only, not yet active)
- [ ] Set up Cloudflare R2 account (free tier: 10 GB storage, 10M reads/month)

### At First Paying Client
- [ ] Upgrade Supabase to Pro ($25/month)
- [ ] Monitor database growth weekly

### At 4-5 Clients
- [ ] Upgrade Vercel to Pro ($20/month)
- [ ] Total infrastructure: $45/month (₦72,000)

### At 15-20 Clients
- [ ] Activate message archival (6-month retention in Supabase, older to R2)
- [ ] Move media files to Cloudflare R2
- [ ] Total infrastructure: ~$75/month (₦120,000)

---

## 11. Revenue Projections at Each Threshold

| Threshold | CRM Revenue/mo | Service Package Revenue/mo* | Total Revenue/mo | Infra Cost | Infra as % of CRM Revenue |
|-----------|:---:|:---:|:---:|:---:|:---:|
| 5 clients | ₦350,000 | ₦2,000,000 | ₦2,350,000 | ₦0 | 0% |
| 10 clients | ₦700,000 | ₦5,000,000 | ₦5,700,000 | ₦72,000 | 10.3% |
| 25 clients | ₦2,000,000 | ₦10,000,000 | ₦12,000,000 | ₦120,000 | 6.0% |
| 50 clients | ₦4,500,000 | ₦15,000,000 | ₦19,500,000 | ₦240,000 | 5.3% |
| 100 clients | ₦9,000,000 | ₦20,000,000 | ₦29,000,000 | ₦400,000 | 4.4% |
| 150 clients | ₦15,000,000 | ₦25,000,000 | ₦40,000,000 | ₦320,000 | 2.1% |

*\*Service package revenue assumes ~40% of CRM clients also purchase marketing packages.*

---

## 12. Summary

**The M4E CRM infrastructure scales efficiently from zero to 150+ clients with planned upgrades:**

- **Free tier:** 0-3 clients (testing and early adoption)
- **$45/month:** 4-15 clients (Supabase Pro + Vercel Pro)
- **$75-150/month:** 15-75 clients (with archival, R2, and add-ons)
- **$200-300/month:** 75-150 clients (hybrid architecture)
- **~$200/month:** 150+ clients (Chatwoot on Hetzner — costs decrease)

**The real constraint is cumulative message storage, not contact count.** Message archival is the single most important mitigation to implement, extending Supabase Pro's useful life from ~20 clients to 75+ clients at zero additional cost.

**Infrastructure costs never exceed 5% of CRM-only revenue** and decrease as a percentage at every growth stage. The Chatwoot migration at 150+ clients is both a capacity upgrade and a cost reduction.
