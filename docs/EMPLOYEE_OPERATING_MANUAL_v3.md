# M4E WhatsApp CRM — Employee Operating Manual

**Version:** 3.0  
**Last Updated:** 30 June 2026  
**Classification:** Internal — Marketing4Effect Staff Only  
**Platform URL:** https://crm.marketing4effect.com  
**Admin Panel:** https://crm.marketing4effect.com/admin/dashboard  

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Architecture & Technology Stack](#2-architecture--technology-stack)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Getting Started — Onboarding Wizard](#4-getting-started--onboarding-wizard)
5. [Dashboard](#5-dashboard)
6. [Inbox — Conversation Management](#6-inbox--conversation-management)
7. [Contacts Management](#7-contacts-management)
8. [Pipelines & Deals](#8-pipelines--deals)
9. [Products & Purchase History](#9-products--purchase-history)
10. [Broadcasts](#10-broadcasts)
11. [Campaigns — Self-Service Engine](#11-campaigns--self-service-engine)
12. [E-Commerce Integrations](#12-e-commerce-integrations)
13. [Automations](#13-automations)
14. [Flows — Visual Conversation Builder](#14-flows--visual-conversation-builder)
15. [AI Chatbot](#15-ai-chatbot)
16. [QR Codes](#16-qr-codes)
17. [WhatsApp Flows (WA Flows)](#17-whatsapp-flows-wa-flows)
18. [Ad Leads — Click-to-WhatsApp Tracking](#18-ad-leads--click-to-whatsapp-tracking)
19. [Sentiment Analysis](#19-sentiment-analysis)
20. [Segments — Advanced Audience Builder](#20-segments--advanced-audience-builder)
21. [Settings — Complete Reference](#21-settings--complete-reference)
22. [Help & Guides](#22-help--guides)
23. [Super Admin Panel](#23-super-admin-panel)
24. [Safety & Security Systems](#24-safety--security-systems)
25. [API Routes — Complete Reference](#25-api-routes--complete-reference)
26. [Database Schema & Migrations](#26-database-schema--migrations)
27. [Deployment & Infrastructure](#27-deployment--infrastructure)
28. [Monitoring & Cron Jobs](#28-monitoring--cron-jobs)
29. [Quick Reply Templates](#29-quick-reply-templates)
30. [Campaign Templates — Full Catalogue](#30-campaign-templates--full-catalogue)
31. [Automation Templates](#31-automation-templates)
32. [Flow Templates](#32-flow-templates)
33. [Troubleshooting Guide](#33-troubleshooting-guide)
34. [Glossary](#34-glossary)
35. [Platform Statistics](#35-platform-statistics)

---

## 1. Platform Overview

### What Is the M4E WhatsApp CRM?

The M4E WhatsApp CRM is a **Customer Reactivation Manager** — a full-featured WhatsApp-first customer relationship management platform built specifically for Nigerian mid-market businesses. It enables businesses to:

- **Communicate** with customers via WhatsApp, Email, and SMS from a single inbox
- **Reactivate** dormant customers using AI-powered campaign templates
- **Automate** repetitive messaging with triggers, flows, and AI chatbot
- **Track** sales pipelines, deals, products, and purchase history
- **Analyse** customer sentiment, campaign performance, and revenue metrics
- **Integrate** with Shopify, WooCommerce, Paystack, and Flutterwave
- **Segment** audiences using advanced rule-based builders
- **Scale** with multi-branch support, team roles, and white-label readiness

### Who Uses It?

| User Type | Description |
|-----------|-------------|
| **Business Owner** | The client who subscribes to M4E services. Has Owner role. |
| **Business Staff** | Client's employees added as Agents or Viewers. |
| **M4E Employee** | Marketing4Effect staff managing client accounts. Admin role. |
| **M4E Super Admin** | Platform administrators with access to the Admin Panel. |

### Key Differentiators

1. **Nigerian Market Optimised** — Pidgin English support, Naira currency, Nigerian industry presets
2. **Database Reactivation Focus** — 14 pre-built campaign templates for winning back dormant customers
3. **AI-Powered** — Chatbot with intent detection, sentiment analysis, knowledge base
4. **Self-Service Campaigns** — 6-step wizard that analyses the database and recommends campaigns
5. **Multi-Channel** — WhatsApp + Email (Brevo) + SMS from one platform
6. **Enterprise Safety** — Circuit breaker, rate limiting, AI cost monitoring, message loop detection

---

## 2. Architecture & Technology Stack

### Frontend

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix primitives) |
| State Management | React hooks + URL search params |
| Icons | Lucide React |
| Notifications | Sonner (toast) |
| Charts | Recharts |

### Backend

| Component | Technology |
|-----------|------------|
| API Routes | Next.js Route Handlers (111 routes) |
| Database | PostgreSQL (Supabase) |
| Authentication | Supabase Auth (email/password + OAuth) |
| Row-Level Security | Supabase RLS with custom policies |
| Real-time | Supabase Realtime subscriptions |
| File Storage | Supabase Storage |
| AI/LLM | OpenRouter API (Gemini 2.0 Flash) |
| Email | Brevo (Sendinblue) SMTP + API |
| SMS | Brevo SMS API |
| WhatsApp | Meta Cloud API (v18.0+) |
| Payments | Paystack + Flutterwave (stubs ready) |

### Infrastructure

| Component | Technology |
|-----------|------------|
| Hosting | Vercel (auto-deploy from GitHub) |
| Domain | crm.marketing4effect.com |
| Repository | github.com/kembah17/marketing4effect |
| Monitoring | Custom monitoring system + cron-job.org |
| CI/CD | Vercel GitHub integration (auto-deploy on push) |

### Code Statistics (as of 30 June 2026)

| Metric | Count |
|--------|-------|
| TypeScript files | 471 |
| Total lines of code | 99,079 |
| React components | 158 |
| API routes | 111 |
| Pages | 43 |
| Database migrations | 53 |
| Campaign templates | 14 |
| Quick reply templates | 25+ |

---

## 3. User Roles & Permissions

The CRM uses a hierarchical role system defined in `src/lib/auth/roles.ts`. Roles are stored in the `profiles.account_role` column and enforced at both the UI level (component gating) and API level (route guards + RLS policies).

### Role Hierarchy

| Role | Rank | Description |
|------|------|-------------|
| **Owner** | 4 | Account creator. Immutable. Can transfer ownership, delete account. One per account. |
| **Admin** | 3 | Full management access. Can invite/remove members, edit all settings, manage integrations. |
| **Agent** | 2 | Operational access. Can send messages, create contacts, move deals, run broadcasts, manage automations. Cannot change settings or manage members. |
| **Viewer** | 1 | Read-only access. Can view all data but cannot modify anything. Ideal for reporting stakeholders. |

### Permission Matrix

| Capability | Owner | Admin | Agent | Viewer |
|------------|-------|-------|-------|--------|
| View dashboard & data | ✅ | ✅ | ✅ | ✅ |
| Send messages | ✅ | ✅ | ✅ | ❌ |
| Create/edit contacts | ✅ | ✅ | ✅ | ❌ |
| Move deals in pipeline | ✅ | ✅ | ✅ | ❌ |
| Run broadcasts | ✅ | ✅ | ✅ | ❌ |
| Create automations | ✅ | ✅ | ✅ | ❌ |
| Edit settings | ✅ | ✅ | ❌ | ❌ |
| Manage team members | ✅ | ✅ | ❌ | ❌ |
| WhatsApp configuration | ✅ | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ | ❌ |
| Delete account | ✅ | ❌ | ❌ | ❌ |

### Super Admin

A separate `is_super_admin` flag on the `profiles` table grants access to the `/admin/*` routes. This is independent of the account role system — a Super Admin is an M4E platform administrator who can see all accounts, all metrics, and all system health data.

**Super Admin access is enforced at three levels:**
1. **Middleware** — checks `is_super_admin` before allowing `/admin/*` page loads
2. **API routes** — `/api/admin/*` routes verify the flag before processing
3. **Database RLS** — admin RPC functions use `SECURITY DEFINER` with super admin checks

---

## 4. Getting Started — Onboarding Wizard

**Route:** `/onboarding`

New accounts are guided through a streamlined 4-step setup wizard that collects only essential information:

### Step 1: Business Profile
- **Business Name** — displayed throughout the CRM
- **Industry** — selects from: Retail, Restaurant, Healthcare, Real Estate, Fashion, Beauty, Education, Professional Services, Other
- **Business Size** — Solo, 2-10, 11-50, 51-200, 200+
- **Country** — Nigeria (default), Ghana, Kenya, South Africa, UK, US, Canada, Other

### Step 2: WhatsApp Connection
Three options:
- **Embedded Signup** (Recommended) — One-click Meta Business connection via Facebook Login SDK. Automatically provisions WhatsApp Business API access.
- **Manual Setup** — Enter Phone Number ID and Access Token from Meta Business Manager
- **Skip** — Connect later from Settings

### Step 3: First Contact
Three options:
- **Add Manually** — Enter name, phone, and email for one contact
- **CSV Import** — Upload a CSV file with contacts
- **Skip** — Import contacts later

### Step 4: Quick Wins
- **Enable AI Chatbot** — Toggle on/off
- **Business Hours Preset** — Select standard hours
- **First Campaign** — Choose a recommended campaign template

Onboarding state is persisted in the `profiles` table (`onboarding_completed`, `onboarding_step`, `onboarding_data`) so users can resume if interrupted.

---

## 5. Dashboard

**Route:** `/dashboard`

The main dashboard provides a real-time overview of the business's CRM activity.

### Metrics Cards
The top row displays key performance indicators:
- **Total Contacts** — number of contacts in the database
- **Open Conversations** — active conversations needing attention
- **Messages Sent** — total outbound messages (today/this week/this month)
- **Active Campaigns** — currently running campaign count
- **Revenue Recovered** — total revenue attributed to reactivation campaigns
- **Conversion Rate** — average campaign conversion rate

### Recent Activity
- Latest conversations with contact name, last message preview, and timestamp
- Quick-click to open any conversation in the Inbox

### Campaign Performance Summary
- Active campaigns with progress bars
- Sent/delivered/read/replied metrics
- Revenue attribution per campaign

### Pipeline Overview
- Deal count and value per pipeline stage
- Visual funnel representation

---

## 6. Inbox — Conversation Management

**Route:** `/inbox`

The Inbox is the primary workspace for customer communication. It provides a WhatsApp-like interface for managing all conversations.

### Layout
- **Left Panel** — Conversation list with search, filters, and status tabs (Open, Pending, Closed)
- **Centre Panel** — Message thread with the selected contact
- **Right Panel** — Contact details, tags, notes, custom fields, deal info

### Conversation Features

| Feature | Description |
|---------|-------------|
| **Text Messages** | Send and receive plain text messages |
| **Media Messages** | Send/receive images, videos, documents, audio |
| **Quick Replies** | Type `/` to access shortcut replies (e.g., `/hi`, `/thanks`, `/hours`) |
| **Message Reactions** | React to customer messages with emojis |
| **Interactive Messages** | Send button messages and list messages |
| **Template Messages** | Send pre-approved WhatsApp message templates |
| **Message Status** | Track sent → delivered → read status with checkmarks |
| **Agent Assignment** | Assign conversations to specific team members |
| **Conversation Status** | Toggle between Open, Pending, and Closed |
| **Contact Context** | View contact profile, tags, notes, purchase history in the right panel |
| **Real-time Updates** | New messages appear instantly via Supabase Realtime |
| **Unread Badges** | Sidebar shows total unread count; individual conversations show unread count |

### Message Types Supported

| Type | Inbound | Outbound |
|------|---------|----------|
| Text | ✅ | ✅ |
| Image | ✅ | ✅ |
| Video | ✅ | ✅ |
| Document | ✅ | ✅ |
| Audio | ✅ | ✅ |
| Location | ✅ | ❌ |
| Sticker | ✅ | ❌ |
| Interactive (buttons/lists) | ✅ | ✅ |
| Template | ❌ | ✅ |

### Sender Types
- **customer** — messages from the WhatsApp user
- **agent** — messages sent by a human team member
- **bot** — messages sent by automations, flows, or AI chatbot

---

## 7. Contacts Management

**Route:** `/contacts`

### Contact Record

Each contact stores:

| Field | Description |
|-------|-------------|
| **Name** | Contact's display name |
| **Phone** | WhatsApp number (E.164 format). Nullable since migration 035. |
| **Email** | Email address. Nullable. At least one of phone/email required. |
| **Company** | Business/organisation name |
| **Primary Channel** | Preferred communication channel: WhatsApp, Email, or SMS |
| **Data Completeness Score** | 0-100 score computed by DB trigger based on filled fields |
| **Branch** | Assigned branch (for multi-location businesses) |
| **Tags** | Colour-coded labels for categorisation |
| **Custom Fields** | User-defined fields (text, number, date, dropdown) |
| **Notes** | Free-text notes added by agents |
| **Avatar** | Profile picture (auto-generated initials or uploaded) |

### Contact Operations

| Operation | Description |
|-----------|-------------|
| **Create** | Add individual contacts manually |
| **CSV Import** | Bulk import from CSV files with column mapping |
| **OCR Import** | Upload photos of business cards or handwritten lists; AI extracts contact data |
| **Bulk Tag** | Select multiple contacts and apply/remove tags |
| **Search** | Full-text search across name, phone, email, company |
| **Filter** | Filter by tags, branch, channel, date range |
| **Export** | Download contacts as CSV |
| **Deduplication** | Automatic phone number normalisation prevents duplicates (migration 022) |

### Dual Identifier System (Migration 035)

Contacts can exist with:
- Phone only (WhatsApp contacts)
- Email only (email-only contacts)
- Both phone and email

The `primary_channel` field determines which channel is used for outbound messages. The `data_completeness_score` is automatically calculated by a database trigger.

---

## 8. Pipelines & Deals

**Route:** `/pipelines`

### Pipeline Structure

Pipelines are visual Kanban boards for tracking sales opportunities:

- **Pipeline** — a named sales process (e.g., "New Leads", "Enterprise Sales")
- **Stage** — a column in the pipeline (e.g., "Qualified", "Proposal Sent", "Negotiation", "Won")
- **Deal** — an individual opportunity card that moves through stages

### Deal Record

| Field | Description |
|-------|-------------|
| **Title** | Deal name/description |
| **Value** | Monetary value in account currency |
| **Contact** | Linked contact record |
| **Product** | Linked product (optional, since migration 034) |
| **Stage** | Current pipeline stage |
| **Expected Close Date** | Projected closing date |
| **Notes** | Free-text notes |

### Pipeline Operations

- **Drag & Drop** — move deals between stages
- **Create Pipeline** — define custom pipelines with named stages
- **Edit Stages** — rename, reorder, add, or remove stages
- **Deal Details** — click a deal card to view/edit full details
- **Currency** — deals display in the account's default currency (configurable in Settings)

---

## 9. Products & Purchase History

**Route:** `/products`

### Product Catalogue

Manage the business's product/service catalogue:

| Field | Description |
|-------|-------------|
| **Name** | Product/service name |
| **Description** | Detailed description |
| **Price** | Unit price in account currency |
| **Category** | Product category |
| **SKU** | Stock keeping unit (optional) |
| **Is Active** | Whether the product is currently available |

### Purchase History

Track customer purchases for reactivation scoring:

| Field | Description |
|-------|-------------|
| **Contact** | Which customer made the purchase |
| **Product** | What was purchased |
| **Amount** | Purchase value |
| **Purchase Date** | When the purchase occurred |
| **Notes** | Additional details |

### Product Score Settings

The **Adaptive Recency Scoring** system (migration 039) analyses purchase patterns to intelligently segment customers:

- **Active** — purchased within the "active" threshold
- **At Risk** — purchased within the "at risk" threshold
- **Dormant** — no purchase beyond the "dormant" threshold

Thresholds are configurable per industry with presets:

| Industry | Active (days) | At Risk (days) | Dormant (days) |
|----------|--------------|----------------|----------------|
| FMCG | 30 | 60 | 90 |
| Retail | 60 | 120 | 180 |
| B2B Services | 90 | 180 | 365 |
| Healthcare | 90 | 180 | 365 |
| Real Estate | 180 | 365 | 730 |

The system can also **auto-adapt** thresholds based on actual transaction data using the `analyze_purchase_recency` RPC function.

### AI Product Suggestions

The `/api/products/suggest` endpoint uses AI to recommend products to contacts based on their purchase history and browsing patterns.

---

## 10. Broadcasts

**Route:** `/broadcasts`

### What Are Broadcasts?

Broadcasts are bulk messages sent to multiple contacts simultaneously. They use pre-approved WhatsApp message templates.

### Creating a Broadcast

1. **Select Template** — choose from synced WhatsApp message templates
2. **Select Audience** — filter contacts by tags, segments, or select all
3. **Customise Variables** — fill in template variable placeholders
4. **Schedule or Send** — send immediately or schedule for later

### Broadcast Metrics

Each broadcast tracks:
- **Total Recipients** — number of contacts targeted
- **Sent** — messages successfully sent to Meta API
- **Delivered** — messages delivered to recipient's device
- **Read** — messages opened/read by recipient
- **Failed** — messages that failed to send

Metrics are displayed as percentage bars with real-time polling (every 5 seconds while sending).

### Multi-Channel Routing (Migration 037)

Broadcasts support channel routing:
- **WhatsApp** — via Meta Cloud API templates
- **Email** — via Brevo SMTP
- **SMS** — via Brevo SMS API
- **Auto** — automatically selects based on contact's `primary_channel`

---

## 11. Campaigns — Self-Service Engine

**Route:** `/campaigns`

The Campaign Engine is the CRM's flagship feature — a self-service system that guides users through creating and launching customer reactivation campaigns.

### Campaign Wizard (6 Steps)

#### Step 1: Analyse Database
The wizard calls `/api/campaigns/analyze` to scan the contact database and produce:
- Total contacts and contacts with purchases
- Segment breakdown (Active, At Risk, Dormant)
- Revenue metrics (lifetime, average purchase value, dormant potential)
- AI-generated recommendations for which campaigns to run

#### Step 2: Select Template
Browse 14 pre-built campaign templates organised by category:
- **Reactivation** — Win-Back, Loyalty Reward
- **Cart Recovery** — Abandoned Cart
- **Post-Purchase** — Cross-Sell/Upsell, Review Collection
- **Lifecycle** — Birthday Campaign, VIP Exclusive
- **Engagement** — WhatsApp Flow Survey, Product Catalog Browse
- **Revenue** — Ad Lead Nurture
- **Feedback** — Unhappy Customer Recovery

Each template shows:
- What it does and why you need it
- Expected open/reply/conversion rates
- Tier level (1 = basic, 2 = advanced, 3 = premium)
- Message templates and sequence steps

#### Step 3: Customise Messages
Edit the pre-written message templates:
- Modify text while preserving variable placeholders
- Toggle discount offers on/off
- Preview how messages will appear on WhatsApp

#### Step 4: Select Audience
Define who receives the campaign:
- Use template's default audience filter
- Customise with segment rules
- Preview audience count before launching

#### Step 5: Schedule
- **Send Now** — launch immediately
- **Schedule** — pick a future date and time

#### Step 6: Review & Launch
Final review showing:
- Campaign name and template
- Message previews
- Audience size
- Estimated performance metrics
- Confirm and launch

### Campaign Gallery

The `/campaigns` page also features a **browsable gallery** with:
- Category filter tabs (All, Reactivation, Cart Recovery, etc.)
- Rich cards with descriptions, expected metrics, and tier badges
- One-click "Use Template" to enter the wizard

### Campaign Monitoring

Active campaigns display:
- Real-time sent/delivered/read/replied/converted counts
- Revenue attribution
- Progress percentage
- Pause/resume/cancel controls

### Campaign Reports

Generate reports via:
- `/api/campaigns/[id]/report` — JSON report
- `/api/campaigns/[id]/report/csv` — CSV export
- `/api/campaigns/[id]/report/pdf` — PDF report

### Event-Driven Triggers

Campaigns can be triggered automatically by events:
- Order placed/shipped/delivered/cancelled
- Payment confirmed/failed
- Cart abandoned
- Contact birthday/anniversary
- Purchase milestone reached
- No purchase for X days

Triggers are managed via `/api/campaigns/triggers` and executed by a cron endpoint.

---

## 12. E-Commerce Integrations

**Route:** `/ecommerce`

### Supported Platforms

| Platform | Status | Webhook Endpoint |
|----------|--------|------------------|
| **Shopify** | Active | `/api/webhooks/shopify` |
| **WooCommerce** | Active | `/api/webhooks/woocommerce` |
| **Paystack** | Stub (awaiting bank account) | `/api/webhooks/paystack` |
| **Flutterwave** | Stub (awaiting bank account) | `/api/webhooks/flutterwave` |

### Integration Setup

The E-Commerce page has four tabs:

1. **Integrations** — Connect/manage store integrations via setup wizard
2. **Orders** — View synced orders from connected stores
3. **Carts** — View abandoned carts detected by the system
4. **Catalog** — Sync product catalogs between store and CRM

### Shopify Integration

When connected, the Shopify webhook receiver handles:
- `orders/create` — syncs new orders, creates purchase records
- `orders/updated` — updates order status
- `products/create` / `products/update` — syncs product catalog
- `customers/create` / `customers/update` — syncs customer data
- `carts/create` / `carts/update` — tracks cart activity

### WooCommerce Integration

Similar webhook handling for WooCommerce events with WordPress-specific payload parsing.

### Abandoned Cart Detection

The system detects abandoned carts via:
- Cart webhook events from Shopify/WooCommerce
- A cron endpoint (`/api/ecommerce/carts/cron`) that checks for carts older than the configured threshold
- Triggers the "Abandoned Cart" campaign template when detected

### Campaign Trigger Engine

The trigger engine (`src/lib/campaigns/trigger-engine.ts`) processes e-commerce events and fires matching campaign triggers:

```
E-commerce Event → Webhook → Trigger Engine → Match Conditions → Queue Execution → Send Campaign
```

---

## 13. Automations

**Route:** `/automations`

### What Are Automations?

Automations are event-driven rules that execute actions when specific triggers fire. They follow a **trigger → condition → action** pattern.

### Trigger Types

| Trigger | Description |
|---------|-------------|
| `new_message_received` | Any inbound message |
| `first_inbound_message` | First-ever message from a contact |
| `new_contact_created` | Contact added to the system |
| `tag_added` | Specific tag applied to a contact |
| `deal_stage_changed` | Deal moves to a specific pipeline stage |
| `keyword_match` | Message contains specific keywords |

### Action Types

| Action | Description |
|--------|-------------|
| `send_message` | Send a text message to the contact |
| `add_tag` | Apply a tag to the contact |
| `remove_tag` | Remove a tag from the contact |
| `assign_agent` | Assign the conversation to a team member |
| `move_deal` | Move a deal to a specific pipeline stage |
| `wait` | Pause execution for a specified duration |
| `condition` | Branch based on time of day, tag presence, etc. |

### Pre-Built Templates

| Template | Trigger | Description |
|----------|---------|-------------|
| **Welcome Message** | First inbound message | Auto-greet new contacts and tag them |
| **Out of Office** | New message received | Reply during off-hours (6pm-9am) |
| **Lead Qualifier** | Keyword match | Ask qualifying questions and tag leads |
| **Follow-Up Reminder** | Tag added | Send follow-up after a delay |

### Automation Builder

- Visual step-by-step builder
- Drag to reorder steps
- Condition branching (yes/no paths)
- Enable/disable toggle
- Duplicate existing automations
- Execution counter tracks how many times each automation has fired

### Automation Engine

The engine (`src/lib/automations/engine.ts`) is called from the WhatsApp webhook handler. Processing order:

```
Inbound Message → Flows Engine → AI Chatbot → Automations Engine
```

If a Flow or AI Chatbot handles the message, automations are suppressed to prevent duplicate responses.

---

## 14. Flows — Visual Conversation Builder

**Route:** `/flows` (Beta)

### What Are Flows?

Flows are multi-step conversational experiences built with a visual node-based editor. Unlike automations (which are linear trigger→action chains), flows support complex branching conversations.

### Node Types

| Node | Description |
|------|-------------|
| **Start** | Entry point — defines trigger (keyword, first message, manual) |
| **Send Message** | Send a text message |
| **Send Buttons** | Send a message with up to 3 reply buttons |
| **Send List** | Send a message with a list menu (up to 10 items) |
| **Collect Input** | Wait for customer's text reply and store it |
| **Condition** | Branch based on input value, tag, or custom logic |
| **Set Tag** | Apply or remove a tag |
| **Handoff** | Transfer to a human agent |
| **End** | Terminate the flow |

### Flow Templates

| Template | Description |
|----------|-------------|
| **Welcome Menu** | Greet customers and route based on new/existing status |
| **FAQ Bot** | Answer common questions with a list menu |
| **Lead Capture** | Collect name, email, and interest from new contacts |

### Flow Engine

The flow engine (`src/lib/flows/engine.ts`) manages per-contact flow runs:
- Tracks which node each contact is currently on
- Processes interactive replies (button taps, list selections)
- Handles timeouts and fallback policies
- Supports concurrent flows per contact

### Flow Lifecycle

1. **Draft** — flow is being built, not active
2. **Active** — flow is live and processing messages
3. **Paused** — flow is temporarily disabled

A cron endpoint (`/api/flows/cron`) handles timed transitions and cleanup of stale flow runs.

---

## 15. AI Chatbot

**Route:** `/ai-chatbot` (Beta)

### Overview

The AI Chatbot provides automated customer service using OpenRouter's Gemini 2.0 Flash model. It sits in the webhook pipeline between Flows and Automations.

### Five Tabs

#### 1. Settings
- **Enable/Disable** — master toggle
- **Model Selection** — choose AI model
- **Temperature** — control response creativity (0.0-1.0)
- **Max Tokens** — limit response length
- **System Prompt** — customise the AI's personality and instructions
- **Business Hours** — only respond during configured hours
- **Handoff Keywords** — words that trigger transfer to human agent (e.g., "speak to agent", "human")
- **Excluded Tags** — contacts with these tags bypass the AI

#### 2. Knowledge Base
- Add entries with title, content, and category
- The AI searches the knowledge base before generating responses
- Supports bulk import
- Categories help organise entries (FAQ, Product Info, Policies, etc.)

#### 3. Test
- Interactive chat interface to test the AI's responses
- Simulates a customer conversation without sending real WhatsApp messages
- Shows intent detection, confidence scores, and knowledge base matches

#### 4. Logs
- View all AI interactions with timestamps
- See detected intent, confidence, response text
- Track whether the AI auto-replied or handed off
- Filter by date range and outcome

#### 5. Analytics
- Total interactions, auto-reply rate, handoff rate
- Average confidence score
- Top detected intents
- Response time distribution
- Token usage and estimated costs

### AI Processing Pipeline

```
Inbound Message
  → Circuit Breaker Check (rate limiting)
  → Flow Engine (if active flow for contact)
  → AI Chatbot Engine
    → Check if enabled for account
    → Check business hours
    → Check excluded tags
    → Search knowledge base
    → Detect intent via OpenRouter
    → Generate response
    → Track usage and costs
    → Send response via WhatsApp
  → Automation Engine (if AI didn't handle)
```

### AI Cost Monitoring

The system tracks:
- Tokens used per interaction (input + output)
- Cost per interaction based on model pricing
- Daily/weekly/monthly cost aggregation
- Budget alerts when spending exceeds thresholds
- All tracked in the Admin Panel → AI & Safety page

---

## 16. QR Codes

**Route:** `/qr-codes`

### Features

- **Generate QR Codes** — create QR codes that open a WhatsApp conversation with the business
- **Pre-filled Messages** — configure a default message that appears when the customer scans
- **Templates** — save QR code configurations for reuse
- **Download** — export as PNG for printing

### Use Cases

- Business cards and flyers
- Product packaging
- Store/office displays
- Email signatures
- Social media posts
- Invoices and receipts
- Event banners
- Website embedding

---

## 17. WhatsApp Flows (WA Flows)

**Route:** `/whatsapp-flows` (Beta)

### What Are WhatsApp Flows?

WhatsApp Flows are Meta's native interactive forms within WhatsApp. Unlike the CRM's internal Flows (Section 14), these are rendered natively in the WhatsApp app with form fields, dropdowns, and buttons.

### Capabilities

- **Create** — design WhatsApp Flow JSON structures
- **Publish** — submit flows to Meta for approval
- **Send** — send published flows to contacts
- **Track** — monitor flow completion rates

### Management

| Operation | API Endpoint |
|-----------|-------------|
| List flows | `GET /api/whatsapp/flows` |
| Create flow | `POST /api/whatsapp/flows` |
| Get flow details | `GET /api/whatsapp/flows/[id]` |
| Update flow | `PUT /api/whatsapp/flows/[id]` |
| Publish flow | `POST /api/whatsapp/flows/[id]/publish` |
| Send to contact | `POST /api/whatsapp/flows/[id]/send` |

---

## 18. Ad Leads — Click-to-WhatsApp Tracking

**Route:** `/ad-leads` (Beta)

### How It Works

When a customer clicks a Click-to-WhatsApp (CTWA) ad on Facebook or Instagram:
1. Meta sends referral data with the customer's first message
2. The webhook handler extracts ad source, headline, creative, and CTWA click ID
3. The `trackCTWALead` function records the lead in the `ctwa_leads` table
4. The lead appears in the Ad Leads dashboard

### Dashboard Components

- **CTWADashboard** — overview metrics (total leads, conversion rate, top-performing ads)
- **CTWALeadsPanel** — detailed lead list with nurture tracking status

### Tracked Data

| Field | Description |
|-------|-------------|
| Source URL | The ad or post URL |
| Source Type | 'ad' or 'post' |
| Source ID | Meta's ad/post identifier |
| Headline | Ad headline text |
| Body | Ad body text |
| Media Type | Image or video |
| CTWA Click ID | Unique click identifier |
| Contact | Linked CRM contact |

### Auto-Tagging (Migration 054)

CTWA leads are automatically tagged for easy filtering and campaign targeting.

---

## 19. Sentiment Analysis

**Route:** `/sentiment` (Beta)

### How It Works

Every incoming WhatsApp message is automatically analysed for sentiment using AI:

1. Message arrives via webhook
2. `triggerSentimentAnalysis` is called asynchronously
3. AI classifies the message as: **Positive**, **Neutral**, **Negative**, or **Urgent**
4. Results are stored in the `message_sentiments` table
5. Negative and urgent messages are flagged for immediate attention

### Language Support

- Standard English
- Nigerian Pidgin English
- Mixed language messages

### Dashboard

The Sentiment Dashboard (`SentimentDashboard` component) shows:
- Sentiment distribution pie chart
- Trend over time
- Flagged messages requiring attention
- Per-contact sentiment history

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/sentiment/analyze` | Manually analyse a message |
| `GET /api/sentiment/stats` | Get sentiment statistics |

---

## 20. Segments — Advanced Audience Builder

**Route:** `/segments` (Beta)

### What Are Segments?

Segments are dynamic groups of contacts defined by rules. They automatically update as contact data changes.

### Segment Builder

The visual segment builder supports:

#### Rule Fields
- Contact fields (name, phone, email, company, branch)
- Tag presence/absence
- Custom field values
- Purchase history (total purchases, last purchase date, lifetime value)
- Activity (last message date, conversation count)
- Channel preference

#### Operators
- `equals` / `not_equals`
- `contains` / `not_contains`
- `greater_than` / `less_than`
- `between`
- `in` / `not_in`
- `is_empty` / `is_not_empty`
- `within_days` / `before_days`

#### Logic Groups
- **AND** — all rules must match
- **OR** — any rule must match
- Nested groups up to 2 levels deep

### Segment Operations

| Operation | Description |
|-----------|-------------|
| Create | Build a new segment with the visual builder |
| Edit | Modify existing segment rules |
| Preview | See matching contact count before saving |
| Delete | Remove a segment |
| Use in Campaigns | Select a segment as the campaign audience |
| Use in Broadcasts | Target a segment for bulk messaging |

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/segments` | List all segments |
| `POST /api/segments` | Create a new segment |
| `GET /api/segments/[id]` | Get segment details |
| `PUT /api/segments/[id]` | Update segment rules |
| `DELETE /api/segments/[id]` | Delete a segment |
| `POST /api/segments/preview` | Preview matching contacts |

---

## 21. Settings — Complete Reference

**Route:** `/settings?tab=<section>`

The Settings page uses a left-rail navigation with 16 sections:

### Overview (`?tab=overview`)
Landing page showing status cards for all settings sections with quick-access links.

### Profile (`?tab=profile`)
- Edit display name
- Upload avatar
- View email (read-only)
- View account ID

### Security (`?tab=security`)
- Change password
- View active sessions
- Two-factor authentication status

### Appearance (`?tab=appearance`)
- Toggle between Light and Dark mode
- Theme persists across sessions

### WhatsApp (`?tab=whatsapp`)
- **Embedded Signup** — one-click Meta Business connection
- **Manual Configuration** — enter Phone Number ID, Access Token, Webhook Verify Token
- **Connection Status** — verify WhatsApp API connectivity
- **Registration** — register/verify the phone number with Meta
- **Webhook URL** — display the webhook URL to configure in Meta Business Manager

### Meta Costs (`?tab=costs`)
- View Meta's WhatsApp conversation pricing tiers
- Track estimated costs per conversation category:
  - Marketing conversations
  - Utility conversations
  - Authentication conversations
  - Service conversations (free for 24 hours)
- Monthly cost projection

### SMS (`?tab=sms`)
- **SMS Configuration** — Brevo API key and sender settings
- **SMS Test** — send a test SMS to verify configuration
- **Sender ID Guide** — instructions for registering branded sender IDs in Nigeria (DND compliance)

### Channels (`?tab=channels`)
- **Channel Matrix** — recommended communication channels by country
- Shows top 10 channels for Nigeria, Ghana, Kenya, South Africa, UK, US, Canada
- Includes WhatsApp, SMS, Email, Instagram DM, Telegram, etc.
- Penetration rates and best use cases per channel

### Templates (`?tab=templates`)
- **Sync Templates** — pull latest templates from Meta
- **View Templates** — browse all WhatsApp message templates with status (approved/pending/rejected)
- **Submit Template** — create and submit new templates to Meta for approval
- **Template Validation** — checks template content against Meta's policies before submission

### Fields & Tags (`?tab=fields`)
- **Tags** — create, edit, delete colour-coded tags
- **Custom Fields** — define custom contact fields (text, number, date, dropdown)

### Deals (`?tab=deals`)
- **Default Currency** — set the account's currency (NGN, USD, GBP, etc.)
- **Pipeline Settings** — configure default pipeline behaviour

### Recency (`?tab=recency`)
- **Industry Presets** — select industry for automatic threshold configuration
- **Custom Thresholds** — manually set Active/At Risk/Dormant day ranges
- **Auto-Adaptive Mode** — let the system analyse purchase data and recommend thresholds
- **Confidence Badges** — show data quality indicators

### Branches (`?tab=branches`)
- **Create Branch** — add business locations/branches
- **Assign Members** — assign team members to branches
- **Branch Analytics** — view per-branch metrics
- **Contact Assignment** — assign contacts to branches

### Quick Replies (`?tab=quick-replies`)
- **Built-in Templates** — 25+ pre-written replies across 8 categories and 5 industries
- **Custom Replies** — create your own quick replies with shortcuts
- **Categories** — greeting, closing, FAQ, pricing, scheduling, follow-up, support, general
- **Industries** — general, retail, restaurant, healthcare, real estate
- **Shortcuts** — type `/shortcut` in the inbox to insert (e.g., `/hi`, `/thanks`, `/hours`)

### Members (`?tab=members`)
- **View Members** — see all team members with roles
- **Invite Members** — generate invite links with role assignment
- **Change Roles** — promote/demote members (admin+ only)
- **Remove Members** — remove team members (admin+ only)
- **Transfer Ownership** — transfer account ownership (owner only)

### Website Sync (`?tab=website-sync`)
- **Sync Configuration** — connect the CRM to the business's website
- **Content Sync** — pull website content for AI knowledge base
- **Auto-Update** — schedule periodic content refreshes

---

## 22. Help & Guides

**Route:** `/help`

A searchable FAQ page with 12 sections covering all CRM features:

1. **Getting Started** — setup, first steps, WhatsApp connection
2. **Dashboard** — metrics, activity feed, navigation
3. **Inbox** — conversations, messaging, media, quick replies
4. **Contacts** — import, tags, custom fields, deduplication
5. **Broadcasts** — templates, audience selection, scheduling
6. **Campaigns** — wizard, templates, monitoring, reports
7. **Automations** — triggers, actions, templates, troubleshooting
8. **Flows** — node types, templates, activation, testing
9. **AI Chatbot** — setup, knowledge base, testing, costs
10. **E-Commerce** — integrations, orders, carts, catalog sync
11. **Products & Purchases** — catalog, history, recency scoring
12. **Settings** — all configuration options explained

Each section has an accordion of frequently asked questions with detailed answers.

---

## 23. Super Admin Panel

**Access:** `/admin/*` (requires `is_super_admin = true`)

The Super Admin Panel is the M4E platform management interface. It provides visibility across all client accounts.

### Admin Sidebar Navigation

| Route | Label | Description |
|-------|-------|-------------|
| `/admin/dashboard` | Overview | Platform-wide metrics and growth charts |
| `/admin/accounts` | Accounts | All client accounts with onboarding status |
| `/admin/campaigns` | Campaigns | Cross-account campaign performance |
| `/admin/analytics` | Analytics | Platform analytics with engagement/cohort tabs |
| `/admin/revenue` | Revenue | Revenue tracking and projections |
| `/admin/monitoring` | Monitoring | System health, alerts, logs, performance |
| `/admin/safety` | AI & Safety | AI cost monitoring and circuit breaker controls |

### Admin Dashboard (`/admin/dashboard`)

#### Platform Metrics
- Total accounts
- Total contacts across all accounts
- Total messages sent
- Total broadcasts sent
- Active WhatsApp connections
- New accounts (this month)

#### Growth Chart
- 30-day growth series showing accounts, contacts, and messages over time

#### Onboarding Tracker
- Table of all accounts with onboarding completion status
- Shows which steps each account has completed
- Identifies accounts that need follow-up

#### Alerts Panel
- System alerts requiring attention
- Account-specific issues
- Integration failures

### Admin Accounts (`/admin/accounts`)
- Full list of all client accounts
- Account details: name, owner, creation date, contact count, message count
- WhatsApp connection status
- Onboarding progress
- Sort and filter capabilities

### Admin Campaigns (`/admin/campaigns`)
- Cross-account campaign table
- Performance metrics per campaign
- Filter by status, account, template
- Campaign health indicators

### Admin Analytics (`/admin/analytics`)
Three tabs:
1. **Engagement** — message volume, response rates, active hours
2. **Cohort** — user retention and engagement cohorts
3. **Overview** — high-level platform health metrics

### Admin Revenue (`/admin/revenue`)
- Revenue overview across all accounts
- Revenue attribution to campaigns
- Monthly recurring revenue tracking
- Revenue projections

### Admin Monitoring (`/admin/monitoring`)
Five tabs:
1. **Overview** — system health status, uptime, response times
2. **Alerts** — active and resolved alerts with severity levels
3. **Logs** — structured system logs with filtering
4. **Security** — security events, failed logins, suspicious activity
5. **Performance** — API response times, error rates, throughput

### Admin AI & Safety (`/admin/safety`)
Two tabs:
1. **AI Usage** — token consumption, cost tracking, budget management, per-account breakdown
2. **Safety** — circuit breaker status, rate limit events, message loop detections

---

## 24. Safety & Security Systems

### Circuit Breaker — Message Loop Detection

**File:** `src/lib/safety/circuit-breaker.ts`

The circuit breaker prevents runaway message loops (e.g., two bots replying to each other, or an automation creating an infinite loop).

#### Rate Rules

| Rule | Window | Max Messages | Cooldown | Scope |
|------|--------|-------------|----------|-------|
| contact_5min | 5 minutes | 10 | 10 minutes | Per contact |
| contact_1hr | 1 hour | 30 | 30 minutes | Per contact |
| contact_24hr | 24 hours | 100 | 1 hour | Per contact |
| account_1hr | 1 hour | 500 | 15 minutes | Per account |
| account_24hr | 24 hours | 5,000 | 1 hour | Per account |

#### How It Works

1. Every outbound message passes through `checkAndRecord()`
2. In-memory Map tracks message timestamps per contact and account
3. If any rate rule is exceeded, the circuit "trips":
   - Message is blocked
   - Cooldown period begins
   - Event is logged to `security_events` table
   - Admin alert is created
4. Stale entries are cleaned up every 5 minutes

### AI Cost Monitoring

**File:** `src/lib/ai/usage-tracker.ts`

Tracks all AI API usage:
- Tokens consumed (input + output)
- Cost per interaction
- Daily/weekly/monthly aggregation
- Budget thresholds with alerts
- Per-account breakdown

### Webhook Signature Verification

**File:** `src/lib/whatsapp/webhook-signature.ts`

All incoming WhatsApp webhooks are verified using Meta's X-Hub-Signature-256 header to prevent spoofing.

### Encryption

**File:** `src/lib/whatsapp/encryption.ts`

Sensitive data (WhatsApp access tokens) are encrypted at rest using AES encryption with the `ENCRYPTION_KEY` environment variable.

### Row-Level Security (RLS)

All database tables have RLS enabled with policies ensuring:
- Users can only access data belonging to their account
- Super admins can access all data via SECURITY DEFINER functions
- Service role key bypasses RLS for server-side operations

### Middleware Security

**File:** `src/middleware.ts`

The Next.js middleware enforces:
- Authentication for all protected routes
- Super admin verification for `/admin/*` routes
- Request ID generation for tracing
- Response time headers for monitoring
- Redirect logic for auth pages and invite flows

---

## 25. API Routes — Complete Reference

The CRM has **111 API routes** organised by domain:

### Account Management (7 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/api/account` | Get/update account details |
| GET/POST | `/api/account/invitations` | List/create invite links |
| DELETE | `/api/account/invitations/[id]` | Revoke an invitation |
| GET/PUT/DELETE | `/api/account/members/[userId]` | Manage individual members |
| GET | `/api/account/members` | List all account members |
| POST | `/api/account/transfer-ownership` | Transfer account to another member |

### Admin (7 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/api/admin/ai-budget` | View/set AI spending budget |
| GET | `/api/admin/ai-usage` | AI usage statistics |
| GET | `/api/admin/monitoring` | System health overview |
| GET | `/api/admin/monitoring/alerts` | System alerts |
| GET | `/api/admin/monitoring/logs` | System logs |
| GET | `/api/admin/monitoring/security` | Security events |

### AI Chatbot (7 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/ai/analytics` | AI interaction analytics |
| GET/PUT | `/api/ai/config` | AI chatbot configuration |
| GET/POST | `/api/ai/knowledge` | Knowledge base entries |
| POST | `/api/ai/knowledge/bulk` | Bulk import knowledge entries |
| PUT/DELETE | `/api/ai/knowledge/[id]` | Update/delete knowledge entry |
| GET | `/api/ai/logs` | AI interaction logs |
| POST | `/api/ai/test` | Test AI chatbot response |

### Automations (6 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/automations` | List/create automations |
| GET/PUT/DELETE | `/api/automations/[id]` | Manage individual automation |
| POST | `/api/automations/[id]/duplicate` | Clone an automation |
| POST | `/api/automations/cron` | Cron endpoint for timed actions |
| POST | `/api/automations/engine` | Manual engine trigger |

### Branches (7 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/branches` | List/create branches |
| GET/PUT/DELETE | `/api/branches/[id]` | Manage individual branch |
| GET/POST | `/api/branches/[id]/members` | Branch member management |
| DELETE | `/api/branches/[id]/members/[memberId]` | Remove branch member |
| GET | `/api/branches/analytics` | Branch analytics |
| GET | `/api/branches/metrics` | Branch metrics |

### Campaigns (12 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/campaigns` | List/create campaigns |
| GET/PUT/DELETE | `/api/campaigns/[id]` | Manage individual campaign |
| POST | `/api/campaigns/[id]/launch` | Launch a campaign |
| GET | `/api/campaigns/[id]/performance` | Campaign performance metrics |
| GET | `/api/campaigns/[id]/report` | Campaign report (JSON) |
| GET | `/api/campaigns/[id]/report/csv` | Campaign report (CSV) |
| GET | `/api/campaigns/[id]/report/pdf` | Campaign report (PDF) |
| POST | `/api/campaigns/analyze` | Analyse database for campaign recommendations |
| GET | `/api/campaigns/templates` | List campaign templates |
| GET/POST | `/api/campaigns/triggers` | List/create campaign triggers |
| PUT/DELETE | `/api/campaigns/triggers/[id]` | Manage individual trigger |
| POST | `/api/campaigns/triggers/cron` | Process trigger queue |

### Contacts (4 routes)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/contacts/bulk-tag` | Apply/remove tags in bulk |
| POST | `/api/contacts/import/bulk` | Bulk import contacts |
| POST | `/api/contacts/import/csv` | Import from CSV file |
| POST | `/api/contacts/import/ocr` | Import via OCR (photo of business cards) |

### CTWA / Ad Leads (2 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/ctwa/leads` | List CTWA leads |
| GET | `/api/ctwa/stats` | CTWA statistics |

### E-Commerce (6 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/ecommerce/integrations` | List/create integrations |
| GET/PUT/DELETE | `/api/ecommerce/integrations/[id]` | Manage integration |
| GET | `/api/ecommerce/orders` | List synced orders |
| GET | `/api/ecommerce/carts` | List abandoned carts |
| POST | `/api/ecommerce/carts/cron` | Abandoned cart detection cron |

### Email (1 route)
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/api/email/config` | Email (Brevo) configuration |

### Flows (7 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/flows` | List/create flows |
| GET/PUT/DELETE | `/api/flows/[id]` | Manage individual flow |
| POST | `/api/flows/[id]/activate` | Activate/deactivate a flow |
| GET | `/api/flows/[id]/runs` | View flow run history |
| GET | `/api/flows/templates` | List flow templates |
| POST | `/api/flows/cron` | Flow maintenance cron |

### Health (1 route)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Public health check endpoint |

### Invitations (2 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/invitations/[token]/peek` | Preview invitation details |
| POST | `/api/invitations/[token]/redeem` | Accept an invitation |

### Monitoring (1 route)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/cron/monitoring` | System monitoring cron (called every 30 min) |

### Onboarding (1 route)
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/api/onboarding` | Get/update onboarding state |

### Payments (2 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/payments/providers` | List payment providers |
| GET | `/api/payments/transactions` | List transactions |

### Products (4 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/products` | List/create products |
| GET/PUT/DELETE | `/api/products/[id]` | Manage individual product |
| POST | `/api/products/suggest` | AI product suggestions |

### Purchases (4 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/purchases` | List/create purchases |
| GET/PUT/DELETE | `/api/purchases/[id]` | Manage individual purchase |
| GET | `/api/purchases/recency-analysis` | Analyse purchase recency |
| GET/PUT | `/api/purchases/score-settings` | Recency score settings |

### QR Codes (2 routes)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/qr/generate` | Generate QR code |
| GET/POST | `/api/qr/templates` | QR code templates |

### Segments (4 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/segments` | List/create segments |
| GET/PUT/DELETE | `/api/segments/[id]` | Manage individual segment |
| POST | `/api/segments/preview` | Preview segment matches |

### Sentiment (2 routes)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/sentiment/analyze` | Analyse message sentiment |
| GET | `/api/sentiment/stats` | Sentiment statistics |

### Settings (2 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/api/settings/website-sync` | Website sync configuration |
| GET/POST | `/api/sync/website` | Trigger website content sync |

### SMS (4 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/api/sms/config` | SMS configuration |
| GET | `/api/sms/health` | SMS service health check |
| POST | `/api/sms/send` | Send an SMS message |
| POST | `/api/sms/test` | Send a test SMS |

### Webhooks (4 routes)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/webhooks/shopify` | Shopify webhook receiver |
| POST | `/api/webhooks/woocommerce` | WooCommerce webhook receiver |
| POST | `/api/webhooks/paystack` | Paystack webhook receiver |
| POST | `/api/webhooks/flutterwave` | Flutterwave webhook receiver |

### WhatsApp (14 routes)
| Method | Route | Description |
|--------|-------|-------------|
| GET/PUT | `/api/whatsapp/config` | WhatsApp configuration |
| POST | `/api/whatsapp/config/verify-registration` | Verify phone registration |
| POST | `/api/whatsapp/embedded-signup/start` | Start embedded signup flow |
| GET | `/api/whatsapp/embedded-signup/callback` | OAuth callback handler |
| GET | `/api/whatsapp/embedded-signup/status` | Check signup status |
| POST | `/api/whatsapp/send` | Send a WhatsApp message |
| POST | `/api/whatsapp/react` | React to a message |
| POST | `/api/whatsapp/broadcast` | Send a broadcast |
| GET | `/api/whatsapp/media/[mediaId]` | Download media file |
| GET/POST | `/api/whatsapp/templates` | List/sync message templates |
| PUT/DELETE | `/api/whatsapp/templates/[id]` | Manage individual template |
| POST | `/api/whatsapp/templates/submit` | Submit template to Meta |
| POST | `/api/whatsapp/templates/sync` | Sync templates from Meta |
| GET/POST | `/api/whatsapp/webhook` | WhatsApp webhook (GET=verify, POST=receive) |
| GET/POST | `/api/whatsapp/catalog` | Product catalog management |
| GET/PUT | `/api/whatsapp/catalog/[id]` | Individual catalog item |
| GET/POST | `/api/whatsapp/flows` | WhatsApp Flows management |
| GET/PUT/DELETE | `/api/whatsapp/flows/[id]` | Individual WhatsApp Flow |
| POST | `/api/whatsapp/flows/[id]/publish` | Publish a WhatsApp Flow |
| POST | `/api/whatsapp/flows/[id]/send` | Send a WhatsApp Flow |

### Agent Events (1 route)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/agent/events` | Server-Sent Events for real-time agent notifications |

---

## 26. Database Schema & Migrations

### Migration History (53 migrations)

| # | Migration | Description |
|---|-----------|-------------|
| 001 | initial_schema | Core tables: profiles, contacts, conversations, messages, tags, custom_fields, whatsapp_config |
| 002 | pipelines_enhancements | Pipeline stages, deals, drag-and-drop support |
| 003 | broadcast_recipient_wamid | Broadcast system with recipient tracking |
| 004 | contact_delete_set_null | Cascade delete fix for contacts |
| 005 | broadcast_counts_incremental | Incremental broadcast count triggers |
| 006 | automations | Automation engine tables |
| 007 | automations_increment_counter | Automation execution counter |
| 008 | profile_avatars_storage | Supabase Storage bucket for avatars |
| 009 | message_actions | Message reactions and context replies |
| 010 | flows | Flow builder tables (flows, flow_nodes, flow_runs) |
| 011 | profile_beta_features | Beta feature flags per profile |
| 012 | flows_increment_counter | Flow execution counter |
| 013 | whatsapp_config_phone_unique | Unique constraint on phone_number_id |
| 014 | message_templates_meta | WhatsApp message template management |
| 015 | whatsapp_config_registration | Phone number registration tracking |
| 016 | flow_media | Media support in flows |
| 017 | account_sharing | Multi-user accounts with roles (account_role_enum) |
| 018 | account_member_rpcs | RPC functions for member management |
| 019 | invitation_rpcs | Invitation system RPCs |
| 020 | account_sharing_followups | Account sharing refinements |
| 021 | account_default_currency | Per-account currency setting |
| 022 | contact_phone_dedup | Phone normalisation and deduplication |
| 023 | chat_media | Media message storage |
| 029 | email_config | Brevo email configuration table |
| 030 | sms_config | SMS configuration table |
| 031 | create_products_table | Product catalogue |
| 032 | create_purchase_history | Purchase history tracking |
| 033 | create_product_score_settings | Product scoring configuration |
| 034 | add_product_id_to_deals | Link products to deals |
| 035 | dual_identifier_system | Email-only contacts, primary_channel, data_completeness_score |
| 036 | multi_branch_support | Branch management tables |
| 037 | broadcast_channel_routing | Multi-channel broadcast support |
| 038 | agent_event_queue | Real-time agent notification system |
| 039 | adaptive_recency_thresholds | Configurable purchase recency scoring |
| 040 | super_admin_platform | Super admin flag, platform metrics RPCs |
| 041 | campaign_engine | Campaign tables, 10 initial templates, events, performance |
| 042 | admin_dashboard_analytics | Admin dashboard RPCs (growth series, accounts overview) |
| 043 | ecommerce_payments_triggers | E-commerce integration, payment webhooks, campaign triggers |
| 044 | ai_chatbot | AI chatbot config, knowledge base, logs |
| 045 | system_monitoring | System logs, alerts, health snapshots, security events, API metrics |
| 046 | campaign_template_enrichment | Rich descriptions for campaign templates |
| 047 | qr_flows_catalog_ctwa_sentiment | QR templates, WhatsApp Flows, catalog sync, CTWA leads, sentiment |
| 048 | remaining_campaign_templates | Additional campaign templates |
| 049 | rls_policies_and_campaign_templates | 20 RLS policies for new tables |
| 049b | campaign_templates | Campaign template inserts (applied via API) |
| 050 | ai_cost_monitoring_loop_detection | AI usage tracking, circuit breaker events |
| 051 | embedded_signup | Meta Embedded Signup state tracking |
| 052 | template_rules_costs_sms | Template validation rules, cost calculator, SMS config |
| 053 | onboarding_campaign_monitoring | Onboarding wizard, campaign monitoring enhancements |
| 054 | quick_replies_ctwa_tagging | Quick reply storage, CTWA auto-tagging |
| 055 | import_ocr_channels | OCR import logs, channel matrix data |
| 056 | website_sync_branches_segments | Website sync config, branch enhancements, segment tables |

---

## 27. Deployment & Infrastructure

### Vercel Deployment

- **Auto-deploy** — every push to `main` branch triggers automatic deployment
- **Preview deployments** — pull requests get preview URLs
- **Custom domain** — `crm.marketing4effect.com`
- **Environment variables** — configured in Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ENCRYPTION_KEY`
  - `OPENROUTER_API_KEY`
  - `BREVO_API_KEY`
  - `CRON_SECRET`

### Supabase

- **Project:** `bxryvqxrcujrqipvcjoa`
- **Region:** (configured at creation)
- **Database:** PostgreSQL with RLS
- **Auth:** Email/password + OAuth providers
- **Storage:** Avatar uploads
- **Realtime:** Conversation updates

### GitHub

- **Repository:** `kembah17/marketing4effect`
- **Branch strategy:** `main` (production)
- **CI:** Vercel GitHub App (auto-deploy)

### Database Migrations

Migrations are applied via the **Supabase Management API** (not the SQL Editor, which has known bugs):

```python
import requests
project_ref = 'bxryvqxrcujrqipvcjoa'
url = f'https://api.supabase.com/v1/projects/{project_ref}/database/query'
headers = {'Authorization': f'Bearer {access_token}', 'Content-Type': 'application/json'}
resp = requests.post(url, headers=headers, json={'query': sql_content})
```

---

## 28. Monitoring & Cron Jobs

### System Monitoring

The monitoring system runs via a cron job that hits `/api/cron/monitoring` every 30 minutes.

#### What the Cron Job Does

1. **Health Checks** — verifies database connectivity, API responsiveness
2. **Alert Evaluation** — checks thresholds and creates alerts if exceeded
3. **Metrics Flush** — aggregates API metrics into hourly buckets
4. **Log Cleanup** — removes logs older than 30 days
5. **Security Scan** — checks for suspicious patterns

#### Cron Job Configuration (cron-job.org)

| Setting | Value |
|---------|-------|
| URL | `https://crm.marketing4effect.com/api/cron/monitoring` |
| Method | POST |
| Schedule | Every 30 minutes |
| Header | `Authorization: Bearer <CRON_SECRET>` |

#### Monitoring Tables

| Table | Description |
|-------|-------------|
| `system_logs` | Structured application logs |
| `system_alerts` | Active and resolved alerts |
| `health_snapshots` | Periodic health check results |
| `security_events` | Security-related events (failed logins, rate limits, etc.) |
| `api_metrics_hourly` | Aggregated API performance metrics |

### Other Cron Endpoints

| Endpoint | Purpose | Recommended Schedule |
|----------|---------|---------------------|
| `/api/cron/monitoring` | System health monitoring | Every 30 minutes |
| `/api/automations/cron` | Process timed automation steps | Every 5 minutes |
| `/api/flows/cron` | Clean up stale flow runs | Every 15 minutes |
| `/api/campaigns/triggers/cron` | Process campaign trigger queue | Every 5 minutes |
| `/api/ecommerce/carts/cron` | Detect abandoned carts | Every 15 minutes |

---

## 29. Quick Reply Templates

The CRM includes 25+ pre-built quick reply templates across 8 categories and 5 industries:

### General (All Industries)

| Shortcut | Title | Message Preview |
|----------|-------|-----------------|
| `/hi` | Welcome greeting | "Hello! 👋 Thank you for reaching out..." |
| `/thanks` | Thank you & close | "Thank you for your time! If you have any other questions..." |
| `/hours` | Business hours | "Our business hours are Monday to Friday, 9 AM – 6 PM..." |
| `/callback` | Request callback | "I'd love to discuss this further. Could you share a convenient time..." |
| `/followup` | Follow-up check | "Hi! Just checking in to see if you had any questions..." |
| `/location` | Send location | "Here's our address: [ADDRESS]..." |
| `/pay` | Payment info | "We accept bank transfer, card payments, and cash..." |
| `/sorry` | Apology | "We sincerely apologize for the inconvenience..." |
| `/onit` | On it | "Got it! I'm looking into this now..." |
| `/refer` | Referral ask | "We're glad you had a great experience! 🌟..." |

### Retail
| `/stock` | Product availability | "Let me check if that item is currently in stock..." |
| — | Order status | "I'll check your order status right away..." |
| — | Delivery info | "We deliver within Lagos in 1–2 business days..." |
| — | New arrivals | "We just got new stock in! 🎉..." |
| — | Return policy | "We accept returns within 7 days of purchase..." |

### Restaurant
| — | Menu request | "Here's our menu! 🍽️..." |
| — | Reservation confirm | "Your reservation is confirmed! 🎉..." |
| — | Order received | "Your order has been received! 👨‍🍳..." |
| — | Delivery ETA | "Your order is on its way! 🛵..." |

### Healthcare
| — | Appointment booking | "I'd be happy to help you book an appointment..." |
| — | Appointment reminder | "This is a friendly reminder about your appointment..." |
| — | Lab results | "Your lab results are ready..." |

### Real Estate
| — | Property inquiry | "Thank you for your interest! 🏠..." |
| — | Viewing schedule | "Great! Let's schedule a viewing..." |

---

## 30. Campaign Templates — Full Catalogue

### 14 Pre-Built Templates

| # | Template | Category | Tier | Channel | Expected Conversion |
|---|----------|----------|------|---------|--------------------|
| 1 | **Win-Back Campaign** | Reactivation | 1 | WhatsApp | 8-15% |
| 2 | **Loyalty Reward** | Reactivation | 1 | WhatsApp | 10-20% |
| 3 | **Abandoned Cart Recovery** | Cart Recovery | 2 | Auto | 15-25% |
| 4 | **Cross-Sell / Upsell** | Post-Purchase | 2 | WhatsApp | 5-12% |
| 5 | **Review Collection** | Post-Purchase | 1 | WhatsApp | 15-30% |
| 6 | **Birthday Campaign** | Lifecycle | 1 | WhatsApp | 20-35% |
| 7 | **VIP Exclusive** | Lifecycle | 2 | WhatsApp | 12-25% |
| 8 | **Payment Trust Sequence** | Revenue | 2 | WhatsApp | 8-18% |
| 9 | **COD Confirmation** | Revenue | 1 | WhatsApp | 25-40% |
| 10 | **Subscription Renewal** | Lifecycle | 2 | Auto | 30-50% |
| 11 | **WhatsApp Flow Survey** | Engagement | 2 | WhatsApp | 20-35% |
| 12 | **Product Catalog Browse** | Engagement | 2 | WhatsApp | 10-20% |
| 13 | **Ad Lead Nurture** | Revenue | 2 | WhatsApp | 8-15% |
| 14 | **Unhappy Customer Recovery** | Feedback | 2 | WhatsApp | 15-30% |

Each template includes:
- Pre-written message sequences (2-4 messages)
- Timing delays between messages
- Audience filters
- Conditional logic (e.g., skip if already purchased)
- Rich descriptions explaining what it does and why

---

## 31. Automation Templates

| Template | Trigger | Steps |
|----------|---------|-------|
| **Welcome Message** | First inbound message | Send greeting → Add tag |
| **Out of Office** | New message received | Check time (6pm-9am) → Send off-hours reply |
| **Lead Qualifier** | Keyword match | Ask qualifying questions → Tag based on answers |
| **Follow-Up Reminder** | Tag added | Wait 24 hours → Send follow-up message |

---

## 32. Flow Templates

| Template | Trigger | Nodes |
|----------|---------|-------|
| **Welcome Menu** | Keyword ("support", "help", "hi") | Start → Send buttons (New/Existing) → Route to appropriate response → Handoff |
| **FAQ Bot** | Keyword ("faq", "question") | Start → Send list menu (topics) → Send answer per topic → Ask if resolved → Handoff if not |
| **Lead Capture** | First inbound message | Start → Collect name → Collect email → Collect interest → Set tag → Thank you → End |

---

## 33. Troubleshooting Guide

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Messages not sending | WhatsApp not connected | Check Settings → WhatsApp → verify connection |
| Messages not sending | 24-hour window expired | Use a message template instead of free-form text |
| Template rejected by Meta | Policy violation | Review Meta's template guidelines, edit and resubmit |
| Contacts not importing | CSV format issues | Ensure CSV has headers: name, phone, email |
| Automation not firing | Automation disabled | Check the enable/disable toggle |
| Flow not responding | Flow not activated | Activate the flow from the Flows page |
| AI chatbot not replying | AI disabled or outside business hours | Check AI Chatbot → Settings |
| Broadcast stuck at 0% | Rate limiting or API error | Check broadcast status, retry if failed |
| Can't access admin panel | Not a super admin | Contact platform administrator |
| Slow dashboard loading | Large dataset | Use date filters to limit data range |
| Circuit breaker tripped | Message loop detected | Wait for cooldown, check automation logic |
| Webhook not receiving | Incorrect webhook URL | Verify URL in Meta Business Manager matches Settings |

### Health Check

Visit `https://crm.marketing4effect.com/api/health` to verify system status. Returns:
- Database connectivity
- API responsiveness
- Timestamp

### Error Logs

Super admins can view system logs at `/admin/monitoring` → Logs tab. Filter by:
- Severity (info, warning, error, critical)
- Date range
- Component (webhook, automation, flow, ai, broadcast)

---

## 34. Glossary

| Term | Definition |
|------|------------|
| **Account** | A business entity in the CRM. One account can have multiple users. |
| **Automation** | An event-driven rule that executes actions when triggers fire. |
| **Broadcast** | A bulk message sent to multiple contacts using a WhatsApp template. |
| **Campaign** | A structured reactivation effort using pre-built templates and sequences. |
| **Circuit Breaker** | Safety system that prevents message loops by rate-limiting outbound messages. |
| **Contact** | A customer record with phone, email, and profile data. |
| **Conversation** | A message thread between the business and a contact. |
| **CTWA** | Click-to-WhatsApp — Meta ad format that opens a WhatsApp conversation. |
| **Deal** | A sales opportunity tracked in a pipeline. |
| **Flow** | A multi-step conversational experience with branching logic. |
| **Knowledge Base** | A collection of information entries the AI chatbot uses to answer questions. |
| **Pipeline** | A visual Kanban board for tracking sales stages. |
| **Quick Reply** | A pre-written message template accessible via keyboard shortcuts. |
| **RLS** | Row-Level Security — database-level access control ensuring data isolation. |
| **Segment** | A dynamic group of contacts defined by rules. |
| **Sentiment** | AI-detected emotional tone of a message (positive, neutral, negative, urgent). |
| **Super Admin** | An M4E platform administrator with cross-account visibility. |
| **Template** | A pre-approved WhatsApp message format required for outbound messages outside the 24-hour window. |
| **Trigger** | An event that initiates an automation or campaign execution. |
| **WA Flow** | A Meta-native interactive form rendered inside WhatsApp. |

---

## 35. Platform Statistics

*As of 30 June 2026:*

| Metric | Value |
|--------|-------|
| TypeScript source files | 471 |
| Total lines of code | 99,079 |
| React components | 158 |
| API routes | 111 |
| Pages | 43 |
| Database migrations | 53 |
| Campaign templates | 14 |
| Automation templates | 4 |
| Flow templates | 3 |
| Quick reply templates | 25+ |
| Settings sections | 16 |
| Admin panel pages | 7 |
| Supported industries | 9 |
| Supported countries | 8 |
| User roles | 4 + Super Admin |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 2026 | Initial employee guide (18,208 words) |
| 2.0 | June 2026 | Expanded to 39,000 words with all features |
| 3.0 | 30 June 2026 | Complete rewrite from codebase audit. 471 files, 111 API routes, 53 migrations documented. |

---

*This document is confidential and intended for Marketing4Effect employees only. Do not distribute externally.*
