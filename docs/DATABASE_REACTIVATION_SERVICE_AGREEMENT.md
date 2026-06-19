# DATABASE REACTIVATION SERVICE AGREEMENT

**Marketing4Effect (M4E) — Database Reactivation & Customer Win-Back Services**

---

## PARTIES

This Database Reactivation Service Agreement ("Agreement") is entered into as of the date of last signature below ("Effective Date") by and between:

**Service Provider:**
Marketing4Effect ("M4E")
Lagos, Nigeria
Email: hello@marketing4effect.com
(hereinafter referred to as "M4E" or "Service Provider")

**Client:**
Business Name: _____________________________________________
Registered Address: _________________________________________
Contact Person: _____________________________________________
Email: _____________________________________________________
Phone: _____________________________________________________
(hereinafter referred to as "Client")

M4E and Client are each referred to individually as a "Party" and collectively as the "Parties."

---

## 1. DEFINITIONS

For the purposes of this Agreement, the following terms shall have the meanings set forth below:

**1.1 "Active Customer"** — A customer who has completed a purchase or transaction within the last ninety (90) days.

**1.2 "Attribution Window"** — The configurable time period (default: 14 calendar days) during which a customer purchase may be attributed to M4E's reactivation campaign. Configurable options: 7, 14, or 30 days, as agreed in Schedule A.

**1.3 "Average Order Value" (AOV)** — The mean transaction value calculated automatically by the CRM system from raw transaction data provided by the Client. Formula: Total Revenue ÷ Total Number of Transactions.

**1.4 "Campaign Engagement"** — Any measurable interaction between a customer and a reactivation campaign message, including but not limited to: email open, email click, WhatsApp message read receipt, WhatsApp link click, SMS link click, or landing page visit originating from a campaign link.

**1.5 "CRM System"** — The M4E Customer Reactivation Manager platform (currently hosted at crm.marketing4effect.com), including all associated databases, automation engines, and reporting tools.

**1.6 "Customer Lifetime Value" (CLV)** — The projected total revenue from a customer over their entire relationship with the Client, calculated automatically from raw transaction data.

**1.7 "Database"** — The Client's collection of customer records, including but not limited to: names, email addresses, phone numbers, purchase history, and engagement data.

**1.8 "Deal"** — A tracked sales opportunity within the CRM System, representing a potential or completed transaction with a customer.

**1.9 "Dormant Customer"** — A customer who has not completed a purchase or transaction within the last ninety (90) days but has a prior purchase history with the Client.

**1.10 "Performance Fee"** — The variable fee payable to M4E, calculated as a percentage of Reactivation Revenue, as defined in Section 6.

**1.11 "Prospect"** — A contact in the Database who has shown interest (e.g., signed up, enquired, downloaded content) but has never completed a purchase.

**1.12 "Raw Transaction Data"** — Unprocessed sales records provided by the Client containing, at minimum: transaction date, transaction amount, customer identifier, product/service description, and payment method.

**1.13 "Reactivated Customer"** — A Dormant Customer who completes a purchase within the Attribution Window following their last Campaign Engagement.

**1.14 "Reactivation Revenue"** — The total value of purchases made by Reactivated Customers within the Attribution Window, as calculated by the CRM System from Raw Transaction Data.

**1.15 "Reactivation Rate"** — The percentage of contacted Dormant Customers who become Reactivated Customers. Formula: (Reactivated Customers ÷ Total Dormant Customers Contacted) × 100.

---

## 2. SCOPE OF SERVICES

### 2.1 Core Reactivation Service

M4E shall provide the following core services ("Core Services"):

**(a) Database Audit & Health Assessment**
- Import and consolidation of Client's customer data into the CRM System
- De-duplication of customer records by email address and phone number
- Email validation and deliverability assessment
- Database health scoring and segmentation analysis
- Identification of Dormant Customers, Active Customers, and Prospects

**(b) Customer Segmentation**
- Classification of all contacts into actionable segments based on:
  - Purchase recency (Hot Dormant: 90–180 days; Warm Dormant: 180–365 days; Cold Dormant: 365+ days)
  - Customer value (VIP: top 20% by spend; Mid-value: middle 60%; Low-value: bottom 20%)
  - Engagement history (Openers, Clickers, Ghosts, Repliers)
- Dynamic segment updates based on ongoing customer behaviour

**(c) Multi-Channel Reactivation Campaigns**
- Design and execution of personalised reactivation sequences across:
  - **Email** — Brevo-powered transactional and marketing emails
  - **WhatsApp** — Meta Business API-powered messaging
  - **SMS** — Brevo Transactional SMS (where applicable)
- Campaign content creation, A/B testing, and optimisation
- Automated workflow configuration within the CRM System

**(d) Performance Tracking & Reporting**
- Real-time campaign performance dashboards
- Monthly performance reports including all calculated metrics
- Attribution tracking and Reactivation Revenue calculation
- Communication cost tracking and transparency

### 2.2 Service Exclusions

The Core Services do NOT include:
- Creation of new marketing content beyond reactivation sequences (e.g., brand campaigns, product launches)
- Paid advertising or media buying
- Website design, development, or hosting
- Physical marketing materials
- Customer service or support on behalf of the Client
- Legal, tax, or financial advisory services

---

## 3. SERVICE TIERS & ADD-ONS

### 3.1 Core Reactivation Package

The Core Reactivation Package includes all services described in Section 2.1 and is the standard engagement for all Clients.

### 3.2 Available Add-Ons

The following add-on services are independently activatable and separately priced. Each add-on operates as a standalone module that can be activated or deactivated at any time without affecting the Core Service:

**(a) Google My Business (GMB) Review Generation**
- Satisfaction-gated review collection workflow
- GMB profile creation/claiming assistance (where Client lacks a profile)
- Automated review link distribution post-satisfaction check
- Review monitoring and response management
- Pricing: See Schedule B

**(b) Video Testimonial Collection**
- WhatsApp-based video testimonial solicitation
- Video storage, processing, and delivery
- Website embedding code generation
- Pricing: See Schedule B

**(c) Referral Program Management**
- Referral incentive structure design
- Automated referral tracking and reward distribution
- Referral campaign messaging
- Pricing: See Schedule B

**(d) Advanced Analytics & Reporting**
- Custom dashboard creation
- Cohort analysis and predictive modelling
- Quarterly business review presentations
- Pricing: See Schedule B

### 3.3 Custom Solutions

The Client may request strategy analysis for custom add-ons at any time. Custom solutions arising from deep research into the Client's specific business challenges shall be scoped and priced on a per-engagement basis. M4E shall provide a written proposal including scope, timeline, and pricing before commencing any custom work.

---

## 4. ATTRIBUTION RULE

### 4.1 Definition of Attribution

A reactivated sale is attributed to M4E's campaign if the customer's last Campaign Engagement occurred within the Attribution Window before the purchase date.

### 4.2 Attribution Window

The default Attribution Window is **fourteen (14) calendar days**. The Parties may agree to an alternative window of 7, 14, or 30 days, as specified in Schedule A. The Attribution Window is measured from the timestamp of the customer's last Campaign Engagement to the timestamp of the purchase transaction.

### 4.3 Evidence of Campaign Engagement

The following CRM-logged events constitute valid Campaign Engagement for attribution purposes:

| Event Type | Evidence | Tracking Method |
|---|---|---|
| Email delivered | Brevo delivery confirmation | API callback |
| Email opened | Brevo open tracking pixel | API callback |
| Email link clicked | Brevo click tracking | API callback |
| WhatsApp message delivered | Meta delivery receipt | Webhook |
| WhatsApp message read | Meta read receipt | Webhook |
| WhatsApp link clicked | UTM-tracked link click | Analytics |
| SMS delivered | Brevo SMS delivery receipt | API callback |
| SMS link clicked | UTM-tracked link click | Analytics |
| Landing page visit | UTM parameter match from campaign | Analytics |

### 4.4 Attribution Calculation

The CRM System shall automatically:
1. Match each purchase transaction (from Raw Transaction Data) to a customer record
2. Check if the customer had any Campaign Engagement within the Attribution Window preceding the purchase
3. If yes, attribute the full transaction amount as Reactivation Revenue
4. If no Campaign Engagement exists within the window, the transaction is NOT attributed

### 4.5 Multi-Touch Attribution

Where a customer received messages across multiple channels (email, WhatsApp, SMS), the **last engagement** before purchase determines the attributed channel for reporting purposes. The full transaction amount is attributed regardless of channel.

### 4.6 Dispute Resolution for Attribution

In the event of a dispute regarding attribution:

1. **Initial Review** — Either Party may request an attribution review by providing written notice within seven (7) business days of receiving the monthly report.
2. **Evidence Submission** — Both Parties shall submit supporting evidence within five (5) business days of the review request.
3. **Joint Review** — The Parties shall conduct a joint review of CRM logs, transaction data, and engagement records within ten (10) business days.
4. **Resolution** — If the Parties cannot agree, the dispute shall be escalated to the dispute resolution process in Section 15.

---

## 5. PAYMENT DATA AUTHENTICITY & VERIFICATION

### 5.1 Client's Data Obligations

The Client SHALL provide Raw Transaction Data in the following format:

| Field | Description | Required |
|---|---|---|
| `date` | Transaction date (YYYY-MM-DD) | Yes |
| `amount` | Transaction amount in Nigerian Naira (₦) | Yes |
| `customer_id` | Unique customer identifier (email, phone, or internal ID) | Yes |
| `product_service` | Description of product or service purchased | Yes |
| `payment_method` | Payment method used (cash, transfer, POS, Paystack, etc.) | Yes |

Data shall be provided as CSV files uploaded to the CRM System or via API integration, at intervals agreed in Schedule A (default: weekly).

### 5.2 Data Accuracy Responsibility

**The Client is solely responsible for the accuracy, completeness, and timeliness of all Raw Transaction Data provided to M4E.** M4E's performance fee calculations are based entirely on the data provided by the Client. M4E shall not be held liable for fee calculations based on inaccurate or incomplete data supplied by the Client.

### 5.3 Audit Rights

M4E reserves the right to request supporting documentation to verify the accuracy of Raw Transaction Data, including but not limited to:
- Point-of-sale (POS) terminal reports
- Bank statement excerpts (redacted for non-relevant transactions)
- Payment gateway reports (Paystack, Flutterwave, etc.)
- Accounting software exports

Such requests shall be made in writing and limited to transactions relevant to Reactivation Revenue calculations. The Client shall provide requested documentation within ten (10) business days.

### 5.4 Anomaly Detection

The CRM System includes automated anomaly detection that flags:
- Transactions with amounts significantly above or below the calculated AOV (>3 standard deviations)
- Unusual spikes in transaction volume
- Duplicate transaction entries
- Transactions with missing or inconsistent customer identifiers
- Backdated transactions entered after the reporting period

Flagged anomalies shall be reported to both Parties for review and resolution before inclusion in Performance Fee calculations.

### 5.5 Penalties for Deliberate Misreporting

If M4E discovers, through audit or anomaly detection, that the Client has deliberately:
- Underreported transaction data to reduce Performance Fees
- Fabricated transaction data to inflate metrics
- Withheld transaction data that should have been reported
- Manipulated customer identifiers to avoid attribution

The following penalties shall apply:

**(a) First Offence:** Written notice and recalculation of fees based on corrected data, plus a 10% surcharge on the corrected Performance Fee for the affected period.

**(b) Second Offence:** Recalculation plus 25% surcharge, and M4E reserves the right to conduct a full audit at the Client's expense.

**(c) Third Offence:** M4E may terminate this Agreement immediately with all outstanding fees becoming due, plus damages equivalent to three (3) months of average Performance Fees.

---

## 6. FEE STRUCTURE

### 6.1 One-Time Setup Fee

A non-refundable setup fee is payable upon execution of this Agreement:

| Database Size | Setup Fee (₦) |
|---|---|
| Up to 1,000 contacts | ₦150,000 |
| 1,001 – 5,000 contacts | ₦300,000 |
| 5,001 – 10,000 contacts | ₦500,000 |
| 10,001 – 25,000 contacts | ₦750,000 |
| 25,001+ contacts | Custom quote |

The setup fee covers: data import, de-duplication, email validation, initial segmentation, CRM configuration, and first campaign design.

### 6.2 Communication Costs (Pass-Through)

All communication costs are passed through to the Client at cost, with no markup:

| Channel | Cost Basis | Estimated Rate |
|---|---|---|
| WhatsApp (Marketing) | Meta conversation pricing | ~₦40–80 per conversation |
| WhatsApp (Utility) | Meta conversation pricing | ~₦20–40 per conversation |
| Email (Transactional) | Brevo pricing | Free up to 300/day; then ~₦5–10 per email |
| SMS | Brevo SMS pricing | ~₦4–8 per SMS segment |

*Actual rates depend on Meta and Brevo pricing at time of sending. Rates shown are estimates as of the Effective Date.*

Communication costs are invoiced monthly in arrears with itemised breakdowns.

### 6.3 Performance Fee

**(a) Calculation Method**

The Performance Fee is calculated **entirely from Raw Transaction Data** using the following formula:

```
Performance Fee = Reactivation Revenue × Agreed Percentage
```

Where:
- **Reactivation Revenue** = Sum of all transaction amounts from Reactivated Customers within the Attribution Window (calculated automatically by the CRM System)
- **Agreed Percentage** = As specified in Schedule A (default: 15%)

**(b) Automatic Metric Calculation**

The following metrics are calculated automatically by the CRM System from Raw Transaction Data. **The Client does NOT input, estimate, or configure these values:**
- Average Order Value (AOV)
- Customer Lifetime Value (CLV)
- Reactivation Rate
- Dormancy Rate
- Revenue per Reactivated Customer
- Campaign ROI

**(c) Fee Floor and Cap**

| Parameter | Value |
|---|---|
| Minimum Monthly Performance Fee | ₦0 (no reactivation = no fee) |
| Maximum Monthly Performance Fee | As specified in Schedule A (default: uncapped) |

**(d) Payment Terms**

Performance Fees are invoiced monthly, within five (5) business days of the end of each calendar month. Payment is due within fifteen (15) business days of invoice date. Late payments incur interest at 2% per month on the outstanding balance.

### 6.4 Monthly Management Retainer

For ongoing campaign management, optimisation, and reporting:

| Service Level | Monthly Retainer (₦) |
|---|---|
| Standard (up to 5,000 contacts) | ₦100,000 |
| Professional (5,001 – 15,000 contacts) | ₦200,000 |
| Enterprise (15,001+ contacts) | Custom quote |

The retainer covers: campaign monitoring, A/B testing, sequence optimisation, monthly reporting, and up to two (2) strategy calls per month.

### 6.5 Communication Cost Controls

**(a) Monthly Cost Caps**

The Client may configure a monthly communication cost cap within the CRM System. When the cap is reached, automated campaigns will pause until the next billing cycle or until the Client raises the cap.

**(b) Real-Time Cost Dashboard**

The Client shall have access to a real-time dashboard within the CRM System showing:
- Current month communication spend by channel
- Cost per message by channel
- Projected monthly spend based on current run rate
- Historical spend trends

**(c) No Hidden Fees**

M4E shall not charge any fees beyond those explicitly described in this Section 6 and the applicable Schedules. All costs are transparent and auditable.

---

## 7. DEAL CONFIGURATION INDEMNITY

### 7.1 Client's Configuration Rights

The CRM System allows the Client to manually configure:
- Deal stages and pipeline structures
- Deal values and expected close dates
- Deal outcomes (won, lost, abandoned)
- Custom fields and tags on deals
- Automation triggers related to deal events

### 7.2 Indemnity

**The Client acknowledges that manual modifications to deal configurations, stages, and outcomes are made at their sole discretion. M4E bears no responsibility for business outcomes resulting from client-configured deal parameters.**

Without limiting the generality of the foregoing:
- M4E is not responsible for revenue projections based on Client-configured deal values
- M4E is not responsible for pipeline accuracy when the Client manually overrides automated deal progression
- M4E is not responsible for reporting discrepancies caused by Client modifications to deal stages or outcomes

### 7.3 Audit Trail

The CRM System logs all manual changes to deal configurations with:
- Timestamp of change
- User who made the change
- Previous value
- New value
- IP address of the session

These logs are available to both Parties and serve as the authoritative record in any dispute regarding deal configuration changes.

---

## 8. DATA PROCESSING AGREEMENT (DPA)

### 8.1 Compliance Framework

Both Parties shall comply with the Nigeria Data Protection Regulation (NDPR) 2019, the Nigeria Data Protection Act (NDPA) 2023, and any successor legislation. Where the Client operates internationally, the Parties shall also comply with applicable data protection laws in those jurisdictions (e.g., GDPR for EU data subjects).

### 8.2 Roles and Responsibilities

- **Client** is the Data Controller — the Client determines the purposes and means of processing customer personal data.
- **M4E** is the Data Processor — M4E processes customer personal data solely on behalf of and under the instructions of the Client for the purposes of delivering the Services.

### 8.3 Data Ownership

**The Client owns all customer data at all times.** M4E acquires no ownership rights over the Client's customer data by virtue of processing it under this Agreement.

### 8.4 Lawful Basis for Processing

The Client warrants that it has obtained all necessary consents or has another lawful basis under NDPR/NDPA for:
- Sharing customer personal data with M4E
- Sending marketing communications (email, WhatsApp, SMS) to customers
- Processing customer purchase data for analytics purposes

### 8.5 Data Handling

**(a) Storage**
- Customer data is stored in Supabase (PostgreSQL) hosted infrastructure
- All data is encrypted at rest (AES-256) and in transit (TLS 1.2+)
- API keys and sensitive credentials are encrypted using application-level encryption before storage

**(b) Access Controls**
- Access to customer data is restricted to authorised M4E personnel and the Client's designated users
- Role-based access control (RBAC) is enforced within the CRM System
- All data access is logged with user identity and timestamp

**(c) Data Minimisation**
- M4E processes only the minimum data necessary to deliver the Services
- No customer data is used for purposes other than those specified in this Agreement

### 8.6 Data Retention

| Data Type | Retention Period | After Retention |
|---|---|---|
| Customer contact records | Duration of Agreement + 90 days | Deleted or exported to Client |
| Transaction data | Duration of Agreement + 90 days | Deleted or exported to Client |
| Campaign engagement logs | Duration of Agreement + 180 days | Anonymised or deleted |
| Automation logs | Duration of Agreement + 90 days | Deleted |
| Aggregated analytics | Indefinite (anonymised) | Retained for benchmarking |

### 8.7 Data Deletion

Upon termination of this Agreement or upon written request by the Client:
- M4E shall delete all customer personal data within thirty (30) days
- M4E shall provide written confirmation of deletion
- Anonymised, aggregated data may be retained for internal benchmarking

### 8.8 Data Breach Notification

In the event of a personal data breach:
1. M4E shall notify the Client within **72 hours** of becoming aware of the breach
2. Notification shall include: nature of the breach, categories of data affected, estimated number of records, likely consequences, and measures taken
3. M4E shall cooperate with the Client in notifying the Nigeria Data Protection Commission (NDPC) and affected data subjects as required by law

### 8.9 Sub-Processors

M4E uses the following sub-processors for service delivery:

| Sub-Processor | Purpose | Data Location |
|---|---|---|
| Supabase | Database hosting | Cloud (US/EU) |
| Meta (WhatsApp Business API) | WhatsApp messaging | Global |
| Brevo | Email and SMS delivery | EU |
| Vercel | Application hosting | Global (Edge) |

M4E shall notify the Client before engaging any new sub-processor and shall ensure all sub-processors are bound by data processing obligations no less protective than those in this Agreement.

---

## 9. TERMINATION & DATA MIGRATION

### 9.1 Termination for Convenience

Either Party may terminate this Agreement by providing **thirty (30) days' written notice** to the other Party.

### 9.2 Termination for Cause

Either Party may terminate this Agreement immediately upon written notice if:
- The other Party commits a material breach and fails to cure within fifteen (15) days of written notice
- The other Party becomes insolvent, enters liquidation, or ceases business operations
- The Client commits a third offence under Section 5.5 (Deliberate Misreporting)

### 9.3 Effect of Termination

Upon termination:

**(a) Data Export**
- M4E shall provide the Client with a complete export of all customer data within fifteen (15) business days
- Export formats: CSV, JSON, or SQL dump (Client's choice)
- Export includes: contacts, conversations, messages, deals, automation logs, campaign performance data

**(b) Migration Assistance**
- M4E shall provide reasonable assistance for data migration to the Client's chosen platform
- If the Client is migrating to Chatwoot or another supported platform, M4E shall provide migration scripts and documentation
- Migration assistance beyond five (5) hours shall be billed at M4E's standard consulting rate

**(c) Outstanding Payments**
- All fees accrued up to the termination date remain payable
- Performance Fees for the final month shall be calculated on a pro-rata basis
- Communication costs incurred up to termination are payable in full

**(d) Data Deletion**
- Following successful data export and confirmation by the Client, M4E shall delete all customer data per Section 8.7

### 9.4 Survival

Sections 5 (Payment Data Authenticity), 7 (Deal Configuration Indemnity), 8 (Data Processing), 12 (Confidentiality), 13 (Limitation of Liability), and 15 (Dispute Resolution) shall survive termination of this Agreement.

---

## 10. COMMUNICATION COSTS TRANSPARENCY

### 10.1 Itemised Billing

All communication costs shall be itemised in monthly invoices showing:

| Line Item | Detail |
|---|---|
| WhatsApp conversations | Count by type (marketing, utility, service) with per-conversation cost |
| Emails sent | Count with per-email cost (or free tier usage) |
| SMS messages | Count by segment with per-segment cost |
| Total communication cost | Sum of all channels |

### 10.2 Real-Time Dashboard Access

The Client shall have 24/7 access to the CRM System's cost tracking dashboard, which displays:
- Current billing period spend by channel
- Daily and weekly spend trends
- Cost per reactivated customer
- Projected monthly spend
- Comparison to previous periods

### 10.3 Monthly Cost Caps

The Client may set monthly communication cost caps per channel:
- When a cap is reached, the CRM System pauses automated sending on that channel
- The Client is notified immediately when 80% and 100% of a cap is reached
- Caps can be adjusted at any time through the CRM System settings

### 10.4 No Hidden Fees

M4E warrants that:
- No markup is applied to communication costs
- No additional platform fees, technology fees, or access fees are charged beyond those in Section 6
- All third-party costs are passed through at the exact rate charged to M4E

---

## 11. ADD-ON FLEXIBILITY

### 11.1 Independent Activation

Each add-on service described in Section 3.2 operates independently of the Core Service and other add-ons. The Client may:
- Activate any add-on at any time during the Agreement term
- Deactivate any add-on with fifteen (15) days' written notice
- Activate multiple add-ons simultaneously
- Request modifications to active add-ons

### 11.2 Separate Pricing

Each add-on is priced independently as specified in Schedule B. Add-on fees are in addition to the Core Service fees in Section 6.

### 11.3 Custom Solution Requests

The Client may request strategy analysis for custom add-ons at any time by:
1. Submitting a written brief describing the business challenge or opportunity
2. M4E conducts research and analysis (up to 5 hours included in the management retainer)
3. M4E presents findings and a proposal for custom solution development
4. If the Client approves, a separate scope of work and pricing is agreed before work begins

---

## 12. CONFIDENTIALITY & NON-COMPETE

### 12.1 Confidential Information

Each Party acknowledges that it may receive confidential information from the other Party, including but not limited to: business strategies, customer data, pricing information, technical systems, and proprietary methodologies.

### 12.2 Obligations

Each Party shall:
- Use Confidential Information solely for the purposes of this Agreement
- Not disclose Confidential Information to any third party without prior written consent
- Protect Confidential Information with at least the same degree of care used for its own confidential information
- Limit access to Confidential Information to personnel who need it for service delivery

### 12.3 Exceptions

Confidentiality obligations do not apply to information that:
- Is or becomes publicly available through no fault of the receiving Party
- Was known to the receiving Party before disclosure
- Is independently developed without reference to Confidential Information
- Is required to be disclosed by law or court order (with prompt notice to the disclosing Party)

### 12.4 Non-Solicitation

During the term of this Agreement and for twelve (12) months following termination, neither Party shall directly solicit or hire employees or contractors of the other Party who were involved in delivering the Services.

---

## 13. LIMITATION OF LIABILITY

### 13.1 Cap on Liability

M4E's total aggregate liability under this Agreement shall not exceed the total fees paid by the Client to M4E in the twelve (12) months preceding the event giving rise to the claim.

### 13.2 Exclusion of Consequential Damages

Neither Party shall be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to: loss of profits, loss of revenue, loss of business opportunities, or loss of data, even if advised of the possibility of such damages.

### 13.3 Exceptions

The limitations in Sections 13.1 and 13.2 shall not apply to:
- Breaches of Section 12 (Confidentiality)
- Breaches of Section 8 (Data Processing)
- Fraud or wilful misconduct
- Indemnification obligations under Section 7 (Deal Configuration Indemnity)

### 13.4 Force Majeure

Neither Party shall be liable for failure to perform obligations due to events beyond reasonable control, including but not limited to: natural disasters, government actions, internet outages, third-party service provider failures (Meta, Brevo, Supabase), or pandemic-related disruptions.

---

## 14. GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the **laws of the Federal Republic of Nigeria**.

---

## 15. DISPUTE RESOLUTION

### 15.1 Negotiation

The Parties shall first attempt to resolve any dispute arising from this Agreement through good-faith negotiation between senior representatives within fifteen (15) business days of written notice of the dispute.

### 15.2 Mediation

If negotiation fails, the Parties shall submit the dispute to mediation under the rules of the Lagos Court of Arbitration (LCA) or another mutually agreed mediation body.

### 15.3 Arbitration

If mediation fails within thirty (30) days, the dispute shall be resolved by binding arbitration under the Arbitration and Mediation Act 2023 of Nigeria. The arbitration shall be conducted in Lagos, Nigeria, in the English language, by a single arbitrator appointed by mutual agreement or, failing agreement, by the LCA.

### 15.4 Injunctive Relief

Nothing in this Section prevents either Party from seeking injunctive or other equitable relief from a court of competent jurisdiction to prevent irreparable harm.

---

## 16. GENERAL PROVISIONS

### 16.1 Entire Agreement

This Agreement, together with all Schedules, constitutes the entire agreement between the Parties and supersedes all prior negotiations, representations, and agreements.

### 16.2 Amendments

No amendment to this Agreement shall be effective unless made in writing and signed by both Parties.

### 16.3 Severability

If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

### 16.4 Waiver

Failure by either Party to enforce any provision shall not constitute a waiver of that provision or the right to enforce it later.

### 16.5 Assignment

Neither Party may assign this Agreement without the prior written consent of the other Party, except in connection with a merger, acquisition, or sale of substantially all assets.

### 16.6 Notices

All notices under this Agreement shall be in writing and delivered by email (with read receipt confirmation) or registered post to the addresses specified above.

---

## SCHEDULE A: SERVICE CONFIGURATION

*To be completed at onboarding:*

| Parameter | Value |
|---|---|
| Database Size (estimated contacts) | _________________ |
| Attribution Window | ☐ 7 days  ☐ 14 days (default)  ☐ 30 days |
| Performance Fee Percentage | ______% (default: 15%) |
| Monthly Performance Fee Cap | ₦_____________ (default: uncapped) |
| Data Upload Frequency | ☐ Weekly  ☐ Bi-weekly  ☐ Monthly |
| Monthly Communication Cost Cap | ₦_____________ (default: uncapped) |
| Channels Enabled | ☐ Email  ☐ WhatsApp  ☐ SMS |
| Reporting Frequency | ☐ Weekly  ☐ Monthly (default) |
| Primary Contact (Client) | _________________ |
| Primary Contact (M4E) | _________________ |

---

## SCHEDULE B: ADD-ON PRICING

| Add-On | Setup Fee (₦) | Monthly Fee (₦) | Notes |
|---|---|---|---|
| GMB Review Generation | ₦50,000 | ₦30,000 | Includes up to 100 review requests/month |
| Video Testimonial Collection | ₦75,000 | ₦50,000 | Includes storage up to 10GB |
| Referral Program Management | ₦100,000 | ₦75,000 | Includes tracking and reward management |
| Advanced Analytics | ₦50,000 | ₦50,000 | Custom dashboards and quarterly reviews |

*Pricing effective as of the Effective Date. M4E reserves the right to adjust add-on pricing with 30 days' written notice.*

---

## SIGNATURES

### Service Provider: Marketing4Effect (M4E)

| | |
|---|---|
| Signature | _________________________________ |
| Name | _________________________________ |
| Title | _________________________________ |
| Date | _________________________________ |

### Client

| | |
|---|---|
| Signature | _________________________________ |
| Name | _________________________________ |
| Title | _________________________________ |
| Date | _________________________________ |

---

*This Agreement is executed in two (2) counterparts, each of which shall be deemed an original.*

---

**Document Version:** 1.0  
**Last Updated:** June 2025  
**Template ID:** M4E-DBRA-2025-001
