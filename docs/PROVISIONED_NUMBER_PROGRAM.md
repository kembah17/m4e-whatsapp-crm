# M4E Provisioned Number Program

## Design Document v1.0

**Author:** Marketing4Effect (M4E)  
**Date:** June 2025  
**Status:** Draft — Awaiting Approval  
**Classification:** Internal Strategy Document — Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Program Concept](#3-program-concept)
4. [Technical Architecture](#4-technical-architecture)
5. [Pricing Model](#5-pricing-model)
6. [Client Onboarding Process](#6-client-onboarding-process)
7. [Display Name Strategy](#7-display-name-strategy)
8. [Multi-Number CRM Architecture](#8-multi-number-crm-architecture)
9. [SIM Procurement Strategy](#9-sim-procurement-strategy)
10. [Scaling Plan](#10-scaling-plan)
11. [Risk Management](#11-risk-management)
12. [Strategic Moat Analysis](#12-strategic-moat-analysis)
13. [Operational Procedures](#13-operational-procedures)
14. [Financial Projections](#14-financial-projections)
15. [Implementation Roadmap](#15-implementation-roadmap)

---

## 1. Executive Summary

The M4E Provisioned Number Program solves a critical adoption barrier: **Nigerian SME owners are reluctant to hand over access to their personal WhatsApp Business number** for CRM integration. This reluctance stems from legitimate concerns about privacy, business continuity, and the deeply personal nature of WhatsApp in Nigerian business culture.

M4E's solution is to **provision dedicated WhatsApp Business API numbers** for clients, registered under M4E's WhatsApp Business Account (WABA). Each client receives a dedicated phone number that functions as their business's professional WhatsApp line, fully integrated with the M4E CRM from day one.

### Key Benefits

| Stakeholder | Benefit |
|---|---|
| **Client** | Professional WhatsApp presence without risking personal number; instant CRM integration; no technical setup required |
| **M4E** | Eliminates #1 onboarding objection; creates switching costs; generates recurring revenue; enables full automation control |
| **End Customer** | Consistent, professional communication experience; faster response times via automation |

### Program Metrics (Target Year 1)

| Metric | Target |
|---|---|
| Numbers provisioned | 50 |
| Monthly recurring revenue per number | ₦15,000–₦25,000 |
| Client retention rate | 90%+ |
| Average conversations per number/month | 500–2,000 |

---

## 2. Problem Statement

### The Adoption Barrier

During client onboarding for the M4E CRM and Database Reactivation service, the most common objection is:

> *"I don't want to give you access to my WhatsApp. That's my personal business line. What if something goes wrong?"*

This objection is rooted in several legitimate concerns:

1. **Privacy** — Nigerian business owners use WhatsApp for both personal and business communication. Granting API access feels like exposing private conversations.

2. **Fear of Disruption** — Connecting to the WhatsApp Business API requires migrating from the WhatsApp Business App, which means:
   - Losing access to the familiar WhatsApp Business App interface
   - Risk of message history loss during migration
   - Unfamiliar new workflow through the CRM

3. **Trust Gap** — Many SME owners have been burned by service providers who misused access or caused disruptions. The trust threshold for WhatsApp access is extremely high.

4. **Technical Anxiety** — The concept of API integration is foreign to most Nigerian SME owners. They fear "breaking" their WhatsApp.

5. **Single Point of Failure** — If the client's only WhatsApp number is connected to the CRM and something goes wrong, their entire customer communication channel is disrupted.

### Market Context

- **93% of Nigerian internet users** use WhatsApp (DataReportal 2024)
- WhatsApp is the **primary business communication channel** for 70%+ of Nigerian SMEs
- Most Nigerian SMEs operate with a **single WhatsApp Business number** that handles all customer communication
- The WhatsApp Business App is free; the Business API requires a provider and costs money — a significant mental shift for cost-conscious SME owners

### Impact on M4E Business

Without solving this objection:
- **40–60% of qualified leads** stall at the WhatsApp integration step
- Database Reactivation campaigns lose their most effective channel (WhatsApp has 98% open rates vs 20% for email)
- CRM value proposition is significantly weakened (WhatsApp is the core channel)
- Competitors who solve this problem first will capture the market

---

## 3. Program Concept

### How It Works

M4E provisions a **dedicated WhatsApp Business API number** for each client:

```
┌─────────────────────────────────────────────────────┐
│                  M4E WABA (Master Account)           │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Client A │  │ Client B │  │ Client C │  ...      │
│  │ +234 XXX │  │ +234 YYY │  │ +234 ZZZ │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │              │              │                 │
│       ▼              ▼              ▼                 │
│  ┌──────────────────────────────────────────┐        │
│  │         Meta WhatsApp Business API        │        │
│  └──────────────────┬───────────────────────┘        │
└─────────────────────┼────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │   M4E CRM     │
              │  (Per-Account  │
              │   Routing)     │
              └───────────────┘
```

### Client Experience

1. Client signs up for M4E CRM + Database Reactivation
2. M4E provisions a new Nigerian mobile number
3. Number is registered on Meta's WhatsApp Business API under M4E's WABA
4. Display name is set to the client's business name
5. Number is configured in the client's M4E CRM account
6. Client's customers see messages from "[Business Name]" on WhatsApp
7. Client manages all conversations through the M4E CRM dashboard
8. Client's personal WhatsApp remains completely untouched

### What the Client Gets

- ✅ Dedicated WhatsApp Business number for their business
- ✅ Professional display name with green tick (after verification)
- ✅ Full CRM integration from day one
- ✅ Automated reactivation campaigns via WhatsApp
- ✅ Message templates pre-approved for their industry
- ✅ Real-time conversation management in CRM
- ✅ Personal WhatsApp remains private and unaffected

### What M4E Manages

- SIM card procurement and registration
- WhatsApp Business API registration
- Number verification and display name approval
- Template submission and approval management
- Ongoing number health monitoring
- Backup number provisioning
- Compliance with Meta's policies

---

## 4. Technical Architecture

### 4.1 WhatsApp Business API Setup

#### WABA Structure

```
M4E Business Manager (Meta)
└── WhatsApp Business Account (WABA)
    ├── Phone Number 1 → Client A CRM Account
    ├── Phone Number 2 → Client B CRM Account
    ├── Phone Number 3 → Client C CRM Account
    └── ... (up to 20 numbers per WABA, expandable)
```

#### Registration Flow

1. **SIM Activation** — Activate new Nigerian SIM card
2. **Number Verification** — Receive OTP via SMS on the SIM
3. **API Registration** — Register number via Meta's Cloud API or BSP
4. **Display Name** — Submit business display name for approval
5. **Template Approval** — Submit message templates for pre-approval
6. **CRM Configuration** — Configure number in client's M4E CRM account
7. **Webhook Routing** — Set up webhook to route messages to correct CRM account

#### API Provider Options

| Provider | Type | Cost | Pros | Cons |
|---|---|---|---|---|
| **Meta Cloud API** (Direct) | Direct | Free (conversation fees only) | No middleware cost; direct control | Requires technical setup; webhook management |
| **360dialog** | BSP | €5/number/month + conversations | Reliable; good support | Monthly per-number fee |
| **Twilio** | BSP | $0.005/message + conversations | Well-documented; scalable | Expensive at volume |
| **MessageBird** | BSP | Custom pricing | Multi-channel | Complex pricing |

**Recommended:** Meta Cloud API (Direct) for cost efficiency. M4E already has the technical capability to manage webhooks and API integration through the CRM.

### 4.2 Webhook Architecture

All provisioned numbers share a single WABA, so Meta sends all webhooks to one endpoint. The CRM must route messages to the correct account:

```
Meta Webhook → M4E CRM API
                    │
                    ├── Extract phone_number_id from webhook payload
                    ├── Look up account_id from whatsapp_config table
                    │   (WHERE phone_number_id = webhook.phone_number_id)
                    ├── Route message to correct account's conversation
                    └── Trigger account-specific automations
```

#### Current CRM Support

The M4E CRM already supports per-account WhatsApp configuration via the `whatsapp_config` table:

```sql
-- Existing schema (already supports multi-number)
CREATE TABLE whatsapp_config (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  phone_number_id TEXT,        -- Meta's phone number ID
  waba_id TEXT,                -- WhatsApp Business Account ID
  access_token TEXT,           -- Encrypted API token
  display_phone TEXT,          -- Human-readable number
  webhook_verify_token TEXT,
  is_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

For provisioned numbers, all entries share the same `waba_id` and `access_token` (M4E's master token), but each has a unique `phone_number_id` and `display_phone`.

### 4.3 Message Routing Logic

```typescript
// Webhook handler pseudocode
async function handleWhatsAppWebhook(payload: WebhookPayload) {
  const phoneNumberId = payload.entry[0].changes[0].value.metadata.phone_number_id;
  
  // Look up which CRM account owns this number
  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('account_id')
    .eq('phone_number_id', phoneNumberId)
    .single();
  
  if (!config) {
    console.error(`No account found for phone_number_id: ${phoneNumberId}`);
    return;
  }
  
  // Route to correct account
  await processInboundMessage(config.account_id, payload);
}
```

### 4.4 Number-to-Account Mapping

New table for tracking provisioned numbers:

```sql
CREATE TABLE provisioned_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  phone_number TEXT NOT NULL,           -- +234XXXXXXXXXX
  phone_number_id TEXT,                 -- Meta's phone_number_id (set after registration)
  sim_provider TEXT NOT NULL,           -- 'mtn', 'airtel', 'glo', '9mobile'
  sim_iccid TEXT,                       -- SIM card ICCID for tracking
  display_name TEXT,                    -- Approved WhatsApp display name
  display_name_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  registration_status TEXT DEFAULT 'sim_active', 
    -- 'sim_active', 'api_registered', 'verified', 'templates_approved', 'live'
  quality_rating TEXT DEFAULT 'green',  -- 'green', 'yellow', 'red'
  messaging_limit TEXT DEFAULT 'tier_1', -- 'tier_1' (250), 'tier_2' (1K), 'tier_3' (10K), 'tier_4' (100K)
  is_backup BOOLEAN DEFAULT false,      -- Backup number for this account
  provisioned_at TIMESTAMPTZ DEFAULT now(),
  activated_at TIMESTAMPTZ,             -- When number went live
  deactivated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_provisioned_numbers_account ON provisioned_numbers(account_id);
CREATE INDEX idx_provisioned_numbers_phone ON provisioned_numbers(phone_number);
CREATE UNIQUE INDEX idx_provisioned_numbers_phone_number_id ON provisioned_numbers(phone_number_id) WHERE phone_number_id IS NOT NULL;
```

---

## 5. Pricing Model

### 5.1 Fee Structure

| Fee Component | Amount | Frequency | Notes |
|---|---|---|---|
| **SIM Procurement** | ₦2,000–₦5,000 | One-time | Covers SIM purchase + registration |
| **Setup & Registration** | ₦25,000 | One-time | API registration, display name approval, template setup |
| **Monthly Management** | ₦15,000 | Monthly | Number monitoring, health management, template management |
| **WhatsApp Conversations** | Pass-through + 15% | Monthly | Meta's conversation fees + M4E margin |
| **Backup Number** (optional) | ₦10,000 | One-time setup | Pre-provisioned backup if primary is banned |

### 5.2 WhatsApp Conversation Costs (Meta Pricing — Nigeria)

| Conversation Type | Meta Cost (NGN) | M4E Pass-Through | Client Pays |
|---|---|---|---|
| **Marketing** | ~₦85 | +15% markup | ~₦98 |
| **Utility** | ~₦25 | +15% markup | ~₦29 |
| **Authentication** | ~₦20 | +15% markup | ~₦23 |
| **Service** (customer-initiated) | Free (first 1,000/month) | Free | Free |

*Note: Meta pricing changes periodically. Rates shown are approximate as of mid-2025.*

### 5.3 Bundled Packages

#### Starter Package — ₦45,000 setup + ₦15,000/month
- 1 provisioned number
- Up to 250 marketing conversations/month included
- Standard display name
- 3 pre-approved templates
- Email support

#### Growth Package — ₦60,000 setup + ₦25,000/month
- 1 provisioned number + 1 backup
- Up to 1,000 marketing conversations/month included
- Verified display name (green tick application)
- 10 pre-approved templates
- Priority support
- Monthly number health report

#### Enterprise Package — Custom pricing
- Multiple provisioned numbers
- Unlimited conversations (pass-through pricing)
- Dedicated account manager
- Custom template development
- SLA guarantees
- Quarterly strategy reviews

### 5.4 Cost Comparison for Client

| Approach | Setup Cost | Monthly Cost | Risk | CRM Integration |
|---|---|---|---|---|
| **Client's own number** | Free | Conversation fees only | High (personal number exposed) | Client must configure |
| **M4E Provisioned** | ₦25,000–₦60,000 | ₦15,000–₦25,000 + conversations | Low (dedicated number) | Pre-configured |
| **Client gets own API** | ₦50,000–₦200,000 (BSP setup) | BSP fees + conversations | Medium | Client must configure |

**Value proposition:** For less than the cost of a junior employee's monthly salary, the client gets a fully managed, professionally configured WhatsApp Business presence.

---

## 6. Client Onboarding Process

### Step-by-Step Provisioning

```
Day 0: Client signs service agreement
  │
  ▼
Day 1: SIM procurement
  │  - Purchase SIM from preferred carrier
  │  - Register SIM with NCC-compliant KYC
  │  - Activate and verify SIM receives SMS
  │
  ▼
Day 2-3: WhatsApp API registration
  │  - Add phone number to M4E's WABA in Meta Business Manager
  │  - Complete OTP verification via SMS
  │  - Submit display name for approval
  │  - Submit initial message templates
  │
  ▼
Day 3-7: Approval waiting period
  │  - Display name review (24-72 hours)
  │  - Template review (24-48 hours per template)
  │  - If rejected: revise and resubmit
  │
  ▼
Day 7-8: CRM configuration
  │  - Create/configure client's CRM account
  │  - Link provisioned number to account
  │  - Configure webhook routing
  │  - Set up automation workflows
  │  - Import client's contact database
  │
  ▼
Day 8-9: Testing
  │  - Send test messages to M4E team numbers
  │  - Verify inbound message routing
  │  - Test automation triggers
  │  - Verify template rendering
  │
  ▼
Day 10: Go-live
  │  - Client training session (30 min video call)
  │  - Provide client with CRM login credentials
  │  - Share new WhatsApp number for client to distribute
  │  - Launch initial reactivation campaign
  │
  ▼
Day 14: First check-in
     - Review first week metrics
     - Address any issues
     - Optimise templates based on performance
```

### Client Requirements

| Requirement | Purpose | Format |
|---|---|---|
| Business name (as registered) | Display name approval | Text |
| Business category | Meta verification | Selection |
| Business website or social media | Meta verification | URL |
| Business address | Meta verification | Text |
| Contact database | CRM import | CSV |
| Logo (high-res) | WhatsApp profile photo | PNG/JPG, min 640×640 |
| Signed service agreement | Legal | PDF |
| Payment for setup fee | Activation | Bank transfer |

### Onboarding Checklist

- [ ] Service agreement signed
- [ ] Setup fee received
- [ ] SIM purchased and activated
- [ ] SIM registered (NCC KYC compliant)
- [ ] Number added to M4E WABA
- [ ] OTP verification completed
- [ ] Display name submitted
- [ ] Display name approved
- [ ] Profile photo uploaded
- [ ] Business description set
- [ ] Message templates submitted
- [ ] Templates approved
- [ ] CRM account created
- [ ] Number linked to CRM account
- [ ] Webhook routing verified
- [ ] Contact database imported
- [ ] Automations configured
- [ ] Test messages sent and received
- [ ] Client training completed
- [ ] Go-live confirmed
- [ ] First campaign launched

---

## 7. Display Name Strategy

### Naming Convention

Meta requires WhatsApp Business API display names to follow specific guidelines. Our strategy:

#### Primary Format
```
[Client Business Name]
```
Example: `Mama Nkechi Catering`, `TechFix Lagos`, `Dr. Obi Dental Clinic`

#### If Primary is Rejected (common reasons: too generic, already taken)
```
[Client Business Name] — [Location/Specialty]
```
Example: `Mama Nkechi Catering — Lekki`, `TechFix — Phone Repairs Lagos`

#### M4E Branding (Optional — Client's Choice)
```
[Client Business Name] via M4E
```
Example: `Mama Nkechi Catering via M4E`

**Recommendation:** Do NOT include M4E branding by default. The number should feel like the client's own business line. M4E branding is only added if the client specifically requests it or if it helps with Meta's display name approval.

### Display Name Approval Tips

1. **Use the exact registered business name** — Meta cross-references with business registration
2. **Avoid generic names** — "Lagos Restaurant" will be rejected; "Mama Nkechi's Kitchen" won't
3. **Include location if needed** — Helps differentiate common names
4. **No promotional language** — "Best Prices Lagos" will be rejected
5. **Consistent with online presence** — Name should match website/social media
6. **Apply for Official Business Account** (green tick) for Growth/Enterprise clients

### Green Tick Verification

For Growth and Enterprise package clients, M4E will apply for Meta's Official Business Account verification (green tick):

**Requirements:**
- Registered business with CAC (Corporate Affairs Commission)
- Active website with matching business name
- Consistent social media presence
- Minimum 2-factor authentication on Meta Business Manager
- No policy violations on the WABA

**Timeline:** 2–4 weeks after application

---

## 8. Multi-Number CRM Architecture

### Current CRM Design

The M4E CRM already supports per-account WhatsApp configuration. Each CRM account has its own:
- `whatsapp_config` record with unique `phone_number_id`
- Separate conversation threads
- Independent automation workflows
- Isolated contact database

### How Provisioned Numbers Fit

Provisioned numbers are configured identically to client-owned numbers in the CRM. The only difference is operational:

| Aspect | Client-Owned Number | M4E Provisioned Number |
|---|---|---|
| **WABA** | Client's own (or BSP) | M4E's master WABA |
| **Access Token** | Client's token | M4E's master token |
| **phone_number_id** | Unique per number | Unique per number |
| **CRM Configuration** | Client configures | M4E pre-configures |
| **Template Management** | Client submits | M4E submits on behalf |
| **Billing** | Client pays Meta directly | M4E bills client (pass-through + margin) |
| **Number Ownership** | Client owns SIM | M4E owns SIM |

### Webhook Routing for Multi-Number WABA

Since all provisioned numbers are under M4E's single WABA, the webhook endpoint receives messages for ALL numbers. The routing logic:

```typescript
// Enhanced webhook handler for multi-number WABA
async function handleWebhook(req: Request) {
  const payload = await req.json();
  
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const phoneNumberId = change.value.metadata.phone_number_id;
      const displayPhone = change.value.metadata.display_phone_number;
      
      // Route to correct account
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('account_id')
        .eq('phone_number_id', phoneNumberId)
        .single();
      
      if (!config) {
        // Unknown number — log for investigation
        await logUnroutedMessage(phoneNumberId, displayPhone, change);
        continue;
      }
      
      // Process in account context
      await processMessage(config.account_id, change);
    }
  }
}
```

### Template Management

Message templates are managed at the WABA level, not per-number. This means:

- **All provisioned numbers share the same template library**
- Templates must be generic enough to work across clients OR use template variables for personalisation
- M4E manages template submissions centrally
- Client-specific templates use variables: `{{business_name}}`, `{{offer_details}}`, etc.

#### Template Naming Convention
```
m4e_{client_slug}_{purpose}_{version}
```
Examples:
- `m4e_mama_nkechi_reactivation_v1`
- `m4e_techfix_appointment_reminder_v1`
- `m4e_generic_satisfaction_check_v1` (shared across clients)

---

## 9. SIM Procurement Strategy

### Nigerian Carrier Options

| Carrier | Corporate Plans | Bulk SIM | Monthly Cost | Coverage | Recommendation |
|---|---|---|---|---|---|
| **MTN Nigeria** | MTN Business Hub | Yes (10+ SIMs) | ₦1,000–₦3,000 | Best nationwide | ✅ Primary |
| **Airtel Nigeria** | Airtel Business | Yes (5+ SIMs) | ₦800–₦2,500 | Strong urban | ✅ Secondary |
| **Glo** | Glo Business | Yes | ₦500–₦1,500 | Good in South | Backup |
| **9mobile** | 9mobile Enterprise | Limited | ₦1,000–₦2,000 | Limited | Not recommended |

### Procurement Process

#### Phase 1: Initial Stock (5 Numbers)
1. Purchase 5 MTN SIMs from MTN Business Hub
2. Register all SIMs under M4E's business registration (CAC)
3. Activate with minimum data plans
4. Store SIM details in secure inventory system

#### Phase 2: Growth Stock (10–20 Numbers)
1. Establish corporate account with MTN Business
2. Negotiate bulk SIM pricing
3. Set up auto-renewal for data plans
4. Add Airtel as secondary carrier for redundancy

#### Phase 3: Scale Stock (50+ Numbers)
1. Dedicated account manager at MTN/Airtel
2. Custom corporate plan with volume discounts
3. Automated SIM management system
4. Multi-carrier strategy for resilience

### SIM Registration Requirements (NCC Compliance)

- Valid business registration (CAC certificate)
- Director's valid ID (NIN, International Passport, or Driver's License)
- Proof of business address (utility bill or bank statement)
- Passport photographs
- Completed registration form per carrier

**Important:** All SIMs must be registered under M4E's business entity, not personal names. This ensures:
- Legal compliance with NCC regulations
- Business continuity if staff changes
- Centralised management and billing

### SIM Inventory Management

Maintain a secure spreadsheet/database tracking:

| Field | Purpose |
|---|---|
| Phone number | The +234 number |
| Carrier | MTN/Airtel/Glo |
| ICCID | SIM card identifier |
| PUK | For SIM unlock if needed |
| Registration date | NCC compliance |
| Data plan | Current plan and renewal date |
| Assigned client | Which CRM account |
| Status | Available / Active / Suspended / Deactivated |
| WhatsApp status | Not registered / Registered / Verified / Live |
| Notes | Any issues or special configuration |

---

## 10. Scaling Plan

### Phase 1: Pilot (Months 1–3) — 5 Numbers

**Objective:** Validate the model with early adopter clients.

| Activity | Timeline | Success Metric |
|---|---|---|
| Procure 5 SIMs | Week 1 | 5 SIMs activated |
| Register on WABA | Week 2 | 5 numbers API-ready |
| Onboard 3–5 pilot clients | Weeks 3–8 | 3+ clients live |
| Gather feedback | Weeks 8–12 | NPS > 8 |
| Document processes | Ongoing | SOPs complete |

**Investment:** ~₦200,000 (SIMs + setup time)
**Expected Revenue:** ₦45,000–₦75,000/month

### Phase 2: Growth (Months 4–9) — 20 Numbers

**Objective:** Standardise operations and grow client base.

| Activity | Timeline | Success Metric |
|---|---|---|
| Procure 15 additional SIMs | Month 4 | 20 SIMs in inventory |
| Hire part-time number manager | Month 4 | Dedicated resource |
| Onboard 10–15 new clients | Months 4–9 | 15+ clients live |
| Implement monitoring dashboard | Month 5 | Real-time number health |
| Establish carrier relationships | Month 6 | Corporate accounts active |

**Investment:** ~₦500,000 (SIMs + tooling + part-time staff)
**Expected Revenue:** ₦300,000–₦500,000/month

### Phase 3: Scale (Months 10–18) — 50 Numbers

**Objective:** Achieve operational efficiency at scale.

| Activity | Timeline | Success Metric |
|---|---|---|
| Procure 30 additional SIMs | Month 10 | 50 SIMs in inventory |
| Automate provisioning workflow | Month 11 | < 48hr provisioning time |
| Multi-WABA setup (if needed) | Month 12 | Capacity for 100+ numbers |
| Full-time number operations | Month 12 | Dedicated team member |
| Self-service client portal | Month 15 | Clients can view number stats |

**Investment:** ~₦1,500,000 (SIMs + automation + staff)
**Expected Revenue:** ₦750,000–₦1,250,000/month

### Phase 4: Enterprise (Months 18+) — 500 Numbers

**Objective:** Become the leading WhatsApp provisioning service for Nigerian SMEs.

- Multiple WABAs for capacity
- Automated SIM procurement pipeline
- Self-service provisioning portal
- Reseller/partner program
- Multi-country expansion (Ghana, Kenya)

---

## 11. Risk Management

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Number banned by Meta** | Medium | High | Backup numbers; strict template compliance; quality monitoring |
| **SIM deactivation by carrier** | Low | High | Keep SIMs active with minimum usage; auto-renewal plans |
| **Meta policy changes** | Medium | Medium | Diversify to Evolution API (unofficial) as backup; stay compliant |
| **Client misuse (spam)** | Medium | High | Rate limiting; content review; clear ToS; auto-suspend on violations |
| **NCC regulation changes** | Low | Medium | Legal counsel; compliance monitoring; registered under business entity |
| **WABA-level ban** | Very Low | Critical | Multiple WABAs; strict compliance; appeal process documented |
| **Client churn** | Medium | Medium | Number recycling process; 30-day data retention; re-provisioning SOP |
| **Carrier network issues** | Low | Low | Multi-carrier strategy; backup numbers on different carriers |

### Number Ban Prevention

1. **Quality Rating Monitoring** — Check quality rating daily via Meta API
2. **Template Compliance** — All templates reviewed before submission
3. **Rate Limiting** — Enforce sending limits per number:
   - New numbers: max 250 conversations/24hrs
   - Established numbers: max 1,000 conversations/24hrs
   - Tier 3+: max 10,000 conversations/24hrs
4. **Content Review** — Automated scanning for spam indicators
5. **Opt-out Compliance** — Immediate unsubscribe processing
6. **Warm-up Protocol** — New numbers start with low volume, gradually increase

### Number Ban Recovery

If a number is banned:

1. **Immediate:** Switch client to backup number (if provisioned)
2. **Day 1:** File appeal with Meta via Business Manager
3. **Day 1–3:** Investigate cause (template violation, spam reports, etc.)
4. **Day 3–7:** If appeal fails, provision new number from inventory
5. **Day 7–10:** Migrate client to new number, update all configurations
6. **Post-mortem:** Document cause and update prevention measures

### Backup Number Strategy

- Every Growth/Enterprise client gets a pre-provisioned backup number
- Backup numbers are registered on the API but not actively used
- Backup numbers are on a different carrier than the primary
- Switchover can be completed within 2 hours

---

## 12. Strategic Moat Analysis

### Switching Costs Created

The Provisioned Number Program creates multiple layers of client dependency:

#### 1. Number Identity Lock-in
- Client's customers know and save the provisioned number
- Changing numbers means losing customer contact history
- Business cards, websites, and marketing materials reference the number
- Google My Business listing uses the number

#### 2. Conversation History
- All WhatsApp conversation history lives in M4E's CRM
- Migrating to another provider means losing message history
- Customer context and relationship data is in the CRM

#### 3. Automation Investment
- Custom automation workflows built around the number
- Template library approved and optimised over time
- Reactivation campaigns tuned to the client's audience

#### 4. Operational Dependency
- Client's team trained on M4E CRM
- Business processes built around CRM workflows
- Reporting and analytics tied to the platform

#### 5. Number Portability Barrier
- WhatsApp Business API numbers cannot be easily "ported" between WABAs
- Client would need to re-register the number (or get a new one) with a new provider
- Re-registration means losing verified status and template approvals

### Competitive Advantage

| Advantage | Description |
|---|---|
| **Zero-friction onboarding** | Client doesn't touch their personal WhatsApp |
| **Instant CRM integration** | Number comes pre-configured in the CRM |
| **Managed compliance** | M4E handles Meta's policies and template approvals |
| **Cost efficiency** | Shared WABA infrastructure reduces per-client costs |
| **Nigerian market expertise** | SIM procurement, carrier relationships, local compliance |
| **Bundled value** | Number + CRM + Reactivation + Automation in one package |

### Defensive Moat Strength: ★★★★☆ (Strong)

The combination of number identity, conversation history, automation investment, and portability barriers creates a strong defensive moat. A client leaving M4E would need to:
1. Get a new WhatsApp number
2. Re-register with a new provider
3. Lose all conversation history
4. Rebuild all automations
5. Re-submit and re-approve all templates
6. Notify all customers of the number change
7. Update all marketing materials

**Estimated switching cost for client:** ₦200,000–₦500,000 + 2–4 weeks of disruption

---

## 13. Operational Procedures

### Daily Operations

| Task | Frequency | Owner | Tool |
|---|---|---|---|
| Check number quality ratings | Daily | Number Manager | Meta Business Manager |
| Monitor message delivery rates | Daily | Number Manager | CRM Dashboard |
| Review failed message logs | Daily | Number Manager | CRM Logs |
| Process template submissions | As needed | Number Manager | Meta Business Manager |
| Respond to client number issues | As needed | Support | CRM + Ticketing |

### Weekly Operations

| Task | Frequency | Owner |
|---|---|---|
| Number health report generation | Weekly | Number Manager |
| SIM data plan renewal check | Weekly | Number Manager |
| Template performance review | Weekly | Campaign Manager |
| Client usage and billing reconciliation | Weekly | Finance |

### Monthly Operations

| Task | Frequency | Owner |
|---|---|---|
| Client billing (management fee + conversations) | Monthly | Finance |
| Number inventory audit | Monthly | Number Manager |
| Carrier relationship review | Monthly | Operations |
| Capacity planning (SIM procurement) | Monthly | Operations |
| Meta policy update review | Monthly | Compliance |

### Number Lifecycle Management

```
Procured → Registered → Verified → Templates Approved → Live → Active
                                                                  │
                                                          ┌───────┴───────┐
                                                          │               │
                                                     Suspended      Deactivated
                                                     (temp ban)     (client churn)
                                                          │               │
                                                     Reinstated      Recycled
                                                          │          (new client)
                                                          ▼
                                                        Active
```

---

## 14. Financial Projections

### Year 1 Revenue Model

| Month | Active Numbers | Setup Revenue | Monthly Revenue | Conversation Revenue | Total Monthly |
|---|---|---|---|---|---|
| 1–3 | 3–5 | ₦75,000–₦125,000 | ₦45,000–₦75,000 | ₦15,000–₦30,000 | ₦135,000–₦230,000 |
| 4–6 | 10–15 | ₦125,000–₦250,000 | ₦150,000–₦375,000 | ₦50,000–₦120,000 | ₦325,000–₦745,000 |
| 7–9 | 20–30 | ₦125,000–₦250,000 | ₦300,000–₦750,000 | ₦100,000–₦300,000 | ₦525,000–₦1,300,000 |
| 10–12 | 35–50 | ₦125,000–₦375,000 | ₦525,000–₦1,250,000 | ₦175,000–₦500,000 | ₦825,000–₦2,125,000 |

### Year 1 Summary

| Metric | Conservative | Moderate | Aggressive |
|---|---|---|---|
| Numbers provisioned | 35 | 50 | 75 |
| Total setup revenue | ₦875,000 | ₦1,500,000 | ₦2,250,000 |
| Monthly recurring (Month 12) | ₦525,000 | ₦1,000,000 | ₦1,875,000 |
| Annual recurring revenue | ₦3,150,000 | ₦6,000,000 | ₦11,250,000 |
| Total Year 1 revenue | ₦4,025,000 | ₦7,500,000 | ₦13,500,000 |

### Cost Structure

| Cost Item | Monthly (at 50 numbers) | Annual |
|---|---|---|
| SIM data plans (50 × ₦1,500) | ₦75,000 | ₦900,000 |
| Meta conversation fees (pass-through) | ₦200,000–₦500,000 | ₦2,400,000–₦6,000,000 |
| Part-time number manager | ₦100,000 | ₦1,200,000 |
| Tools and infrastructure | ₦25,000 | ₦300,000 |
| **Total operational cost** | **₦400,000–₦700,000** | **₦4,800,000–₦8,400,000** |

### Margin Analysis

| Revenue Stream | Gross Margin |
|---|---|
| Setup fees | ~85% (mostly labour) |
| Monthly management | ~70% (labour + SIM costs) |
| Conversation pass-through | ~15% (markup on Meta fees) |
| **Blended margin** | **~45–55%** |

---

## 15. Implementation Roadmap

### Immediate Actions (This Week)

- [ ] Finalise pricing model with M4E leadership
- [ ] Purchase first 5 MTN SIMs
- [ ] Register SIMs under M4E business entity
- [ ] Add first number to M4E's WABA
- [ ] Create provisioned_numbers table in Supabase

### Short-Term (Weeks 2–4)

- [ ] Complete API registration for 5 numbers
- [ ] Submit display names for approval
- [ ] Create standard template library (reactivation, appointment, satisfaction check)
- [ ] Build number management dashboard in CRM
- [ ] Identify 3–5 pilot clients
- [ ] Create client-facing sales materials

### Medium-Term (Months 2–3)

- [ ] Onboard pilot clients
- [ ] Gather feedback and iterate
- [ ] Document all SOPs
- [ ] Establish carrier corporate accounts
- [ ] Build automated provisioning workflow
- [ ] Create client billing integration

### Long-Term (Months 4–6)

- [ ] Scale to 20+ numbers
- [ ] Hire dedicated number manager
- [ ] Implement monitoring and alerting
- [ ] Apply for green tick verification for top clients
- [ ] Develop self-service client portal
- [ ] Explore Evolution API as backup/alternative

---

## Appendix A: Meta WhatsApp Business API Limits

| Tier | Daily Conversation Limit | How to Reach |
|---|---|---|
| Tier 1 (New) | 250 unique customers | Default for new numbers |
| Tier 2 | 1,000 unique customers | Maintain quality rating + volume |
| Tier 3 | 10,000 unique customers | Maintain quality rating + volume |
| Tier 4 | 100,000 unique customers | Maintain quality rating + volume |
| Unlimited | No limit | Official Business Account (green tick) |

## Appendix B: Template Categories

| Category | Use Case | Approval Difficulty |
|---|---|---|
| **Marketing** | Promotions, offers, reactivation | Medium (must provide opt-out) |
| **Utility** | Order updates, appointment reminders | Easy |
| **Authentication** | OTP, verification codes | Easy |

## Appendix C: Glossary

| Term | Definition |
|---|---|
| **WABA** | WhatsApp Business Account — the container for phone numbers and templates |
| **BSP** | Business Solution Provider — third-party WhatsApp API provider |
| **phone_number_id** | Meta's unique identifier for a registered WhatsApp number |
| **Display Name** | The business name shown to customers in WhatsApp |
| **Green Tick** | Official Business Account verification badge |
| **NCC** | Nigerian Communications Commission — telecom regulator |
| **ICCID** | Integrated Circuit Card Identifier — unique SIM card number |
| **Quality Rating** | Meta's assessment of a number's messaging quality (Green/Yellow/Red) |

---

*This document is confidential and proprietary to Marketing4Effect. Distribution outside M4E requires written approval.*
