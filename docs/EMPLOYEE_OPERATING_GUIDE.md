# 📘 Customer Reactivation Manager — Employee & White-Label Partner Operating Guide

**Marketing4Effect (M4E) Internal Document**
**Version:** 2.0 | **Last Updated:** June 2026
**Classification:** Internal Use Only — M4E Staff & Authorized White-Label Partners

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Getting Access](#3-getting-access)
4. [Dashboard](#4-dashboard)
5. [Client Onboarding Workflow](#5-client-onboarding-workflow)
6. [Contact Management](#6-contact-management)
7. [Product Catalog](#7-product-catalog)
8. [Inbox & Messaging](#8-inbox--messaging)
9. [Campaigns](#9-campaigns)
10. [Broadcasts](#10-broadcasts)
11. [Automations](#11-automations)
12. [Flows](#12-flows)
13. [AI Chatbot](#13-ai-chatbot)
14. [E-Commerce Integration](#14-e-commerce-integration)
15. [Pipelines](#15-pipelines)
16. [Multi-Branch Management](#16-multi-branch-management)
17. [Team Management](#17-team-management)
18. [Settings Reference](#18-settings-reference)
19. [Admin Panel (Super Admin)](#19-admin-panel-super-admin)
20. [Monitoring & Security](#20-monitoring--security)
21. [Troubleshooting](#21-troubleshooting)
22. [Glossary](#22-glossary)

---

## 1. Introduction

### 1.1 What Is the Customer Reactivation Manager?

The Customer Reactivation Manager (CRM) is a WhatsApp-based customer relationship management platform built specifically for Nigerian businesses. It combines the power of the WhatsApp Business API with intelligent automation, AI-powered chatbots, multi-channel messaging, and a self-service campaign engine to help businesses re-engage dormant customers and drive revenue recovery.

Unlike traditional CRM software that relies on email and phone calls, the M4E CRM meets customers where they already are — on WhatsApp, the most-used messaging app in Nigeria with over 40 million active users.

### 1.2 Who Is This Guide For?

This guide is written for two audiences:

| Audience | Description |
|---|---|
| **M4E Employees** | Campaign managers, operations staff, and technical team members who manage the CRM on behalf of clients |
| **White-Label Partners** | Agency partners who license the CRM platform under their own brand to serve their own clients |

Both audiences need to understand every feature of the platform to deliver excellent service to end clients (business owners).

### 1.3 The M4E Business Model

Marketing4Effect operates the CRM as the core technology behind its **Database Reactivation Service** — a done-for-you campaign that recovers revenue from dormant customers. The service is sold as a project-based engagement:

| Component | Detail |
|---|---|
| **Primary Package** | Database Reactivation — ₦2,000,000 per campaign |
| **What's Included** | Data collection, cleaning, segmentation, campaign creation, execution, monitoring, and reporting |
| **Technology** | The CRM platform (this system) powers the entire operation |
| **Revenue Model** | Project fees + optional monthly retainer for ongoing campaigns |
| **White-Label** | Partners can resell the platform under their own brand |

### 1.4 Key Terminology

Before diving in, familiarize yourself with these terms used throughout this guide:

| Term | Meaning |
|---|---|
| **Account** | A client's workspace in the CRM — contains their contacts, messages, campaigns, and settings |
| **Contact** | A customer record — typically a phone number with associated name, email, tags, and purchase history |
| **Broadcast** | A bulk message sent to multiple contacts at once |
| **Campaign** | A pre-built, multi-step marketing sequence (e.g., Win-Back, Abandoned Cart) |
| **Automation** | An if-this-then-that rule that triggers actions automatically |
| **Flow** | A visual, branching conversation workflow for interactive WhatsApp menus |
| **Template** | A Meta-approved WhatsApp message format required for initiating conversations |
| **Recency Score** | A classification of how recently a customer last purchased (Active, Hot Dormant, Warm Dormant, Cold Dormant) |
| **Super Admin** | M4E staff with platform-wide access to all accounts and the admin panel |

---

## 2. System Architecture Overview

### 2.1 How the Parts Connect

The CRM is a modern web application with several integrated services. Here is a simplified view of how they connect:

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                           │
│              (Chrome, Firefox, Edge, Safari)                │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 NEXT.JS APPLICATION                         │
│                  (Hosted on Vercel)                         │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │Dashboard │  │  Inbox   │  │Campaigns │  │Admin Panel │  │
│  │Contacts  │  │Broadcasts│  │   Flows  │  │ Monitoring │  │
│  │Products  │  │Pipelines │  │Automations│  │ Analytics  │  │
│  │Settings  │  │AI Chatbot│  │E-Commerce│  │  Revenue   │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              70+ API Routes                          │   │
│  │  /api/whatsapp  /api/campaigns  /api/ai  /api/cron   │   │
│  │  /api/webhooks  /api/broadcasts /api/flows           │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│   SUPABASE   │ │  META    │ │   BREVO      │
│  (Database)  │ │(WhatsApp)│ │  (Email)     │
│              │ │          │ │              │
│ PostgreSQL   │ │ Cloud API│ │ SMTP + API   │
│ Auth         │ │ Webhooks │ │ 300 free/day │
│ Storage      │ │ Templates│ │              │
│ RLS Security │ │          │ │              │
└──────────────┘ └──────────┘ └──────────────┘
          │
          ├──── OpenRouter (AI Models for Chatbot)
          ├──── Shopify / WooCommerce (E-Commerce Webhooks)
          └──── Paystack / Flutterwave (Payments — Ready, Pending Activation)
```

### 2.2 Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) | User interface — all pages and interactions |
| **Backend** | Next.js API Routes | Server-side logic — 70+ endpoints |
| **Database** | Supabase (PostgreSQL) | Data storage — 27+ tables with Row Level Security |
| **Authentication** | Supabase Auth | Login, signup, password reset, session management |
| **WhatsApp** | Meta Cloud API | Send/receive WhatsApp messages |
| **Email** | Brevo (formerly Sendinblue) | Transactional and marketing emails (300 free/day) |
| **SMS** | Configurable provider | SMS messaging (future) |
| **AI** | OpenRouter (multiple models) | AI chatbot responses, intent detection |
| **E-Commerce** | Shopify + WooCommerce webhooks | Product, order, and cart synchronization |
| **Payments** | Paystack + Flutterwave | Payment processing (stubs ready, pending activation) |
| **Hosting** | Vercel | Application hosting with edge functions |
| **Monitoring** | Built-in cron system | Health checks, alerts, log management, security |

### 2.3 Multi-Tenant Architecture

The CRM is multi-tenant — multiple client businesses share the same application, but each has their own isolated data:

- Every database table includes an `account_id` column
- Supabase Row Level Security (RLS) ensures users can only see data belonging to their account
- Super admins can access all accounts through the admin panel
- Each account has its own WhatsApp configuration, contacts, campaigns, and settings

### 2.4 Data Flow: How a WhatsApp Message Travels

```
Customer sends WhatsApp message
        ↓
Meta (Facebook) receives it
        ↓
Meta sends webhook to → /api/whatsapp/webhook
        ↓
    ┌─────────────────────────────────────┐
    │  1. Message saved to database       │
    │  2. Contact created/updated         │
    │  3. Check: Any Flow matches?        │──→ Yes → Run the flow
    │  4. Check: Any Automation matches?  │──→ Yes → Run the automation
    │  5. Check: AI Chatbot enabled?      │──→ Yes → AI generates response
    │  6. Message appears in Inbox        │
    └─────────────────────────────────────┘
        ↓
Business owner/agent sees message in Inbox
and can reply manually
```

---

## 3. Getting Access

### 3.1 Logging In

| Item | Detail |
|---|---|
| **URL** | [https://crm.marketing4effect.com](https://crm.marketing4effect.com) |
| **Supported Browsers** | Chrome (recommended), Firefox, Edge, Safari |
| **Mobile Access** | Fully responsive — works on phones and tablets |

**To log in:**

1. Open your browser and navigate to **crm.marketing4effect.com**
2. Enter your **email address** (the one used for your invitation)
3. Enter your **password** (use the eye icon 👁 to toggle visibility)
4. Click **Sign In**

> **First-time users:** You will receive an invitation email with a link. Click that link to set your password before attempting to log in.

> **Forgot password?** Click "Forgot password?" on the login page. A reset link will be sent to your email.

### 3.2 User Roles and Permissions

The CRM has four roles with escalating permission levels:

| Role | Contacts | Messages | Broadcasts | Campaigns | Automations | Flows | Settings | Team | Delete Account |
|---|---|---|---|---|---|---|---|---|---|
| **Viewer** | View | View | View | View | View | View | View | — | — |
| **Agent** | View, Create, Edit | View, Send | Create, Send | Launch | View | View | View | — | — |
| **Admin** | Full | Full | Full | Full | Full | Full | Full | Invite, Edit Roles | — |
| **Owner** | Full | Full | Full | Full | Full | Full | Full | Full + Transfer | Yes |

**Role assignment guidelines:**

- **Owner** — The client (business owner). One per account. Can transfer ownership.
- **Admin** — M4E campaign managers or white-label partner leads. Can configure everything except delete the account.
- **Agent** — M4E operators handling day-to-day messaging and campaign execution. Can send messages and manage contacts but cannot change settings.
- **Viewer** — Clients who want read-only monitoring access, or stakeholders who need visibility without edit rights.

### 3.3 Super Admin Access

Super Admin is a platform-level role that exists above the account-level roles. It grants access to the **Admin Panel** at `/admin/*`.

**Who gets Super Admin:**
- M4E founders and senior technical staff
- Designated white-label partner administrators (if applicable)

**How to grant Super Admin:**
1. Access the Supabase dashboard
2. Navigate to the `profiles` table
3. Find the user's profile row
4. Set `is_super_admin` to `true`
5. The user will now see the Admin Panel link in their sidebar

> **Security Note:** Super Admin access should be granted sparingly. It provides visibility into ALL accounts on the platform, including all contacts, messages, and campaign data.

### 3.4 Navigation Overview

The left sidebar contains all main sections:

| Icon | Section | Purpose | Min. Role |
|---|---|---|---|
| 📊 | **Dashboard** | Overview metrics, activity feed, charts | Viewer |
| 💬 | **Inbox** | WhatsApp conversations — read and reply | Viewer (read), Agent (reply) |
| 👥 | **Contacts** | Customer database — import, tag, segment | Viewer (read), Agent (edit) |
| 🛒 | **Products** | Product catalog with AI descriptions | Viewer (read), Agent (edit) |
| 📋 | **Pipelines** | Kanban board for deal/campaign tracking | Viewer (read), Agent (edit) |
| 📢 | **Broadcasts** | Bulk WhatsApp/Email/SMS messaging | Agent |
| 🎯 | **Campaigns** | Self-service campaign engine (10 templates) | Agent (launch), Admin (configure) |
| ⚡ | **Automations** | Rule-based automated actions | Viewer (read), Admin (edit) |
| 🔄 | **Flows** | Visual conversation flow builder | Viewer (read), Admin (edit) |
| 🤖 | **AI Chatbot** | AI-powered auto-responder configuration | Admin |
| 🛍️ | **E-Commerce** | Shopify/WooCommerce integration | Admin |
| ⚙️ | **Settings** | Account configuration | Viewer (read), Admin (edit) |
| ❓ | **Help** | In-app help and documentation | All |
| 🔧 | **Admin Panel** | Platform-wide management (Super Admin only) | Super Admin |

---

## 4. Dashboard

The Dashboard is your command centre. It provides a real-time snapshot of account performance.

### 4.1 Metrics Cards

At the top of the dashboard, four key metrics are displayed:

| Metric | What It Means | Why It Matters |
|---|---|---|
| **Active Conversations** | Number of ongoing WhatsApp chats with recent activity | Shows current engagement level — high numbers mean customers are responding |
| **New Contacts Today** | Contacts added in the last 24 hours (import, manual, or auto-created) | Tracks data import progress and organic growth |
| **Open Deals** | Total count and value of active deals in the pipeline | Shows campaign revenue potential and sales pipeline health |
| **Messages Sent Today** | WhatsApp messages sent in the last 24 hours | Monitors outreach volume — compare against delivery and read rates |

Each metric card shows a **comparison with the previous period** (green arrow ↑ = improvement, red arrow ↓ = decline).

### 4.2 Activity Feed

The activity feed shows recent actions across the system in chronological order:

- Messages sent and received
- Deals created or moved between stages
- Broadcasts sent and their delivery status
- Automations triggered
- New contacts added
- Campaign events (launched, completed, etc.)

Each activity item is **clickable** — it navigates directly to the relevant conversation, deal, broadcast, or campaign.

### 4.3 Charts

| Chart | Type | What It Shows | How to Use It |
|---|---|---|---|
| **Conversations** | Line chart | Incoming vs. outgoing messages over 7–30 days | Spot response patterns, verify broadcasts are generating replies, identify quiet periods |
| **Pipeline** | Donut chart | Distribution of deals across pipeline stages with values | See where deals are stuck, identify bottlenecks, track Won vs. Lost ratio |
| **Response Time** | Bar chart | Average first-response time by day of week | Ensure response SLAs are met, identify slow days, compare week-over-week |

### 4.4 Quick Actions

Buttons at the top of the dashboard for common tasks:

- **New Contact** — Add a contact manually
- **New Broadcast** — Start a broadcast campaign
- **New Deal** — Create a deal in the pipeline
- **New Campaign** — Launch a campaign from the template gallery

### 4.5 Campaign Summary Widget

If campaigns have been run, the dashboard also shows:

- Total campaigns (active, completed, draft)
- Total messages sent across all campaigns
- Total revenue recovered (attributed to campaigns)
- Total customers reactivated
- Average conversion rate

---

## 5. Client Onboarding Workflow

This section describes the step-by-step process for onboarding a new client onto the CRM platform.

### 5.1 Pre-Onboarding Checklist

Before creating the client's account, ensure you have:

| Item | Required? | Notes |
|---|---|---|
| Client's business name | Yes | Used for account name |
| Client's email address | Yes | Used for Owner account login |
| Client's phone number | Yes | For WhatsApp communication |
| Customer data (CSV, spreadsheet, or raw) | Yes | The contacts to import |
| WhatsApp Business API credentials | Yes (for messaging) | Phone Number ID, Access Token from Meta Business Manager |
| Client's industry type | Recommended | For recency scoring presets |
| Client's product/service list | Recommended | For product catalog and AI chatbot knowledge base |

### 5.2 Step 1: Create the Client Account

1. Navigate to **crm.marketing4effect.com/signup**
2. Enter the client's business email and a temporary password
3. Complete the signup process
4. Log in to the new account
5. Go to **Settings** → **Profile** and update:
   - Account name (business name)
   - Default currency (NGN)
   - Timezone (Africa/Lagos)

> **Alternative:** If the client will manage their own account, send them the signup link and have them create their own account. Then request Admin access for yourself.

### 5.3 Step 2: Configure WhatsApp

1. Go to **Settings** → **WhatsApp** tab
2. Enter the WhatsApp Business API credentials:
   - **Phone Number ID** — From Meta Business Manager
   - **Business Account ID** — From Meta Business Manager
   - **Access Token** — Permanent token from Meta
   - **Webhook Verify Token** — Auto-generated, copy this to Meta's webhook settings
3. Click **Save Configuration**
4. In Meta Business Manager, set the webhook URL to: `https://crm.marketing4effect.com/api/whatsapp/webhook`
5. Subscribe to webhook events: `messages`, `message_deliveries`, `message_reads`
6. Send a test message to verify the connection

### 5.4 Step 3: Import Contacts

See [Section 6: Contact Management](#6-contact-management) for detailed import instructions.

**Quick summary:**
1. Clean the client's customer data (standardize phone numbers, remove duplicates)
2. Format as CSV with columns: `phone`, `name`, `email`, `company`, `notes`
3. Go to **Contacts** → **Import** → upload the CSV
4. Map columns and confirm import
5. Verify contact count matches expectations

### 5.5 Step 4: Set Up Products (If Applicable)

1. Go to **Products** → **Add Product**
2. Enter product details (name, price, description, image)
3. Use the **AI Ghost Text** feature to auto-generate descriptions
4. Repeat for all products/services the client offers

### 5.6 Step 5: Configure Recency Scoring

1. Go to **Settings** → **Recency Scoring**
2. Select the client's **industry preset** (FMCG, Retail, B2B, Healthcare, Real Estate, or Custom)
3. Review the dormancy thresholds:
   - **Active** — Purchased within X days
   - **Hot Dormant** — Between X and Y days
   - **Warm Dormant** — Between Y and Z days
   - **Cold Dormant** — Beyond Z days
4. Optionally enable **Adaptive Mode** to let the system learn from actual purchase data
5. Save settings

### 5.7 Step 6: Launch First Campaign

1. Go to **Campaigns** → **New Campaign**
2. The system will analyze the contact database and recommend a campaign type
3. Follow the 6-step wizard (see [Section 9: Campaigns](#9-campaigns))
4. For most new clients, start with the **Win-Back Campaign** targeting Cold Dormant contacts

### 5.8 Step 7: Set Up Automations

Configure essential automations:

1. **Auto-Tag Responders** — Tag contacts who reply to campaigns
2. **Escalate Hot Leads** — Route purchase-intent messages to senior agents
3. **Out of Office** — Auto-reply outside business hours
4. **Follow-up Non-Responders** — Send reminders after 3 days of no response

See [Section 11: Automations](#11-automations) for detailed setup instructions.

### 5.9 Step 8: Invite Team Members

1. Go to **Settings** → **Members**
2. Invite the client as **Owner** (if they created the account, they already are)
3. Invite M4E campaign managers as **Admin**
4. Invite M4E operators as **Agent**
5. Optionally invite client stakeholders as **Viewer**

### 5.10 Onboarding Timeline

| Day | Activity | Responsible |
|---|---|---|
| Day 1 | Account creation, WhatsApp configuration | M4E Technical |
| Day 1-2 | Data collection from client, cleaning, formatting | M4E Operations |
| Day 2-3 | Contact import, product catalog setup, recency scoring | M4E Operations |
| Day 3-4 | Campaign creation, automation setup, flow configuration | M4E Campaign Manager |
| Day 4-5 | Testing (send test messages, verify automations) | M4E Campaign Manager |
| Day 5-7 | Campaign launch, monitoring, first wave of messages | M4E Campaign Manager |
| Day 7+ | Ongoing monitoring, response handling, optimization | M4E Operations |

---

## 6. Contact Management

Contacts are the foundation of every reactivation campaign. This section covers everything about managing customer data in the CRM.

### 6.1 Viewing Contacts

1. Click **Contacts** in the sidebar
2. You will see a searchable, scrollable list of all contacts
3. Use the **search bar** to find contacts by name, phone number, or email
4. Click any contact to open their **detail view**

The contact detail view shows:
- Contact information (name, phone, email, company)
- Tags applied to this contact
- Custom fields and their values
- Conversation history (linked to Inbox)
- Purchase history (if products are configured)
- Deals linked to this contact
- Recency score and segment classification
- Branch assignment (if multi-branch is enabled)

### 6.2 Importing Contacts (CSV Import)

CSV import is the primary method for loading client customer data into the CRM.

**Step-by-step:**

1. Click **Contacts** → **Import** button (top right)
2. The Import Modal opens
3. Prepare your CSV file with these columns:

| Column | Required? | Format | Example |
|---|---|---|---|
| `phone` | **Yes** | International format with country code | +2348012345678 |
| `name` | Recommended | Full name | Adebayo Ogundimu |
| `email` | Optional | Valid email address | adebayo@gmail.com |
| `company` | Optional | Business name | GreenLeaf Farms |
| `notes` | Optional | Any text | VIP customer, last purchase March 2025 |
| `tags` | Optional | Comma-separated | high-value, retail, lagos |

4. Click **Choose File** and select your CSV
5. The system shows a **preview** of the data and auto-maps columns
6. Review the mapping — ensure phone numbers are mapped to the phone field
7. Click **Import**
8. Wait for completion — a success message shows the count of imported contacts

> **Phone Number Format:** Numbers MUST include the country code (+234 for Nigeria). Numbers without country codes will fail to receive WhatsApp messages. The system will attempt to auto-format numbers but always verify.

### 6.3 Deduplication

The CRM automatically deduplicates contacts by phone number:

- When importing, if a phone number already exists, the existing contact is **updated** (not duplicated)
- The deduplication uses the **dual-identifier system** — contacts are matched by both phone number and email
- If a CSV contains duplicate phone numbers, only the last occurrence is imported
- After import, you can verify by checking the total contact count

### 6.4 Tags

Tags are labels attached to contacts for organization, segmentation, and targeting.

**Common tag categories for reactivation campaigns:**

| Category | Example Tags | Purpose |
|---|---|---|
| **Segment** | high-value, medium-value, low-value | Revenue-based segmentation |
| **Recency** | active, hot-dormant, warm-dormant, cold-dormant | Purchase recency (auto-assigned by scoring) |
| **Campaign Status** | broadcast-sent, responded, no-response, won-back, lost | Track campaign progress |
| **Interest** | interested, not-interested, needs-follow-up | Engagement level |
| **Source** | pos-data, whatsapp-export, exercise-book, shopify | Where the data came from |
| **Opt-Out** | opted-out, do-not-contact | Compliance — never message these contacts |

**To create tags:**
1. Go to **Settings** → **Tags** tab
2. Click **Add Tag**
3. Enter a name and choose a colour
4. Click **Save**

**To tag contacts:**
- **Individual:** Open contact detail → Tags section → select tags from dropdown
- **Bulk:** Select multiple contacts in the list → click **Tag** action → choose tags
- **Automatic:** Use automations to add/remove tags based on events

### 6.5 Segmentation

Segmentation combines tags, custom fields, and recency scores to create targeted audiences:

| Segmentation Method | How It Works | Best For |
|---|---|---|
| **By Tags** | Filter contacts with specific tags | Campaign targeting, broadcast audiences |
| **By Recency Score** | Filter by Active/Hot/Warm/Cold dormancy | Reactivation campaigns |
| **By Custom Fields** | Filter by any custom field value | Industry-specific segmentation |
| **By Purchase History** | Filter by total spend, last purchase date, product category | Revenue-based targeting |
| **By Branch** | Filter by assigned branch location | Multi-location businesses |

### 6.6 The Recency Scoring System

The recency scoring system is one of the CRM's most powerful features. It automatically classifies contacts into dormancy segments based on their purchase history.

#### How It Works

1. The system looks at each contact's **last purchase date**
2. It compares this against configurable **dormancy thresholds**
3. Each contact is classified into one of four segments:

| Segment | Default (Retail) | Meaning | Campaign Priority |
|---|---|---|---|
| **Active** | Purchased within 60 days | Currently engaged customer | Low — they're already buying |
| **Hot Dormant** | 60–120 days since purchase | Recently lapsed — easiest to win back | **Highest** — best ROI |
| **Warm Dormant** | 120–240 days since purchase | Moderately lapsed — needs incentive | High — good potential |
| **Cold Dormant** | 240+ days since purchase | Long-term lapsed — hardest to recover | Medium — lower conversion but high volume |

#### Industry Presets

Different industries have different purchase cycles. The CRM includes presets:

| Industry | Hot Dormant | Warm Dormant | Cold Dormant | Rationale |
|---|---|---|---|---|
| **FMCG** | 30 days | 60 days | 120 days | Fast-moving goods — customers buy frequently |
| **Retail** | 60 days | 120 days | 240 days | General retail — moderate purchase frequency |
| **B2B** | 90 days | 180 days | 365 days | Business purchases — longer sales cycles |
| **Healthcare** | 120 days | 240 days | 480 days | Healthcare — infrequent but regular visits |
| **Real Estate** | 180 days | 365 days | 730 days | High-value, very infrequent transactions |
| **Custom** | User-defined | User-defined | User-defined | Set your own thresholds |

#### Adaptive Thresholds

When **Adaptive Mode** is enabled, the system learns from actual purchase data:

1. It analyzes inter-purchase intervals across all contacts
2. It calculates percentile-based threshold recommendations
3. It shows a **confidence badge** indicating how reliable the recommendations are:
   - 🔴 Low confidence (< 50 purchases analyzed)
   - 🟡 Medium confidence (50–200 purchases)
   - 🟢 High confidence (200+ purchases)
4. You can accept the recommendations or keep manual thresholds

The adaptive system updates its recommendations each time the recency analysis is run.

### 6.7 Custom Fields

Custom fields store additional data specific to each client's needs.

**Common custom fields for reactivation:**

| Field Name | Type | Purpose |
|---|---|---|
| Last Purchase Date | Date | When the customer last bought something |
| Total Spend | Number | Lifetime value of the customer |
| Product Category | Text | What they typically buy |
| Reactivation Status | Text | Current status in the campaign |
| Data Source | Text | Where this contact came from |
| Preferred Language | Text | For multilingual campaigns |

**To manage custom fields:**
1. Go to **Settings** → **Custom Fields** tab (Admin/Owner only)
2. Click **Add Field**
3. Enter the field name, select the type (Text, Number, Date, Boolean), and save

### 6.8 Adding Contacts Manually

1. Click **Contacts** → **Add Contact** button
2. Fill in the contact form:
   - **Phone** (required) — with country code (+234...)
   - **Name** — customer's full name
   - **Email** — if available
   - Any configured **custom fields**
3. Click **Save**

Contacts are also created automatically when:
- A new customer sends a WhatsApp message to the business number
- An order is placed through a connected Shopify/WooCommerce store
- A contact is imported via CSV

---

## 7. Product Catalog

The Product Catalog stores the client's products and services, enabling purchase tracking, AI-powered recommendations, and campaign personalization.

### 7.1 Adding Products

1. Go to **Products** in the sidebar
2. Click **Add Product**
3. Fill in the product form:

| Field | Required? | Description |
|---|---|---|
| **Name** | Yes | Product or service name |
| **Price** | Yes | Price in the account's default currency (NGN) |
| **Description** | Recommended | Detailed description — used by AI chatbot |
| **Image** | Optional | Product photo — displayed in messages and catalog |
| **Category** | Optional | Product category for organization |
| **SKU** | Optional | Stock keeping unit for inventory tracking |

4. Click **Save**

### 7.2 AI Ghost Text

When adding or editing a product, the **AI Ghost Text** feature can auto-generate descriptions:

1. Enter the product name and price
2. Click the **AI Suggest** button (✨) next to the description field
3. The AI generates a compelling product description based on the name and price
4. Review and edit the suggestion as needed
5. Click **Save**

The AI uses context from the account's industry and existing products to generate relevant descriptions.

### 7.3 Linking Products to Purchase History

Products connect to the purchase history system:

- When a purchase is recorded (manually or via e-commerce sync), it links to a product
- This enables the recency scoring system to track per-product purchase patterns
- Campaign templates like **Upsell & Cross-Sell** use purchase history to recommend complementary products
- The **Product Score Settings** configure how product affinity is calculated

### 7.4 Product Scoring

The product scoring system ranks products by relevance for each contact:

1. **Purchase Frequency** — How often the contact buys this product
2. **Recency** — How recently they last purchased it
3. **Monetary Value** — Total spend on this product
4. **Cross-Purchase Affinity** — What other products buyers of this product also purchase

These scores power the AI recommendation engine used in Upsell & Cross-Sell campaigns.

---

## 8. Inbox & Messaging

The Inbox is the live chat interface where you read and reply to WhatsApp messages from customers.

### 8.1 Inbox Layout

| Panel | Position | Content |
|---|---|---|
| **Conversation List** | Left | All WhatsApp conversations, sorted by most recent message |
| **Message Area** | Centre | The actual chat — message bubbles with timestamps |
| **Contact Sidebar** | Right | Contact details, tags, custom fields, deals, purchase history |

### 8.2 Reading Messages

1. Click **Inbox** in the sidebar
2. The conversation list shows all active chats
3. **Unread conversations** are highlighted with a badge showing the unread count
4. Click a conversation to open it
5. Messages appear as bubbles:
   - **Grey bubbles** — Incoming messages from the customer
   - **Coloured bubbles** — Outgoing messages from your team
6. Each message shows the timestamp and delivery status

### 8.3 Message Status Icons

| Icon | Status | Meaning |
|---|---|---|
| 🕐 | **Pending** | Message is queued for sending |
| ✓ | **Sent** | Message has been sent to WhatsApp servers |
| ✓✓ | **Delivered** | Message has been delivered to the customer's phone |
| ✓✓ (blue) | **Read** | Customer has opened and read the message |
| ❌ | **Failed** | Message failed to send — check the error reason |

### 8.4 Replying to Messages

1. Open a conversation
2. Type your message in the **composer** at the bottom
3. Press **Enter** or click the **Send** button

**Additional messaging features:**

| Feature | How to Use | Notes |
|---|---|---|
| **Reply Quotes** | Click the reply icon on a specific message | Quotes the original message in your reply |
| **Reactions** | Click the emoji icon on a message | React with 👍, ❤️, 😂, 😮, 😢, 🙏 |
| **Template Picker** | Click the template icon (📋) in the composer | Insert a pre-approved WhatsApp template |
| **Media Attachments** | Click the attachment icon (📎) | Send images, documents, audio, video |

### 8.5 The 24-Hour Window Rule

WhatsApp enforces a critical messaging rule:

| Scenario | What You Can Send | Cost |
|---|---|---|
| **Within 24 hours** of customer's last message | Any free-form text, media, or template | Free (customer service window) |
| **After 24 hours** since customer's last message | Only approved templates | Paid (per conversation, typically ₦30–50) |
| **Customer has never messaged you** | Only approved templates | Paid |

> **Key Implication:** Always use templates for initial outreach and broadcasts. Free-form messages only work within the 24-hour customer service window.

### 8.6 Using Templates in Conversations

1. In the composer area, click the **Template** icon (📋)
2. Browse or search available templates
3. Select a template
4. Fill in any variable fields (e.g., `{{1}}` = customer name, `{{2}}` = product name)
5. Click **Send**

### 8.7 Media Handling

The CRM supports sending and receiving various media types:

| Media Type | Send | Receive | Max Size |
|---|---|---|---|
| **Images** | ✅ | ✅ | 5 MB |
| **Documents** (PDF, DOC) | ✅ | ✅ | 100 MB |
| **Audio** | ✅ | ✅ | 16 MB |
| **Video** | ✅ | ✅ | 16 MB |
| **Stickers** | ❌ | ✅ | — |
| **Location** | ❌ | ✅ | — |

Received media is stored in Supabase Storage and displayed inline in the conversation.

### 8.8 Conversation Assignment

Conversations can be assigned to specific team members:

1. Open a conversation
2. Click the **Assign** button in the contact sidebar
3. Select a team member from the dropdown
4. The conversation moves to that agent's queue

Automations can also auto-assign conversations based on rules (e.g., round-robin, keyword-based routing).

### 8.9 Best Practices for Inbox Management

- **Respond within 2 hours** during business hours (9am–6pm WAT)
- **Use templates** for initial outreach — they have higher delivery rates
- **Tag contacts** after meaningful interactions (e.g., "Interested", "Needs Follow-up")
- **Assign conversations** to the appropriate team member if you cannot handle it
- **Never send spam** — every message should be relevant and personalised
- **Monitor the 24-hour window** — if it's about to expire, send a template to re-open it
- **Track opt-outs** — if someone says "stop" or "unsubscribe", tag them as `opted-out` immediately


---

## 9. Campaigns

The Campaign Engine is the CRM's most powerful feature — a self-service system that lets you launch sophisticated, multi-step marketing campaigns with minimal effort. This section covers everything you need to know.

### 9.1 What Are Campaigns?

Campaigns are **pre-built, multi-step marketing sequences** designed to achieve specific business outcomes. They differ from broadcasts and automations in important ways:

| Feature | Broadcast | Automation | Campaign |
|---|---|---|---|
| **What it is** | A single bulk message to many contacts | An if-this-then-that rule | A complete marketing sequence with multiple steps |
| **Steps** | One message | One trigger → one or more actions | Multiple messages over days/weeks with conditions |
| **Targeting** | Manual audience selection | Trigger-based (any matching contact) | AI-recommended audience based on campaign type |
| **Templates** | You choose the template | You configure the trigger and actions | Pre-built templates with proven sequences |
| **Tracking** | Delivery stats only | Execution logs | Full funnel: sent → delivered → read → replied → converted → revenue |
| **ROI** | Not tracked | Not tracked | Revenue attribution — tracks actual purchases from campaign contacts |
| **Best for** | One-time announcements | Ongoing automated responses | Strategic marketing initiatives with measurable ROI |

**Think of it this way:**
- A **broadcast** is like sending a flyer to everyone on your street
- An **automation** is like a doorbell that automatically says "welcome" when someone arrives
- A **campaign** is like a trained salesperson who follows a proven script over multiple conversations to close a deal

### 9.2 The 6-Step Campaign Wizard

To create a campaign, go to **Campaigns** → **New Campaign**. The wizard guides you through six steps:

#### Step 1: Analyze 📊

The system scans the account's contact database and provides intelligent recommendations:

- **Contact distribution** — How many contacts are Active, Hot Dormant, Warm Dormant, Cold Dormant
- **Recommended campaign** — Based on the data, the system suggests which campaign type will have the highest impact
- **Estimated reach** — How many contacts qualify for each campaign type
- **Expected results** — Projected open rates, reply rates, and conversion rates based on industry benchmarks

You can accept the recommendation or choose a different campaign type.

#### Step 2: Template 📋

Browse the **Campaign Template Gallery** — a visual grid of all 10 available campaign templates. Each template card shows:

- Campaign name and icon
- Category (Reactivation, Cart Recovery, Post-Purchase, Lifecycle, Engagement, Revenue, Feedback)
- Brief description
- Tier level (Tier 1 = included, Tier 2 = premium)
- Expected performance metrics

Click a template to see its full details:
- **What It Does** — Detailed explanation of the campaign's purpose
- **Why You Need It** — Business case with statistics
- **How It Works** — Step-by-step sequence description
- **Best For** — Which businesses benefit most
- **Example Result** — Real-world performance benchmarks

Select your template and click **Next**.

#### Step 3: Audience 👥

The system **auto-selects the target audience** based on the campaign type:

| Campaign Type | Auto-Selected Audience |
|---|---|
| Win-Back | Contacts classified as Hot/Warm/Cold Dormant |
| Abandoned Cart | Contacts with abandoned carts (via e-commerce integration) |
| Post-Purchase Thank You | Contacts who made a purchase in the last 14 days |
| Order Status | Contacts with active orders |
| COD Confirmation | Contacts with pending COD orders |
| Review Collection | Contacts who purchased 7–30 days ago |
| Birthday | Contacts with birthdays in the upcoming period |
| Upsell/Cross-Sell | Contacts with purchase history matching cross-sell rules |
| Referral | Contacts tagged as satisfied (high ratings, repeat purchases) |
| VIP Rewards | Top-spending contacts (top 20% by revenue) |

You can refine the audience by:
- Adding or removing tag filters
- Adjusting recency thresholds
- Excluding specific contacts or segments
- Setting minimum/maximum audience size

The system shows a **live count** of qualifying contacts as you adjust filters.

#### Step 4: Customize ✏️

Customize the campaign's message content and timing:

- **Message Templates** — Edit the pre-written message text for each step in the sequence
- **Variables** — Map personalization fields (customer name, product name, discount amount, etc.)
- **Timing** — Adjust delays between sequence steps (e.g., send reminder after 2 days instead of 3)
- **Channel** — Choose the delivery channel for each step:
  - **WhatsApp** — Primary channel (highest open rates in Nigeria)
  - **Email** — Secondary channel (via Brevo)
  - **SMS** — Tertiary channel
  - **Auto** — System chooses the best channel based on contact preferences and availability

#### Step 5: Schedule 📅

Set when the campaign should run:

| Option | Description |
|---|---|
| **Send Now** | Launch immediately |
| **Schedule** | Set a specific date and time for launch |
| **Recurring** | Run automatically on a schedule (e.g., weekly, monthly) |
| **Save as Draft** | Save without scheduling — launch manually later |

For scheduled campaigns, the system respects the account's timezone (default: Africa/Lagos WAT).

#### Step 6: Review ✅

The final review screen shows a complete summary:

- Campaign name and template
- Target audience size
- Message preview for each sequence step
- Schedule details
- Estimated performance (open rate, reply rate, conversion rate)
- Estimated cost (WhatsApp conversation fees)

Click **Launch Campaign** to activate, or **Back** to make changes.

### 9.3 The 10 Campaign Templates — Complete Reference

Below is a comprehensive description of every campaign template available in the CRM.

---

#### 9.3.1 Win-Back Campaign

| Property | Detail |
|---|---|
| **Slug** | `win_back` |
| **Category** | Reactivation |
| **Tier** | 1 (Included) |
| **Default Channel** | WhatsApp |
| **Target Audience** | Contacts inactive for 90+ days |

**What It Does:**
Automatically sends a series of personalized messages to customers who haven't bought from you in a while, offering them special incentives to come back.

**Why You Need It:**
Your dormant customers already know and trust your brand. Reactivating just 15% of them costs nothing compared to acquiring new customers and can generate significant revenue.

**How It Works:**
1. System identifies customers inactive for 90+ days
2. Sends a "We miss you" message with a discount
3. If no reply after 2 days, sends a reminder
4. Final "last chance" message after 3 days

**Best For:**
Any business with customers who haven't purchased in 3+ months.

**Expected Results:**
Businesses typically recover 15–25% of dormant customers, generating ₦500K–₦2M in recovered revenue per campaign.

**Sequence Timeline:**
```
Day 0: "We miss you" message + discount offer
Day 2: Reminder (if no reply)
Day 5: Final "last chance" message
```

**Key Metrics to Watch:**
- Open rate (target: 85%+)
- Reply rate (target: 15–25%)
- Conversion rate (target: 10–15%)
- Revenue recovered per contact

---

#### 9.3.2 Abandoned Cart Recovery

| Property | Detail |
|---|---|
| **Slug** | `abandoned_cart` |
| **Category** | Cart Recovery |
| **Tier** | 1 (Included) |
| **Default Channel** | WhatsApp |
| **Target Audience** | Contacts with abandoned carts (detected via e-commerce integration) |

**What It Does:**
Automatically messages customers who added products to their online cart but didn't complete the purchase, reminding them and offering incentives.

**Why You Need It:**
70% of online shopping carts are abandoned. These are people who WANTED to buy — they just need a gentle nudge. This campaign recovers that lost revenue.

**How It Works:**
1. System detects abandoned carts (1 hour after last activity)
2. Sends a friendly reminder about items left behind
3. After 24 hours, offers a 10% discount
4. After 3 days, sends a stock warning

**Best For:**
E-commerce businesses with Shopify or WooCommerce stores connected to the CRM.

**Expected Results:**
Average cart recovery rate of 22%, meaning if you have 100 abandoned carts worth ₦50K each, you could recover ₦1.1M.

**Sequence Timeline:**
```
Hour 1:  "You left something behind" reminder
Hour 24: 10% discount offer
Day 3:   "Items selling fast" urgency message
```

**Key Metrics to Watch:**
- Cart recovery rate (target: 20–25%)
- Revenue recovered per cart
- Discount redemption rate

**Prerequisite:** Requires an active Shopify or WooCommerce integration (see [Section 14: E-Commerce Integration](#14-e-commerce-integration)).

---

#### 9.3.3 Post-Purchase Thank You

| Property | Detail |
|---|---|
| **Slug** | `post_purchase_thank_you` |
| **Category** | Post-Purchase |
| **Tier** | 1 (Included) |
| **Default Channel** | WhatsApp |
| **Target Audience** | Contacts who made a purchase in the last 14 days |

**What It Does:**
Sends a warm thank-you message after every purchase, followed by product tips and a review request — building loyalty and collecting social proof.

**Why You Need It:**
The moment after purchase is when customers feel best about your brand. This campaign turns that goodwill into repeat purchases and reviews that attract new customers.

**How It Works:**
1. Immediately after purchase: thank-you message with product tips
2. After 7 days: check-in asking how they're enjoying the product
3. After 14 days: review request (only if feedback was positive)

**Best For:**
Any business that wants more reviews and repeat customers.

**Expected Results:**
92% open rate, 35% reply rate, and 28% of customers leave a review or make a repeat purchase.

**Sequence Timeline:**
```
Day 0:  Thank you + product tips
Day 7:  "How are you enjoying it?" check-in
Day 14: Review request (conditional on positive feedback)
```

**Key Metrics to Watch:**
- Open rate (target: 90%+)
- Reply rate (target: 30–40%)
- Review submission rate (target: 25–30%)
- Repeat purchase rate

---

#### 9.3.4 Order Status Notifications

| Property | Detail |
|---|---|
| **Slug** | `order_status` |
| **Category** | Post-Purchase |
| **Tier** | 1 (Included) |
| **Default Channel** | WhatsApp |
| **Target Audience** | Contacts with active orders |

**What It Does:**
Keeps customers informed about their order at every stage — confirmation, shipping, and delivery — via WhatsApp messages they actually read.

**Why You Need It:**
Customers check WhatsApp 23x per day but email only 2–3x. Order updates via WhatsApp reduce "where is my order?" support queries by 60% and build trust.

**How It Works:**
1. Order placed → instant confirmation with order details
2. Order shipped → tracking link sent
3. Order delivered → delivery confirmation with support offer

**Best For:**
Any business that ships physical products.

**Expected Results:**
95% open rate (vs 20% for email), 60% reduction in support queries about order status.

**Sequence Timeline:**
```
Order placed:    Instant confirmation
Order shipped:   Shipping notification + tracking
Order delivered: Delivery confirmation + support offer
```

**Key Metrics to Watch:**
- Open rate (target: 95%+)
- Support query reduction
- Customer satisfaction scores

**Prerequisite:** Requires an active e-commerce integration with order status webhooks.

---

#### 9.3.5 COD Confirmation Flow

| Property | Detail |
|---|---|
| **Slug** | `cod_confirmation` |
| **Category** | Post-Purchase |
| **Tier** | 2 (Premium) |
| **Default Channel** | WhatsApp |
| **Target Audience** | Contacts with pending Cash-on-Delivery orders |

**What It Does:**
Confirms Cash-on-Delivery orders before dispatch, reducing failed deliveries and no-shows that waste your delivery costs.

**Why You Need It:**
In Nigeria, 30–40% of COD orders fail because customers aren't home, changed their mind, or forgot. Each failed delivery costs you ₦2,000–₦5,000. This campaign cuts failures by half.

**How It Works:**
1. After COD order: sends confirmation request (reply YES/NO)
2. If no reply after 24 hours: follow-up message
3. Day before delivery: reminder with amount to prepare

**Best For:**
Any business offering Cash-on-Delivery in Nigeria.

**Expected Results:**
Reduces failed COD deliveries by 45–55%, saving ₦100K–₦500K per month in wasted delivery costs.

**Sequence Timeline:**
```
Order placed:        "Please confirm your order — reply YES or NO"
Hour 24 (no reply):  Follow-up confirmation request
Day before delivery: "Your order arrives tomorrow — please have ₦X ready"
```

**Key Metrics to Watch:**
- Confirmation rate (target: 75–85%)
- Failed delivery reduction (target: 45–55%)
- Cost savings per month

**Nigeria-Specific Value:** This template is particularly valuable in the Nigerian market where COD is the dominant payment method and failed deliveries are a major cost center for e-commerce businesses.

---

#### 9.3.6 Review & Feedback Collection

| Property | Detail |
|---|---|
| **Slug** | `review_collection` |
| **Category** | Feedback |
| **Tier** | 1 (Included) |
| **Default Channel** | WhatsApp |
| **Target Audience** | Contacts who purchased 7–30 days ago |

**What It Does:**
Systematically collects customer reviews and feedback using a satisfaction-first approach — only asking happy customers for public reviews.

**Why You Need It:**
Reviews are the #1 factor in purchase decisions. But asking unhappy customers for reviews backfires. This campaign screens satisfaction first, routing happy customers to review sites and unhappy ones to your support team.

**How It Works:**
1. Sends satisfaction check (rate 1–5)
2. Happy customers (4–5) → asked for Google/social media review
3. Unhappy customers (1–3) → routed to support for resolution
4. Follow-up thank you

**Best For:**
Businesses wanting more positive reviews without risking negative ones.

**Expected Results:**
35% response rate, with 85% of respondents rating 4–5 stars, generating 3–5x more positive reviews per month.

**Sequence Timeline:**
```
Day 0:  "How would you rate your experience? (1-5)"
        → Rating 4-5: "Thank you! Would you share your experience on Google?"
        → Rating 1-3: "We're sorry to hear that. Let us make it right."
Day 3:  Follow-up thank you
```

**Key Metrics to Watch:**
- Response rate (target: 30–40%)
- Satisfaction score distribution
- Review submission rate (target: 20–30% of happy customers)
- Support resolution rate for unhappy customers

**Satisfaction-Gated Approach:** This campaign implements the M4E satisfaction-gated review methodology — a 4-step progressive escalation: Satisfaction Check → Review Request → Testimonial Request → Referral Request. Unhappy customers are routed to service recovery instead of public review platforms.

---

#### 9.3.7 Birthday & Anniversary

| Property | Detail |
|---|---|
| **Slug** | `birthday_campaign` |
| **Category** | Lifecycle |
| **Tier** | 2 (Premium) |
| **Default Channel** | WhatsApp |
| **Target Audience** | Contacts with birthdays in the upcoming period |

**What It Does:**
Automatically sends personalized birthday wishes and purchase anniversary messages with special offers, making customers feel valued.

**Why You Need It:**
Birthday messages have 481% higher transaction rates than regular promotions. It's the easiest way to make customers feel personally valued and drive a purchase.

**How It Works:**
1. On customer's birthday: personalized wish with exclusive discount
2. On purchase anniversary: "Thank you for being with us" message with loyalty reward

**Best For:**
Any business that collects customer birth dates.

**Expected Results:**
Birthday campaigns see 481% higher transaction rates and 342% higher revenue per message than standard promotions.

**Sequence Timeline:**
```
Birthday:           Personalized birthday wish + exclusive discount code
Purchase anniversary: "Thank you for X years" + loyalty reward
```

**Key Metrics to Watch:**
- Open rate (target: 90%+)
- Redemption rate (target: 15–25%)
- Revenue per birthday message
- Customer sentiment (replies)

**Data Requirement:** This campaign requires the `birthday` or `date_of_birth` custom field to be populated for contacts. Import this data during the CSV import process.

---

#### 9.3.8 Upsell & Cross-Sell

| Property | Detail |
|---|---|
| **Slug** | `upsell_cross_sell` |
| **Category** | Revenue |
| **Tier** | 2 (Premium) |
| **Default Channel** | WhatsApp |
| **Target Audience** | Contacts with purchase history matching cross-sell rules |

**What It Does:**
Recommends complementary or premium products based on what each customer has already purchased, increasing average order value.

**Why You Need It:**
Selling to existing customers is 5–25x cheaper than acquiring new ones. Customers who bought Product A are highly likely to want Product B — you just need to tell them about it.

**How It Works:**
1. After purchase: recommends complementary products
2. Offers a bundle discount for buying together
3. Personalized based on actual purchase history

**Best For:**
Businesses with multiple products or product tiers.

**Expected Results:**
Average 15–20% increase in revenue per customer through targeted product recommendations.

**Sequence Timeline:**
```
Day 3 post-purchase:  "Customers who bought X also love Y"
Day 7:                Bundle offer with discount
```

**Key Metrics to Watch:**
- Recommendation click rate
- Cross-sell conversion rate (target: 10–15%)
- Average order value increase
- Revenue per recommendation

**Prerequisite:** Requires a populated product catalog with purchase history data. The product scoring system uses purchase frequency, recency, monetary value, and cross-purchase affinity to generate recommendations.

---

#### 9.3.9 Referral Program

| Property | Detail |
|---|---|
| **Slug** | `referral_program` |
| **Category** | Engagement |
| **Tier** | 2 (Premium) |
| **Default Channel** | WhatsApp |
| **Target Audience** | Satisfied customers (high ratings, repeat purchases) |

**What It Does:**
Turns your happiest customers into brand ambassadors by giving them a unique referral link and rewarding both them and their friends.

**Why You Need It:**
Referred customers have 37% higher retention and 25% higher profit margins. Word-of-mouth is the most trusted form of marketing — this campaign systematizes it.

**How It Works:**
1. Identifies satisfied customers (high ratings, repeat purchases)
2. Sends referral invitation with unique link/code
3. Rewards both referrer and new customer when referral converts

**Best For:**
Businesses with high customer satisfaction wanting organic growth.

**Expected Results:**
Top referral programs generate 20–30% of new customers, with each referrer bringing in 2–3 new customers on average.

**Sequence Timeline:**
```
Day 0:  "Love our service? Share with friends and earn rewards!"
Day 7:  Reminder with referral stats ("You've referred X people")
Day 30: Monthly referral summary + bonus offer
```

**Key Metrics to Watch:**
- Referral invitation acceptance rate
- Referrals per customer (target: 2–3)
- Referral conversion rate
- Customer acquisition cost via referrals vs. other channels

---

#### 9.3.10 VIP Customer Rewards

| Property | Detail |
|---|---|
| **Slug** | `vip_rewards` |
| **Category** | Engagement |
| **Tier** | 2 (Premium) |
| **Default Channel** | WhatsApp |
| **Target Audience** | Top-spending contacts (top 20% by revenue) |

**What It Does:**
Identifies your top-spending customers and rewards them with exclusive offers, early access to new products, and VIP treatment.

**Why You Need It:**
Your top 20% of customers generate 80% of your revenue. Losing even one VIP customer is devastating. This campaign makes them feel special and keeps them loyal.

**How It Works:**
1. System identifies top spenders automatically
2. Sends exclusive VIP offer or early access notification
3. Personalized based on their purchase preferences

**Best For:**
Any business wanting to retain high-value customers.

**Expected Results:**
VIP programs increase top-customer retention by 25–40% and average spend by 20%, protecting your most valuable revenue stream.

**Sequence Timeline:**
```
Day 0:  "You're one of our VIP customers!" + exclusive offer
Day 14: Early access to new product/service
Day 30: VIP-only discount or loyalty reward
```

**Key Metrics to Watch:**
- VIP retention rate (target: 90%+)
- VIP spend increase (target: 15–25%)
- VIP churn rate (target: < 5%)
- Revenue protected by VIP program

---

### 9.4 Campaign Template Tiers

| Tier | Templates | Access |
|---|---|---|
| **Tier 1** (Included) | Win-Back, Abandoned Cart, Post-Purchase Thank You, Order Status, Review Collection | Available to all accounts |
| **Tier 2** (Premium) | COD Confirmation, Birthday & Anniversary, Upsell & Cross-Sell, Referral Program, VIP Rewards | Available on premium plans or as add-ons |

### 9.5 Campaign Triggers

Campaigns can be triggered in several ways:

| Trigger Type | Description | Example |
|---|---|---|
| **Manual** | Launched by a user through the wizard | "Launch Win-Back campaign now" |
| **Scheduled** | Set to launch at a specific date/time | "Send Birthday campaign every morning at 9am" |
| **Event-Based** | Triggered by a system event | "Send Abandoned Cart message 1 hour after cart abandonment" |
| **Recurring** | Runs on a regular schedule | "Run Win-Back campaign monthly for new dormant contacts" |

Event-based triggers are configured through the campaign trigger system (`/api/campaigns/triggers`). Common trigger events:

- `cart_abandoned` — E-commerce cart abandoned for 1+ hours
- `order_placed` — New order created
- `order_shipped` — Order status changed to shipped
- `order_delivered` — Order status changed to delivered
- `purchase_completed` — Purchase recorded in purchase history
- `contact_dormant` — Contact's recency score changed to dormant
- `birthday_upcoming` — Contact's birthday is within X days

### 9.6 Reading Campaign Performance Metrics

After a campaign is launched, the campaign detail page (`/campaigns/[id]`) shows comprehensive performance data:

#### Funnel Metrics

| Metric | What It Measures | How It's Calculated |
|---|---|---|
| **Total Sent** | Messages dispatched | Count of `sent` events |
| **Total Delivered** | Messages reaching the customer's phone | Count of `delivered` events |
| **Total Read** | Messages opened by the customer | Count of `read` events |
| **Total Replied** | Customers who responded | Count of `replied` events |
| **Total Clicked** | Customers who clicked a link/button | Count of `clicked` events |
| **Total Converted** | Customers who took the desired action | Count of `converted` events |
| **Total Purchased** | Customers who made a purchase | Count of `purchased` events |
| **Total Opted Out** | Customers who unsubscribed | Count of `opted_out` events |
| **Total Failed** | Messages that failed to send | Count of `failed` events |

#### Rate Metrics

| Metric | Formula | Good Benchmark |
|---|---|---|
| **Delivery Rate** | Delivered ÷ Sent × 100 | 95%+ |
| **Read Rate** | Read ÷ Delivered × 100 | 80%+ (WhatsApp) |
| **Reply Rate** | Replied ÷ Read × 100 | 15–30% |
| **Conversion Rate** | Converted ÷ Sent × 100 | 5–15% |

#### Revenue Metrics

| Metric | What It Shows |
|---|---|
| **Total Revenue** | Sum of all purchase amounts attributed to this campaign |
| **Revenue per Contact** | Total Revenue ÷ Unique Contacts |
| **ROI** | (Revenue - Campaign Cost) ÷ Campaign Cost × 100 |
| **Unique Contacts** | Number of distinct contacts who received campaign messages |

### 9.7 Campaign Statuses

| Status | Meaning | Actions Available |
|---|---|---|
| **Draft** | Created but not launched | Edit, Schedule, Launch, Delete |
| **Scheduled** | Set to launch at a future time | Edit, Cancel, Launch Now |
| **Active** | Currently running — messages being sent | Pause, View Metrics |
| **Paused** | Temporarily stopped | Resume, Cancel |
| **Completed** | All sequence steps finished | View Report, Clone |
| **Cancelled** | Manually stopped before completion | View Partial Report, Clone |

### 9.8 Campaign Best Practices

1. **Start with Win-Back** — It's the highest-ROI campaign for most businesses
2. **Let the AI recommend** — The Analyze step's recommendations are based on your actual data
3. **Personalize everything** — Messages with the customer's name get 2–3x higher response rates
4. **Monitor daily** — Check campaign metrics every day during the first week
5. **Respond to replies** — Campaigns generate conversations; have agents ready in the Inbox
6. **Test with small audiences first** — Launch to 50–100 contacts, verify results, then scale
7. **Don't overlap campaigns** — Avoid sending multiple campaigns to the same contact simultaneously
8. **Track revenue attribution** — The real measure of success is revenue recovered, not just messages sent
9. **Use Tier 2 templates** — COD Confirmation and Birthday campaigns have exceptionally high ROI in Nigeria
10. **Clone successful campaigns** — When a campaign works well, clone it and adjust for the next segment


---

## 10. Broadcasts

Broadcasts are bulk messages sent to multiple contacts simultaneously. They are the simplest form of outreach — one message, many recipients.

### 10.1 When to Use Broadcasts vs. Campaigns

| Use Broadcasts For | Use Campaigns For |
|---|---|
| One-time announcements | Multi-step sequences |
| Holiday greetings | Revenue recovery |
| Flash sales | Customer reactivation |
| Event invitations | Automated follow-ups |
| Policy updates | ROI-tracked initiatives |
| Quick surveys | Behaviour-triggered sequences |

### 10.2 Creating a Broadcast

1. Go to **Broadcasts** → **New Broadcast**
2. Fill in the broadcast details:

| Field | Description |
|---|---|
| **Name** | Internal name for tracking (e.g., "June Flash Sale") |
| **Channel** | WhatsApp, Email, or SMS |
| **Template** | Select a pre-approved WhatsApp template (required for WhatsApp) |
| **Message** | The message content (for Email/SMS) or template variables (for WhatsApp) |

3. Select the **audience**:
   - **All Contacts** — Send to everyone
   - **By Tags** — Filter by one or more tags (e.g., "high-value" AND "lagos")
   - **By Segment** — Use recency segments (Active, Hot Dormant, etc.)
   - **By Branch** — Send to contacts in a specific branch
   - **Manual Selection** — Pick individual contacts from the list

4. Review the **recipient count** — the system shows how many contacts will receive the message
5. Choose when to send:
   - **Send Now** — Dispatch immediately
   - **Schedule** — Set a date and time
6. Click **Send** or **Schedule**

### 10.3 Multi-Channel Broadcasts

Broadcasts support three channels:

| Channel | Provider | Cost | Best For |
|---|---|---|---|
| **WhatsApp** | Meta Cloud API | ~₦30–50 per conversation | Highest open rates (85%+), interactive messages |
| **Email** | Brevo | Free (up to 300/day) | Longer content, attachments, newsletters |
| **SMS** | Configurable | Varies by provider | Contacts without WhatsApp, urgent notifications |

You can create separate broadcasts for each channel or use the **Auto** channel option to let the system choose the best channel per contact based on availability and preference.

### 10.4 Tracking Broadcast Results

After sending, the broadcast detail page (`/broadcasts/[id]`) shows:

| Metric | Description |
|---|---|
| **Total Recipients** | Number of contacts targeted |
| **Sent** | Messages successfully dispatched |
| **Delivered** | Messages reaching the recipient's device |
| **Read** | Messages opened (WhatsApp only) |
| **Replied** | Recipients who responded |
| **Failed** | Messages that could not be delivered |
| **Delivery Rate** | Delivered ÷ Sent × 100 |
| **Read Rate** | Read ÷ Delivered × 100 |

### 10.5 Broadcast Best Practices

- **Always use templates for WhatsApp** — Free-form messages only work within the 24-hour window
- **Segment your audience** — Don't blast everyone; target relevant groups
- **Time it right** — Best times for Nigerian audiences: 9–11am and 4–6pm WAT
- **Personalize** — Use template variables (name, product, etc.) for higher engagement
- **Respect opt-outs** — Never send to contacts tagged as `opted-out`
- **Monitor delivery rates** — If below 90%, check phone number quality
- **Limit frequency** — No more than 2–3 broadcasts per week to avoid fatigue

---

## 11. Automations

Automations are rule-based actions that execute automatically when specific conditions are met. They are the "set it and forget it" engine of the CRM.

### 11.1 What Automations Can Do

Automations follow a simple pattern: **When THIS happens → Do THAT**

| Component | Options |
|---|---|
| **Trigger** (When) | Keyword match, tag added, tag removed, time-based, contact created, message received, deal stage changed |
| **Condition** (If) | Optional filters — only run if contact has specific tags, is in a segment, matches a custom field value |
| **Action** (Do) | Send message, add tag, remove tag, create deal, move deal, start flow, send webhook, send email, assign conversation, update custom field |

### 11.2 Creating an Automation

1. Go to **Automations** → **New Automation**
2. Configure the automation:

| Field | Description | Example |
|---|---|---|
| **Name** | Descriptive name | "Auto-Tag Campaign Responders" |
| **Trigger Type** | What event starts the automation | `keyword_match` |
| **Trigger Config** | Trigger-specific settings | `{"keywords": ["interested", "yes", "tell me more"], "match_type": "contains"}` |
| **Is Active** | Whether the automation is currently running | `true` |

3. Add **automation steps** (actions to perform in sequence):

| Step Type | What It Does | Example |
|---|---|---|
| `send_message` | Sends a WhatsApp message | "Thank you for your interest! Here's more info..." |
| `add_tag` | Adds a tag to the contact | Add tag: "interested" |
| `remove_tag` | Removes a tag from the contact | Remove tag: "no-response" |
| `create_deal` | Creates a deal in the pipeline | Create deal: "Reactivation - {contact_name}" |
| `start_flow` | Starts a conversation flow | Start flow: "Product Inquiry Flow" |
| `send_webhook` | Sends data to an external URL | POST to CRM webhook endpoint |
| `send_notification` | Notifies a team member | Email notification to campaign manager |
| `assign_conversation` | Assigns the chat to a team member | Assign to: Senior Agent |
| `update_field` | Updates a custom field value | Set "reactivation_status" to "responded" |

4. Click **Save**

### 11.3 Trigger Types Reference

| Trigger Type | Fires When | Config Options |
|---|---|---|
| `keyword_match` | Contact sends a message containing specific keywords | `keywords` (array), `match_type` (exact/contains/starts_with) |
| `tag_added` | A tag is added to a contact | `tag` (string) — the tag name |
| `tag_removed` | A tag is removed from a contact | `tag` (string) — the tag name |
| `contact_created` | A new contact is created | No config needed |
| `message_received` | Any message is received from a contact | Optional: `channel` filter |
| `deal_stage_changed` | A deal moves to a different pipeline stage | `stage` (string) — the target stage |
| `time_based` | At a scheduled time | `cron` expression or `datetime` |

### 11.4 Common Automation Recipes

These are proven automation configurations used in M4E reactivation campaigns:

#### Recipe 1: Auto-Tag Campaign Responders
```
Trigger: keyword_match → ["interested", "yes", "tell me more", "how much"]
Action 1: add_tag → "responded"
Action 2: remove_tag → "no-response"
Action 3: create_deal → "Reactivation Lead - {name}"
```

#### Recipe 2: Escalate Hot Leads
```
Trigger: keyword_match → ["buy", "order", "purchase", "price", "how much"]
Action 1: add_tag → "hot-lead"
Action 2: assign_conversation → Senior Agent
Action 3: send_notification → Campaign Manager email
```

#### Recipe 3: Out-of-Office Auto-Reply
```
Trigger: message_received (outside business hours)
Condition: Business hours = false
Action 1: send_message → "Thanks for reaching out! We're currently closed. We'll respond first thing tomorrow morning. Business hours: Mon-Fri 9am-6pm, Sat 9am-1pm."
```

#### Recipe 4: Follow-Up Non-Responders
```
Trigger: time_based → 72 hours after broadcast sent
Condition: Contact has tag "broadcast-sent" AND does NOT have tag "responded"
Action 1: send_message → Follow-up template
Action 2: add_tag → "follow-up-sent"
```

#### Recipe 5: Won-Back Detection
```
Trigger: tag_added → "purchased"
Condition: Contact previously had tag "dormant"
Action 1: add_tag → "won-back"
Action 2: remove_tag → "dormant"
Action 3: create_deal → stage "Won Back"
Action 4: send_notification → "Customer {name} has been won back!"
```

### 11.5 Viewing Automation Logs

Each automation has a **Logs** page (`/automations/[id]/logs`) showing:

- Every time the automation was triggered
- Which contact triggered it
- What actions were executed
- Whether each action succeeded or failed
- Timestamps for all events

Use logs to debug automations that aren't working as expected.

### 11.6 Automation Best Practices

- **Name automations descriptively** — "Auto-Tag Responders" not "Automation 1"
- **Test before activating** — Send a test message to trigger the automation and verify all steps
- **Avoid loops** — Don't create automations that trigger each other infinitely
- **Use conditions** — Add filters to prevent automations from firing on irrelevant contacts
- **Monitor logs weekly** — Check for failures and unexpected triggers
- **Disable before editing** — Set `is_active` to false while making changes

---

## 12. Flows

Flows are visual, branching conversation workflows that create interactive WhatsApp experiences. They enable multi-step conversations with buttons, lists, and conditional logic.

### 12.1 What Flows Can Do

Flows are ideal for:

| Use Case | Example |
|---|---|
| **Customer onboarding** | Collect business information through a guided questionnaire |
| **Product inquiry** | Interactive menu: "What are you looking for?" → Category → Product → Price |
| **Appointment booking** | "When would you like to visit?" → Date → Time → Confirmation |
| **FAQ bot** | "What do you need help with?" → Topic → Answer |
| **Order placement** | Product selection → Quantity → Delivery address → Payment method → Confirmation |
| **Feedback collection** | Rating → Comments → Thank you |

### 12.2 The Flow Builder

The Flow Builder is a visual editor at `/flows/[id]` where you design conversation flows by connecting nodes.

**Interface layout:**
- **Canvas** — The main area where you drag, drop, and connect nodes
- **Node Palette** — Left panel with available node types
- **Properties Panel** — Right panel showing settings for the selected node
- **Toolbar** — Top bar with Save, Test, Publish, and Undo/Redo buttons

### 12.3 Node Types

| Node Type | Icon | What It Does | Example |
|---|---|---|---|
| **Start** | ▶️ | Entry point of the flow — every flow has exactly one | Triggered by keyword or automation |
| **Send Message** | 💬 | Sends a text message to the contact | "Welcome! How can I help you today?" |
| **Collect Input** | 📝 | Waits for the contact to reply and stores their response | "What is your name?" → stores in variable |
| **Send Buttons** | 🔘 | Sends a message with up to 3 clickable buttons | "Choose an option:" [Option A] [Option B] [Option C] |
| **Send List** | 📋 | Sends a message with a scrollable list of up to 10 items | Product catalog, service menu |
| **Set Tag** | 🏷️ | Adds or removes a tag on the contact | Add tag: "onboarding-complete" |
| **Condition** | ❓ | Branches the flow based on a condition | If tag = "VIP" → Path A, else → Path B |
| **Delay** | ⏰ | Waits for a specified time before continuing | Wait 24 hours before sending follow-up |
| **Handoff** | 🤝 | Transfers the conversation to a human agent | "Connecting you with a team member..." |
| **End** | ⏹️ | Terminates the flow | Flow complete |

### 12.4 Creating a Flow

1. Go to **Flows** → **New Flow** (or click an existing flow to edit)
2. The Flow Builder opens with a **Start** node
3. Click the **+** button on the Start node to add the first step
4. Select a node type from the palette
5. Configure the node in the Properties Panel:
   - For **Send Message**: Enter the message text
   - For **Collect Input**: Enter the prompt and variable name to store the response
   - For **Send Buttons**: Enter the message and button labels
   - For **Conditions**: Set the condition logic
6. Connect nodes by dragging from one node's output to another node's input
7. Continue building until the flow reaches an **End** node
8. Click **Save**

### 12.5 Testing Flows

1. Click the **Test** button in the Flow Builder toolbar
2. A test panel opens simulating a WhatsApp conversation
3. Walk through the flow by responding to each prompt
4. Verify that:
   - Messages display correctly
   - Buttons and lists work as expected
   - Conditions branch correctly
   - Tags are applied/removed
   - The flow reaches the End node
5. Fix any issues and re-test

### 12.6 Flow Runs

Each time a contact goes through a flow, it creates a **Flow Run** record. View runs at `/flows/[id]/runs`:

| Field | Description |
|---|---|
| **Contact** | Who went through the flow |
| **Status** | Running, Completed, Failed, Paused |
| **Current Node** | Where the contact currently is in the flow |
| **Started At** | When the flow run began |
| **Completed At** | When the flow run finished (if completed) |
| **Collected Data** | All input values collected during the flow |

### 12.7 M4E Pre-Built Flows

The CRM includes several pre-built flow templates:

| Flow | Nodes | Purpose |
|---|---|---|
| **Client Onboarding** | 80 nodes | Comprehensive intake questionnaire for new M4E clients (10 sections, 34 questions) |
| **RetailBot Pro** | 33 nodes | Interactive product inquiry and ordering flow for retail businesses |
| **BeautyBot Pro** | 38 nodes | Appointment booking and service inquiry flow for beauty/wellness businesses |
| **Product Inquiry** | 15 nodes | Simple product catalog browsing flow |
| **Feedback Collection** | 12 nodes | Satisfaction rating and review collection flow |

---

## 13. AI Chatbot

The AI Chatbot is an intelligent auto-responder that uses large language models to answer customer questions, detect intent, and handle routine inquiries without human intervention.

### 13.1 How the AI Chatbot Works

```
Customer sends message
        ↓
System checks: Is AI Chatbot enabled?
        ↓ Yes
System checks: Is this within business hours? (if configured)
        ↓ Yes
System checks: Has max auto-replies been reached for this conversation?
        ↓ No
AI processes the message:
  1. Searches knowledge base for matching FAQ
  2. If match found with high confidence → sends knowledge base answer
  3. If no match → generates response using LLM (with system prompt context)
  4. If confidence below threshold → triggers handoff to human agent
        ↓
Response sent to customer
Conversation logged in ai_conversation_logs
```

### 13.2 Enabling the AI Chatbot

1. Go to **AI Chatbot** in the sidebar (Admin role required)
2. Toggle **Enable AI Chatbot** to ON
3. Configure the settings (see below)
4. Add knowledge base entries
5. Test with a sample message

### 13.3 Configuration Settings

| Setting | Default | Description |
|---|---|---|
| **Is Enabled** | Off | Master switch for the AI chatbot |
| **Model** | google/gemini-2.5-flash | The AI model used for responses (via OpenRouter) |
| **Confidence Threshold** | 0.70 | Minimum confidence score (0–1) to auto-reply. Below this, handoff to human. |
| **Max Auto-Replies** | 3 | Maximum consecutive AI replies per conversation before forcing handoff |
| **Handoff Message** | "Let me connect you with a team member..." | Message sent when handing off to a human agent |
| **Greeting Message** | "Hello! I'm an AI assistant..." | First message sent to new contacts (if auto-greet is enabled) |
| **System Prompt** | (Nigerian business assistant prompt) | Instructions that shape the AI's personality and behaviour |
| **Business Hours** | Mon–Fri 9am–5pm, Sat 9am–1pm (Africa/Lagos) | When the AI is active. Outside hours, it can be disabled or use a different message. |
| **Fallback Message** | "I couldn't understand that..." | Sent when the AI cannot process the message |
| **Max Tokens** | 500 | Maximum length of AI responses |
| **Temperature** | 0.7 | Creativity level (0 = factual, 1 = creative) |
| **Auto-Greet New Contacts** | Off | Automatically send greeting to first-time contacts |
| **Excluded Labels** | [] | Tags/labels that exclude contacts from AI responses |

### 13.4 Knowledge Base Management

The knowledge base is a collection of FAQ entries that the AI searches before generating responses.

**Adding a knowledge base entry:**

1. Go to **AI Chatbot** → **Knowledge Base** tab
2. Click **Add Entry**
3. Fill in:

| Field | Description | Example |
|---|---|---|
| **Category** | Entry type | `faq`, `product`, `policy`, `shipping`, `returns`, `pricing`, `general` |
| **Question** | The question this entry answers | "What are your delivery times?" |
| **Answer** | The answer to provide | "We deliver within Lagos in 24-48 hours..." |
| **Keywords** | Search keywords for matching | `["delivery", "shipping", "how long", "when"]` |
| **Priority** | Higher priority entries are preferred | 0 (default), higher = more important |
| **Is Active** | Whether this entry is currently used | true |

4. Click **Save**

**Best practices for knowledge base:**
- Add 20–50 entries covering the most common customer questions
- Use natural language in questions (how customers actually ask)
- Include multiple keyword variations
- Keep answers concise (2–3 sentences)
- Update regularly based on conversation logs
- Deactivate outdated entries rather than deleting them

### 13.5 Handoff Behaviour

The AI hands off to a human agent when:

1. **Low confidence** — The AI's confidence score is below the threshold (default: 0.70)
2. **Max replies reached** — The conversation has had 3+ consecutive AI replies
3. **Customer requests human** — Customer types "agent", "human", "speak to someone"
4. **Excluded label** — The contact has a tag in the excluded labels list

When handoff occurs:
- The handoff message is sent to the customer
- The conversation is flagged for human attention in the Inbox
- The AI stops auto-replying to that conversation
- A notification is sent to the assigned agent (if configured)

### 13.6 Conversation Logs

Every AI interaction is logged in the **AI Conversation Logs** table:

| Field | What It Records |
|---|---|
| **Inbound Message** | What the customer said |
| **Detected Intent** | What the AI thinks the customer wants |
| **Confidence** | How confident the AI is (0–1) |
| **Response Text** | What the AI replied |
| **Knowledge Entry** | Which FAQ entry was used (if any) |
| **Was Auto-Replied** | Whether the AI sent an automatic response |
| **Was Handed Off** | Whether the conversation was handed to a human |
| **Handoff Reason** | Why handoff occurred (low confidence, max replies, customer request) |
| **Model Used** | Which AI model generated the response |
| **Tokens Used** | How many tokens were consumed |
| **Latency** | Response time in milliseconds |

Use these logs to:
- Identify common questions not in the knowledge base
- Find low-confidence responses that need knowledge base entries
- Monitor AI costs (token usage)
- Evaluate response quality

---

## 14. E-Commerce Integration

The CRM integrates with Shopify and WooCommerce to synchronize products, orders, customers, and carts — enabling automated campaigns triggered by e-commerce events.

### 14.1 Supported Platforms

| Platform | Status | What Syncs |
|---|---|---|
| **Shopify** | Fully supported | Products, Orders, Customers, Carts |
| **WooCommerce** | Fully supported | Products, Orders, Customers, Carts |

### 14.2 Connecting Shopify

1. Go to **E-Commerce** in the sidebar
2. Click **Connect Shopify**
3. Enter your Shopify store details:

| Field | Where to Find It |
|---|---|
| **Store URL** | Your Shopify store URL (e.g., `mystore.myshopify.com`) |
| **API Key** | Shopify Admin → Settings → Apps → Develop apps → API credentials |
| **API Secret** | Same location as API Key |
| **Access Token** | Generated when creating the app in Shopify |

4. Click **Connect**
5. Configure sync options:
   - **Sync Products** — Import products from Shopify
   - **Sync Orders** — Import orders and track status changes
   - **Sync Customers** — Import customer data as CRM contacts
6. Click **Save**
7. The system will perform an initial sync (may take a few minutes for large stores)

### 14.3 Connecting WooCommerce

1. Go to **E-Commerce** in the sidebar
2. Click **Connect WooCommerce**
3. Enter your WooCommerce store details:

| Field | Where to Find It |
|---|---|
| **Store URL** | Your WordPress site URL (e.g., `https://mystore.com`) |
| **Consumer Key** | WooCommerce → Settings → Advanced → REST API → Add Key |
| **Consumer Secret** | Same location as Consumer Key |

4. Click **Connect**
5. Configure sync options (same as Shopify)
6. Click **Save**

### 14.4 What Syncs

| Data Type | Direction | Details |
|---|---|---|
| **Products** | Store → CRM | Name, price, description, image, inventory, variants |
| **Orders** | Store → CRM | Order number, status, items, amounts, customer info |
| **Customers** | Store → CRM | Name, email, phone → created as CRM contacts |
| **Carts** | Store → CRM | Abandoned cart detection (items, value, customer) |
| **Order Status** | Store → CRM | Real-time updates: pending → confirmed → shipped → delivered |

### 14.5 Abandoned Cart Detection

The system detects abandoned carts through e-commerce webhooks:

1. Customer adds items to cart on the online store
2. Customer does not complete checkout within 1 hour
3. The CRM creates an `ecommerce_carts` record with status `abandoned`
4. If the **Abandoned Cart Recovery** campaign is active, it automatically triggers
5. The customer receives a WhatsApp reminder about their cart

**Cart statuses:**

| Status | Meaning |
|---|---|
| `active` | Customer is currently shopping |
| `abandoned` | No checkout after 1+ hours |
| `recovered` | Customer completed purchase after reminder |
| `expired` | Cart abandoned for 30+ days — no longer recoverable |

### 14.6 Order Status Tracking

When connected, order status changes flow automatically:

```
Shopify/WooCommerce order status changes
        ↓
Webhook sent to CRM → /api/webhooks/shopify or /api/webhooks/woocommerce
        ↓
CRM updates ecommerce_orders table
        ↓
If Order Status campaign is active:
  → Sends WhatsApp notification to customer
        ↓
Customer receives: "Your order #1234 has been shipped! Track it here: ..."
```

---

## 15. Pipelines

Pipelines provide a visual Kanban board for tracking deals, sales opportunities, and campaign progress.

### 15.1 Pipeline Stages

The default **Customer Reactivation Pipeline** has 7 stages:

| Stage | Purpose | Typical Actions |
|---|---|---|
| **Data Import** | Contact data has been imported | Verify data quality, check phone numbers |
| **Segmentation** | Contacts have been segmented by recency | Review segments, adjust thresholds |
| **Message Generation** | Campaign messages have been created | Review templates, personalize content |
| **Campaign Active** | Campaign is running, messages being sent | Monitor delivery rates, handle replies |
| **Follow-up** | Initial campaign complete, following up with non-responders | Send reminders, try different approaches |
| **Won Back** | Customer has been successfully reactivated | Record purchase, calculate ROI |
| **Lost** | Customer did not respond after all attempts | Archive, try again in 3–6 months |

### 15.2 Managing Deals

**Creating a deal:**
1. Go to **Pipelines** in the sidebar
2. Click **Add Deal** (or deals are auto-created by automations)
3. Fill in:
   - **Deal Name** — e.g., "Reactivation - Adebayo Ogundimu"
   - **Value** — Expected revenue (e.g., ₦50,000)
   - **Contact** — Link to a CRM contact
   - **Product** — Link to a product (optional)
   - **Stage** — Starting pipeline stage
4. Click **Save**

**Moving deals between stages:**
- **Drag and drop** — Drag the deal card from one column to another
- **Click to edit** — Open the deal and change the stage dropdown
- **Automation** — Automations can move deals automatically based on events

### 15.3 Deal-Contact-Product Linking

Deals connect to contacts and products:

```
Contact (Adebayo) ←→ Deal (Reactivation Lead) ←→ Product (Premium Package)
```

This linking enables:
- Viewing all deals for a contact in their detail page
- Tracking which products are driving reactivation revenue
- Calculating per-product and per-contact ROI

---

## 16. Multi-Branch Management

For businesses with multiple locations, the CRM supports branch-level organization and reporting.

### 16.1 Setting Up Branches

1. Go to **Settings** → **Branches** tab (Admin/Owner only)
2. Click **Add Branch**
3. Enter branch details:
   - **Branch Name** — e.g., "Lagos - Victoria Island"
   - **Address** — Physical address
   - **Phone** — Branch phone number
   - **Manager** — Assigned team member
4. Click **Save**
5. Repeat for each branch location

### 16.2 Assigning Contacts to Branches

Contacts can be assigned to branches:

- **During import** — Include a `branch` column in the CSV
- **Manually** — Open contact detail → select branch from dropdown
- **By automation** — Create an automation that assigns branch based on phone area code or tag
- **By location** — If the contact's address matches a branch's service area

### 16.3 Branch-Level Reporting

With branches configured, the dashboard and campaign reports can be filtered by branch:

- **Dashboard** — View metrics for a specific branch or all branches
- **Campaigns** — See campaign performance per branch
- **Contacts** — Filter contact list by branch
- **Broadcasts** — Target broadcasts to specific branches

This is particularly valuable for franchise businesses or companies with regional offices across Nigeria.


---

## 17. Team Management

Team management controls who has access to the CRM account and what they can do.

### 17.1 Inviting Team Members

1. Go to **Settings** → **Members** tab
2. Click **Invite Member**
3. Enter the person's **email address**
4. Select their **role** (Viewer, Agent, Admin)
5. Click **Send Invitation**
6. The person receives an email with a link to join the account
7. They click the link, create a password (if new to the platform), and gain access

### 17.2 Managing Existing Members

The Members tab shows all current team members with their:

| Column | Description |
|---|---|
| **Name** | Team member's display name |
| **Email** | Login email address |
| **Role** | Current role (Owner, Admin, Agent, Viewer) |
| **Status** | Active, Pending (invitation sent), or Disabled |
| **Joined** | Date they joined the account |

**Actions available:**
- **Change Role** — Promote or demote a member (Admin/Owner only)
- **Remove** — Remove a member from the account (Admin/Owner only)
- **Disable** — Temporarily suspend access without removing (Admin/Owner only)

### 17.3 Role Permissions Matrix (Detailed)

| Permission | Viewer | Agent | Admin | Owner |
|---|---|---|---|---|
| View dashboard | ✅ | ✅ | ✅ | ✅ |
| View contacts | ✅ | ✅ | ✅ | ✅ |
| Create/edit contacts | ❌ | ✅ | ✅ | ✅ |
| Delete contacts | ❌ | ❌ | ✅ | ✅ |
| Import contacts (CSV) | ❌ | ✅ | ✅ | ✅ |
| View inbox | ✅ | ✅ | ✅ | ✅ |
| Send messages | ❌ | ✅ | ✅ | ✅ |
| Create broadcasts | ❌ | ✅ | ✅ | ✅ |
| Launch campaigns | ❌ | ✅ | ✅ | ✅ |
| Configure campaigns | ❌ | ❌ | ✅ | ✅ |
| View automations | ✅ | ✅ | ✅ | ✅ |
| Create/edit automations | ❌ | ❌ | ✅ | ✅ |
| View flows | ✅ | ✅ | ✅ | ✅ |
| Create/edit flows | ❌ | ❌ | ✅ | ✅ |
| Configure AI chatbot | ❌ | ❌ | ✅ | ✅ |
| Manage products | ❌ | ✅ | ✅ | ✅ |
| Manage pipelines/deals | ❌ | ✅ | ✅ | ✅ |
| Configure e-commerce | ❌ | ❌ | ✅ | ✅ |
| View settings | ✅ | ✅ | ✅ | ✅ |
| Edit settings | ❌ | ❌ | ✅ | ✅ |
| Invite members | ❌ | ❌ | ✅ | ✅ |
| Change member roles | ❌ | ❌ | ✅ | ✅ |
| Remove members | ❌ | ❌ | ✅ | ✅ |
| Transfer ownership | ❌ | ❌ | ❌ | ✅ |
| Delete account | ❌ | ❌ | ❌ | ✅ |

### 17.4 Transferring Ownership

Only the current Owner can transfer ownership:

1. Go to **Settings** → **Members**
2. Find the member who will become the new Owner
3. Click the **Transfer Ownership** button next to their name
4. Confirm the transfer
5. The previous Owner is demoted to Admin
6. The new Owner gains full control

> **Warning:** Ownership transfer is immediate and cannot be undone by the previous Owner. Only transfer to trusted individuals.

### 17.5 Best Practices for Team Management

| Practice | Rationale |
|---|---|
| Give clients **Viewer** or **Owner** role | Prevents accidental changes to campaign configurations |
| Give M4E campaign managers **Admin** role | Full configuration access without account deletion risk |
| Give M4E operators **Agent** role | Day-to-day messaging without settings access |
| Remove access promptly when staff leave | Security — prevent unauthorized access |
| Use individual accounts, never share logins | Audit trail — know who did what |

---

## 18. Settings Reference

The Settings page (`/settings`) contains all account-level configuration organized into tabs.

### 18.1 Profile Tab

| Setting | Description | Default |
|---|---|---|
| **Account Name** | Business name displayed throughout the CRM | (Set during signup) |
| **Account Email** | Primary contact email for the account | (Set during signup) |
| **Currency** | Default currency for deals, products, and revenue | NGN |
| **Timezone** | Used for scheduling, timestamps, and business hours | Africa/Lagos |
| **Language** | Interface language | English |

### 18.2 WhatsApp Tab

| Setting | Description | Where to Find It |
|---|---|---|
| **Phone Number ID** | The WhatsApp phone number identifier | Meta Business Manager → WhatsApp → Phone Numbers |
| **Business Account ID** | The WhatsApp Business Account ID | Meta Business Manager → Settings → Business Info |
| **Access Token** | Permanent access token for API calls | Meta Business Manager → System Users → Generate Token |
| **Webhook Verify Token** | Token for webhook verification (auto-generated) | Copy from CRM to Meta webhook settings |
| **Webhook URL** | The URL Meta sends messages to | `https://crm.marketing4effect.com/api/whatsapp/webhook` |
| **Default Template** | Template used for initial outreach | Select from approved templates |

**Connection status indicators:**
- 🟢 **Connected** — WhatsApp API is configured and working
- 🟡 **Pending** — Configuration saved but not yet verified
- 🔴 **Disconnected** — No configuration or configuration error

### 18.3 Email Tab

| Setting | Description | Default |
|---|---|---|
| **Email Provider** | Email service provider | Brevo |
| **API Key** | Brevo API key for sending emails | (Must be configured) |
| **From Name** | Sender name displayed in emails | Account name |
| **From Email** | Sender email address | (Must be configured) |
| **Reply-To Email** | Where replies are directed | Same as From Email |
| **Daily Limit** | Maximum emails per day | 300 (Brevo free tier) |

### 18.4 SMS Tab

| Setting | Description | Default |
|---|---|---|
| **SMS Provider** | SMS gateway provider | (Configurable) |
| **API Key** | Provider API key | (Must be configured) |
| **Sender ID** | Displayed sender name/number | Account name |
| **Country Code** | Default country code for phone numbers | +234 |

> **Note:** SMS is a future feature. The configuration interface is ready but SMS sending is not yet active.

### 18.5 Recency Scoring Tab

| Setting | Description | Default |
|---|---|---|
| **Industry Preset** | Pre-configured thresholds for your industry | Retail |
| **Hot Dormant Days** | Days since last purchase to classify as Hot Dormant | 60 |
| **Warm Dormant Days** | Days since last purchase to classify as Warm Dormant | 120 |
| **Cold Dormant Days** | Days since last purchase to classify as Cold Dormant | 240 |
| **Adaptive Enabled** | Let the system learn from your data | Off |
| **Recommended Thresholds** | System-calculated optimal thresholds | (Shown when data is available) |
| **Data Confidence** | How reliable the recommendations are | (Shown as percentage) |

### 18.6 Tags Tab

Manage the tag library:

- **Add Tag** — Create a new tag with name and colour
- **Edit Tag** — Change tag name or colour
- **Delete Tag** — Remove a tag (does not remove it from contacts that already have it)
- **Merge Tags** — Combine two tags into one

### 18.7 Custom Fields Tab

Manage custom fields for contacts:

- **Add Field** — Create a new field (Text, Number, Date, Boolean, Select)
- **Edit Field** — Change field name or type
- **Delete Field** — Remove a field (data in that field is lost)
- **Reorder Fields** — Change the display order in contact forms

### 18.8 Members Tab

See [Section 17: Team Management](#17-team-management).

### 18.9 Branches Tab

See [Section 16: Multi-Branch Management](#16-multi-branch-management).

### 18.10 Danger Zone

At the bottom of Settings (Owner only):

| Action | What It Does | Reversible? |
|---|---|---|
| **Export All Data** | Downloads all account data as CSV/JSON | N/A |
| **Delete All Contacts** | Removes all contacts and their data | ❌ No |
| **Delete Account** | Permanently deletes the entire account | ❌ No |

> **Warning:** Danger Zone actions are irreversible. Always export data before deleting anything.

---

## 19. Admin Panel (Super Admin)

The Admin Panel is accessible only to Super Admins and provides platform-wide visibility and management capabilities.

### 19.1 Accessing the Admin Panel

1. Log in with a Super Admin account
2. Click **Admin Panel** in the sidebar (only visible to Super Admins)
3. The Admin Panel has its own navigation with 7 sections

### 19.2 Admin Dashboard (`/admin/dashboard`)

The admin dashboard shows platform-wide metrics:

| Metric | Description |
|---|---|
| **Total Accounts** | Number of client accounts on the platform |
| **Total Contacts** | Sum of all contacts across all accounts |
| **Total Messages** | Messages sent/received across the platform |
| **Active Campaigns** | Currently running campaigns across all accounts |
| **Platform Revenue** | Total revenue tracked across all campaigns |
| **System Health** | Overall system status (Healthy, Degraded, Down) |

Charts show:
- Account growth over time
- Message volume trends
- Campaign performance aggregates
- Revenue trends

### 19.3 Admin Campaigns (`/admin/campaigns`)

View and manage campaigns across all accounts:

| Column | Description |
|---|---|
| **Campaign Name** | Name of the campaign |
| **Account** | Which client account owns this campaign |
| **Template** | Which template was used |
| **Status** | Draft, Scheduled, Active, Paused, Completed, Cancelled |
| **Audience** | Number of target contacts |
| **Sent/Delivered/Read** | Message funnel metrics |
| **Revenue** | Revenue attributed to this campaign |
| **Created** | When the campaign was created |

Actions:
- **View Details** — Open the campaign's full performance report
- **Pause/Resume** — Control campaign execution
- **Cancel** — Stop a campaign

### 19.4 Admin Revenue (`/admin/revenue`)

Revenue tracking across the entire platform:

| View | What It Shows |
|---|---|
| **Revenue by Account** | Which clients are generating the most campaign revenue |
| **Revenue by Campaign Type** | Which campaign templates perform best |
| **Revenue Over Time** | Daily/weekly/monthly revenue trends |
| **Revenue by Channel** | WhatsApp vs. Email vs. SMS revenue attribution |
| **ROI Summary** | Platform-wide return on investment |

### 19.5 Admin Analytics (`/admin/analytics`)

The analytics page has **4 tabs**:

#### Tab 1: Overview
- Platform-wide KPIs with trend indicators
- Account activity heatmap
- Feature adoption rates (which features are being used)

#### Tab 2: Engagement
- Message volume by hour/day/week
- Response rates by account
- Average response time
- Conversation duration metrics

#### Tab 3: Campaigns
- Campaign launch frequency
- Template popularity ranking
- Average campaign performance by type
- A/B test results (if applicable)

#### Tab 4: Growth
- New account signups over time
- Contact growth rate per account
- Feature adoption curves
- Churn indicators

### 19.6 Admin Monitoring (`/admin/monitoring`)

The monitoring page has **5 tabs**:

#### Tab 1: Health
- System component status (API, Database, WhatsApp, Email, AI)
- Uptime percentages
- Response time metrics
- Error rate trends

#### Tab 2: Alerts
- Active alerts (unresolved issues)
- Alert history
- Severity levels: Info, Warning, Critical
- Auto-resolve timers

#### Tab 3: Logs
- System logs with filtering:
  - By level: Debug, Info, Warn, Error, Fatal
  - By category: API, Auth, WhatsApp, Campaign, AI, Cron
  - By date range
  - By account
  - By request ID
- Log detail view with full metadata

#### Tab 4: Security
- Security events (login attempts, failed authentications)
- Brute force detection alerts
- IP address tracking
- Session management
- Rate limiting status

#### Tab 5: Cron Jobs
- Scheduled task status
- Last execution time and result
- Next scheduled execution
- Execution history with duration and outcome

### 19.7 Admin Accounts (`/admin/accounts`)

Manage all client accounts on the platform:

| Column | Description |
|---|---|
| **Account Name** | Business name |
| **Owner** | Account owner's name and email |
| **Contacts** | Number of contacts in the account |
| **Messages** | Total messages sent/received |
| **Campaigns** | Number of campaigns (active/total) |
| **Created** | Account creation date |
| **Status** | Active, Suspended, Trial |

**Actions:**
- **View** — Open the account detail page with full statistics
- **Impersonate** — Log in as the account owner (for support purposes)
- **Suspend** — Temporarily disable the account
- **Delete** — Permanently remove the account and all its data

### 19.8 Account Detail Page (`/admin/accounts/[id]`)

Drilling into a specific account shows:

- Account information and settings
- Owner and team member details
- Contact statistics and growth
- Campaign history and performance
- Message volume and delivery rates
- Revenue attribution
- WhatsApp configuration status
- E-commerce integration status
- AI chatbot usage statistics
- Recent activity log

---

## 20. Monitoring & Security

The CRM includes a comprehensive monitoring and security infrastructure to ensure platform reliability and data protection.

### 20.1 System Health Checks

The cron system runs periodic health checks via `/api/cron/health`:

| Check | Frequency | What It Monitors |
|---|---|---|
| **Database Connectivity** | Every 5 minutes | Can the application connect to Supabase? |
| **WhatsApp API** | Every 15 minutes | Is the Meta Cloud API responding? |
| **Email Service** | Every 15 minutes | Is Brevo accepting API calls? |
| **AI Service** | Every 15 minutes | Is OpenRouter responding? |
| **Webhook Endpoint** | Every 5 minutes | Is the webhook receiver processing events? |
| **Disk Space** | Every hour | Is storage usage within limits? |
| **Memory Usage** | Every 5 minutes | Is the application within memory bounds? |

When a health check fails:
1. A `system_alert` is created with severity `warning` or `critical`
2. The alert appears in the Admin Panel → Monitoring → Alerts tab
3. If configured, an email notification is sent to Super Admins
4. The alert auto-resolves when the check passes again

### 20.2 System Alerts

Alerts have three severity levels:

| Severity | Meaning | Example | Action Required |
|---|---|---|---|
| **Info** | Informational — no action needed | "Daily backup completed successfully" | None |
| **Warning** | Something needs attention soon | "Email delivery rate dropped below 90%" | Investigate within 24 hours |
| **Critical** | Immediate action required | "WhatsApp API connection lost" | Investigate immediately |

**Managing alerts:**
1. Go to **Admin Panel** → **Monitoring** → **Alerts**
2. View active (unresolved) alerts
3. Click an alert to see details and metadata
4. Click **Resolve** to mark as handled
5. Add resolution notes for the team

### 20.3 System Logs

Every significant system event is logged in the `system_logs` table:

| Field | Description |
|---|---|
| **Level** | debug, info, warn, error, fatal |
| **Category** | API, Auth, WhatsApp, Campaign, AI, Cron, Security |
| **Message** | Human-readable description of the event |
| **Metadata** | JSON object with additional context |
| **Request ID** | Unique identifier for tracing a request through the system |
| **User ID** | Which user triggered the event (if applicable) |
| **Account ID** | Which account the event relates to |
| **IP Address** | Source IP address |
| **Duration** | How long the operation took (in milliseconds) |
| **Status Code** | HTTP status code (for API events) |

**Searching logs:**
1. Go to **Admin Panel** → **Monitoring** → **Logs**
2. Use filters to narrow results:
   - Level filter (e.g., show only errors)
   - Category filter (e.g., show only WhatsApp events)
   - Date range
   - Account filter
   - Free-text search
3. Click a log entry to see full details

### 20.4 Security Events

The security monitoring system tracks:

| Event Type | What It Detects |
|---|---|
| **Failed Login Attempts** | Incorrect password entries |
| **Brute Force Detection** | Multiple failed logins from the same IP (threshold: 5 attempts in 15 minutes) |
| **Suspicious IP Activity** | Login attempts from unusual locations |
| **Role Changes** | When a user's role is modified |
| **Data Exports** | When account data is exported |
| **Account Deletions** | When accounts or contacts are deleted |
| **API Key Usage** | When API keys are used for authentication |

**Brute force protection:**
- After 5 failed login attempts from the same IP within 15 minutes:
  1. The IP is temporarily blocked for 30 minutes
  2. A `critical` alert is created
  3. The account owner is notified via email
  4. The event is logged with full details

### 20.5 The Cron System

The CRM uses a cron-based system for scheduled tasks. The cron endpoint is at `/api/cron` and is protected by the `AUTOMATION_CRON_SECRET`.

**Scheduled tasks:**

| Task | Schedule | Purpose |
|---|---|---|
| **Health Checks** | Every 5 minutes | Monitor system component status |
| **Campaign Processor** | Every 2 minutes | Process scheduled campaign messages |
| **Automation Runner** | Every 2 minutes | Execute time-based automations |
| **Cart Abandonment Check** | Every 15 minutes | Detect abandoned e-commerce carts |
| **Recency Score Update** | Daily at 2am WAT | Recalculate contact dormancy segments |
| **Log Cleanup** | Daily at 3am WAT | Archive logs older than 90 days |
| **Alert Auto-Resolve** | Every hour | Resolve alerts past their auto-resolve time |
| **Webhook Retry** | Every 5 minutes | Retry failed webhook deliveries |

**Cron configuration:**
- The cron is triggered by an external service (e.g., Vercel Cron, UptimeRobot, or a custom scheduler)
- Each request must include the `AUTOMATION_CRON_SECRET` header for authentication
- The cron endpoint returns a JSON response with the status of each task

### 20.6 Data Protection

| Measure | Implementation |
|---|---|
| **Encryption at Rest** | Supabase encrypts all data at rest using AES-256 |
| **Encryption in Transit** | All connections use TLS 1.2+ (HTTPS) |
| **Row Level Security** | Every table has RLS policies ensuring data isolation between accounts |
| **API Key Encryption** | E-commerce API keys are encrypted before storage using the `ENCRYPTION_KEY` |
| **Password Hashing** | Supabase Auth uses bcrypt for password hashing |
| **Session Management** | JWT tokens with configurable expiry |
| **NDPR Compliance** | The platform is designed to comply with Nigeria's Data Protection Regulation |

---

## 21. Troubleshooting

This section covers common issues and their solutions.

### 21.1 Login Issues

| Problem | Cause | Solution |
|---|---|---|
| "Invalid credentials" | Wrong email or password | Use "Forgot password" to reset. Check for typos. |
| "Account not found" | Email not registered | Check the email address. Contact admin for invitation. |
| Can't receive reset email | Email in spam folder or wrong email | Check spam/junk folder. Verify the email address with admin. |
| Session expired | JWT token expired | Log out and log back in. Clear browser cookies if persistent. |
| Locked out | Brute force protection triggered | Wait 30 minutes, then try again. Contact Super Admin if urgent. |

### 21.2 WhatsApp Issues

| Problem | Cause | Solution |
|---|---|---|
| Messages not sending | WhatsApp not configured | Go to Settings → WhatsApp and enter API credentials |
| "Template not found" | Template not approved by Meta | Check Meta Business Manager for template approval status |
| Messages stuck on "Pending" | API rate limit or connectivity issue | Wait 5 minutes and check again. Verify API token is valid. |
| Webhook not receiving messages | Webhook URL misconfigured | Verify the webhook URL in Meta Business Manager matches the CRM URL |
| "Message failed" errors | Invalid phone number or blocked contact | Verify phone number format (+234...). Check if contact has blocked the business number. |
| Low delivery rates | Poor phone number quality | Clean contact list — remove invalid numbers, verify country codes |
| 24-hour window expired | Trying to send free-form message after window | Use an approved template instead of free-form text |

### 21.3 Campaign Issues

| Problem | Cause | Solution |
|---|---|---|
| Campaign stuck on "Draft" | Not all required fields completed | Review all 6 wizard steps and ensure nothing is missing |
| Campaign not sending messages | Cron not running | Check Admin Panel → Monitoring → Cron Jobs for last execution time |
| Low open rates | Messages sent at wrong time | Reschedule for 9–11am or 4–6pm WAT |
| Low reply rates | Message not personalized or compelling | Review message templates, add personalization, improve offer |
| Revenue not tracking | Purchase events not linked to campaign | Verify e-commerce integration is active and purchase events are being recorded |
| "No qualifying contacts" | Audience filter too restrictive | Broaden the filter criteria or check that contacts have the required data |

### 21.4 Import Issues

| Problem | Cause | Solution |
|---|---|---|
| CSV import fails | File format error | Ensure CSV is UTF-8 encoded with comma separators |
| Phone numbers not matching | Missing country code | Add +234 prefix to all Nigerian numbers |
| Duplicate contacts created | Different phone formats | Standardize all numbers to international format before import |
| Custom fields not importing | Column names don't match | Verify CSV column headers match the custom field names exactly |
| Import hangs or times out | File too large | Split into batches of 5,000 contacts per file |

### 21.5 AI Chatbot Issues

| Problem | Cause | Solution |
|---|---|---|
| AI not responding | Chatbot disabled | Go to AI Chatbot page and toggle Enable to ON |
| Poor quality responses | Knowledge base incomplete | Add more FAQ entries covering common questions |
| AI responding to everything | Confidence threshold too low | Increase threshold from 0.70 to 0.80 or higher |
| AI not responding to anything | Confidence threshold too high | Decrease threshold from 0.70 to 0.50 |
| High token usage | Responses too long | Reduce Max Tokens setting (default: 500) |
| AI responding outside hours | Business hours not configured | Configure business hours in AI Chatbot settings |

### 21.6 E-Commerce Issues

| Problem | Cause | Solution |
|---|---|---|
| Products not syncing | API credentials incorrect | Re-enter API key and secret in E-Commerce settings |
| Orders not appearing | Webhook not configured in store | Set up webhook URL in Shopify/WooCommerce pointing to CRM |
| Abandoned carts not detected | Cart tracking not enabled | Ensure "Sync Orders" is enabled in integration settings |
| Customer data not matching | Phone/email mismatch | Ensure store customer data includes phone numbers with country codes |

### 21.7 Performance Issues

| Problem | Cause | Solution |
|---|---|---|
| Pages loading slowly | Large dataset or network issue | Check internet connection. Clear browser cache. |
| Dashboard not updating | Cached data | Refresh the page (Ctrl+F5). Wait for next cron cycle. |
| Search is slow | Too many contacts | Use filters to narrow results before searching |
| Export timing out | Large data export | Export in smaller batches (by date range or segment) |

---

## 22. Glossary

| Term | Definition |
|---|---|
| **Account** | A client's workspace in the CRM containing all their data, contacts, campaigns, and settings |
| **Active Contact** | A contact who has purchased within the Hot Dormant threshold period |
| **Adaptive Thresholds** | System-calculated dormancy thresholds based on actual purchase data patterns |
| **Admin** | A user role with full configuration access but cannot delete the account |
| **Agent** | A user role for day-to-day operations — can send messages and manage contacts |
| **Automation** | A rule-based action that executes automatically when triggered by an event |
| **Brevo** | Email service provider (formerly Sendinblue) used for transactional and marketing emails |
| **Broadcast** | A bulk message sent to multiple contacts simultaneously |
| **Campaign** | A pre-built, multi-step marketing sequence designed to achieve a specific business outcome |
| **Campaign Event** | A tracked interaction within a campaign (sent, delivered, read, replied, converted, purchased) |
| **Campaign Template** | A pre-configured campaign blueprint with proven message sequences and audience targeting |
| **COD** | Cash on Delivery — a payment method where the customer pays when the order arrives |
| **Cold Dormant** | A contact who has not purchased beyond the Cold Dormant threshold (default: 240+ days for retail) |
| **Contact** | A customer record in the CRM, identified by phone number and/or email |
| **Conversion** | When a campaign contact takes the desired action (e.g., makes a purchase, leaves a review) |
| **Cron** | A scheduled task system that runs automated processes at regular intervals |
| **Custom Field** | A user-defined data field added to contact records for storing additional information |
| **Deal** | A sales opportunity tracked in the pipeline, linked to a contact and optionally a product |
| **Delivery Rate** | Percentage of sent messages that were successfully delivered to the recipient's device |
| **Dormant Customer** | A customer who has not made a purchase within the expected timeframe for their industry |
| **Flow** | A visual, branching conversation workflow for interactive WhatsApp experiences |
| **Flow Run** | A single execution of a flow for a specific contact |
| **Handoff** | When the AI chatbot transfers a conversation to a human agent |
| **Hot Dormant** | A contact who has recently lapsed — the easiest segment to reactivate |
| **Industry Preset** | Pre-configured dormancy thresholds based on typical purchase cycles for an industry |
| **Knowledge Base** | A collection of FAQ entries used by the AI chatbot to answer customer questions |
| **Meta Cloud API** | Facebook/Meta's official API for sending and receiving WhatsApp Business messages |
| **Multi-Tenant** | Architecture where multiple client accounts share the same application but have isolated data |
| **Node** | A single step in a flow (e.g., send message, collect input, condition branch) |
| **OpenRouter** | AI model routing service used to access various LLMs for the chatbot |
| **Opt-Out** | When a customer requests to stop receiving messages |
| **Owner** | The highest-level user role — full control including account deletion and ownership transfer |
| **Pipeline** | A visual Kanban board for tracking deals through stages |
| **Purchase History** | Records of customer purchases linked to contacts and products |
| **Read Rate** | Percentage of delivered messages that were opened and read by the recipient |
| **Recency Score** | A classification of how recently a contact last purchased (Active, Hot, Warm, Cold Dormant) |
| **Reply Rate** | Percentage of read messages that received a response from the recipient |
| **Revenue Attribution** | Tracking which campaign or message led to a purchase |
| **RLS (Row Level Security)** | Database security mechanism ensuring users can only access data belonging to their account |
| **Sequence** | The ordered series of messages and delays in a campaign |
| **Supabase** | Backend-as-a-service platform providing the database, authentication, and storage |
| **Super Admin** | A platform-level role with access to all accounts and the Admin Panel |
| **Tag** | A label attached to a contact for organization, segmentation, and targeting |
| **Template** | A Meta-approved WhatsApp message format required for initiating conversations outside the 24-hour window |
| **Tier** | Campaign template classification — Tier 1 (included) vs. Tier 2 (premium) |
| **Trigger** | An event that starts an automation or campaign sequence |
| **Viewer** | A user role with read-only access to all data |
| **Warm Dormant** | A contact who has been inactive for a moderate period — needs incentive to return |
| **WAT** | West Africa Time (UTC+1) — the timezone used for scheduling in Nigeria |
| **Webhook** | An HTTP callback that sends real-time data from one system to another when an event occurs |
| **WhatsApp Business API** | The official API for businesses to send and receive WhatsApp messages at scale |
| **White-Label** | A product or service that can be rebranded and resold by a partner under their own brand |

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | June 14, 2026 | M4E Technical Team | Initial release |
| 2.0 | June 28, 2026 | M4E Technical Team | Complete rewrite — added Campaigns (10 templates), AI Chatbot, E-Commerce, Recency Scoring, Admin Panel, Monitoring, and comprehensive troubleshooting |

---

*This document is confidential and intended for M4E employees and authorized white-label partners only. Do not distribute externally.*

*For questions or corrections, contact the M4E Technical Team.*
