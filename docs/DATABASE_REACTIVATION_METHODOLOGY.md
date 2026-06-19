---
name: database-reactivation
version: 1.0.0
author: Agent Zero
tags:
  - database-reactivation
  - crm
  - win-back
  - email-marketing
  - customer-retention
  - revenue-recovery
  - nigerian-market
triggers:
  - database reactivation
  - reactivate customers
  - win back
  - dormant customers
  - inactive customers
  - customer database
  - reactivation campaign
  - CRM cleanup
  - database audit
  - lapsed customers
description: >
  Enables agencies to mine a client\'s existing customer database to generate
  revenue at zero ad cost. Implements a proven 10-step reactivation methodology
  covering CRM consolidation, segmentation, email validation, personalised
  multi-channel outreach (email + WhatsApp + SMS), and automated workflows.
  Includes ROI calculator, quarterly campaign calendar, and Nigerian-market
  WhatsApp templates. Proven results: 29% win-back rate, 390% ROI, 760%
  revenue increase from segmentation.
---

# Database Reactivation

## Overview

Database reactivation is the systematic process of re-engaging dormant, lapsed,
and inactive customers in a business\'s existing database to generate revenue
**without any advertising spend**.

### Why It Matters

| Metric | Existing Customers | New Prospects |
|---|---|---|
| Probability of sale | **60–70%** | 5–20% |
| Average spend | **31% more** than new customers | Baseline |
| Email ROI | **$38 return per $1 spent** | Varies widely |
| Cost to acquire | **$0 (already in database)** | $50–$500+ CAC |

Every business sits on a goldmine of past buyers, expired leads, and lapsed
subscribers. Most never contact them again. Database reactivation turns that
neglected asset into immediate, measurable revenue.

### The Core Insight

A customer who bought once **already trusts you**. They already know your brand,
have experienced your product, and overcame every objection that stops cold
prospects. Reactivation simply reminds them you exist and gives them a reason
to return.

---

## The 10-Step Reactivation Process

### Step 1: Pool Data into a Single CRM

**Objective:** Consolidate all customer data into one unified system.

**Actions:**
- Export contacts from all sources: email platforms, POS systems, spreadsheets,
  accounting software, social media DMs, WhatsApp business contacts
- Merge into a single CRM (HubSpot Free, Brevo, Google Sheets for small lists)
- De-duplicate records by email address and phone number
- Standardise field formats (dates, phone numbers with country codes, names)

**Common data sources to check:**
- Email marketing platform (Mailchimp, Brevo, etc.)
- Point-of-sale / invoicing system
- Accounting software (QuickBooks, Xero)
- WhatsApp Business contact list
- Instagram/Facebook DM history
- Old spreadsheets and CSV exports
- Business card collections (digitise with CamCard or similar)

### Step 2: Tag and Segment

**Objective:** Categorise every contact with meaningful metadata.

**Segmentation dimensions:**

| Dimension | Examples |
|---|---|
| Geographic | City, state, country, timezone |
| Demographic | Age range, gender, job title, income bracket |
| Industry | SaaS, e-commerce, professional services, retail |
| Company size | Solo, SMB (2–50), mid-market (51–500), enterprise (500+) |
| Purchase history | Products bought, order value, frequency |
| Engagement level | Email opens, click rates, last interaction date |
| Acquisition source | Referral, ad campaign, organic, event |

### Step 3: Sort into 3 Categories

**Objective:** Classify every contact into one of three buckets.

| Category | Definition | Action |
|---|---|---|
| **Prospects** | Never purchased; showed interest (signed up, enquired, downloaded) | Nurture sequence → convert |
| **Dormant** | Purchased before but inactive 90+ days | Reactivation sequence → win back |
| **Active** | Purchased within last 90 days or currently engaged | Upsell / cross-sell / referral |

### Step 4: Validate Emails

**Objective:** Remove invalid emails to protect sender reputation.

**Tools:**
- [NeverBounce](https://neverbounce.com) — bulk verification, pay-per-check
- [ZeroBounce](https://zerobounce.net) — includes abuse/spam trap detection
- [Brevo built-in](https://brevo.com) — basic validation on import

**Process:**
1. Export email list as CSV
2. Upload to verification service
3. Remove: invalid, disposable, spam-trap, role-based addresses
4. Keep: valid + catch-all (send cautiously to catch-all)
5. Target: **95%+ deliverability rate** before sending

**Expected results:**
- Small lists (<1,000): 5–15% invalid
- Medium lists (1,000–10,000): 10–25% invalid
- Old lists (2+ years untouched): 25–40% invalid

### Step 5: Analyse and Update Customer Data

**Objective:** Enrich records with missing information.

**Actions:**
- Fill in missing fields (name, company, last purchase date)
- Update outdated information (job titles, company names)
- Add purchase history summaries (total spend, last product, frequency)
- Calculate Customer Lifetime Value (CLV) for each contact
- Flag VIP customers (top 20% by spend)

### Step 6: Segment Dynamically (Behaviour-Based)

**Objective:** Create segments based on behaviour, not just demographics.

**Dynamic segments:**

| Segment | Trigger | Priority |
|---|---|---|
| **Hot dormant** | Last purchase 90–180 days ago, high CLV | 🔴 Highest |
| **Warm dormant** | Last purchase 180–365 days ago | 🟡 High |
| **Cold dormant** | Last purchase 365+ days ago | 🟠 Medium |
| **Ghost prospects** | Signed up but never purchased | 🔵 Medium |
| **Lapsed VIPs** | Top 20% spenders now inactive | 🔴 Highest |
| **One-time buyers** | Single purchase, never returned | 🟡 High |
| **Seasonal buyers** | Purchase pattern tied to seasons/events | 🟢 Timed |

### Step 7: Create Personalised Communication Plans

**Objective:** Map the right message to the right segment at the right time.

**Communication matrix:**

| Segment | Channel | Tone | Offer | Timing |
|---|---|---|---|---|
| Hot dormant | Email + WhatsApp | Personal, warm | No discount needed | Immediate |
| Warm dormant | Email → WhatsApp | Friendly check-in | Soft incentive | Week 1 |
| Cold dormant | Email only | Re-introduction | Strong incentive | Week 2 |
| Ghost prospects | Email | Value-first | Free resource/trial | Week 1 |
| Lapsed VIPs | Personal email + call | VIP treatment | Exclusive access | Immediate |
| One-time buyers | Email + SMS | Helpful | Related product | Week 1 |

### Step 8: Develop Email Templates

**Objective:** Create proven reactivation email sequences.

#### The 10-Word Reactivation Email

The single most effective reactivation email ever tested:

> **Subject:** Quick question
>
> **Body:** Are you still looking for help with [specific thing]?
>
> [Your name]

**Why it works:**
- Ultra-short = gets read
- Feels personal, not marketing
- Asks a question = invites reply
- Specific = shows you remember them
- No images, no links = bypasses spam filters

**Response rates:** 30–40% open rate, 10–15% reply rate

See `templates/reactivation-email-sequence.md` for the complete 6-email sequence.

### Step 9: Design Automated Reactivation Workflows

**Objective:** Set up trigger-based automation so reactivation runs continuously.

**Primary workflow triggers:**

```
TRIGGER: No purchase in 90 days
  → Day 0:  Send Email 1 (10-word email)
  → Day 3:  No response? Send WhatsApp message 1
  → Day 7:  No response? Send Email 2 ("We miss you")
  → Day 14: No response? Send Email 3 (Exclusive offer)
  → Day 21: No response? Send WhatsApp message 2
  → Day 28: No response? Send Email 4 (Value reminder)
  → Day 35: No response? Send Email 5 (Personal video)
  → Day 42: No response? Send Email 6 (Final chance)
  → Day 49: No response? Move to "cold" segment, reduce frequency
  → Day 90: Re-enter sequence with different angle
```

**Re-engagement triggers:**
- Opens email → Tag as "warming up", accelerate sequence
- Clicks link → Tag as "interested", send targeted follow-up
- Replies → Route to human for personal response
- Purchases → Exit reactivation, enter **satisfaction-gated-reviews** sequence

### Step 10: Use Omnichannel Approach

**Objective:** Reach customers where they actually are.

**Channel priority (Nigerian market):**
1. **WhatsApp** — 93% penetration in Nigeria, highest open rates
2. **Email** — Professional context, longer content
3. **SMS** — Backup for non-WhatsApp users
4. **Instagram DM** — For B2C brands with social presence
5. **Phone call** — For VIP/high-value accounts only

**Channel priority (International):**
1. **Email** — Primary channel, most scalable
2. **SMS** — High open rates, short messages
3. **WhatsApp** — Growing in EU/LATAM markets
4. **Retargeting ads** — Custom audiences from email lists
5. **Direct mail** — For high-value B2B accounts

See `templates/whatsapp-reactivation-sequence.md` for WhatsApp-specific templates.

---

## Client Database Audit Process

### How to Request Access

**Script for client conversation:**

> "We\'d like to run a quick audit of your existing customer database. Most
> businesses are sitting on thousands of naira/dollars in untapped revenue from
> past customers who simply forgot about them. We can usually identify
> reactivation revenue within 48 hours of receiving your data."

**What to request:**
1. Full customer/contact list export (CSV preferred)
2. Purchase/transaction history (last 2–3 years minimum)
3. Email marketing platform access or export
4. WhatsApp Business contact export
5. Any CRM access (read-only is fine)

### Assess Database Health

Run `scripts/database_audit.py` against the client\'s exported data to generate:
- Total contact count
- Email validity estimate
- Segmentation breakdown (active/dormant/prospect)
- Data completeness score
- Estimated reactivation revenue

### Estimate Reactivation Revenue Potential

Use the **ROI Calculator** (see section below) to project revenue.

### Data Privacy Compliance

See `checklists/data-privacy-compliance.md` for NDPR (Nigeria) and GDPR (EU)
compliance requirements.

---

## Reactivation Email Templates

Six proven templates are provided in `templates/reactivation-email-sequence.md`:

1. **The 10-Word Email** — "Are you still looking for help with [specific thing]?"
2. **The "We Miss You" Email** — Personal, warm, no selling
3. **The Exclusive Offer Email** — Time-limited incentive for return
4. **The Value Reminder Email** — Remind them of results/benefits achieved
5. **The Personal Video Email** — Short Loom/video with personal message
6. **The Final Chance Email** — Last attempt before reducing contact

Each template includes: subject line, preview text, body copy, CTA, and timing.

---

## WhatsApp Reactivation Templates

Four WhatsApp templates optimised for the Nigerian market are provided in
`templates/whatsapp-reactivation-sequence.md`:

1. **The Check-In** — Casual, personal, no selling
2. **The Value Drop** — Share a useful tip or resource
3. **The Exclusive Offer** — WhatsApp-only deal
4. **The Voice Note** — Personal voice message script

---

## ROI Calculator

### Formula

```
Estimated Reactivation Revenue =
  Database Size
  × Valid Email Rate (typically 75–85%)
  × Dormant Rate (typically 40–60%)
  × Reactivation Rate (typically 10–29%)
  × Average Order Value
```

### Example Calculation

| Input | Value |
|---|---|
| Database size | 5,000 contacts |
| Valid email rate | 80% |
| Dormant contacts | 60% |
| Reactivation rate | 15% |
| Average order value | ₦50,000 ($60) |

```
5,000 × 0.80 × 0.60 × 0.15 × ₦50,000 = ₦18,000,000 ($21,600)
```

**At zero ad cost, this is pure profit minus email platform fees.**

### Quick Reference Table

| Database Size | Conservative (10%) | Moderate (15%) | Aggressive (25%) |
|---|---|---|---|
| 1,000 | ₦2.4M | ₦3.6M | ₦6.0M |
| 5,000 | ₦12.0M | ₦18.0M | ₦30.0M |
| 10,000 | ₦24.0M | ₦36.0M | ₦60.0M |
| 25,000 | ₦60.0M | ₦90.0M | ₦150.0M |

*Based on 80% valid rate, 60% dormant rate, ₦50,000 AOV*

---

## Quarterly Campaign Calendar

| Quarter | Focus | Segment Priority | Offer Type |
|---|---|---|---|
| **Q1 (Jan–Mar)** | New Year reactivation | All dormant | "Fresh start" messaging, new year offers |
| **Q2 (Apr–Jun)** | Mid-year check-in | 90–180 day dormant | Value reminder, case studies |
| **Q3 (Jul–Sep)** | Pre-holiday warm-up | Cold dormant + VIPs | Early access, loyalty rewards |
| **Q4 (Oct–Dec)** | Holiday/year-end push | All segments | Strongest offers, urgency messaging |

**Monthly cadence within each quarter:**
- **Week 1:** Segment refresh + email validation
- **Week 2:** Launch reactivation sequence (Email 1–3)
- **Week 3:** WhatsApp follow-up + Email 4–6
- **Week 4:** Results analysis + segment updates

---

## Segmentation Strategies

### By Inactivity Duration

| Segment | Days Inactive | Approach | Expected Win-Back Rate |
|---|---|---|---|
| **Recently lapsed** | 30–60 days | Gentle reminder, no incentive needed | 25–35% |
| **Dormant** | 90–180 days | Personal outreach + soft incentive | 15–25% |
| **Long dormant** | 180–365 days | Re-introduction + strong incentive | 8–15% |
| **Deep freeze** | 365+ days | Last-chance campaign, then archive | 3–8% |

### By Customer Value

| Segment | Definition | Approach |
|---|---|---|
| **VIP** | Top 20% by lifetime spend | Personal email/call from founder, VIP offers |
| **Mid-value** | Middle 60% by spend | Standard reactivation sequence |
| **Low-value** | Bottom 20% by spend | Automated sequence, minimal customisation |

### By Engagement History

| Segment | Behaviour | Approach |
|---|---|---|
| **Openers** | Open emails but don\'t click | Improve CTAs, add urgency |
| **Clickers** | Click but don\'t buy | Reduce friction, add incentive |
| **Ghosts** | No opens in 6+ months | Subject line testing, WhatsApp pivot |
| **Repliers** | Have replied to past emails | Personal follow-up, relationship-first |

---

## Integration with Other Skills

### → satisfaction-gated-reviews
When a reactivated customer makes a purchase, they automatically enter the
satisfaction-gated review sequence:
1. Reactivation purchase → 3-day wait → Satisfaction check
2. Satisfied → Review request → Testimonial request → Referral request
3. Unsatisfied → Service recovery sequence

This creates a **self-reinforcing loop**: reactivation generates revenue AND
fuels the review/referral pipeline.

### → email-sequence
Reactivation email templates follow the same structural patterns as the
email-sequence skill. Use email-sequence for ongoing nurture; use
database-reactivation for targeted win-back campaigns.

### → customer-avatar
Segmentation in Step 2 and Step 6 should reference customer avatars built
with the customer-avatar skill. Each segment maps to a specific avatar with
tailored messaging.

### → referral-program
Reactivated customers who complete the satisfaction gate and leave positive
reviews are prime candidates for the referral program. The referral-program
skill handles incentive structure and tracking.

### → ad-creative-production
Testimonials collected from reactivated customers (via satisfaction-gated-reviews)
become raw material for ad creatives. Use ad-creative-production to transform
testimonials into high-converting ad scripts.

---

## Proven Results

| Metric | Result | Source |
|---|---|---|
| Win-back rate | **29%** of dormant customers reactivated | Industry benchmark |
| Campaign ROI | **390%** return on reactivation campaigns | Klaviyo data |
| Short-term revenue | **$83,000** from single reactivation campaign | Case study |
| Revenue increase | **760%** from proper segmentation | Marketing Sherpa |
| Email ROI | **$38 per $1 spent** | DMA/Litmus |
| Repeat customer spend | **31% more** than first-time buyers | Adobe Digital Index |
| Sale probability | **60–70%** for existing vs 5–20% for new | Marketing Metrics |

---

## Scripts

| Script | Purpose | Usage |
|---|---|---|
| `scripts/database_audit.py` | Analyse customer database health | `python scripts/database_audit.py --input data.csv` |
| `scripts/generate_reactivation_emails.py` | Generate personalised email sequences | `python scripts/generate_reactivation_emails.py --brand "Acme" --service "consulting"` |
| `scripts/segment_database.py` | Segment database by inactivity and value | `python scripts/segment_database.py --input data.csv --output segments/` |

## Templates

| Template | Purpose |
|---|---|
| `templates/reactivation-email-sequence.md` | 6-email reactivation sequence |
| `templates/whatsapp-reactivation-sequence.md` | 4-message WhatsApp sequence |
| `templates/client-database-audit-checklist.md` | Client database audit checklist |
| `templates/reactivation-campaign-brief.md` | Campaign brief template |

## Checklists

| Checklist | Purpose |
|---|---|
| `checklists/pre-campaign-checklist.md` | Pre-launch verification |
| `checklists/data-privacy-compliance.md` | NDPR/GDPR compliance |
