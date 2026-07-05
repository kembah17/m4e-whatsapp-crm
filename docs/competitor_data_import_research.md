# Competitor Data Import Research: WhatsApp CRM Platforms
## Competitive Intelligence Report for Marketing4Effect
**Date:** 2026-07-05 | **Prepared by:** M4E Research Team

---

## Executive Summary

This report provides comprehensive competitive intelligence on how 8 WhatsApp CRM platforms handle customer data import, with special focus on small/mid-market businesses in Nigeria and Africa. The research covers import formats, WhatsApp-based import capabilities, email-based import, mobile contact export workflows, innovative approaches, and data validation/deduplication.

### Key Finding
**CSV is the universal import format across all platforms.** No platform natively supports vCard import, WhatsApp-based bulk import, or email-based import. This represents a significant opportunity for M4E's CRM to differentiate by supporting multiple import channels including WhatsApp-based contact submission.

---

## Platform-by-Platform Analysis

### 1. Siteti (Nigerian WhatsApp CRM)
**Website:** [siteti.com](https://siteti.com) | **HQ:** Ajah, Lagos, Nigeria | **Pricing:** Naira-native

#### Import Methods
| Feature | Support | Details |
|---------|---------|--------|
| **CSV** | ✅ Yes | Standard CSV file upload via dashboard |
| **Excel (.xlsx)** | ✅ Yes | Direct Excel file upload supported |
| **Google Sheets** | ✅ Yes | Import directly from Google Sheets — unique among competitors |
| **vCard (.vcf)** | ❌ No | Not mentioned in documentation |
| **API Import** | ✅ Yes | API keys available for custom integrations |
| **WhatsApp-based Import** | ❌ No | Not supported for bulk import |
| **Email-based Import** | ❌ No | Not supported |

#### Contact Management & Segmentation
- **Lead Segmentation:** Contacts can be organized into **hot, warm, or opportunity** groups for precise targeting
- **Sales Rep Assignment:** Specific segments can be assigned to sales reps for follow-up
- **Broadcast Integration:** Segmented contacts can be targeted with broadcast messages
- **Chatbot Flow Integration:** Contacts feed into chatbot automation flows

#### Unique/Innovative Approaches
- **Google Sheets Direct Import:** Siteti is the only platform in this comparison that supports direct Google Sheets import, which is significant for Nigerian SMEs who often maintain customer lists in Google Sheets
- **Naira Billing:** 100% Naira billing eliminates FX volatility — a major differentiator for Nigerian businesses
- **Multi-agent Shared Inbox:** Contacts imported are immediately available across all agents
- **Paystack/Flutterwave Integration:** Local payment gateway integration for Nigerian businesses

#### Data Validation & Deduplication
- Specific validation/deduplication mechanisms not publicly documented
- Phone numbers likely used as primary identifiers given WhatsApp API requirements
- Country code handling details not specified in public documentation

#### Competitive Assessment for M4E
- **Threat Level:** HIGH — Direct Nigerian competitor with Naira pricing
- **Strengths:** Google Sheets import, local payment, Nigerian market focus
- **Weaknesses:** Limited public documentation on data validation, no vCard support
- **M4E Opportunity:** Surpass with WhatsApp-based import, vCard support, OCR for paper contacts

---

### 2. Respond.io
**Website:** [respond.io](https://respond.io) | **HQ:** Malaysia | **Pricing:** USD

#### Import Methods
| Feature | Support | Details |
|---------|---------|--------|
| **CSV** | ✅ Yes | Only CSV accepted; max 20MB, <200K rows |
| **Excel (.xlsx)** | ❌ No | Must export to CSV first |
| **Google Sheets** | ❌ No | Must export to CSV first |
| **vCard (.vcf)** | ❌ No | Not supported |
| **API Import** | ✅ Yes | Full API available |
| **WhatsApp-based Import** | ❌ No | Only organic contact creation via conversations |
| **Email-based Import** | ❌ No | Email used only for import result notifications |

#### Import Process (3-Step)
1. **Upload:** CSV file with E.164 phone numbers, First Name required
2. **Map:** Align CSV headers to contact fields (auto-maps matching names)
3. **Review:** Validation report showing adds/updates/skips before committing

#### Import Purposes (4 Options)
| Purpose | Behavior |
|---------|----------|
| Add new contacts only | Skips existing matches |
| Update existing only | Updates matched records, ignores new |
| Add & update | Creates new + updates existing |
| Add all despite duplicates | No dedup — creates all as new |

#### Data Validation & Deduplication
- **Identifiers:** Phone number, email, or contact ID for matching
- **Phone Format:** E.164 required (e.g., +234803xxxxxxx)
- **Date Format:** YYYY-MM-DD required
- **Error Handling:** Downloadable error CSV with "Error" column describing issues per row
- **Batch Tags:** Auto-generated import tag for each batch (removable)
- **Results File:** Available for 7 days via dashboard and email

#### Unique/Innovative Approaches
- **Multi-purpose imports** with explicit dedup strategy selection
- **Error file download** for iterative data cleaning
- **Batch tagging** for tracking import sources
- **Segment builder** with filters (channel, tags, last interaction, time-based)

#### Competitive Assessment for M4E
- **Threat Level:** MEDIUM — Strong platform but USD pricing disadvantages it in Nigeria
- **Strengths:** Sophisticated import with 4 purpose modes, excellent error handling
- **Weaknesses:** CSV-only, no Excel/Sheets, USD pricing, no African market focus
- **M4E Opportunity:** Match import sophistication while adding Nigerian-specific features

---

### 3. WATI
**Website:** [wati.io](https://wati.io) | **HQ:** Hong Kong | **Pricing:** USD

#### Import Methods
| Feature | Support | Details |
|---------|---------|--------|
| **CSV** | ✅ Yes | Strict format; max 1MB file size |
| **Excel (.xlsx)** | ⚠️ Partial | Sample "Excel" provided but must save as CSV |
| **Google Sheets** | ❌ No | Must export to CSV |
| **vCard (.vcf)** | ❌ No | Not supported |
| **API Import** | ✅ Yes | API available |
| **WhatsApp-based Import** | ❌ No | Not supported |
| **Email-based Import** | ❌ No | Not supported |

#### CSV Structure Requirements
- **Column Order:** Name, CountryCode, Phone (must be exact, in English)
- **CountryCode:** Numeric only, NO plus sign (e.g., "234" for Nigeria)
- **Phone:** Local number only, NO spaces/dashes, NO country code prefix
- **No Formulas:** Cells must contain plain text values only
- **No Empty Cells:** Must be removed before import
- **File Size:** Maximum 1MB per CSV

#### Additional Attributes
| Column | Purpose |
|--------|---------|
| Allow Broadcast | Permission for broadcast messages |
| Allow Campaign | Permission for campaign messages |
| Allow SMS | Permission for SMS messages |
| Custom Attributes (Col F+) | Any custom fields (City, Country, etc.) |

#### Data Validation & Deduplication
- **Strict column validation** — names must match exactly
- **No duplicate phone numbers** allowed in import file
- **Update/Skip options** during import for existing contacts
- **Export-to-CSV round-trip** for bulk attribute updates

#### Competitive Assessment for M4E
- **Threat Level:** MEDIUM — Popular but strict import limits
- **Strengths:** Clear structure, broadcast permission tracking, bulk attribute updates
- **Weaknesses:** 1MB file limit, very strict formatting, USD pricing
- **M4E Opportunity:** More flexible import with larger file limits and Nigerian phone number intelligence

---

### 4. Trengo
**Website:** [trengo.com](https://trengo.com) | **HQ:** Netherlands | **Pricing:** EUR

#### Import Methods
| Feature | Support | Details |
|---------|---------|--------|
| **CSV** | ✅ Yes | Standard CSV upload |
| **Plain Text Paste** | ✅ Yes | **Unique** — paste text with separators directly |
| **Excel (.xlsx)** | ❌ No | Must export to CSV |
| **vCard (.vcf)** | ❌ No | Not supported |
| **API Import** | ✅ Yes | API available |
| **WhatsApp-based Import** | ❌ No | Not supported |
| **Email-based Import** | ❌ No | Not supported |

#### Import Process
1. Navigate to Contacts → Import contacts
2. Choose: **Upload CSV file** OR **Paste plain text**
3. Select separator (comma, semicolon, tab)
4. Configure: Assign to contact groups, map values
5. Confirm import

#### Unique/Innovative Approaches
- **Plain Text Paste Import:** Allows pasting contact data directly from text files, chat logs, SMS exports, or notes — highly relevant for African SMEs with informal data sources
- **Contact Groups:** Assign contacts to groups during import for immediate segmentation
- **Flexible Separators:** Supports comma, semicolon, and tab separators

#### Data Validation & Deduplication
- Limited public documentation on specific validation rules
- Phone numbers likely serve as unique identifiers
- Group-based organization helps manage imported contacts

#### Competitive Assessment for M4E
- **Threat Level:** LOW — European focus, EUR pricing
- **Strengths:** Plain text paste is innovative for informal data sources
- **Weaknesses:** Limited African market presence, EUR pricing
- **M4E Opportunity:** Adopt plain text paste concept for Nigerian market

---

### 5. Interakt (Indian Market — Similar to Nigeria)
**Website:** [interakt.shop](https://interakt.shop) | **HQ:** India | **Pricing:** INR

#### Import Methods
| Feature | Support | Details |
|---------|---------|--------|
| **CSV** | ✅ Yes | Up to 50MB, 500K contacts per file |
| **Excel (.xlsx)** | ❌ No | Must export to CSV |
| **Google Sheets** | ❌ No | Must export to CSV |
| **vCard (.vcf)** | ❌ No | Not supported |
| **API Import** | ✅ Yes | API available |
| **WhatsApp-based Import** | ❌ No | Not supported |
| **Email-based Import** | ❌ No | Not supported |

#### CSV Structure Requirements
- **Mandatory:** Name, Country Code, Phone Number
- **Name:** Letters only (no numbers/special characters)
- **Country Code:** Numeric only, no plus sign
- **Phone Number:** Numeric only, no country code, no spaces/special chars
- **No Duplicates:** Phone Number column must not contain duplicates
- **File Limit:** 50MB, up to 500,000 contacts (highest among competitors)

#### Special Columns
| Column | Type | Purpose |
|--------|------|---------|
| WhatsApp Opted | TRUE/FALSE | Consent tracking for WhatsApp messaging |
| User ID | String | Internal identifier |
| Custom Traits | Various | Gender, Age Group, City, Customer Type, Lifetime Value, etc. |
| Date-Time Traits | ISO format | birth_date, last_order_date, etc. |

#### Data Validation & Deduplication
- **Phone-based matching:** Existing contacts updated based on phone number match
- **Duplicate rejection:** Duplicate phone numbers in CSV may not be added
- **Attribute mapping:** Must map CSV columns to existing system attributes
- **Consent tracking:** WhatsApp Opted column for opt-in status

#### Competitive Assessment for M4E
- **Threat Level:** LOW-MEDIUM — Indian market focus but similar emerging market dynamics
- **Strengths:** Highest capacity (500K contacts), rich attribute support, consent tracking
- **Weaknesses:** No African market presence, INR pricing
- **M4E Opportunity:** Match capacity and consent features, add Nigerian-specific attributes

---

### 6. Zoko
**Website:** [zoko.io](https://zoko.io) | **HQ:** India | **Pricing:** USD

#### Import Methods
| Feature | Support | Details |
|---------|---------|--------|
| **CSV** | ✅ Yes | Upload via dashboard |
| **Manual Entry** | ✅ Yes | Add contacts individually |
| **Shopify Sync** | ✅ Yes | **Automatic** contact sync with Shopify |
| **CRM Integration** | ✅ Yes | Import from HubSpot and other CRMs |
| **vCard (.vcf)** | ❌ No | Not supported |
| **WhatsApp-based Import** | ⚠️ Partial | QR codes and wa.me links for contact acquisition |
| **Email-based Import** | ❌ No | Not supported |

#### Contact Acquisition Methods
- **Shopify Auto-Sync:** Contacts stay updated automatically — even with zero orders
- **QR Code Chat-Ins:** Customers scan QR to start WhatsApp chat (auto-creates contact)
- **wa.me Links:** Clickable links that open WhatsApp chat with business
- **Link Creator Feature:** Built-in tool for creating contact acquisition links

#### Contact Management
- **Tagging:** Tag contacts by preferences, purchase history, engagement level
- **Purchase History Tracking:** Uses Shopify order data for personalized offers
- **Automation Journeys:** Welcome messages, post-purchase follow-ups
- **Bulk Messaging:** With opt-in rule compliance
- **Message Analytics:** Track contact interaction with messages

#### Data Validation & Deduplication
- Shopify sync handles deduplication automatically
- Cloud-based centralized data management
- Encrypted messages and contact information
- Consent management and opt-in tracking

#### Competitive Assessment for M4E
- **Threat Level:** LOW — E-commerce focused, USD pricing
- **Strengths:** Shopify integration, QR code acquisition, automation journeys
- **Weaknesses:** E-commerce centric, no African market focus
- **M4E Opportunity:** Adopt QR code and wa.me link concepts for Nigerian retail clients

---

### 7. Simpu (Nigerian)
**Website:** [simpu.co](https://simpu.co) | **HQ:** Nigeria | **Pricing:** Not publicly listed

#### Import Methods
| Feature | Support | Details |
|---------|---------|--------|
| **CSV** | ✅ Yes | Via SDK file upload hook (useSimpuFileUpload) |
| **Excel (.xlsx)** | ✅ Yes | SDK supports Excel file processing |
| **API Import** | ✅ Yes | Full REST API with List/Contact CRUD endpoints |
| **vCard (.vcf)** | ❌ No | Not mentioned |
| **WhatsApp-based Import** | ❌ No | Not supported |
| **Email-based Import** | ❌ No | Not supported |

#### Platform Overview
- **Omnichannel Inbox:** Email, WhatsApp, SMS, Facebook, Instagram, Twitter, iMessage, live chat
- **Contact Identity Merging:** Can merge different social profiles of same contact as one identity
- **Campaign Recipients:** CSV/Excel file processing specifically for campaign recipient lists
- **API-First Architecture:** List system with Get, Query, Create, Update, Delete endpoints

#### Contact Management
- **List System:** Contacts organized in lists via API
- **Query/Filter:** Row-level querying within contact lists
- **Multi-Channel Identity:** Unified contact across messaging channels
- **Email & SMS Marketing:** Built-in campaign tools

#### Data Validation & Deduplication
- Contact identity merging across channels (unique feature)
- API-based validation possible through custom integrations
- Specific import validation rules not publicly documented

#### Competitive Assessment for M4E
- **Threat Level:** MEDIUM — Nigerian competitor with omnichannel approach
- **Strengths:** Multi-channel identity merging, Nigerian market, API-first
- **Weaknesses:** Limited public documentation, less WhatsApp-specific than M4E
- **M4E Opportunity:** Deeper WhatsApp specialization, better import UX, Naira pricing

---

### 8. Termii (Nigerian)
**Website:** [termii.com](https://termii.com) | **HQ:** Nigeria | **Pricing:** Naira-native

#### Import Methods
| Feature | Support | Details |
|---------|---------|--------|
| **CSV** | ✅ Yes | Primary import method via dashboard |
| **Excel (.xlsx)** | ⚠️ Partial | Prepare in Excel, must save as CSV |
| **Google Sheets** | ⚠️ Partial | Prepare in Sheets, must save as CSV |
| **API Import** | ✅ Yes | Phonebook API with fetch endpoint |
| **vCard (.vcf)** | ❌ No | Not supported |
| **WhatsApp-based Import** | ❌ No | Not supported |
| **Email-based Import** | ❌ No | Not supported |

#### Import Process
1. **Consent First:** Obtain consent from subscribers before importing
2. **Create Phonebook:** Set up phonebook in Termii dashboard
3. **Prepare CSV:** Build in Google Sheets/Excel with labeled columns
4. **Minimal Data OK:** Can upload phone numbers only (other columns optional)
5. **Upload:** Browse and select CSV, assign country code and phonebook
6. **Async Processing:** "Contacts is been uploaded in the background"

#### Phonebook System
- Contacts organized into **phonebooks** (logical groupings)
- Phonebooks can represent campaigns, regions, customer categories
- Country code mapping during upload
- API endpoint: `GET /api/phonebooks/{phonebook_id}/contacts`

#### Data Validation & Deduplication
- **Consent-first approach** — emphasized before any technical steps
- Country code validation during upload
- Phone numbers as primary identifiers
- Minimal data requirement (phone number only) lowers barrier
- Specific deduplication behavior not extensively documented

#### Competitive Assessment for M4E
- **Threat Level:** MEDIUM — Nigerian, Naira-native, but SMS-focused
- **Strengths:** Consent-first approach, minimal data requirement, Naira pricing, API
- **Weaknesses:** SMS-focused rather than WhatsApp CRM, limited import sophistication
- **M4E Opportunity:** WhatsApp-specific CRM features that Termii lacks

---

## Comparative Matrix

### Import Format Support

| Platform | CSV | Excel | Google Sheets | vCard | API | Plain Text |
|----------|-----|-------|---------------|-------|-----|------------|
| **Siteti** 🇳🇬 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Respond.io** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **WATI** | ✅ | ⚠️ | ❌ | ❌ | ✅ | ❌ |
| **Trengo** | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Interakt** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Zoko** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Simpu** 🇳🇬 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Termii** 🇳🇬 | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ❌ |

### Import Channel Support

| Platform | Dashboard Upload | WhatsApp Import | Email Import | Shopify Sync | QR/Link Capture |
|----------|-----------------|-----------------|--------------|--------------|------------------|
| **Siteti** 🇳🇬 | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Respond.io** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **WATI** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Trengo** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Interakt** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Zoko** | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Simpu** 🇳🇬 | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Termii** 🇳🇬 | ✅ | ❌ | ❌ | ❌ | ❌ |

### Data Validation & Deduplication

| Platform | Phone Dedup | Consent Tracking | Error Reports | Batch Tags | Max File/Contacts |
|----------|-------------|------------------|---------------|------------|-------------------|
| **Siteti** 🇳🇬 | Unknown | Unknown | Unknown | Unknown | Unknown |
| **Respond.io** | ✅ 4 modes | ❌ Manual | ✅ CSV download | ✅ Auto-tag | 20MB / 200K |
| **WATI** | ✅ Reject | ✅ Allow Broadcast | ❌ | ❌ | 1MB / Unknown |
| **Trengo** | Likely | ❌ | ❌ | ❌ | Unknown |
| **Interakt** | ✅ Reject+Update | ✅ WhatsApp Opted | ❌ | ✅ Tags | 50MB / 500K |
| **Zoko** | ✅ Shopify | ✅ Opt-in tracking | ❌ | ✅ Tags | Unknown |
| **Simpu** 🇳🇬 | ✅ Identity merge | ❌ | ❌ | ❌ | Unknown |
| **Termii** 🇳🇬 | Likely | ✅ Consent-first | ❌ | ❌ | Unknown |

---

## Mobile Contact Export Methods

### Android Contact Export

| Method | Steps | Output Format | Best For |
|--------|-------|---------------|----------|
| **Built-in Contacts App** | Contacts → Menu → Manage → Export → .vcf | vCard (.vcf) | Quick full export |
| **Google Contacts Web** | contacts.google.com → Select → Export | vCard or CSV | Conversion to CSV |
| **Share Individual** | Open contact → Share → Choose destination | vCard (.vcf) | Small batches (<10) |
| **ADB (Developer)** | USB debug → adb pull contacts.vcf | vCard (.vcf) | Technical users |

#### Android Variant Menu Paths
| Brand | Path |
|-------|------|
| **Stock Android/Pixel** | Contacts → Fix and manage → Export to file |
| **Samsung One UI** | Contacts → ☰ → Manage contacts → Export contacts |
| **Xiaomi MIUI** | Contacts → Settings (gear) → Import/Export → Export to storage |
| **OnePlus OxygenOS** | Contacts → ⋮ → Import/Export → Export to .vcf file |

### iPhone Contact Export

| Method | Steps | Output Format | Best For |
|--------|-------|---------------|----------|
| **iCloud Web** | iCloud.com → Contacts → Select → Export | vCard (.vcf) | Full export |
| **Share via Apps** | Contacts → Select → Share → Email/AirDrop | vCard (.vcf) | Individual/small batch |
| **Third-party Apps** | Various App Store apps | vCard or CSV | Bulk export with conversion |

### vCard to CSV Conversion Workflow

```
Phone Contacts → Export to .vcf → Import to Google Contacts → Export as CSV → Clean/Normalize → Import to CRM
```

**Key Steps:**
1. Export contacts from phone as .vcf file
2. Import .vcf into Google Contacts (contacts.google.com → Import)
3. Export from Google Contacts as CSV
4. Clean CSV: normalize phone numbers, split country codes, remove duplicates
5. Format columns to match target CRM requirements
6. Import into WhatsApp CRM platform

---

## WhatsApp Cloud API: vCard/Contact Message Support

### What the API Supports
- **Receiving Contact Cards:** When a user sends a contact card in WhatsApp, the Cloud API delivers a webhook payload with contact data (name, phone numbers) in a vCard-like structure
- **Sending Contact Cards:** Businesses can send contact cards to users via the messages API
- **Message Type:** `contacts` type in webhook payload

### What the API Does NOT Support
- **Bulk vCard Upload:** No endpoint to upload large .vcf files as address books
- **Bulk Contact Import via Messages:** Not designed for thousands of contact cards
- **Direct CRM Sync:** No built-in mechanism to sync device contacts to CRM

### Practical Implications
- Contact cards received via WhatsApp can be parsed and added to CRM individually
- This is useful for **lead enrichment** (customer shares a friend's contact) but NOT for bulk migration
- Sending thousands of contact cards via WhatsApp would be impractical and rate-limited
- **Organic contact creation** happens when new customers message the business number

### Webhook Payload Structure (Contact Message)
```json
{
  "messages": [{
    "type": "contacts",
    "contacts": [{
      "name": {
        "formatted_name": "John Doe",
        "first_name": "John",
        "last_name": "Doe"
      },
      "phones": [{
        "phone": "+2348031234567",
        "type": "CELL"
      }]
    }]
  }]
}
```

---

## Best Practices for Bulk Contact Import in African Markets

### Challenge: Fragmented Data Sources

Nigerian SMEs typically store customer contacts across:
- 📱 **Personal phones** (Android/iPhone contacts)
- 📓 **Paper notebooks** (handwritten names and numbers)
- 📊 **Basic spreadsheets** (Excel/Google Sheets, often inconsistent)
- 💬 **WhatsApp chat history** (contacts accumulated over years)
- 📇 **SIM card contacts** (especially on feature phones)
- 🏪 **POS/receipt systems** (for retail businesses)

### Recommended Import Workflow for Nigerian SMEs

#### Phase 1: Data Collection
1. **Phone Contacts:** Export to .vcf from all staff phones
2. **Paper Notebooks:** Transcribe to Google Sheets (name + phone minimum)
3. **Existing Spreadsheets:** Consolidate into single master sheet
4. **WhatsApp Contacts:** Export from WhatsApp Business app if available
5. **SIM Contacts:** Copy SIM contacts to phone, then export

#### Phase 2: Data Normalization
1. **Phone Number Standardization:**
   - Remove leading "0" from Nigerian numbers (080... → 803...)
   - Add country code: "234" in separate column or "+234" prefix
   - Remove spaces, dashes, parentheses
   - Validate: Nigerian mobile numbers are 10 digits after country code
2. **Name Cleaning:**
   - Separate first/last names if required
   - Remove special characters
   - Handle "Alhaji", "Chief", "Mrs" prefixes appropriately
3. **Deduplication:**
   - Sort by phone number, remove exact duplicates
   - Check for near-duplicates (same number, different formatting)
   - Merge records with most complete data

#### Phase 3: Consent Documentation
1. **Mark consent status** for each contact:
   - Existing customers who have messaged you = implied consent
   - Contacts from paper notebooks = need explicit opt-in
   - Purchased lists = DO NOT import (WhatsApp policy violation)
2. **Add consent column** to CSV (TRUE/FALSE or date of consent)
3. **Plan opt-in campaign** for contacts without explicit consent

#### Phase 4: Platform Import
1. **Format CSV** to match target platform requirements
2. **Test with small batch** (50-100 contacts) first
3. **Import in batches** with source tags (e.g., "notebook-july2026", "phone-export")
4. **Verify** imported contacts appear correctly
5. **Run deduplication** against existing contacts in platform

### Nigerian Phone Number Formats

| Format | Example | Use Case |
|--------|---------|----------|
| Local (with leading 0) | 08031234567 | Domestic dialing |
| Local (without leading 0) | 8031234567 | Some CRM formats |
| International (with +) | +2348031234567 | E.164 standard |
| Split (CountryCode + Phone) | 234 \| 8031234567 | WATI, Interakt format |

### Common Nigerian Mobile Prefixes
| Prefix | Network |
|--------|---------|
| 0803, 0806, 0813, 0816, 0810, 0814, 0903, 0906, 0913, 0916 | MTN |
| 0805, 0807, 0815, 0811, 0905, 0915 | Glo |
| 0802, 0808, 0812, 0701, 0902, 0901, 0904, 0907, 0912 | Airtel |
| 0809, 0817, 0818, 0909, 0908 | 9mobile |

---

## Strategic Opportunities for M4E CRM

### Gap Analysis: What NO Competitor Offers

| Feature Gap | Opportunity for M4E |
|-------------|--------------------|
| **vCard Direct Import** | Accept .vcf files directly — skip CSV conversion |
| **WhatsApp-based Import** | Let clients send contact cards or files via WhatsApp |
| **Email-based Import** | Parse CSV/Excel attachments from client emails |
| **OCR for Paper Contacts** | Photograph notebook pages → extract contacts via AI |
| **Phone Contact Sync** | Mobile app or PWA that reads device contacts directly |
| **Nigerian Number Intelligence** | Auto-detect network, validate format, normalize |
| **Pidgin English Support** | Contact notes and tags in Pidgin |
| **Consent Wizard** | Guided consent collection for imported contacts |

### M4E's Existing Advantage
From the CRM codebase, M4E already has:
- ✅ **Data Import OCR via Gemini 2.0 Flash** (Batch 6 implementation)
- ✅ **Multi-identifier contact resolution** (BSUID → Phone → Username cascade)
- ✅ **Naira-native pricing** (like Siteti and Termii)
- ✅ **Nigerian market focus** with Pidgin awareness
- ✅ **WhatsApp Business API integration** (Meta Embedded Signup)

### Recommended Priority Features for M4E Import System

1. **🔴 HIGH:** CSV + Excel + Google Sheets import (match Siteti)
2. **🔴 HIGH:** vCard (.vcf) direct import (unique differentiator)
3. **🔴 HIGH:** Nigerian phone number auto-normalization
4. **🟡 MEDIUM:** WhatsApp-based contact submission (client sends file via WhatsApp)
5. **🟡 MEDIUM:** OCR import for photographed contact lists (leverage existing Gemini integration)
6. **🟡 MEDIUM:** Consent tracking columns (match Interakt/WATI)
7. **🟢 LOW:** Email-based import (parse attachments)
8. **🟢 LOW:** Plain text paste import (match Trengo)
9. **🟢 LOW:** QR code contact acquisition (match Zoko)

---

## Sources & References

1. Respond.io Documentation — Contact Import, Data Import Settings
2. WATI Help Center — Importing Contacts, Bulk Update Guide
3. Trengo Help Center — Import Contacts
4. Interakt Resource Center — Bulk Upload Guidelines
5. Termii Medium Blog — How to Import Contacts
6. Termii Developer Documentation — Phonebook API
7. Siteti.com — Features and Documentation
8. Zoko.io — Contact Management Blog
9. Simpu.co — API Documentation
10. Meta WhatsApp Cloud API — Messages Webhook Reference
11. Google Contacts Help — Export/Import
12. Android Contact Export Guides — Various OEM documentation
13. Clutch.co — Siteti Company Profile
14. TechCabal — Simpu Launch Coverage
15. NaijaTechGuide — WhatsApp Business API Price Guide

---

*Report compiled for Marketing4Effect competitive intelligence. Data current as of July 2026.*
