# M4E Client Onboarding, WhatsApp Requirements & White-Label Program
## Gap Analysis & Implementation Plan

**Date:** 10 July 2026
**Status:** For Review
**Classification:** Internal Strategy Document

---

## Executive Summary

A thorough audit of all M4E documentation, CRM code, website content, training materials, and internal guides reveals that **we have strong internal/employee-facing processes but almost zero client-facing documentation** for three critical areas:

1. **Meta Business Verification & Onboarding Requirements** — Potential clients have no way to know what they need before engaging M4E
2. **WhatsApp Messaging Rules & Requirements** — Clients don't understand what they can/cannot send, pricing, or compliance rules
3. **White-Label Partner Program** — The technical infrastructure exists but there are no partner-facing materials, flows, or FAQs

This plan proposes **8 deliverables** across these three areas, with clear ownership, format, and distribution channels.

---

## Part 1: Current State Audit

### 1.1 Meta Business Verification & Client Onboarding

| Document | Audience | Status | Gap |
|----------|----------|--------|-----|
| Employee Guide Section 5 (8-step onboarding) | M4E staff | ✅ Complete | Internal only — clients never see this |
| Provisioned Number Program (client requirements table) | M4E strategy | ✅ Complete | Internal strategy doc — not client-facing |
| Embedded Signup (3 API routes, library, setup wizard) | CRM code | ✅ Built | Code exists but no user-facing explanation |
| Embedded Signup Research (100+ pages) | Technical reference | ✅ Complete | Too technical for clients |
| CRM Help Page FAQ | CRM users | ⚠️ Minimal | Says "You'll need a Meta Business account" — no details |
| Website FAQ | Potential clients | ⚠️ Minimal | Mentions WhatsApp API costs but zero Meta verification info |
| Client User Guide | Active clients | ⚠️ Starts too late | Begins at "Signing Up" — skips ALL pre-requisites |
| **Client-facing onboarding requirements guide** | **Potential clients** | **❌ Missing** | **Nothing exists** |
| **"How M4E Assists" onboarding document** | **Potential clients** | **❌ Missing** | **Nothing exists** |
| **Pre-onboarding checklist for clients** | **Potential clients** | **❌ Missing** | **Nothing exists** |

### 1.2 WhatsApp Messaging Rules & Requirements

| Document | Audience | Status | Gap |
|----------|----------|--------|-----|
| Ban Avoidance Engine (7 rules in code) | CRM system | ✅ Built | Enforced silently — clients don't know the rules |
| Employee Guide messaging sections | M4E staff | ✅ Complete | Internal only |
| Client User Guide Appendix L (Templates Guide) | Active clients | ✅ Complete | Only covers template creation, not rules/compliance |
| Training Module 22 (WhatsApp Number Safety) | Training | ✅ Complete | Training material, not a reference document |
| CRM Help Page (24-hour window FAQ) | CRM users | ⚠️ Brief | One FAQ answer — not comprehensive |
| Website FAQ (messaging costs mention) | Potential clients | ⚠️ Minimal | One line about Meta rates |
| **Standalone WhatsApp messaging rules guide** | **Clients** | **❌ Missing** | **Nothing exists** |
| **WhatsApp pricing transparency document** | **Clients** | **❌ Missing** | **Nothing exists** |
| **Do's and Don'ts messaging guide** | **Clients** | **❌ Missing** | **Nothing exists** |

### 1.3 White-Label Partner Program

| Document | Audience | Status | Gap |
|----------|----------|--------|-----|
| Employee Guide Section 34 (technical setup) | M4E developers | ✅ Complete | Purely technical — not partner-facing |
| Wholesale pricing model | M4E internal | ✅ Defined | Internal pricing, no partner brochure |
| Partner onboarding timeline (7-day) | M4E internal | ✅ Defined | Internal process, no partner guide |
| Support tiers (3-tier model) | M4E internal | ✅ Defined | Internal structure, no partner explanation |
| **Partner program brochure/information pack** | **Potential partners** | **❌ Missing** | **Nothing exists** |
| **Partner FAQ document** | **Potential partners** | **❌ Missing** | **Nothing exists** |
| **Partner application flow** | **Potential partners** | **❌ Missing** | **Nothing exists** |
| **Partner agreement template** | **Legal** | **❌ Missing** | **Nothing exists** |
| **Partner onboarding guide (partner perspective)** | **New partners** | **❌ Missing** | **Nothing exists** |
| **Website white-label/partner page** | **Potential partners** | **❌ Missing** | **Nothing exists** |

---

## Part 2: Proposed Deliverables

### Deliverable 1: Client Onboarding Requirements Pack
**Purpose:** Give potential clients everything they need to know BEFORE engaging M4E
**Audience:** Potential and new clients
**Format:** Branded PDF + Markdown + Website page
**Distribution:** Sales conversations, website download, WhatsApp share, email attachment

#### Contents:
1. **Welcome & What to Expect** — Plain-English overview of the onboarding journey
2. **Meta Business Verification Requirements** — Step-by-step what the client needs:
   - Registered business (CAC certificate or equivalent)
   - Business website OR active social media page (Facebook/Instagram)
   - Business email address (not personal Gmail)
   - Business phone number (dedicated, not personal WhatsApp)
   - Business address (physical or registered)
   - Business category selection
   - Business description (2-3 sentences)
3. **What M4E Handles For You** — Clear list of what we do vs. what the client must provide:
   - M4E handles: WhatsApp API configuration, webhook setup, CRM account creation, template submission, automation setup, testing
   - Client provides: Business documents, customer database, product/service information, brand assets (logo), approval of message templates
4. **Document Checklist** — Printable checklist:
   - ☐ CAC Certificate (or business registration document)
   - ☐ Business logo (high resolution, minimum 640×640 pixels)
   - ☐ Business phone number (dedicated line)
   - ☐ Customer database (phone contacts, spreadsheets, or exercise books)
   - ☐ Product/service list with prices
   - ☐ Business email address
   - ☐ Facebook Business Page URL (if available)
   - ☐ Signed service agreement
   - ☐ Payment confirmation
5. **Timeline** — Visual 10-day onboarding journey (simplified from internal 8-step process)
6. **Two Onboarding Paths** — Explain both options:
   - **Path A: Use Your Own Number** — Client connects their existing WhatsApp Business number via Embedded Signup (self-service, guided by M4E)
   - **Path B: M4E Provisioned Number** — M4E provides a dedicated WhatsApp Business number (fully managed, zero technical effort from client)
7. **FAQ Section** — Common pre-onboarding questions:
   - "Will I lose my existing WhatsApp conversations?"
   - "Can I still use WhatsApp on my phone?"
   - "What if my business isn't registered with CAC?"
   - "How long does Meta verification take?"
   - "What does it cost?"
   - "What if I already have a WhatsApp Business account?"

---

### Deliverable 2: WhatsApp Messaging Rules & Requirements Guide
**Purpose:** Ensure clients understand WhatsApp Business API rules before and during campaigns
**Audience:** Active clients and their teams
**Format:** Branded PDF + Markdown + CRM Help Page update + Website FAQ update
**Distribution:** Onboarding pack, CRM help section, training materials

#### Contents:
1. **How WhatsApp Business API Messaging Works** — Plain-English explanation:
   - Difference between WhatsApp personal, WhatsApp Business App, and WhatsApp Business API
   - Why API is needed for business messaging at scale
2. **The 24-Hour Conversation Window** — Visual diagram:
   - Customer messages you → 24-hour window opens → you can reply freely
   - Window closes → you must use approved templates
   - What counts as "opening" a window
3. **Message Templates** — What they are and why they matter:
   - Four categories: Marketing, Utility, Authentication, Service
   - How templates are submitted and approved by Meta
   - Typical approval time (24-72 hours)
   - Common rejection reasons and how to avoid them
   - Template examples for each category
4. **What You CAN Send** — Clear examples:
   - Promotional offers to opted-in customers
   - Order confirmations and delivery updates
   - Appointment reminders
   - Birthday wishes and loyalty rewards
   - Customer service responses
   - Product catalogs and recommendations
5. **What You CANNOT Send** — Clear prohibitions:
   - Messages to people who haven't opted in
   - Spam or unsolicited bulk messages
   - Misleading or deceptive content
   - Content that violates Meta's Commerce Policy
   - Messages outside the 24-hour window without templates
6. **Opt-In Requirements** — How to legally collect consent:
   - What counts as valid opt-in
   - How to collect opt-in (QR codes, website forms, in-store)
   - Record-keeping requirements
   - How to handle opt-outs
7. **Quality Rating & Account Health** — What it means:
   - Green (High), Yellow (Medium), Red (Low) quality ratings
   - What affects your quality rating
   - Messaging tier limits (250 → 1,000 → 10,000 → 100,000)
   - How to improve a low quality rating
   - What happens if quality drops too low (restrictions, bans)
8. **WhatsApp API Pricing** — Transparent cost breakdown:
   - Per-message pricing for templates (Marketing, Utility, Authentication)
   - Free service conversations within 24-hour window
   - Free entry-point conversations (72 hours)
   - Nigeria-specific rate card
   - Monthly cost examples for different business sizes
   - How M4E's CRM optimises costs (ban avoidance engine, smart scheduling)
9. **M4E's Built-In Protections** — How our CRM keeps you safe:
   - Ban Avoidance Engine (7 automatic rules)
   - Warm-up period for new numbers
   - Frequency capping
   - Opt-out detection
   - Quality monitoring alerts
   - Template validation before submission

---

### Deliverable 3: Website Updates — Onboarding & Requirements Pages
**Purpose:** Make onboarding requirements and WhatsApp rules discoverable on the website
**Audience:** Potential clients browsing the website
**Format:** New website pages + FAQ updates

#### New Pages:
1. **`/getting-started`** — "Getting Started with M4E" page:
   - Hero: "Ready to bring back your customers? Here's what you need."
   - Requirements checklist (visual, with icons)
   - Two onboarding paths explained
   - Timeline infographic
   - CTA: "Book a Free Consultation" / "Download Onboarding Pack"
2. **`/platform/getting-started`** — "Getting Started with the CRM" page:
   - For clients who want the CRM-only product
   - Meta Business verification requirements
   - WhatsApp API setup process
   - Pricing tiers reminder
   - CTA: "Start Free Trial" / "Talk to Us"

#### Updated Pages:
3. **FAQ Page** — Add new section "Getting Started & Requirements":
   - "What do I need before signing up?"
   - "How does Meta Business Verification work?"
   - "How long does onboarding take?"
   - "What are WhatsApp API messaging costs?"
   - "Can I keep using my WhatsApp Business App?"
4. **Platform Page** — Add "Getting Started" section with requirements summary

---

### Deliverable 4: CRM In-App Help Updates
**Purpose:** Ensure CRM users can find onboarding and messaging rules within the app
**Audience:** Active CRM users
**Format:** CRM Help page updates

#### Updates:
1. Add "Getting Started" section with Meta verification requirements
2. Add "WhatsApp Messaging Rules" section with 24-hour window, templates, opt-in
3. Add "Pricing & Costs" section with WhatsApp API rate card
4. Add "Account Health" section with quality rating explanation
5. Update existing WhatsApp FAQ with more detail

---

### Deliverable 5: White-Label Partner Information Pack
**Purpose:** Provide potential partners with everything they need to evaluate the program
**Audience:** Marketing agencies, consulting firms, technology resellers
**Format:** Branded PDF + Markdown
**Distribution:** Partner enquiries, website download, sales conversations

#### Contents:
1. **Program Overview** — What white-labelling means in plain English:
   - "Offer our CRM under your own brand"
   - "Your clients see your logo, your domain, your brand"
   - "We handle the technology, you handle the relationship"
2. **What You Get** — Feature list:
   - Full CRM platform under your brand
   - Custom domain (crm.youragency.com)
   - Your logo, colours, and fonts throughout
   - All 14 campaign templates
   - AI chatbot with your branding
   - WhatsApp Business API integration
   - E-commerce integrations (Shopify, WooCommerce)
   - Analytics and reporting dashboards
   - Regular platform updates from M4E
3. **Partner Pricing** — Transparent wholesale model:
   - Three tiers with wholesale and suggested retail pricing
   - Margin calculations
   - Volume discounts (if applicable)
   - What's included vs. what costs extra
4. **How It Works** — Partner journey:
   - Step 1: Apply → Step 2: Agreement → Step 3: Setup (3-5 days) → Step 4: Training → Step 5: Launch
   - Visual timeline
5. **Technical Requirements** — What partners need:
   - A domain name for the CRM
   - A Meta Business account (for WhatsApp API)
   - Brand assets (logo, colours, fonts)
   - A Supabase account (free tier available)
   - A Vercel account (free tier available)
6. **Support Model** — Three-tier support explained:
   - Partner handles: Client questions, how-to support, basic troubleshooting
   - M4E handles: Technical issues, bug fixes, security
   - M4E handles: Infrastructure, updates, new features
7. **Revenue Projections** — Example scenarios:
   - 5 clients at Professional tier: ₦X/month revenue, ₦Y/month cost, ₦Z/month profit
   - 10 clients mixed tiers: projections
   - 25 clients: projections
8. **Case for Partnership** — Why partner with M4E:
   - 99,000+ lines of battle-tested code
   - Built specifically for Nigerian/African markets
   - Naira pricing, local payment integration
   - Continuous updates and new features
   - No need to build or maintain technology
9. **FAQ** — Common partner questions:
   - "Can I set my own pricing?"
   - "Do my clients know about M4E?"
   - "What happens if I want to leave?"
   - "Can I add custom features?"
   - "How do updates work?"
   - "What about data ownership?"
   - "Do I need technical staff?"
   - "What's the minimum commitment?"

---

### Deliverable 6: White-Label Partner Agreement Template
**Purpose:** Legal framework for partner relationships
**Audience:** Legal / Partners
**Format:** Markdown + PDF

#### Contents:
1. Definitions and interpretation
2. Grant of licence (non-exclusive, territory-specific)
3. Partner obligations (support, branding, compliance)
4. M4E obligations (platform, updates, Tier 2/3 support)
5. Pricing and payment terms
6. Data protection and NDPR compliance
7. Intellectual property
8. Confidentiality
9. Term and termination
10. Limitation of liability
11. Dispute resolution
12. Schedule A: Pricing tiers
13. Schedule B: Service level agreement
14. Schedule C: Acceptable use policy

---

### Deliverable 7: White-Label Partner Onboarding Guide
**Purpose:** Step-by-step guide for new partners to set up and launch
**Audience:** New partners and their technical teams
**Format:** Markdown + PDF

#### Contents:
1. Pre-setup checklist (what to prepare)
2. Day 1-2: Infrastructure setup walkthrough
3. Day 3-4: Branding customisation guide (with screenshots)
4. Day 4-5: Testing checklist
5. Day 5-7: Team training curriculum
6. Day 7: Launch checklist
7. Post-launch: First client onboarding guide
8. Ongoing: Update management process
9. Troubleshooting common setup issues

---

### Deliverable 8: Website White-Label/Partner Page
**Purpose:** Attract potential partners through the website
**Audience:** Marketing agencies, consultants, resellers browsing the website
**Format:** New website page

#### Page: `/partners` or `/white-label`
1. Hero: "Offer Our CRM Under Your Brand"
2. Benefits section (3-4 key selling points)
3. How it works (visual 5-step process)
4. Pricing overview (wholesale tiers)
5. Partner testimonials (placeholder for future)
6. Technical requirements summary
7. FAQ accordion
8. CTA: "Apply to Become a Partner" → leads to application form or contact

---

## Part 3: Implementation Priority & Timeline

| Priority | Deliverable | Effort | Timeline | Rationale |
|----------|------------|--------|----------|----------|
| 🔴 **Critical** | D1: Client Onboarding Requirements Pack | 1 day | Week 1 | Needed for every sales conversation NOW |
| 🔴 **Critical** | D2: WhatsApp Messaging Rules Guide | 1 day | Week 1 | Clients must understand rules before campaigns |
| 🟡 **High** | D3: Website Updates (Getting Started pages) | 1 day | Week 1-2 | Makes requirements discoverable online |
| 🟡 **High** | D4: CRM In-App Help Updates | 0.5 day | Week 2 | Active users need this reference |
| 🟠 **Medium** | D5: White-Label Partner Information Pack | 1 day | Week 2-3 | Needed when partner enquiries come |
| 🟠 **Medium** | D6: White-Label Partner Agreement | 1 day | Week 3 | Legal framework before signing partners |
| 🔵 **Lower** | D7: White-Label Partner Onboarding Guide | 1 day | Week 3-4 | Needed only after first partner signs |
| 🔵 **Lower** | D8: Website Partner Page | 0.5 day | Week 4 | Marketing channel for partner acquisition |

**Total estimated effort:** ~7 days
**Recommended timeline:** 4 weeks (parallel with other priorities)

---

## Part 4: Distribution Strategy

| Channel | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 |
|---------|----|----|----|----|----|----|----|----|----|
| Sales WhatsApp conversations | ✅ | ✅ | | | ✅ | | | |
| Website (public pages) | ✅ | ✅ | ✅ | | ✅ | | | ✅ |
| Website (downloadable PDF) | ✅ | ✅ | | | ✅ | | | |
| CRM in-app help | | ✅ | | ✅ | | | | |
| Email to new clients | ✅ | ✅ | | | | | | |
| Client User Guide (update) | ✅ | ✅ | | | | | | |
| Training curriculum (update) | ✅ | ✅ | | | | | ✅ | |
| Partner enquiry responses | | | | | ✅ | ✅ | ✅ | |
| GitHub docs/ folder | ✅ | ✅ | | | ✅ | ✅ | ✅ | |

---

## Part 5: Content Sources (Already Available)

All content for these deliverables can be synthesised from existing internal documents — no new research needed:

| Source Document | Relevant Content |
|----------------|------------------|
| Employee Guide Section 5 | 8-step onboarding process, pre-checklist, timeline |
| Provisioned Number Program | Client requirements table, onboarding flow, checklist |
| Embedded Signup Research | Meta verification process, technical requirements, billing models |
| Ban Avoidance Engine code | 7 rules, tier limits, quality rating logic |
| Client User Guide Appendix L | Template creation guide, message types |
| Training Module 22 | WhatsApp safety rules, warm-up, frequency capping |
| Employee Guide Section 34 | White-label setup, pricing, partner process |
| CRM FAQ Document | Existing Q&A content to expand |
| WACRM Investigation Report | Ban avoidance rules, Meta compliance |
| Aggregated Recommendations v2 | Embedded Signup implementation, SMS branding |
| Package Execution System | Onboarding timelines, package-to-CRM mapping |

---

## Recommendation

Start with **Deliverables 1 and 2** immediately — these are the most urgent because:
- Every potential client conversation requires explaining Meta verification requirements
- Every active client needs to understand WhatsApp messaging rules
- Both can be completed in 1 day each using existing internal documentation
- Both serve as professional sales tools that build client confidence

The white-label deliverables (D5-D8) can follow once the client-facing materials are complete, as partner enquiries are less immediate than client onboarding needs.

---

*This plan is ready for your review. Upon approval, I will begin implementation starting with the critical deliverables.*
