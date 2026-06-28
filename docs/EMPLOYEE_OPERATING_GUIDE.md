# M4E WhatsApp CRM — Employee Operating Guide

**Version:** 3.0  
**Last Updated:** June 2026  
**Classification:** Internal — Marketing4Effect Staff Only  
**Document Owner:** Marketing4Effect Technical Operations  
**CRM URL:** https://crm.marketing4effect.com  
**Repository:** github.com/kembah17/m4e-whatsapp-crm  
**Codebase:** 83,359 lines of code | 88 API routes | 38 pages | 137 components | 48 migrations  

---

> **Note:** This document is the authoritative reference for all M4E staff operating the WhatsApp CRM platform. Every feature, setting, API endpoint, and operational procedure is documented here. When in doubt, consult this guide before escalating.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Getting Started](#3-getting-started)
4. [Dashboard](#4-dashboard)
5. [Client Onboarding Workflow](#5-client-onboarding-workflow)
6. [Inbox & Messaging](#6-inbox--messaging)
7. [Contact Management](#7-contact-management)
8. [Products & Purchases](#8-products--purchases)
9. [Deal Pipelines](#9-deal-pipelines)
10. [Broadcasts](#10-broadcasts)
11. [Campaigns](#11-campaigns)
12. [Automations](#12-automations)
13. [Visual Flow Builder](#13-visual-flow-builder)
14. [AI Chatbot](#14-ai-chatbot)
15. [E-Commerce Integration](#15-e-commerce-integration)
16. [QR Code Generator](#16-qr-code-generator)
17. [WhatsApp Flows](#17-whatsapp-flows)
18. [Click-to-WhatsApp Ad Leads (CTWA)](#18-click-to-whatsapp-ad-leads-ctwa)
19. [Sentiment Analysis](#19-sentiment-analysis)
20. [Multi-Branch Management](#20-multi-branch-management)
21. [Team Management](#21-team-management)
22. [Settings Reference](#22-settings-reference)
23. [Admin Panel Overview](#23-admin-panel-overview)
24. [Admin Dashboard](#24-admin-dashboard)
25. [Account Management](#25-account-management)
26. [Admin Analytics](#26-admin-analytics)
27. [Admin Campaign Analytics](#27-admin-campaign-analytics)
28. [Revenue Management](#28-revenue-management)
29. [System Monitoring](#29-system-monitoring)
30. [API Reference](#30-api-reference)
31. [Webhook Integration](#31-webhook-integration)
32. [Cron Jobs & Scheduled Tasks](#32-cron-jobs--scheduled-tasks)
33. [Security Procedures](#33-security-procedures)
34. [White-Label Partner Guide](#34-white-label-partner-guide)
35. [CRM Pricing Tiers](#35-crm-pricing-tiers)
36. [Deployment & DevOps](#36-deployment--devops)
37. [Troubleshooting Guide](#37-troubleshooting-guide)
38. [Glossary](#38-glossary)

---

## 1. Introduction

### 1.1 What Is the M4E WhatsApp CRM?

The M4E WhatsApp CRM is a purpose-built customer reactivation and relationship management platform designed specifically for Nigerian mid-market businesses. Unlike generic CRM tools that bolt on WhatsApp as an afterthought, this platform was engineered from the ground up around the WhatsApp Business Cloud API — the dominant communication channel for Nigerian commerce.

At its core, the CRM enables businesses to:

- **Reactivate dormant customers** using AI-powered campaign sequences that identify, segment, and re-engage customers who have stopped purchasing
- **Manage real-time WhatsApp conversations** through a unified inbox with media support, quick replies, and template messaging
- **Run automated marketing campaigns** using 14 pre-built campaign templates spanning reactivation, retention, growth, and engagement categories
- **Track deals and revenue** through customizable Kanban-style pipelines with drag-and-drop stage management
- **Analyze customer sentiment** using AI-powered sentiment detection with Nigerian Pidgin English support
- **Integrate e-commerce platforms** including Shopify and WooCommerce for cart abandonment recovery and order synchronization
- **Deploy AI chatbots** powered by OpenRouter LLM models with knowledge base management and human handoff capabilities
- **Build visual automation flows** using a drag-and-drop canvas interface with conditional logic and multi-step sequences

The platform is built on a modern tech stack (Next.js 14+, Supabase, TypeScript) and deployed on Vercel, providing enterprise-grade reliability with the agility of a startup tool.

### 1.2 Who Is This Guide For?

This guide is written for **M4E internal staff** who operate, configure, and support the CRM platform. This includes:

| Role | How They Use This Guide |
|------|------------------------|
| **Account Managers** | Client onboarding, campaign setup, daily CRM operations, client support |
| **Campaign Specialists** | Campaign creation, template configuration, broadcast management, A/B testing |
| **Technical Support** | Troubleshooting, WhatsApp configuration, integration debugging, system monitoring |
| **Super Administrators** | Admin panel operations, account management, revenue tracking, system health monitoring |
| **Developers** | API reference, webhook integration, cron job management, deployment procedures |
| **Sales Team** | CRM demonstrations, feature explanations, pricing tier guidance |
| **Management** | Platform capabilities overview, revenue analytics, strategic planning |

> **Note:** For client-facing documentation, refer to the separate **Client User Guide** (`CLIENT_USER_GUIDE.md`) which uses simplified language appropriate for end users.

### 1.3 M4E Business Model Context

Marketing4Effect (M4E) operates as an AI-powered digital marketing agency targeting Nigerian mid-market businesses. The WhatsApp CRM is the operational backbone of our service delivery, particularly for:

- **Business Reactivation Package (Package 1):** ₦2,300,000 — Uses the CRM's reactivation campaigns, RFM scoring, and automation sequences to re-engage dormant customer databases
- **Growth Engine Package (Package 2):** ₦3,200,000 — Leverages the CRM's full campaign suite, deal pipelines, and e-commerce integrations
- **Full Digital Transformation (Package 3):** ₦4,500,000 — Complete CRM deployment with white-label branding, custom automations, and AI chatbot configuration
- **Complete Package:** ₦8,500,000 — All packages combined with premium support
- **Unicorn Consultation:** ₦3,500,000 — Strategic consultation with CRM access

The CRM is also offered as a standalone SaaS product with three pricing tiers (Starter, Professional, Business) for clients who want self-service access.

### 1.4 Key Terminology

Before diving into the platform, familiarize yourself with these essential terms:

| Term | Definition |
|------|------------|
| **Account** | A tenant instance in the CRM. Each client business gets one account with isolated data. |
| **Contact** | A customer record in the CRM, identified by phone number and/or email address. |
| **Conversation** | A WhatsApp message thread between the business and a contact. |
| **Template** | A pre-approved WhatsApp message format registered with Meta for outbound messaging. |
| **Broadcast** | A one-time bulk message sent to a filtered audience using a WhatsApp template. |
| **Campaign** | A multi-step, automated marketing sequence with triggers, delays, and conditional logic. |
| **Automation** | A trigger-action workflow that executes automatically when conditions are met. |
| **Flow** | A visual, multi-step conversational sequence built on the canvas-based flow builder. |
| **Pipeline** | A Kanban-style board for tracking deals through customizable stages. |
| **RFM Scoring** | Recency-Frequency-Monetary scoring system that segments contacts by purchase behavior. |
| **Recency Score** | A simplified RFM variant focusing on days since last purchase to categorize contact engagement. |
| **Tag** | A label applied to contacts for segmentation, filtering, and automation triggering. |
| **Branch** | A physical location or division within a client's business for multi-location management. |
| **RLS** | Row-Level Security — Supabase's data isolation mechanism ensuring accounts only see their own data. |
| **CTWA** | Click-to-WhatsApp Ads — Meta ad format that opens a WhatsApp conversation when clicked. |
| **Sentiment** | AI-detected emotional tone of a message (positive, neutral, negative). |
| **Handoff** | The process of transferring a conversation from AI chatbot to a human agent. |
| **Super Admin** | M4E staff with access to the admin panel for cross-account management. |
| **Webhook** | An HTTP callback that delivers real-time event notifications to the CRM. |
| **Cron Job** | A scheduled task that runs automatically at defined intervals. |
| **NDPR** | Nigeria Data Protection Regulation — the primary data privacy law governing CRM operations. |
| **WhatsApp Cloud API** | Meta's official API for programmatic WhatsApp Business messaging. |

---

## 2. System Architecture Overview

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14+)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Dashboard │ │  Inbox   │ │ Contacts │ │Campaigns │ │  Admin   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
│       │            │            │            │            │        │
│  ┌────┴────────────┴────────────┴────────────┴────────────┴────┐   │
│  │              Next.js API Routes (88 endpoints)              │   │
│  └────┬────────────┬────────────┬────────────┬────────────┬────┘   │
└───────┼────────────┼────────────┼────────────┼────────────┼────────┘
        │            │            │            │            │
┌───────┼────────────┼────────────┼────────────┼────────────┼────────┐
│       ▼            ▼            ▼            ▼            ▼        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    SUPABASE PLATFORM                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │PostgreSQL│ │   Auth   │ │ Storage  │ │  Realtime     │   │   │
│  │  │  (RLS)   │ │  (JWT)   │ │ (Files)  │ │ (WebSocket)   │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │   │
│  │  48 Migrations | Row-Level Security | Multi-Tenant          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                         BACKEND SERVICES                           │
└───────┬────────────┬────────────┬────────────┬────────────┬────────┘
        │            │            │            │            │
        ▼            ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ WhatsApp │ │OpenRouter│ │ Shopify  │ │WooComm.  │ │ Paystack │
│Cloud API │ │  (AI)    │ │  API     │ │  API     │ │Flutterw. │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
   EXTERNAL INTEGRATIONS
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|----------|
| **Frontend Framework** | Next.js 14+ (App Router) | Server-side rendering, API routes, React components |
| **UI Library** | React 18+ | Component-based user interface |
| **Styling** | Tailwind CSS | Utility-first CSS framework with M4E custom theme |
| **UI Components** | shadcn/ui | Accessible, customizable component library |
| **Animations** | Framer Motion | Page transitions and micro-interactions |
| **State Management** | React Context + SWR | Client-side state and data fetching with caching |
| **Language** | TypeScript | Type-safe JavaScript for frontend and API routes |
| **Database** | PostgreSQL (via Supabase) | Primary data store with 48 migrations |
| **Authentication** | Supabase Auth | JWT-based authentication with role management |
| **File Storage** | Supabase Storage | Media files, imports, exports |
| **Real-time** | Supabase Realtime | WebSocket subscriptions for live messaging |
| **Row-Level Security** | Supabase RLS | Multi-tenant data isolation at database level |
| **AI/LLM** | OpenRouter API | AI chatbot, sentiment analysis, content generation |
| **Messaging** | WhatsApp Cloud API (Meta) | Official WhatsApp Business messaging |
| **Email** | Brevo (Sendinblue) | Transactional and notification emails (300/day free) |
| **E-Commerce** | Shopify API, WooCommerce API | Store integration, order sync, cart tracking |
| **Payments** | Paystack, Flutterwave | Nigerian payment processing webhooks |
| **Hosting** | Vercel | Serverless deployment with edge functions |
| **Version Control** | GitHub | Source code management with CI/CD |
| **Package Manager** | npm | Dependency management |
| **Testing** | Vitest | Unit and integration testing |
| **Code Quality** | ESLint, Prettier | Linting and formatting |

### 2.3 Multi-Tenant Architecture

The CRM uses a **shared database, shared schema** multi-tenant design where all client accounts exist in the same PostgreSQL database but are isolated through Supabase Row-Level Security (RLS) policies.

**How It Works:**

1. Every data table includes an `account_id` column that references the `accounts` table
2. RLS policies on every table ensure that queries automatically filter by the authenticated user's `account_id`
3. Users are linked to accounts through the `account_members` table with role assignments
4. The `get_current_account_id()` PostgreSQL function extracts the account context from the JWT token
5. Super admin users bypass RLS for cross-account operations via the service role key

**Tenant Isolation Guarantee:**

```
User Login → JWT Token (contains account_id) → Every Query Filtered by RLS → Only Own Data Returned
```

**Key Tables in Multi-Tenant Design:**

| Table | Purpose |
|-------|----------|
| `accounts` | Master tenant table — one row per client business |
| `account_members` | Links users to accounts with roles (owner/admin/agent/viewer) |
| `account_invitations` | Pending team member invitations |
| `contacts` | Customer records, scoped by `account_id` |
| `conversations` | WhatsApp threads, scoped by `account_id` |
| `messages` | Individual messages within conversations |
| `campaigns` | Marketing campaigns, scoped by `account_id` |
| `automations` | Automation workflows, scoped by `account_id` |
| `flows` | Visual flow definitions, scoped by `account_id` |
| `deals` | Pipeline deals, scoped by `account_id` |
| `products` | Product catalog, scoped by `account_id` |

### 2.4 Data Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │────▶│  WhatsApp    │────▶│  Meta Cloud  │
│  (WhatsApp)  │◀────│  App         │◀────│  API         │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                          Webhook │ POST
                                                  ▼
                                         ┌──────────────┐
                                         │  /api/webhook │
                                         │  /whatsapp    │
                                         └──────┬───────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          ▼                      ▼                      ▼
                   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                   │   Message    │     │  AI Chatbot  │     │  Automation  │
                   │   Storage    │     │  Processing  │     │   Engine     │
                   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
                          │                    │                    │
                          ▼                    ▼                    ▼
                   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                   │  Supabase    │     │  OpenRouter   │     │  Campaign    │
                   │  Realtime    │     │  LLM API     │     │  Sequences   │
                   └──────┬───────┘     └──────────────┘     └──────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  CRM Inbox   │
                   │  (Live UI)   │
                   └──────────────┘
```

**Inbound Message Flow:**
1. Customer sends WhatsApp message → Meta Cloud API receives it
2. Meta sends webhook POST to `/api/webhook/whatsapp`
3. CRM processes the message: stores in database, checks automation triggers, runs AI chatbot if enabled
4. Supabase Realtime pushes the message to the Inbox UI via WebSocket
5. Agent sees the message appear in real-time and can respond

**Outbound Message Flow:**
1. Agent types message in Inbox OR campaign/automation triggers a send
2. API route calls WhatsApp Cloud API with the message content
3. Meta delivers the message to the customer's WhatsApp
4. Delivery status webhooks update the message status (sent → delivered → read)

---

## 3. Getting Started

### 3.1 Logging In

1. Navigate to **https://crm.marketing4effect.com** in your browser (Chrome, Firefox, or Edge recommended)
2. You will see the M4E branded login page with Midnight Indigo background and Champagne Gold accents
3. Enter your **email address** and **password**
4. Click **Sign In**
5. If this is your first login from a new device, you may receive an email verification prompt

> **Tip:** Bookmark the CRM URL for quick access. The platform works on mobile browsers but is optimized for desktop screens 1280px and wider.

> **Warning:** After 5 consecutive failed login attempts, your IP address will be temporarily blocked by the brute force protection system. Wait 15 minutes or contact a Super Admin to unblock.

### 3.2 First-Time Setup

When you first log in to a new account, complete these setup steps in order:

1. **Profile Configuration**
   - Navigate to **Settings → Profile**
   - Set the account name (business name)
   - Select currency (NGN for Nigerian Naira)
   - Set timezone (Africa/Lagos for WAT)
   - Choose language preference

2. **WhatsApp Configuration**
   - Navigate to **Settings → WhatsApp Configuration**
   - Enter the Phone Number ID from Meta Business Manager
   - Enter the WhatsApp Business Account ID
   - Enter the permanent Access Token
   - Set the Webhook Verify Token
   - Test the connection — status indicator should show green "Connected"

3. **Team Setup**
   - Navigate to **Settings → Members & Invitations**
   - Invite team members by email with appropriate roles
   - Assign at least one backup Admin role

4. **Template Sync**
   - Navigate to **Settings → Template Manager**
   - Click **Sync Templates** to pull approved templates from Meta
   - Verify all templates appear with "Approved" status

5. **Appearance**
   - Navigate to **Settings → Appearance**
   - Choose from 6 dark themes or light mode
   - Select the theme that matches the client's brand preference

### 3.3 User Roles

The CRM implements a four-tier role-based access control (RBAC) system:

| Role | Access Level | Typical User |
|------|-------------|---------------|
| **Owner** | Full access to all features including billing, account deletion, and ownership transfer. Only one Owner per account. | Business owner or M4E account manager |
| **Admin** | Full access to all features except ownership transfer and account deletion. Can manage team members and all settings. | Senior staff, department heads |
| **Agent** | Access to Inbox, Contacts, Campaigns, Broadcasts, Deals, and Products. Cannot access Settings, Admin panel, or team management. | Customer service reps, sales agents |
| **Viewer** | Read-only access to Dashboard, Contacts, and Deals. Cannot send messages, create campaigns, or modify any data. | Managers who need visibility without edit access |

**Permission Matrix:**

| Feature | Owner | Admin | Agent | Viewer |
|---------|-------|-------|-------|--------|
| Dashboard (view) | ✅ | ✅ | ✅ | ✅ |
| Inbox (read/send) | ✅ | ✅ | ✅ | ❌ |
| Contacts (CRUD) | ✅ | ✅ | ✅ | 👁️ Read |
| Contact Import | ✅ | ✅ | ✅ | ❌ |
| Contact Export | ✅ | ✅ | ❌ | ❌ |
| Tags (manage) | ✅ | ✅ | ✅ | ❌ |
| Products (CRUD) | ✅ | ✅ | ✅ | 👁️ Read |
| Deals (CRUD) | ✅ | ✅ | ✅ | 👁️ Read |
| Broadcasts (send) | ✅ | ✅ | ✅ | ❌ |
| Campaigns (CRUD) | ✅ | ✅ | ✅ | ❌ |
| Automations (CRUD) | ✅ | ✅ | ❌ | ❌ |
| Flows (CRUD) | ✅ | ✅ | ❌ | ❌ |
| AI Chatbot Config | ✅ | ✅ | ❌ | ❌ |
| E-Commerce Setup | ✅ | ✅ | ❌ | ❌ |
| Settings (all) | ✅ | ✅ | ❌ | ❌ |
| Team Management | ✅ | ✅ | ❌ | ❌ |
| Billing/Subscription | ✅ | ❌ | ❌ | ❌ |
| Delete Account | ✅ | ❌ | ❌ | ❌ |
| Transfer Ownership | ✅ | ❌ | ❌ | ❌ |

### 3.4 Super Admin Access

Super Admin is a special designation for M4E internal staff that grants access to the **Admin Panel** — a separate interface for managing all accounts across the platform.

Super Admin access is controlled at the database level through the `super_admin` flag on the user profile. It is **not** a regular role and cannot be assigned through the UI.

**Super Admin Capabilities:**
- View and manage all accounts on the platform
- Impersonate any account (log in as that account for support)
- Access cross-account analytics and revenue data
- Monitor system health, security events, and cron jobs
- Suspend or delete accounts
- View aggregated campaign performance across all tenants

> **Warning:** Super Admin access should be limited to senior M4E technical staff only. All impersonation actions are logged for audit purposes.

### 3.5 Navigation Overview

The CRM interface consists of three main areas:

**1. Sidebar Navigation (Left)**

The sidebar is the primary navigation element, always visible on desktop:

| Icon | Label | Path | Description |
|------|-------|------|-------------|
| 📊 | Dashboard | `/dashboard` | Overview metrics, charts, and activity feed |
| 💬 | Inbox | `/inbox` | Real-time WhatsApp messaging interface |
| 👥 | Contacts | `/contacts` | Contact database with search, filter, and import |
| 📦 | Products | `/products` | Product catalog and purchase tracking |
| 🎯 | Deals | `/deals` | Kanban pipeline for deal management |
| 📢 | Broadcasts | `/broadcasts` | One-time bulk WhatsApp message sending |
| 🚀 | Campaigns | `/campaigns` | Multi-step automated campaign management |
| ⚡ | Automations | `/automations` | Trigger-based automation workflows |
| 🔀 | Flows | `/flows` | Visual conversation flow builder |
| 🤖 | AI Chatbot | `/ai-chatbot` | AI assistant configuration and knowledge base |
| 🛒 | E-Commerce | `/ecommerce` | Shopify/WooCommerce integration management |
| 📱 | QR Codes | `/qr-codes` | WhatsApp QR code generator |
| 📋 | WhatsApp Flows | `/whatsapp-flows` | Meta WhatsApp Flows (in-chat forms) |
| 📈 | CTWA Leads | `/ctwa` | Click-to-WhatsApp ad lead tracking |
| 😊 | Sentiment | `/sentiment` | AI sentiment analysis dashboard |
| 🏢 | Branches | `/branches` | Multi-branch location management |
| ⚙️ | Settings | `/settings` | Account configuration (12 panels) |
| ❓ | Help | `/help` | In-app help center with 12 sections |
| 🔧 | Admin | `/admin` | Super Admin panel (admin users only) |

**2. Top Bar**

The top bar contains:
- Account name and logo
- Theme toggle (light/dark mode)
- Notification bell
- User avatar with dropdown menu (profile, logout)

**3. Main Content Area**

The central area displays the active page content. Most pages follow a consistent layout:
- Page title and description at the top
- Action buttons (Create, Import, Export) in the top-right
- Content area with tables, cards, or specialized interfaces
- Pagination controls at the bottom for list views



## 4. Dashboard

The Dashboard is the first screen users see after logging in. It provides a real-time overview of the account's key performance metrics, recent activity, and quick access to common actions.

**URL:** `/dashboard`

### 4.1 Metric Cards

Four primary metric cards are displayed across the top of the dashboard:

| Card | Metric | Description | Calculation |
|------|--------|-------------|-------------|
| **Total Contacts** | Count | Total number of contacts in the account database | `COUNT(contacts WHERE account_id = current)` |
| **Active Conversations** | Count | Conversations with messages in the last 24 hours | `COUNT(conversations WHERE last_message_at > NOW() - 24h)` |
| **Campaigns Running** | Count | Campaigns currently in "Active" status | `COUNT(campaigns WHERE status = 'active')` |
| **Messages Sent (30d)** | Count | Total outbound messages sent in the last 30 days | `COUNT(messages WHERE direction = 'outbound' AND created_at > NOW() - 30d)` |

Each card displays:
- The current value in large, bold typography
- A percentage change indicator (↑ green for increase, ↓ red for decrease) compared to the previous period
- A subtle sparkline showing the trend over the last 7 days

### 4.2 Activity Feed

The activity feed is a chronological stream of recent events across the account, displayed in a scrollable panel on the right side of the dashboard. Events include:

| Event Type | Icon | Example |
|-----------|------|----------|
| New Contact | 👤 | "John Doe was added to contacts" |
| New Conversation | 💬 | "New conversation started with +234 801 234 5678" |
| Campaign Launched | 🚀 | "Win-Back Campaign was activated" |
| Deal Created | 🎯 | "New deal: ₦500,000 - Adeola Enterprises" |
| Deal Won | 🏆 | "Deal won: ₦1,200,000 - Lagos Textiles" |
| Broadcast Sent | 📢 | "Broadcast sent to 450 contacts" |
| Contact Imported | 📥 | "150 contacts imported from CSV" |
| Automation Triggered | ⚡ | "Auto-tag automation triggered for 23 contacts" |
| AI Chatbot Handoff | 🤖→👤 | "AI chatbot handed off conversation to agent" |

The feed shows the 20 most recent events with timestamps. Click any event to navigate to the relevant detail page.

### 4.3 Charts

Three interactive charts provide visual analytics:

#### 4.3.1 Conversations Over Time (Line Chart)

- **Type:** Area/line chart
- **X-axis:** Date (last 30 days by default)
- **Y-axis:** Number of conversations
- **Data Series:** New conversations per day, active conversations per day
- **Interactivity:** Hover for exact values, click to filter by date range
- **Purpose:** Track conversation volume trends to identify peak periods and measure campaign impact

#### 4.3.2 Pipeline Overview (Donut Chart)

- **Type:** Donut/ring chart
- **Segments:** One segment per pipeline stage, colored by stage
- **Center Value:** Total deal value across all stages (formatted as ₦X.XM)
- **Legend:** Stage name, deal count, and total value per stage
- **Purpose:** Quick visual of deal distribution across pipeline stages

#### 4.3.3 Response Time Distribution (Bar Chart)

- **Type:** Horizontal bar chart
- **Categories:** < 5 min, 5-15 min, 15-30 min, 30-60 min, 1-4 hours, 4+ hours
- **Values:** Percentage of conversations with first response in each time bracket
- **Color Coding:** Green (< 15 min), Yellow (15-60 min), Red (> 1 hour)
- **Purpose:** Monitor team responsiveness and identify SLA compliance

### 4.4 Quick Actions

A row of quick action buttons provides one-click access to common tasks:

| Button | Action | Navigates To |
|--------|--------|-------------|
| **+ New Contact** | Opens the create contact dialog | `/contacts` (with modal) |
| **Send Broadcast** | Starts the broadcast wizard | `/broadcasts/new` |
| **Create Campaign** | Opens the campaign creation wizard | `/campaigns/new` |
| **Import Contacts** | Opens the CSV import dialog | `/contacts` (with import modal) |
| **View Inbox** | Navigates to the messaging inbox | `/inbox` |

### 4.5 Campaign Summary Widget

Below the charts, a campaign summary widget displays:

| Column | Description |
|--------|-------------|
| **Campaign Name** | Name of the campaign |
| **Status** | Current status badge (Draft, Active, Paused, Completed) |
| **Sent** | Number of messages sent |
| **Delivered** | Number of messages delivered (with delivery rate %) |
| **Read** | Number of messages read (with read rate %) |
| **Replied** | Number of replies received (with reply rate %) |
| **Last Activity** | Timestamp of the most recent campaign action |

The widget shows the 5 most recent campaigns. Click "View All Campaigns" to navigate to the full campaigns page.

> **Tip:** The dashboard auto-refreshes every 60 seconds. You can also manually refresh by clicking the refresh icon in the top-right corner of any chart or widget.

---

## 5. Client Onboarding Workflow

Client onboarding is the most critical process in the CRM lifecycle. A well-executed onboarding ensures the client's WhatsApp Business API is properly configured, their contact database is imported, and their first campaign is launched within the target timeline.

### 5.1 Pre-Onboarding Checklist

Before starting the onboarding process, verify the following prerequisites:

| # | Requirement | How to Verify | Status |
|---|------------|---------------|--------|
| 1 | Client has a registered business | Ask for CAC registration number | ☐ |
| 2 | Client has a dedicated business phone number | Confirm the number is not already on WhatsApp Business | ☐ |
| 3 | Client has a Meta Business Manager account | Check at business.facebook.com | ☐ |
| 4 | Client has a WhatsApp Business API account | Verify in Meta Business Manager → WhatsApp Accounts | ☐ |
| 5 | Client has approved WhatsApp message templates | At least 2-3 templates approved by Meta | ☐ |
| 6 | Client has a customer database (CSV/Excel) | Minimum 100 contacts with phone numbers | ☐ |
| 7 | Client has product/service catalog information | Product names, prices, descriptions | ☐ |
| 8 | Client has assigned a primary point of contact | Name, email, phone of the person managing the CRM | ☐ |
| 9 | M4E has received signed service agreement | Database Reactivation Service Agreement v2 | ☐ |
| 10 | Payment has been received or payment plan confirmed | Verify with finance team | ☐ |

### 5.2 The 8-Step Onboarding Process

#### Step 1: Account Creation

**Who:** M4E Super Admin  
**Time:** 15 minutes  
**Tools:** Admin Panel → Account Management

1. Log in to the CRM as Super Admin
2. Navigate to **Admin → Accounts**
3. Click **Create Account**
4. Fill in the account details:
   - **Account Name:** Client's business name
   - **Owner Email:** Client's primary contact email
   - **Currency:** NGN (Nigerian Naira)
   - **Timezone:** Africa/Lagos
   - **Language:** English
5. Click **Create** — this generates the account and sends an invitation email to the owner
6. Record the account ID for internal tracking

> **Note:** The owner will receive an email with a link to set their password and complete registration.

#### Step 2: WhatsApp Configuration

**Who:** M4E Technical Support  
**Time:** 30-45 minutes  
**Tools:** Settings → WhatsApp Configuration

1. Log in to the client's account (via impersonation or with their credentials)
2. Navigate to **Settings → WhatsApp Configuration**
3. Enter the following credentials from Meta Business Manager:
   - **Phone Number ID:** Found in WhatsApp Manager → Phone Numbers
   - **WhatsApp Business Account ID:** Found in WhatsApp Manager → Account Settings
   - **Access Token:** Generate a permanent token in Meta Business Manager → System Users
   - **Webhook Verify Token:** Generate a random string (e.g., `m4e_verify_abc123`)
4. Click **Save Configuration**
5. Configure the webhook URL in Meta Business Manager:
   - URL: `https://crm.marketing4effect.com/api/webhook/whatsapp`
   - Verify Token: The token you set in step 3
   - Subscribe to: `messages`, `message_deliveries`, `message_reads`
6. Test the connection by sending a test message from the client's WhatsApp number
7. Verify the message appears in the CRM Inbox

> **Warning:** The Access Token must be a permanent system user token, not a temporary developer token. Temporary tokens expire after 24 hours and will break the integration.

#### Step 3: Contact Import

**Who:** M4E Account Manager  
**Time:** 30-60 minutes (depending on database size)  
**Tools:** Contacts → Import

1. Prepare the client's customer database in CSV format (see Section 7 for column format)
2. Clean the data: remove duplicates, standardize phone numbers to E.164 format (+234...)
3. Navigate to **Contacts → Import**
4. Upload the CSV file
5. Map columns to CRM fields (name, phone, email, tags, custom fields)
6. Review the import preview — check for errors and warnings
7. Click **Import** to process
8. Verify the import results: total imported, duplicates skipped, errors
9. Spot-check 10-15 contacts to ensure data accuracy

#### Step 4: Product Catalog Setup

**Who:** M4E Account Manager  
**Time:** 20-30 minutes  
**Tools:** Products

1. Navigate to **Products**
2. Click **Add Product** for each product/service the client offers
3. Fill in:
   - **Product Name:** Clear, descriptive name
   - **Description:** Use the AI ghost text feature for suggestions, then customize
   - **Price:** In NGN
   - **Category:** Assign to a product category
   - **Status:** Active
4. If the client has purchase history data, import it via the purchase tracking feature
5. Link historical purchases to contacts where possible

#### Step 5: Recency Scoring Configuration

**Who:** M4E Account Manager  
**Time:** 15 minutes  
**Tools:** Settings → Recency Settings

1. Navigate to **Settings → Recency Settings**
2. Select the appropriate **Industry Preset** (see Section 7.6 for the 6 presets)
3. Review the auto-populated thresholds:
   - Active: 0-X days
   - At Risk: X-Y days
   - Dormant: Y-Z days
   - Lost: Z+ days
4. Adjust thresholds if the client's business has unique purchase cycles
5. Enable **Adaptive Mode** if the client has sufficient purchase history (50+ purchases)
6. Click **Save**
7. The system will automatically score all contacts based on their last purchase date

#### Step 6: First Campaign Launch

**Who:** M4E Campaign Specialist  
**Time:** 45-60 minutes  
**Tools:** Campaigns

1. Navigate to **Campaigns → New Campaign**
2. For the first campaign, we recommend the **Win-Back Dormant** template (see Section 11)
3. Follow the 6-step campaign wizard:
   - Step 1: Select template
   - Step 2: Configure audience (target "Dormant" and "At Risk" segments)
   - Step 3: Customize message templates
   - Step 4: Set timing and delays
   - Step 5: Review and preview
   - Step 6: Activate
4. Monitor the campaign dashboard for the first 24 hours
5. Share initial results with the client

#### Step 7: Automation Setup

**Who:** M4E Technical Support  
**Time:** 30-45 minutes  
**Tools:** Automations

1. Navigate to **Automations**
2. Create essential automations:
   - **Welcome Message:** Trigger on `contact_created` → Send welcome template
   - **Auto-Tag by Response:** Trigger on `message_received` → Add "Responded" tag
   - **Deal Creation:** Trigger on specific keyword → Create deal in pipeline
3. Test each automation by simulating the trigger condition
4. Enable automations once verified

#### Step 8: Team Invitations

**Who:** M4E Account Manager  
**Time:** 10 minutes  
**Tools:** Settings → Members & Invitations

1. Navigate to **Settings → Members & Invitations**
2. Click **Invite Member**
3. Enter the team member's email address
4. Select the appropriate role (Admin, Agent, or Viewer)
5. Click **Send Invitation**
6. The team member will receive an email with a link to join the account
7. Repeat for all team members
8. Verify all invitations are accepted within 48 hours

### 5.3 Onboarding Timeline

| Day | Activity | Owner | Duration |
|-----|----------|-------|----------|
| Day 1 | Account creation + WhatsApp configuration | Super Admin + Tech Support | 1 hour |
| Day 1 | Contact database preparation and cleaning | Account Manager | 2-3 hours |
| Day 2 | Contact import + product catalog setup | Account Manager | 1-2 hours |
| Day 2 | Recency scoring configuration | Account Manager | 15 minutes |
| Day 3 | Template creation and Meta approval submission | Campaign Specialist | 1 hour |
| Day 3-5 | Wait for Meta template approval | — | 24-72 hours |
| Day 5 | First campaign setup and launch | Campaign Specialist | 1 hour |
| Day 5 | Automation setup | Tech Support | 45 minutes |
| Day 5 | Team invitations and training | Account Manager | 30 minutes |
| Day 6-7 | Monitor first campaign, adjust as needed | Campaign Specialist | Ongoing |
| Day 7 | Client handover meeting with results review | Account Manager | 1 hour |

> **Tip:** The ideal onboarding timeline is 7 days from account creation to first campaign results. The bottleneck is usually Meta template approval (24-72 hours). Submit templates on Day 1 if possible.

---

## 6. Inbox & Messaging

The Inbox is the operational heart of the CRM — where real-time WhatsApp conversations happen between your team and customers.

**URL:** `/inbox`

### 6.1 Real-Time WhatsApp Messaging

The Inbox provides a full-featured messaging interface powered by Supabase Realtime WebSocket subscriptions. Messages appear instantly without page refresh.

**Interface Layout:**

```
┌─────────────────┬──────────────────────────┬─────────────────┐
│  Conversation    │    Message Thread         │  Contact        │
│  List (Left)     │    (Center)               │  Sidebar (Right)│
│                  │                           │                 │
│  🔍 Search       │  ┌─────────────────────┐  │  👤 Name        │
│                  │  │ Customer message  ←  │  │  📱 Phone       │
│  ┌────────────┐  │  └─────────────────────┘  │  📧 Email       │
│  │ Contact 1  │  │  ┌─────────────────────┐  │  🏷️ Tags        │
│  │ Last msg...│  │  │  → Agent reply      │  │  📊 Score       │
│  ├────────────┤  │  └─────────────────────┘  │  🏢 Branch      │
│  │ Contact 2  │  │  ┌─────────────────────┐  │  📦 Purchases   │
│  │ Last msg...│  │  │ Customer message  ←  │  │  🎯 Deals       │
│  ├────────────┤  │  └─────────────────────┘  │  📝 Notes       │
│  │ Contact 3  │  │                           │  📋 Custom Flds │
│  │ Last msg...│  │  ┌─────────────────────┐  │                 │
│  └────────────┘  │  │ 📎 Type a message...│  │                 │
│                  │  └─────────────────────┘  │                 │
└─────────────────┴──────────────────────────┴─────────────────┘
```

### 6.2 Message Bubbles

Messages are displayed in a familiar chat bubble format:

| Direction | Alignment | Color | Indicators |
|-----------|-----------|-------|------------|
| **Inbound** (customer) | Left-aligned | Light gray/neutral background | Timestamp, sender name |
| **Outbound** (agent) | Right-aligned | Champagne Gold/brand accent background | Timestamp, status indicators, sender name |
| **System** | Center-aligned | Muted/italic | Automation notifications, status changes |

### 6.3 Media Support

The Inbox supports all WhatsApp media types:

| Media Type | Send | Receive | Preview | Max Size |
|-----------|------|---------|---------|----------|
| **Images** (JPEG, PNG, WebP) | ✅ | ✅ | Inline thumbnail with lightbox | 5 MB |
| **Videos** (MP4, 3GP) | ✅ | ✅ | Inline player with controls | 16 MB |
| **Audio** (MP3, OGG, AMR) | ✅ | ✅ | Inline audio player | 16 MB |
| **Voice Notes** | ❌ | ✅ | Inline audio player with waveform | 16 MB |
| **Documents** (PDF, DOC, XLS) | ✅ | ✅ | File icon with download link | 100 MB |
| **Stickers** (WebP) | ❌ | ✅ | Inline display | 500 KB |
| **Location** | ❌ | ✅ | Map preview with coordinates | — |
| **Contacts** (vCard) | ❌ | ✅ | Contact card display | — |

**Sending Media:**
1. Click the **📎 attachment** icon in the message input area
2. Select the media type (Image, Video, Audio, Document)
3. Choose the file from your device
4. Optionally add a caption
5. Click **Send**

### 6.4 Reactions

Agents can react to customer messages with emoji reactions:

1. Hover over any inbound message
2. Click the **😊 reaction** icon that appears
3. Select an emoji from the picker
4. The reaction is sent via WhatsApp and displayed on the message bubble

Supported reactions: 👍 ❤️ 😂 😮 😢 🙏 (standard WhatsApp reaction set)

### 6.5 Quick Replies

Quick replies are pre-saved message snippets that agents can insert with one click:

1. Click the **⚡ quick reply** icon in the message input area
2. Browse or search available quick replies
3. Click a quick reply to insert it into the message field
4. Edit the text if needed before sending

**Managing Quick Replies:**
- Quick replies are managed at the account level
- Admins can create, edit, and delete quick replies in Settings
- Use variables like `{{contact_name}}` for personalization
- Organize quick replies by category (Greeting, FAQ, Closing, etc.)

### 6.6 Template Picker

For outbound messages outside the 24-hour conversation window, you must use approved WhatsApp templates:

1. Click the **📋 template** icon in the message input area
2. The template picker modal opens showing all approved templates
3. Browse templates by category or search by name
4. Select a template
5. Fill in any variable placeholders (e.g., `{{1}}` for customer name)
6. Preview the final message
7. Click **Send Template**

> **Warning:** WhatsApp enforces a 24-hour messaging window. After 24 hours of no customer response, you can ONLY send approved template messages. Attempting to send a free-form message will fail with an error.

### 6.7 Contact Sidebar

The right sidebar displays comprehensive contact information for the active conversation:

| Section | Information Displayed |
|---------|----------------------|
| **Profile** | Name, phone number, email, profile photo |
| **Tags** | All assigned tags with color badges |
| **Recency Score** | Current segment (Active/At Risk/Dormant/Lost) with badge |
| **Sentiment** | Latest AI-detected sentiment (Positive/Neutral/Negative) |
| **Branch** | Assigned branch location |
| **Custom Fields** | All custom field values |
| **Purchase History** | Recent purchases with dates and amounts |
| **Deals** | Active deals with stage and value |
| **Notes** | Agent notes about the contact |
| **Activity Log** | Recent interactions and events |

You can edit contact details directly from the sidebar without navigating away from the conversation.

### 6.8 Conversation Search

The search functionality in the Inbox allows you to find conversations quickly:

- **Search by contact name:** Type the contact's name in the search bar
- **Search by phone number:** Enter a full or partial phone number
- **Search by message content:** Search within message text across all conversations
- **Filter by status:** Open, Closed, Unread, Assigned to me
- **Filter by tags:** Show only conversations with contacts tagged with specific tags
- **Filter by date range:** Narrow results to a specific time period

### 6.9 Message Status Indicators

Outbound messages display delivery status indicators following the WhatsApp convention:

| Icon | Status | Meaning |
|------|--------|----------|
| 🕐 | **Pending** | Message is queued for sending |
| ✓ | **Sent** | Message has been sent to WhatsApp servers |
| ✓✓ | **Delivered** | Message has been delivered to the recipient's device |
| ✓✓ (blue) | **Read** | Message has been read by the recipient |
| ❌ | **Failed** | Message failed to send (check error details) |

> **Tip:** If a message shows "Failed" status, hover over the error icon to see the specific error code and message from WhatsApp. Common failures include: expired template, invalid phone number, or rate limiting.

### 6.10 Conversation Assignment

Conversations can be assigned to specific team members for accountability:

1. Open a conversation
2. Click the **Assign** button in the conversation header
3. Select a team member from the dropdown
4. The conversation is now assigned and will appear in that agent's "Assigned to me" filter
5. The assigned agent receives a notification

> **Note:** Unassigned conversations appear in the general queue visible to all agents. Implement a round-robin or manual assignment process based on your team's workflow.



## 7. Contact Management

Contacts are the foundation of the CRM. Every campaign, broadcast, automation, and deal revolves around the contact database.

**URL:** `/contacts`

### 7.1 Viewing Contacts

The Contacts page displays a searchable, filterable table of all contacts in the account:

| Column | Description |
|--------|-------------|
| **Name** | Contact's full name (first + last) |
| **Phone** | WhatsApp phone number in E.164 format (+234...) |
| **Email** | Email address (optional) |
| **Tags** | Color-coded tag badges |
| **Recency** | Recency segment badge (Active/At Risk/Dormant/Lost) |
| **Sentiment** | Latest sentiment indicator (😊/😐/😟) |
| **Branch** | Assigned branch name |
| **Last Contact** | Timestamp of last message exchange |
| **Created** | Date the contact was added to the CRM |

**Search:** Type in the search bar to filter by name, phone number, or email in real-time.

**Filters:**
- **By Tag:** Select one or more tags to show only contacts with those tags
- **By Recency Segment:** Filter by Active, At Risk, Dormant, or Lost
- **By Sentiment:** Filter by Positive, Neutral, or Negative
- **By Branch:** Filter by assigned branch
- **By Date Range:** Filter by creation date or last contact date

**Sorting:** Click any column header to sort ascending/descending.

**Pagination:** Results are paginated with 25, 50, or 100 contacts per page.

### 7.2 Creating a Contact

1. Click **+ New Contact** button in the top-right corner
2. Fill in the contact form:
   - **First Name** (required)
   - **Last Name** (optional)
   - **Phone Number** (required, must be valid WhatsApp number with country code)
   - **Email** (optional)
   - **Tags** (optional, select from existing tags or create new)
   - **Branch** (optional, select from configured branches)
   - **Custom Fields** (optional, fill in any configured custom fields)
3. Click **Save Contact**
4. The contact is created and immediately available for messaging and campaigns

### 7.3 CSV Import

Bulk importing contacts from CSV files is the primary method for loading customer databases during onboarding.

#### Step-by-Step Import Process

1. Navigate to **Contacts**
2. Click **Import** button in the top-right corner
3. The import wizard opens with three steps:

**Step 1: Upload File**
- Click "Choose File" or drag-and-drop a CSV file
- Maximum file size: 10 MB
- Supported formats: `.csv` (comma-separated values)
- The system previews the first 5 rows of data

**Step 2: Map Columns**
- The system attempts to auto-map columns based on header names
- Review and adjust the mapping for each column:

| CSV Column | Maps To | Required | Notes |
|-----------|---------|----------|-------|
| Name / Full Name | `name` | ✅ Yes | Will be split into first/last if single column |
| First Name | `first_name` | ✅ Yes (if no full name) | Combined with last_name |
| Last Name | `last_name` | Optional | Combined with first_name |
| Phone / Mobile / WhatsApp | `phone` | ✅ Yes | Must include country code or default +234 applied |
| Email / Email Address | `email` | Optional | Used as secondary identifier |
| Tags | `tags` | Optional | Comma-separated tag names |
| Branch | `branch` | Optional | Must match existing branch name |
| Notes | `notes` | Optional | Free-text notes |
| [Custom Field Name] | `custom_field_[id]` | Optional | Maps to configured custom fields |

- Columns that don't map to any CRM field can be skipped

**Step 3: Review & Import**
- Review the total number of contacts to be imported
- See warnings for:
  - Missing required fields (phone number)
  - Invalid phone number formats
  - Duplicate contacts (matching phone or email)
- Choose duplicate handling: **Skip duplicates** or **Update existing**
- Click **Import** to process

**Post-Import Summary:**
- Total contacts processed
- Successfully imported
- Duplicates skipped or updated
- Errors (with downloadable error report)

#### CSV Format Requirements

```csv
first_name,last_name,phone,email,tags
Adeola,Johnson,+2348012345678,adeola@example.com,"VIP,Lagos"
Chioma,Okafor,+2348098765432,chioma@example.com,"New Customer"
Emeka,Nwosu,+2347011223344,,"Dormant,Abuja"
```

> **Tip:** Always include the country code (+234) in phone numbers. If your CSV has numbers without country codes (e.g., 08012345678), the system will attempt to prepend +234 automatically, but this may fail for non-Nigerian numbers.

> **Warning:** CSV files must use UTF-8 encoding. Files exported from Excel in other encodings may cause character corruption, especially for names with special characters.

### 7.4 Deduplication System

The CRM uses a **dual-identifier deduplication system** to prevent duplicate contacts:

**Primary Identifier:** Phone Number
- Every contact must have a unique phone number within the account
- Phone numbers are normalized to E.164 format before comparison
- Example: `08012345678`, `+2348012345678`, and `2348012345678` are all treated as the same number

**Secondary Identifier:** Email Address
- If a contact has an email, it serves as a secondary unique identifier
- Two contacts cannot share the same email within an account
- Email comparison is case-insensitive (`John@Example.com` = `john@example.com`)

**Deduplication Rules:**

| Scenario | Behavior |
|----------|----------|
| Import contact with existing phone number | Skip or update (based on import settings) |
| Import contact with existing email | Skip or update (based on import settings) |
| Manual creation with existing phone | Error: "A contact with this phone number already exists" |
| Manual creation with existing email | Error: "A contact with this email already exists" |
| API creation with existing identifiers | Returns 409 Conflict with existing contact ID |

### 7.5 Tags

Tags are the primary mechanism for organizing, segmenting, and targeting contacts. They are used extensively in campaigns, broadcasts, automations, and reporting.

#### Tag Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Source** | How the contact was acquired | `imported`, `website`, `referral`, `ctwa-ad`, `walk-in` |
| **Status** | Current relationship status | `active`, `dormant`, `churned`, `vip`, `new-customer` |
| **Interest** | Product/service interests | `electronics`, `fashion`, `food`, `services` |
| **Location** | Geographic segmentation | `lagos`, `abuja`, `port-harcourt`, `ibadan` |
| **Campaign** | Campaign participation tracking | `win-back-sent`, `win-back-responded`, `birthday-2024` |
| **Behavior** | Behavioral indicators | `high-spender`, `frequent-buyer`, `price-sensitive` |
| **Lifecycle** | Onboarding/lifecycle stage | `onboarding-started`, `onboarding-complete`, `ready-for-kickoff` |
| **Custom** | Client-specific categories | Any custom tags the client defines |

#### Creating Tags

1. Navigate to **Settings → Tags**
2. Click **Add Tag**
3. Enter the tag name (lowercase, hyphenated recommended: `vip-customer`)
4. Select a color for the tag badge
5. Click **Save**

Alternatively, tags can be created on-the-fly when editing a contact or during import by typing a new tag name.

#### Bulk Tagging

1. Navigate to **Contacts**
2. Select multiple contacts using the checkboxes
3. Click **Bulk Actions** in the toolbar
4. Select **Add Tag** or **Remove Tag**
5. Choose the tag(s) to apply or remove
6. Click **Apply** — the operation processes immediately

> **Tip:** Bulk tagging is essential for campaign targeting. Before launching a campaign, create a specific tag (e.g., `q2-promo-target`) and bulk-apply it to the target audience.

### 7.6 RFM Recency Scoring System

The CRM implements a simplified RFM (Recency-Frequency-Monetary) scoring system focused on **Recency** — the number of days since a contact's last purchase. This is the core intelligence engine that powers customer reactivation campaigns.

#### How It Works

1. Each contact's **last purchase date** is tracked (from manual entry, import, or e-commerce sync)
2. The system calculates **days since last purchase** for every contact
3. Based on configurable thresholds, each contact is assigned to one of **4 segments**
4. Segments update automatically as time passes (a contact moves from "Active" to "At Risk" if they don't purchase)

#### The 4 Recency Segments

| Segment | Badge Color | Meaning | Typical Action |
|---------|------------|---------|----------------|
| **Active** | 🟢 Green | Purchased recently, within the expected purchase cycle | Nurture, upsell, loyalty rewards |
| **At Risk** | 🟡 Yellow | Purchase cycle is overdue, customer may be drifting | Send reminder, special offer, check-in message |
| **Dormant** | 🟠 Orange | Significantly overdue, customer has likely stopped buying | Win-back campaign, exclusive discount, personal outreach |
| **Lost** | 🔴 Red | Extremely overdue, customer is considered churned | Last-chance offer, feedback request, or archive |

#### 6 Industry Presets

The system includes pre-configured thresholds for common Nigerian business types:

| Industry Preset | Active (days) | At Risk (days) | Dormant (days) | Lost (days) | Rationale |
|----------------|--------------|----------------|----------------|-------------|------------|
| **Restaurant / Food** | 0-7 | 8-21 | 22-45 | 46+ | Frequent dining, weekly purchase cycle |
| **Retail / Fashion** | 0-30 | 31-60 | 61-120 | 121+ | Monthly shopping cycle, seasonal purchases |
| **Beauty / Salon** | 0-21 | 22-45 | 46-90 | 91+ | Bi-weekly to monthly appointments |
| **Electronics / Tech** | 0-60 | 61-120 | 121-240 | 241+ | Quarterly to semi-annual purchase cycle |
| **Professional Services** | 0-30 | 31-90 | 91-180 | 181+ | Monthly retainer or quarterly engagement |
| **General / Custom** | 0-30 | 31-60 | 61-120 | 121+ | Default balanced thresholds |

#### Adaptive Thresholds

When **Adaptive Mode** is enabled, the system automatically adjusts thresholds based on actual purchase data:

1. The system analyzes the distribution of purchase intervals across all contacts
2. It calculates percentile-based thresholds (e.g., Active = bottom 25% of intervals)
3. Thresholds are recalculated weekly as new purchase data comes in
4. A **confidence badge** indicates the reliability of adaptive thresholds:

| Badge | Confidence | Meaning |
|-------|-----------|----------|
| 🟢 **High** | 100+ purchases | Statistically significant sample, thresholds are reliable |
| 🟡 **Medium** | 50-99 purchases | Reasonable sample, thresholds are approximate |
| 🔴 **Low** | < 50 purchases | Insufficient data, using industry preset as fallback |

> **Tip:** For new accounts with limited purchase history, start with the appropriate industry preset and enable Adaptive Mode once you have 50+ purchase records.

### 7.7 Custom Fields

Custom fields allow you to store additional data points specific to the client's business needs.

#### 5 Custom Field Types

| Type | Description | Example Use Case | Input Control |
|------|------------|-----------------|---------------|
| **Text** | Free-form text string, up to 500 characters | Company name, preferred name, notes | Text input |
| **Number** | Numeric value (integer or decimal) | Customer lifetime value, loyalty points | Number input with increment/decrement |
| **Date** | Calendar date value | Birthday, anniversary, contract renewal date | Date picker |
| **Boolean** | True/false toggle | VIP status, email opt-in, NDPR consent | Toggle switch |
| **Select** | Single selection from predefined options | Industry, preferred branch, communication preference | Dropdown menu |

#### Managing Custom Fields

1. Navigate to **Settings → Custom Fields**
2. Click **Add Custom Field**
3. Configure:
   - **Field Name:** Descriptive label (e.g., "Company Name")
   - **Field Type:** Select from the 5 types above
   - **Required:** Toggle whether the field is mandatory
   - **Options:** For Select type, define the dropdown options
4. Click **Save**
5. The field immediately appears on all contact forms and detail views

**Reordering:** Drag and drop custom fields to change their display order on contact forms.

**Editing:** Click the edit icon on any custom field to modify its name, type, or options. Changing the type of an existing field may cause data loss for incompatible conversions.

**Deleting:** Click the delete icon to remove a custom field. This permanently deletes the field and all associated data across all contacts.

> **Warning:** Deleting a custom field is irreversible. All data stored in that field for every contact will be permanently lost. Export contact data before deleting fields.

### 7.8 Exporting Contacts

1. Navigate to **Contacts**
2. Optionally apply filters to export a subset of contacts
3. Click **Export** button in the top-right corner
4. Select export format: **CSV**
5. Choose which fields to include in the export
6. Click **Download**
7. The CSV file is generated and downloaded to your browser

> **Note:** Only Owner and Admin roles can export contacts. This restriction protects customer data in compliance with NDPR requirements.

### 7.9 Contact Detail View

Clicking on any contact in the table opens the full contact detail view:

**Header Section:**
- Contact name, phone, email
- Recency segment badge
- Sentiment indicator
- Edit and delete buttons

**Tabs:**

| Tab | Content |
|-----|----------|
| **Overview** | All contact fields, custom fields, tags, branch assignment |
| **Conversations** | Full message history with the contact |
| **Purchases** | Purchase history with products, dates, and amounts |
| **Deals** | Associated deals with pipeline stage and value |
| **Activity** | Chronological log of all events (messages, tag changes, campaign sends, etc.) |
| **Notes** | Free-form notes added by agents |

---

## 8. Products & Purchases

The Products module enables businesses to maintain a product catalog and track customer purchase history — the data foundation for recency scoring and revenue analytics.

**URL:** `/products`

### 8.1 Product Catalog

The product catalog is a centralized list of all products and services the business offers.

#### Adding a Product

1. Navigate to **Products**
2. Click **+ Add Product**
3. Fill in the product form:

| Field | Required | Description |
|-------|----------|-------------|
| **Product Name** | ✅ | Clear, descriptive name (e.g., "Premium Hair Treatment") |
| **Description** | Optional | Detailed description of the product/service |
| **Price** | ✅ | Price in the account's currency (NGN) |
| **Category** | Optional | Product category for organization |
| **SKU** | Optional | Stock Keeping Unit for inventory reference |
| **Status** | ✅ | Active or Inactive |

4. Click **Save Product**

#### AI Ghost Text Descriptions

When adding or editing a product, the description field features **AI ghost text** — intelligent placeholder suggestions generated by the AI engine:

1. Type the product name in the Name field
2. Click into the Description field
3. Ghost text appears in light gray, suggesting a professional product description
4. Press **Tab** to accept the suggestion, or continue typing to override it
5. The AI considers the product name, category, and price to generate contextually relevant descriptions

> **Tip:** AI ghost text is especially useful for clients who struggle to write product descriptions. It provides a professional starting point that can be customized.

#### Editing a Product

1. Click on any product in the catalog list
2. The product detail view opens with all fields editable
3. Make changes and click **Save**
4. Changes take effect immediately — existing purchase records are not affected

#### Deleting a Product

1. Click the **⋮ menu** on a product card
2. Select **Delete**
3. Confirm the deletion in the dialog
4. The product is soft-deleted — it no longer appears in the catalog but existing purchase records retain the product reference

> **Warning:** Deleting a product does not delete associated purchase records. Historical data is preserved for reporting accuracy.

### 8.2 Purchase History Tracking

Purchase history is the data that powers the recency scoring system. Every purchase record links a contact to a product with a date and amount.

#### Recording a Purchase

**Method 1: Manual Entry**
1. Navigate to a contact's detail view
2. Click the **Purchases** tab
3. Click **+ Add Purchase**
4. Select the product from the catalog dropdown
5. Enter the purchase amount (auto-populated from product price, editable)
6. Set the purchase date (defaults to today)
7. Add optional notes
8. Click **Save**

**Method 2: CSV Import**
- Purchase history can be imported via CSV during contact import
- Include columns for product name, purchase date, and amount
- The system matches product names to catalog entries

**Method 3: E-Commerce Sync**
- When Shopify or WooCommerce is connected, orders are automatically synced as purchase records
- See Section 15 for e-commerce integration details

**Method 4: API**
- Use the `POST /api/purchases` endpoint to create purchase records programmatically
- See Section 30 for API documentation

### 8.3 Purchase Score Settings

Purchase scoring configuration determines how purchase data influences contact segmentation:

1. Navigate to **Settings → Recency Settings**
2. Configure the scoring parameters:
   - **Score Weight:** How heavily purchase recency influences the overall contact score (0-100%)
   - **Frequency Bonus:** Additional score points for contacts with multiple purchases
   - **Monetary Bonus:** Additional score points for high-value purchases
3. Click **Save**

### 8.4 Product Categories

Organize products into categories for easier management and reporting:

1. Navigate to **Products**
2. Click **Categories** tab
3. Click **+ Add Category**
4. Enter the category name (e.g., "Hair Care", "Electronics", "Consulting")
5. Click **Save**
6. Assign products to categories when creating or editing them

Categories enable:
- Filtered product views
- Category-level revenue reporting
- Campaign targeting by product interest

### 8.5 Linking Purchases to Contacts

Purchases create a direct link between contacts and products, enabling:

| Feature | How Purchases Enable It |
|---------|------------------------|
| **Recency Scoring** | Last purchase date determines the contact's recency segment |
| **Campaign Targeting** | Target contacts who purchased specific products |
| **Revenue Analytics** | Calculate customer lifetime value and revenue per product |
| **Personalization** | Reference past purchases in message templates |
| **Upselling** | Identify cross-sell opportunities based on purchase history |



## 9. Deal Pipelines

The Deals module provides a visual Kanban board for tracking sales opportunities, customer negotiations, and revenue through customizable pipeline stages.

**URL:** `/deals`

### 9.1 Kanban Board Interface

The pipeline is displayed as a horizontal Kanban board with columns representing deal stages:

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│   New Lead   │  Contacted   │  Negotiation │   Won        │   Lost       │
│              │              │              │              │              │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │Deal Card │ │ │Deal Card │ │ │Deal Card │ │ │Deal Card │ │ │Deal Card │ │
│ │₦500K     │ │ │₦1.2M    │ │ │₦800K    │ │ │₦2.5M    │ │ │₦300K    │ │
│ │Adeola E. │ │ │Lagos T. │ │ │Chima Ltd│ │ │Nwosu Co.│ │ │Beta Inc │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │
│ ┌──────────┐ │              │ ┌──────────┐ │              │              │
│ │Deal Card │ │              │ │Deal Card │ │              │              │
│ │₦750K     │ │              │ │₦1.5M    │ │              │              │
│ │Obi & Co  │ │              │ │Zenith   │ │              │              │
│ └──────────┘ │              │ └──────────┘ │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

### 9.2 Deal Stages

Default pipeline stages (customizable per account):

| Stage | Color | Description | Typical Actions |
|-------|-------|-------------|------------------|
| **New Lead** | 🔵 Blue | Initial contact or inquiry received | Qualify the lead, gather requirements |
| **Contacted** | 🟡 Yellow | First outreach made, awaiting response | Follow up within 48 hours |
| **Qualified** | 🟠 Orange | Lead confirmed as viable opportunity | Schedule discovery call, send proposal |
| **Negotiation** | 🟣 Purple | Active price/terms discussion | Negotiate terms, handle objections |
| **Proposal Sent** | 🔷 Teal | Formal proposal delivered | Follow up on proposal, answer questions |
| **Won** | 🟢 Green | Deal closed successfully | Trigger onboarding, record revenue |
| **Lost** | 🔴 Red | Deal did not close | Record loss reason, schedule re-engagement |

**Customizing Stages:**
1. Navigate to **Settings → Deals Settings**
2. Add, rename, reorder, or delete pipeline stages
3. Assign colors to each stage
4. Set a default pipeline for new deals
5. Changes apply immediately to the Kanban board

### 9.3 Creating a Deal

1. Click **+ New Deal** button on the Kanban board
2. Fill in the deal form:

| Field | Required | Description |
|-------|----------|-------------|
| **Deal Name** | ✅ | Descriptive name (e.g., "Adeola Enterprises - Q2 Reactivation") |
| **Contact** | ✅ | Link to an existing contact |
| **Value** | ✅ | Deal value in NGN |
| **Stage** | ✅ | Initial pipeline stage (defaults to first stage) |
| **Expected Close Date** | Optional | Target date for closing the deal |
| **Notes** | Optional | Additional context or requirements |
| **Tags** | Optional | Tags for categorization |

3. Click **Create Deal**
4. The deal card appears in the selected stage column

### 9.4 Deal Cards

Each deal card on the Kanban board displays:

| Element | Description |
|---------|-------------|
| **Deal Name** | Primary identifier, truncated if long |
| **Contact Name** | Linked contact with avatar |
| **Value** | Deal value formatted as ₦X.XM or ₦X,XXX |
| **Stage** | Current stage (shown by column position) |
| **Created Date** | When the deal was created |
| **Expected Close** | Target close date with overdue indicator |
| **Days in Stage** | How long the deal has been in the current stage |
| **Tags** | Color-coded tag badges |

### 9.5 Drag-and-Drop

Move deals between stages by dragging and dropping deal cards:

1. Click and hold a deal card
2. Drag it to the target stage column
3. Release to drop — the deal's stage is updated immediately
4. A stage change event is logged in the deal's activity history
5. If automations are configured for `deal_stage_changed` triggers, they fire automatically

### 9.6 Pipeline Analytics

The pipeline analytics panel (accessible via the **📊 Analytics** button) shows:

| Metric | Description |
|--------|-------------|
| **Total Pipeline Value** | Sum of all active deal values |
| **Deals by Stage** | Count and value breakdown per stage |
| **Win Rate** | Percentage of deals that reach "Won" stage |
| **Average Deal Size** | Mean value of won deals |
| **Average Time to Close** | Mean days from creation to "Won" |
| **Conversion Funnel** | Visual funnel showing drop-off between stages |
| **Revenue Forecast** | Projected revenue based on stage probabilities |

### 9.7 Multiple Pipelines

Accounts can create multiple pipelines for different business processes:

- **Sales Pipeline:** For tracking new customer acquisition
- **Reactivation Pipeline:** For tracking dormant customer re-engagement
- **Partnership Pipeline:** For tracking business partnerships
- **Upsell Pipeline:** For tracking expansion revenue from existing customers

Switch between pipelines using the dropdown selector at the top of the Deals page.

---

## 10. Broadcasts

Broadcasts are one-time bulk WhatsApp messages sent to a filtered audience using approved templates. They are the simplest way to reach multiple contacts simultaneously.

**URL:** `/broadcasts`

### 10.1 The 4-Step Broadcast Wizard

Creating a broadcast follows a guided 4-step wizard:

#### Step 1: Choose Template

1. Click **+ New Broadcast**
2. The template picker displays all approved WhatsApp templates
3. Each template shows:
   - Template name
   - Category (Marketing, Utility, Authentication)
   - Language
   - Preview of the template content
   - Approval status badge
4. Select the template you want to use
5. Click **Next**

> **Warning:** Only templates with "Approved" status can be used for broadcasts. Templates in "Pending" or "Rejected" status are grayed out and cannot be selected.

#### Step 2: Select Audience

Define who receives the broadcast using filters:

| Filter Type | Options | Example |
|------------|---------|----------|
| **All Contacts** | Send to entire database | Broadcast to all 5,000 contacts |
| **By Tag** | Include/exclude specific tags | Include "VIP" AND "Lagos" |
| **By Segment** | Filter by recency segment | Target "Dormant" and "At Risk" |
| **By Branch** | Filter by branch location | Only "Ikeja Branch" contacts |
| **By Custom Field** | Filter by custom field values | Where "Industry" = "Retail" |
| **Combination** | Multiple filters with AND/OR logic | "VIP" tag AND "Dormant" segment AND "Lagos" branch |

The audience count updates in real-time as you adjust filters. Review the estimated audience size before proceeding.

5. Click **Next**

#### Step 3: Personalize

Customize the template variables for personalization:

1. The template preview shows variable placeholders (e.g., `{{1}}`, `{{2}}`)
2. Map each variable to a contact field:
   - `{{1}}` → Contact Name (first name)
   - `{{2}}` → Custom value (e.g., discount code, product name)
3. Preview how the message will look for a sample contact
4. Optionally add a header image or document attachment (if the template supports media)
5. Click **Next**

#### Step 4: Schedule or Send

Choose when to send the broadcast:

| Option | Description |
|--------|-------------|
| **Send Immediately** | Broadcast starts sending right away |
| **Schedule for Later** | Set a specific date and time for sending |

For scheduled broadcasts:
1. Select the date using the date picker
2. Select the time (in the account's timezone)
3. Review the scheduled time confirmation
4. Click **Schedule Broadcast**

For immediate sends:
1. Review the final summary: template, audience size, personalization
2. Click **Send Now**
3. Confirm in the dialog: "Are you sure you want to send this broadcast to X contacts?"

### 10.2 Broadcast Tracking

After sending, the broadcast detail page shows real-time delivery metrics:

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Sent** | Messages successfully queued for sending | Count of API calls made |
| **Delivered** | Messages delivered to recipient devices | Delivery webhook confirmations |
| **Delivery Rate** | Percentage of sent messages that were delivered | (Delivered / Sent) × 100% |
| **Read** | Messages opened/read by recipients | Read receipt webhook confirmations |
| **Read Rate** | Percentage of delivered messages that were read | (Read / Delivered) × 100% |
| **Replied** | Recipients who sent a reply message | Inbound messages within 24h of broadcast |
| **Reply Rate** | Percentage of read messages that got replies | (Replied / Read) × 100% |
| **Failed** | Messages that failed to send | Error responses from WhatsApp API |
| **Failure Rate** | Percentage of messages that failed | (Failed / Sent) × 100% |

> **Tip:** A healthy broadcast should achieve: Delivery Rate > 95%, Read Rate > 60%, Reply Rate > 5%. If delivery rate is below 90%, check for invalid phone numbers in your contact list.

### 10.3 Broadcast Best Practices

1. **Segment your audience** — Never broadcast to your entire database. Use tags and segments to target relevant contacts.
2. **Personalize variables** — Messages with the recipient's name get 20-30% higher read rates.
3. **Time your sends** — Best times for Nigerian audiences: Tuesday-Thursday, 10am-12pm or 2pm-4pm WAT.
4. **Respect frequency** — Don't broadcast to the same audience more than twice per week.
5. **Monitor quality rating** — WhatsApp tracks your message quality. High block/report rates can restrict your account.
6. **Test first** — Send a test broadcast to yourself or a small group before the full send.

---

## 11. Campaigns

Campaigns are the CRM's most powerful feature — multi-step, automated marketing sequences that combine message templates, timing delays, conditional logic, and audience targeting to achieve specific business objectives.

**URL:** `/campaigns`

### 11.1 Campaign Wizard Overview

Creating a campaign follows a 6-step wizard:

| Step | Name | Purpose |
|------|------|----------|
| **Step 1** | Choose Template | Select from 14 pre-built campaign templates or start from scratch |
| **Step 2** | Configure Audience | Define target audience using tags, segments, and filters |
| **Step 3** | Customize Messages | Edit message templates, set variables, add media |
| **Step 4** | Set Timing | Configure delays between steps, send windows, and frequency |
| **Step 5** | Review & Preview | Review all settings, preview messages, check audience size |
| **Step 6** | Activate | Launch the campaign immediately or schedule for later |

### 11.2 Campaign Lifecycle

Every campaign moves through a defined lifecycle:

```
Draft → Scheduled → Active → Paused → Completed
                                  ↓
                              Cancelled
```

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| **Draft** | Campaign is being configured, not yet active | Edit, Delete, Activate |
| **Scheduled** | Campaign is set to activate at a future date/time | Edit, Cancel, Activate Now |
| **Active** | Campaign is running, sending messages to contacts | Pause, Cancel |
| **Paused** | Campaign is temporarily stopped, can be resumed | Resume, Cancel, Edit |
| **Completed** | Campaign has finished all steps for all contacts | View Results, Clone |
| **Cancelled** | Campaign was manually stopped before completion | View Results, Clone |

### 11.3 Campaign Templates

The CRM includes **14 pre-built campaign templates** organized into three tiers and four categories. Each template provides a complete, ready-to-customize campaign sequence.

#### Template Overview Table

| # | Template Slug | Name | Tier | Category | Default Channel |
|---|--------------|------|------|----------|------------------|
| 1 | `win-back-dormant` | Win-Back Dormant Customers | Tier 1 | Reactivation | WhatsApp |
| 2 | `birthday-anniversary` | Birthday & Anniversary | Tier 1 | Engagement | WhatsApp |
| 3 | `post-purchase-followup` | Post-Purchase Follow-Up | Tier 1 | Retention | WhatsApp |
| 4 | `vip-exclusive` | VIP Exclusive Rewards | Tier 1 | Growth | WhatsApp |
| 5 | `cart-abandonment` | Cart Abandonment Recovery | Tier 2 | Recovery | WhatsApp |
| 6 | `seasonal-promotion` | Seasonal Promotion | Tier 2 | Growth | WhatsApp |
| 7 | `referral-program` | Referral Program | Tier 2 | Growth | WhatsApp |
| 8 | `feedback-collection` | Feedback Collection | Tier 2 | Engagement | WhatsApp |
| 9 | `new-product-launch` | New Product Launch | Tier 2 | Growth | WhatsApp |
| 10 | `loyalty-program` | Loyalty Program | Tier 2 | Retention | WhatsApp |
| 11 | `whatsapp-flow-survey` | WhatsApp Flow Survey | Tier 3 | Engagement | WhatsApp Flow |
| 12 | `catalog-browse` | Product Catalog Browse | Tier 3 | Growth | WhatsApp |
| 13 | `ad-lead-nurture` | Ad Lead Nurture (CTWA) | Tier 3 | Growth | WhatsApp |
| 14 | `sentiment-recovery` | Sentiment Recovery | Tier 2 | Retention | WhatsApp |

---

#### Template 1: Win-Back Dormant Customers (`win-back-dormant`)

**Tier:** 1 — Reactivation  
**Category:** Reactivation  
**Default Channel:** WhatsApp  

**What It Does:**  
Re-engages customers who have been inactive for 60+ days with a carefully sequenced series of messages designed to remind them of your business, offer an incentive to return, and create urgency. The campaign uses a 3-message sequence over 7 days, escalating from a friendly check-in to a time-limited exclusive offer.

**Why You Need It:**  
Acquiring a new customer costs 5-7x more than reactivating an existing one. Most Nigerian businesses have 40-60% of their customer database in dormant status. This campaign directly targets that revenue opportunity, typically recovering 15-25% of dormant customers.

**How It Works:**
1. **Day 1 — Reconnection Message:** A warm, personalized message acknowledging the customer's absence. Uses their name and references their last purchase. Tone is friendly, not salesy. Example: "Hi {{name}}, we've missed you at [Business]! It's been a while since your last visit and we wanted to check in."
2. **Day 3 — Value Reminder:** Highlights what's new at the business since their last visit. Introduces new products, services, or improvements. Includes a soft call-to-action.
3. **Day 7 — Exclusive Offer:** Delivers a time-limited discount or special offer exclusively for returning customers. Creates urgency with a 48-hour expiration. Includes a clear redemption mechanism.
4. **Post-Response Handling:** If the customer replies at any stage, the campaign pauses and routes to a human agent for personal follow-up. If no response after all 3 messages, the contact is tagged `win-back-failed` for future re-evaluation.

**Best For:**  
Retail stores, restaurants, salons, and service businesses with a large dormant customer base. Especially effective for businesses that have been operating 2+ years and have accumulated inactive customers.

**Example Result:**  
A Lagos fashion retailer with 3,200 dormant contacts ran this campaign and achieved: 89% delivery rate, 62% read rate, 18% reply rate, 12% redemption rate (384 customers returned), generating ₦4.2M in reactivated revenue within 30 days.

**Expected Rates:**  
- Open/Read Rate: 55-70%
- Reply Rate: 12-20%
- Conversion Rate: 8-15%

---

#### Template 2: Birthday & Anniversary (`birthday-anniversary`)

**Tier:** 1 — Engagement  
**Category:** Engagement  
**Default Channel:** WhatsApp  

**What It Does:**  
Automatically sends personalized celebration messages to customers on their birthdays or purchase anniversaries, accompanied by a special offer or discount. The campaign triggers based on date custom fields and sends a single, high-impact message.

**Why You Need It:**  
Birthday messages have the highest open rates of any marketing message type (75%+ on WhatsApp). They create emotional connection, demonstrate that the business values the customer as an individual, and provide a natural reason to offer a discount that drives a purchase.

**How It Works:**
1. **Trigger:** Campaign checks the `birthday` or `anniversary` custom field daily against the current date
2. **Day-of Message:** Sends a celebratory WhatsApp message with the customer's name, a birthday/anniversary greeting, and a special offer (e.g., 15% discount, free item, bonus service)
3. **Offer Validity:** The offer includes a 7-day redemption window
4. **Follow-Up (Day 5):** If the offer hasn't been redeemed, a gentle reminder is sent: "Your birthday treat expires in 2 days!"
5. **Tagging:** Contacts are tagged `birthday-2024-sent` (or relevant year) to prevent duplicate sends

**Best For:**  
Any business that collects customer birthdays. Particularly effective for restaurants (birthday dinner offers), salons (birthday pampering packages), and retail (birthday shopping discounts).

**Example Result:**  
A beauty salon sent birthday campaigns to 180 customers over 3 months: 92% delivery, 78% read rate, 34% redemption rate, average spend ₦45,000 per birthday visit (vs. ₦28,000 normal visit).

**Expected Rates:**  
- Open/Read Rate: 70-85%
- Reply Rate: 25-40%
- Conversion Rate: 20-35%

---

#### Template 3: Post-Purchase Follow-Up (`post-purchase-followup`)

**Tier:** 1 — Retention  
**Category:** Retention  
**Default Channel:** WhatsApp  

**What It Does:**  
Automatically follows up with customers after a purchase to thank them, ensure satisfaction, request feedback, and encourage repeat business. The sequence builds the relationship beyond the transaction.

**Why You Need It:**  
The post-purchase period is the most critical window for building customer loyalty. A customer who receives a follow-up within 48 hours is 3x more likely to make a repeat purchase. This campaign automates what most Nigerian businesses forget to do.

**How It Works:**
1. **Day 1 (Post-Purchase):** Thank you message with order confirmation details. Asks if the customer received their product/service satisfactorily.
2. **Day 3:** Product usage tips or care instructions relevant to what they purchased. Positions the business as helpful, not just transactional.
3. **Day 7:** Satisfaction check-in. Asks for a 1-5 rating. If rating is 4-5, requests a review/testimonial. If rating is 1-3, routes to customer service for issue resolution.
4. **Day 14:** Cross-sell recommendation based on their purchase. "Customers who bought X also love Y" with a small incentive.
5. **Tagging:** Contacts are tagged with satisfaction level (`satisfied`, `neutral`, `unsatisfied`) for future segmentation.

**Best For:**  
E-commerce businesses, product retailers, and service providers who want to build repeat purchase behavior.

**Example Result:**  
An electronics retailer ran post-purchase follow-ups for 500 customers: 85% delivery, 71% read rate, 28% provided feedback, 15% made a repeat purchase within 30 days, customer satisfaction score improved from 3.2 to 4.1.

**Expected Rates:**  
- Open/Read Rate: 65-80%
- Reply Rate: 20-30%
- Conversion Rate: 10-18%

---

#### Template 4: VIP Exclusive Rewards (`vip-exclusive`)

**Tier:** 1 — Growth  
**Category:** Growth  
**Default Channel:** WhatsApp  

**What It Does:**  
Rewards high-value customers with exclusive offers, early access to new products, and VIP treatment. Identifies top customers using purchase history and recency scoring, then delivers premium experiences that reinforce their loyalty.

**Why You Need It:**  
The top 20% of customers typically generate 80% of revenue. This campaign ensures those high-value customers feel recognized and rewarded, reducing churn risk and increasing lifetime value. VIP customers who feel appreciated spend 67% more than regular customers.

**How It Works:**
1. **Audience Selection:** Automatically targets contacts tagged as "VIP" or in the "Active" recency segment with high purchase frequency
2. **Message 1 — VIP Recognition:** Acknowledges their VIP status with a personalized message: "As one of our most valued customers, we wanted to give you something special..."
3. **Message 2 — Exclusive Offer:** Delivers a VIP-only discount, early access to a new product, or invitation to a special event
4. **Message 3 — Feedback Request:** Asks for their input on what the business could do better, making them feel like insiders
5. **Ongoing:** VIP contacts are added to a recurring monthly VIP communication cadence

**Best For:**  
Premium brands, luxury retailers, high-end service providers, and any business with identifiable high-value customer segments.

**Example Result:**  
A premium fashion brand sent VIP campaigns to their top 200 customers: 95% delivery, 82% read rate, 45% reply rate, 38% made a purchase within 7 days, average order value 2.3x higher than non-VIP campaigns.

**Expected Rates:**  
- Open/Read Rate: 75-90%
- Reply Rate: 30-50%
- Conversion Rate: 25-40%

---

#### Template 5: Cart Abandonment Recovery (`cart-abandonment`)

**Tier:** 2 — Recovery  
**Category:** Recovery  
**Default Channel:** WhatsApp  

**What It Does:**  
Automatically detects when a customer adds items to their online cart but doesn't complete the purchase, then sends a sequence of recovery messages to bring them back to complete the transaction.

**Why You Need It:**  
Cart abandonment rates in Nigerian e-commerce average 75-85%. This means for every 4 customers who add items to cart, only 1 completes the purchase. This campaign recovers 10-20% of abandoned carts, directly converting lost revenue.

**How It Works:**
1. **Trigger:** E-commerce integration (Shopify/WooCommerce) detects cart abandonment after 1 hour of inactivity
2. **Hour 1 — Gentle Reminder:** "Hi {{name}}, you left some items in your cart! Your [product name] is waiting for you." Includes a direct link back to the cart.
3. **Hour 24 — Social Proof:** "Other customers love [product name]! Here's what they're saying..." Includes a review snippet and cart link.
4. **Hour 48 — Incentive:** "We don't want you to miss out! Here's 10% off to complete your order. Use code COMEBACK10." Includes discount code and cart link with urgency (expires in 24 hours).
5. **Completion Detection:** If the customer completes the purchase at any point, the remaining messages are cancelled automatically.

**Best For:**  
E-commerce businesses with Shopify or WooCommerce stores connected to the CRM. Requires e-commerce integration to be configured (see Section 15).

**Example Result:**  
An online fashion store recovered 156 out of 890 abandoned carts (17.5% recovery rate) in one month, generating ₦8.7M in recovered revenue. Average recovered order value: ₦55,800.

**Expected Rates:**  
- Open/Read Rate: 60-75%
- Reply Rate: 15-25%
- Conversion Rate: 10-20%

---

#### Template 6: Seasonal Promotion (`seasonal-promotion`)

**Tier:** 2 — Growth  
**Category:** Growth  
**Default Channel:** WhatsApp  

**What It Does:**  
Delivers time-bound promotional campaigns aligned with Nigerian holidays, seasons, and cultural events. Includes pre-built sequences for major occasions with customizable offers and messaging.

**Why You Need It:**  
Seasonal events drive significant consumer spending in Nigeria. Businesses that plan and execute seasonal campaigns capture disproportionate market share during peak periods. This template provides ready-made sequences for key dates.

**How It Works:**
1. **Pre-Season Teaser (7 days before):** Builds anticipation with a preview message: "Something special is coming for [Holiday]! Stay tuned..."
2. **Launch Day:** Announces the promotion with full details: offer, duration, terms, and how to redeem
3. **Mid-Campaign Reminder (Day 3-4):** Urgency message: "Only X days left! Don't miss our [Holiday] special."
4. **Last Chance (Final Day):** Final push: "Last chance! Our [Holiday] offer ends tonight at midnight."
5. **Post-Season Thank You:** Thanks participants and previews the next seasonal event

**Nigerian Seasonal Calendar:**

| Season/Event | Typical Timing | Campaign Focus |
|-------------|---------------|----------------|
| New Year Sales | January 1-15 | New year, new deals |
| Valentine's Day | February 7-14 | Gifts, dining, experiences |
| Easter | March/April | Family, celebration |
| Ramadan/Eid | Varies | Special offers for Eid |
| Independence Day | October 1 | Patriotic promotions |
| Black Friday | November 25-30 | Biggest discounts of the year |
| Christmas/Detty December | December 1-31 | Holiday shopping, celebrations |
| End of Year | December 26-31 | Clearance, year-end deals |

**Best For:**  
Retail, fashion, food & beverage, electronics, and any consumer-facing business.

**Example Result:**  
A retail chain ran a Black Friday campaign to 4,500 contacts: 91% delivery, 68% read rate, 22% reply rate, 15% conversion rate, ₦12.3M in campaign-attributed revenue.

**Expected Rates:**  
- Open/Read Rate: 60-75%
- Reply Rate: 15-25%
- Conversion Rate: 10-18%

---

#### Template 7: Referral Program (`referral-program`)

**Tier:** 2 — Growth  
**Category:** Growth  
**Default Channel:** WhatsApp  

**What It Does:**  
Incentivizes existing customers to refer friends and family by offering rewards for successful referrals. Tracks referral codes, validates new customer sign-ups, and delivers rewards to both referrer and referee.

**Why You Need It:**  
Referred customers have 37% higher retention rates and 25% higher lifetime value than non-referred customers. In Nigeria's relationship-driven market, word-of-mouth is the most trusted form of marketing. This campaign systematizes it.

**How It Works:**
1. **Invitation Message:** Sends existing customers a personalized referral offer: "Love [Business]? Share the love! Give your friends ₦X off their first purchase, and you'll get ₦Y when they buy."
2. **Referral Code Generation:** Each customer receives a unique referral code or link
3. **Tracking:** When a new customer uses a referral code, both parties are tagged and tracked
4. **Reward Delivery:** Automated message to referrer: "Great news! {{friend_name}} just made their first purchase using your referral. Your ₦Y reward is ready!"
5. **Leaderboard Updates:** Top referrers receive monthly recognition messages

**Best For:**  
Service businesses, subscription products, and any business where customer satisfaction is high and word-of-mouth is natural.

**Example Result:**  
A salon launched a referral program with 800 active customers: 65% read rate, 12% shared their referral code, 45 new customers acquired through referrals in 30 days, CAC reduced by 60% compared to paid advertising.

**Expected Rates:**  
- Open/Read Rate: 55-70%
- Reply Rate: 10-18%
- Conversion Rate: 5-12%

---

#### Template 8: Feedback Collection (`feedback-collection`)

**Tier:** 2 — Engagement  
**Category:** Engagement  
**Default Channel:** WhatsApp  

**What It Does:**  
Collects structured customer feedback through conversational WhatsApp messages. Uses a friendly, conversational approach rather than formal surveys to achieve higher response rates.

**Why You Need It:**  
Customer feedback is essential for business improvement, but traditional survey methods (email, web forms) achieve less than 5% response rates in Nigeria. WhatsApp-based feedback collection achieves 25-40% response rates because customers are already comfortable messaging on the platform.

**How It Works:**
1. **Opening Message:** Friendly request for feedback: "Hi {{name}}, we'd love to hear about your recent experience with us! It'll only take 2 minutes."
2. **Rating Request:** "On a scale of 1-5, how would you rate your overall experience?" (Uses WhatsApp button replies for easy selection)
3. **Follow-Up Question:** Based on rating:
   - Rating 4-5: "That's wonderful! What did you enjoy most?"
   - Rating 1-3: "We're sorry to hear that. What could we improve?"
4. **Recommendation Question:** "Would you recommend us to a friend? (Yes/No)"
5. **Thank You:** "Thank you for your feedback! It helps us serve you better." + Optional incentive for completing the survey
6. **Data Storage:** Responses are stored as contact notes and tagged for analysis

**Best For:**  
Any business seeking customer insights. Particularly valuable after service delivery, product launches, or operational changes.

**Example Result:**  
A restaurant collected feedback from 600 recent diners: 72% delivery, 58% read rate, 35% completed the full feedback sequence, NPS score calculated at 72, identified 3 key improvement areas.

**Expected Rates:**  
- Open/Read Rate: 55-70%
- Reply Rate: 25-40%
- Completion Rate: 20-35%

---

#### Template 9: New Product Launch (`new-product-launch`)

**Tier:** 2 — Growth  
**Category:** Growth  
**Default Channel:** WhatsApp  

**What It Does:**  
Builds anticipation and drives initial sales for new product or service launches through a phased announcement sequence. Creates buzz before launch, delivers the announcement, and follows up with social proof.

**Why You Need It:**  
Product launches fail when they lack awareness and urgency. This campaign ensures your existing customer base knows about new offerings before the general public, creating a built-in first wave of buyers and generating word-of-mouth.

**How It Works:**
1. **Day -3 (Teaser):** Mystery teaser message: "Something exciting is coming to [Business] in 3 days... 👀 Stay tuned!"
2. **Day -1 (Preview):** Exclusive preview for existing customers: "You're getting a sneak peek before anyone else! Tomorrow we're launching [Product]..."
3. **Day 0 (Launch):** Full announcement with product details, pricing, images, and a special launch-day offer for existing customers
4. **Day 2 (Social Proof):** Share early customer reactions, reviews, or purchase numbers: "50 customers have already grabbed [Product]! Here's what they're saying..."
5. **Day 5 (Last Chance):** Final reminder for the launch offer: "Launch special ends tomorrow! Get [Product] at the introductory price before it goes up."

**Best For:**  
Retail, fashion, food & beverage, tech products, and any business regularly introducing new offerings.

**Example Result:**  
A skincare brand launched a new product line to 2,000 existing customers: 88% delivery, 71% read rate, 340 pre-orders on launch day, ₦5.1M in first-week revenue, 45% of sales came from the WhatsApp campaign.

**Expected Rates:**  
- Open/Read Rate: 60-80%
- Reply Rate: 15-25%
- Conversion Rate: 8-15%

---

#### Template 10: Loyalty Program (`loyalty-program`)

**Tier:** 2 — Retention  
**Category:** Retention  
**Default Channel:** WhatsApp  

**What It Does:**  
Implements a points-based or tier-based loyalty program communicated entirely through WhatsApp. Tracks customer purchases, awards points, sends balance updates, and notifies customers when they reach reward thresholds.

**Why You Need It:**  
Loyalty programs increase customer retention by 5-10% and increase average order value by 15-25%. Most Nigerian businesses lack the technology for formal loyalty programs. This campaign delivers loyalty program benefits through WhatsApp without requiring a separate app or card system.

**How It Works:**
1. **Enrollment Message:** Invites customers to join the loyalty program: "Join our VIP Rewards Program! Earn points on every purchase and unlock exclusive rewards."
2. **Purchase Confirmation + Points:** After each purchase, sends a points update: "You earned 50 points on your purchase! Your balance: 250 points. 50 more points until your next reward!"
3. **Milestone Notifications:** When a customer reaches a reward threshold: "🎉 Congratulations! You've earned 300 points and unlocked a ₦5,000 reward! Reply REDEEM to claim."
4. **Monthly Statement:** Monthly summary of points earned, redeemed, and current balance
5. **Tier Upgrades:** Notifications when customers move to higher loyalty tiers (Silver → Gold → Platinum)

**Best For:**  
Retail, restaurants, salons, and any business with repeat purchase behavior where a loyalty program adds value.

**Example Result:**  
A restaurant chain enrolled 1,200 customers in their WhatsApp loyalty program: 85% engagement rate, average visit frequency increased from 1.8x/month to 2.7x/month, 23% increase in average spend per visit.

**Expected Rates:**  
- Open/Read Rate: 70-85%
- Reply Rate: 20-30%
- Retention Improvement: 15-25%

---

#### Template 11: WhatsApp Flow Survey (`whatsapp-flow-survey`)

**Tier:** 3 — Engagement  
**Category:** Engagement  
**Default Channel:** WhatsApp Flow  

**What It Does:**  
Deploys interactive in-chat survey forms using Meta's WhatsApp Flows feature. Unlike regular message-based surveys, Flow surveys present a native form interface within WhatsApp — with text inputs, dropdowns, radio buttons, and date pickers — providing a structured data collection experience.

**Why You Need It:**  
WhatsApp Flows provide a significantly better user experience for structured data collection compared to conversational message sequences. Response completion rates are 40-60% higher because the form interface is familiar and fast. Data quality is also higher because inputs are validated.

**How It Works:**
1. **Flow Design:** Create the survey form using the WhatsApp Flows JSON editor (see Section 17)
2. **Campaign Trigger:** Send a WhatsApp message with a Flow button: "We'd love your feedback! Tap below to complete a quick survey."
3. **In-Chat Form:** Customer taps the button and a native form appears within WhatsApp
4. **Form Submission:** Customer fills out the form and submits
5. **Response Collection:** Responses are captured by the CRM and stored as structured data
6. **Thank You Message:** Automated thank you message sent after submission
7. **Data Analysis:** Responses are available in the campaign analytics dashboard

**Best For:**  
Businesses needing structured data collection: customer satisfaction surveys, product preference surveys, event registration, appointment booking forms.

**Example Result:**  
A healthcare provider used Flow surveys for patient satisfaction: 78% delivery, 65% opened the flow, 52% completed the survey (vs. 12% for email surveys), collected 520 structured responses in 2 weeks.

**Expected Rates:**  
- Open/Read Rate: 60-75%
- Flow Open Rate: 50-65%
- Completion Rate: 35-55%

---

#### Template 12: Product Catalog Browse (`catalog-browse`)

**Tier:** 3 — Growth  
**Category:** Growth  
**Default Channel:** WhatsApp  

**What It Does:**  
Sends interactive product catalog messages that allow customers to browse products, view details, and express purchase interest directly within WhatsApp. Leverages WhatsApp's native product catalog features for a seamless shopping experience.

**Why You Need It:**  
Many Nigerian customers prefer browsing and buying through WhatsApp rather than visiting websites. This campaign brings the shopping experience to where customers already are, reducing friction and increasing conversion rates.

**How It Works:**
1. **Catalog Message:** Sends a WhatsApp catalog message showcasing featured products with images, descriptions, and prices
2. **Browse Interaction:** Customer browses products within the WhatsApp interface
3. **Interest Capture:** When a customer selects a product or asks about it, the CRM captures the interest and creates a deal
4. **Agent Notification:** The assigned agent is notified of the product interest for personal follow-up
5. **Follow-Up Sequence:** If no purchase within 24 hours, an automated follow-up is sent with additional product information or a small incentive

**Best For:**  
Retail, fashion, electronics, and any business with a visual product catalog.

**Example Result:**  
A fashion retailer sent catalog browse campaigns to 1,500 contacts: 82% delivery, 59% browsed the catalog, 180 product inquiries generated, 95 purchases completed, ₦6.8M in revenue.

**Expected Rates:**  
- Open/Read Rate: 55-70%
- Browse Rate: 40-60%
- Conversion Rate: 5-12%

---

#### Template 13: Ad Lead Nurture — CTWA (`ad-lead-nurture`)

**Tier:** 3 — Growth  
**Category:** Growth  
**Default Channel:** WhatsApp  

**What It Does:**  
Automatically nurtures leads that come through Click-to-WhatsApp (CTWA) ads on Facebook and Instagram. When a potential customer clicks a CTWA ad and starts a WhatsApp conversation, this campaign takes over with a structured nurture sequence to convert the lead into a customer.

**Why You Need It:**  
CTWA ads generate high-intent leads, but without immediate and structured follow-up, 70% of these leads go cold within 24 hours. This campaign ensures every ad lead receives timely, relevant follow-up that guides them toward a purchase decision.

**How It Works:**
1. **Instant Response (0-5 minutes):** When a CTWA lead arrives, an immediate welcome message is sent: "Hi! Thanks for your interest in [Product/Service]. I'm here to help! What would you like to know?"
2. **Qualification (Minutes 5-30):** If no response, a follow-up with qualifying questions: "Are you looking for [Option A] or [Option B]?" (Uses button replies for easy selection)
3. **Value Delivery (Hour 2):** Sends relevant content: testimonials, product details, pricing information based on their ad source
4. **Offer (Hour 24):** Delivers a special offer for ad leads: "As a thank you for connecting with us, here's an exclusive offer..."
5. **Final Follow-Up (Day 3):** Last touch: "Hi {{name}}, just checking in! Our special offer expires tomorrow. Any questions I can help with?"
6. **Lead Scoring:** Each interaction updates the lead's score. High-scoring leads are flagged for immediate agent attention.

**Best For:**  
Businesses running Facebook/Instagram CTWA ad campaigns. Requires CTWA tracking to be configured (see Section 18).

**Example Result:**  
A real estate company nurtured 450 CTWA leads over 30 days: 92% received the instant response, 68% engaged with qualification questions, 35% received the offer, 12% converted to site visits, 5% converted to sales (₦45M in property sales attributed to the campaign).

**Expected Rates:**  
- Open/Read Rate: 70-85%
- Reply Rate: 30-50%
- Conversion Rate: 8-15%

---

#### Template 14: Sentiment Recovery (`sentiment-recovery`)

**Tier:** 2 — Retention  
**Category:** Retention  
**Default Channel:** WhatsApp  

**What It Does:**  
Automatically detects unhappy customers through AI sentiment analysis and triggers a recovery sequence to address their concerns, resolve issues, and prevent churn. Integrates with the CRM's sentiment analysis engine (see Section 19).

**Why You Need It:**  
A single negative experience causes 32% of customers to stop doing business with a brand. However, customers whose complaints are resolved quickly become more loyal than customers who never had a problem (the "service recovery paradox"). This campaign catches negative sentiment early and initiates recovery.

**How It Works:**
1. **Trigger:** AI sentiment analysis detects a negative sentiment message from a customer (anger, frustration, disappointment keywords in English or Nigerian Pidgin)
2. **Immediate Acknowledgment (0-5 minutes):** "Hi {{name}}, I can see you're not happy with your experience, and I'm truly sorry. Your satisfaction is our top priority."
3. **Escalation:** The conversation is automatically flagged as high-priority and assigned to a senior agent or manager
4. **Resolution Follow-Up (Post-Resolution):** After the issue is addressed: "Hi {{name}}, I wanted to follow up on the issue we discussed. Has everything been resolved to your satisfaction?"
5. **Recovery Offer (Day 3):** If the customer confirms resolution: "As a token of our apology, we'd like to offer you [compensation/discount] on your next visit."
6. **Satisfaction Re-Check (Day 7):** Final check: "Hi {{name}}, just wanted to make sure everything is still going well. We value your business!"

**Best For:**  
Any business with customer service interactions. Especially valuable for businesses with high message volumes where negative sentiment might be missed manually.

**Example Result:**  
A telecom retailer used sentiment recovery for 3 months: detected 89 negative sentiment conversations, 78 were successfully resolved (87.6% resolution rate), 62 customers made subsequent purchases (79.5% retention rate), estimated ₦3.1M in retained revenue.

**Expected Rates:**  
- Detection Accuracy: 85-92%
- Resolution Rate: 75-90%
- Retention Rate: 70-85%



## 12. Automations

Automations are trigger-based workflows that execute actions automatically when specific conditions are met. They are the "if this, then that" engine of the CRM.

**URL:** `/automations`

### 12.1 Automation Builder Interface

The Automations page displays a list of all automations with:

| Column | Description |
|--------|-------------|
| **Name** | Automation name |
| **Trigger** | The event that starts the automation |
| **Steps** | Number of action steps in the sequence |
| **Status** | Active (green) or Inactive (gray) toggle |
| **Last Triggered** | Timestamp of the most recent execution |
| **Executions** | Total number of times the automation has fired |
| **Created** | Creation date |

Click **+ New Automation** to open the automation builder.

### 12.2 Trigger Types

Every automation starts with a trigger — the event that initiates the workflow:

| Trigger Type | Slug | Description | Configuration Options |
|-------------|------|-------------|----------------------|
| **Message Received** | `message_received` | Fires when any inbound WhatsApp message is received | Filter by: contact tags, message content, media type |
| **Tag Added** | `tag_added` | Fires when a specific tag is applied to a contact | Select which tag(s) trigger the automation |
| **Keyword Match** | `keyword_match` | Fires when an inbound message contains specific keywords | Keywords list, match type (exact, contains, regex) |
| **Contact Created** | `contact_created` | Fires when a new contact is added to the database | Filter by: source (import, manual, API, webhook) |
| **Deal Stage Changed** | `deal_stage_changed` | Fires when a deal moves to a specific pipeline stage | Select pipeline and target stage |
| **Scheduled** | `scheduled` | Fires on a recurring schedule (cron-based) | Cron expression (e.g., daily at 9am, weekly on Monday) |

### 12.3 Step Types

After the trigger fires, the automation executes a sequence of steps:

| Step Type | Slug | Description | Configuration |
|----------|------|-------------|---------------|
| **Send Message** | `send_message` | Sends a WhatsApp message to the contact | Template selection, variable mapping, media attachment |
| **Add Tag** | `add_tag` | Applies a tag to the contact | Tag selection (single or multiple) |
| **Remove Tag** | `remove_tag` | Removes a tag from the contact | Tag selection (single or multiple) |
| **Create Deal** | `create_deal` | Creates a new deal in the pipeline | Pipeline, stage, deal name template, value |
| **Wait** | `wait` | Pauses the automation for a specified duration | Duration: minutes, hours, or days |
| **Condition** | `condition` | Branches the automation based on a condition | Field, operator, value → Yes/No paths |

### 12.4 Building an Automation — Step by Step

1. Click **+ New Automation**
2. **Name your automation:** Enter a descriptive name (e.g., "Welcome New Contacts")
3. **Select trigger:** Choose from the 6 trigger types
4. **Configure trigger:** Set the trigger parameters (e.g., which tag, which keywords)
5. **Add steps:** Click **+ Add Step** to add action steps in sequence
6. **Configure each step:** Set the parameters for each action
7. **Review the flow:** The automation builder shows a visual preview of the trigger → steps sequence
8. **Save:** Click **Save Automation** (saves as inactive by default)
9. **Activate:** Toggle the status switch to **Active** when ready

### 12.5 Conditions and Branching

The **Condition** step type enables branching logic within automations:

```
Trigger: Message Received
  │
  ▼
Condition: Does contact have tag "VIP"?
  │
  ├── YES → Send VIP greeting template
  │         Add tag "vip-greeted"
  │
  └── NO  → Send standard greeting template
              Add tag "standard-greeted"
```

**Available Condition Operators:**

| Operator | Description | Example |
|----------|-------------|----------|
| `equals` | Exact match | Tag equals "VIP" |
| `not_equals` | Does not match | Segment not equals "Lost" |
| `contains` | Contains substring | Message contains "price" |
| `not_contains` | Does not contain | Message not contains "unsubscribe" |
| `is_empty` | Field has no value | Email is empty |
| `is_not_empty` | Field has a value | Phone is not empty |
| `greater_than` | Numeric comparison | Purchase count greater than 5 |
| `less_than` | Numeric comparison | Days since last purchase less than 30 |

### 12.6 Automation Logs

Every automation execution is logged for debugging and auditing:

1. Click on any automation to view its detail page
2. Click the **Logs** tab
3. Each log entry shows:
   - **Timestamp:** When the automation was triggered
   - **Contact:** Which contact triggered it
   - **Trigger Event:** The specific event that fired
   - **Steps Executed:** Which steps ran successfully
   - **Errors:** Any steps that failed with error details
   - **Duration:** Total execution time

### 12.7 Cron Execution

Scheduled automations run via the cron system:

- The cron endpoint `/api/automations/cron` is called at regular intervals
- It checks all active automations with `scheduled` trigger type
- Automations whose cron expression matches the current time are executed
- The cron endpoint requires the `AUTOMATION_CRON_SECRET` header for authentication
- See Section 32 for full cron job documentation

### 12.8 Duplicate Automation

To create a copy of an existing automation:

1. Click the **⋮ menu** on the automation card
2. Select **Duplicate**
3. A copy is created with the name "[Original Name] (Copy)"
4. The copy is created in **Inactive** status
5. Edit the copy to customize it before activating

### 12.9 Enable/Disable

Toggle automations on and off without deleting them:

- **Active (green toggle):** Automation is running and will fire on trigger events
- **Inactive (gray toggle):** Automation is paused and will not fire, but configuration is preserved

> **Tip:** Always create and test automations in Inactive status first. Send a test message or create a test contact to verify the automation works correctly before activating it for all contacts.

> **Warning:** Be careful with `message_received` triggers without keyword filters — they will fire on EVERY inbound message, which can cause message loops if the automation sends a reply that triggers another automation.

---

## 13. Visual Flow Builder

The Visual Flow Builder provides a canvas-based interface for creating complex, multi-step conversational sequences. Unlike automations (which are linear trigger → action chains), flows support branching, loops, user input collection, and conditional routing.

**URL:** `/flows`

### 13.1 Canvas Interface

The Flow Builder uses a drag-and-drop canvas powered by React Flow:

```
┌─────────────────────────────────────────────────────────────────┐
│  Flow Name: Customer Onboarding          [Save] [Activate]     │
├─────────────┬───────────────────────────────────────────────────┤
│  Node       │                                                   │
│  Palette    │              CANVAS AREA                          │
│             │                                                   │
│  ┌───────┐  │    ┌─────────┐     ┌─────────┐     ┌─────────┐  │
│  │ Start │  │    │  Start  │────▶│  Send   │────▶│Collect  │  │
│  ├───────┤  │    │         │     │ Message │     │ Input   │  │
│  │ Send  │  │    └─────────┘     └─────────┘     └────┬────┘  │
│  │Message│  │                                         │       │
│  ├───────┤  │                                    ┌────┴────┐  │
│  │Collect│  │                                    │Condition│  │
│  │ Input │  │                                    └─┬────┬──┘  │
│  ├───────┤  │                                      │    │     │
│  │Buttons│  │                              ┌───────┘    └──┐  │
│  ├───────┤  │                              ▼               ▼  │
│  │ List  │  │                         ┌─────────┐   ┌──────┐ │
│  ├───────┤  │                         │Set Tag  │   │ End  │ │
│  │Condit.│  │                         └─────────┘   └──────┘ │
│  ├───────┤  │                                                 │
│  │Set Tag│  │                                                 │
│  ├───────┤  │                                                 │
│  │Handoff│  │                                                 │
│  ├───────┤  │                                                 │
│  │  End  │  │                                                 │
│  └───────┘  │                                                 │
└─────────────┴───────────────────────────────────────────────────┘
```

**Canvas Controls:**
- **Zoom:** Scroll wheel or pinch gesture
- **Pan:** Click and drag on empty canvas area
- **Select:** Click on a node to select and configure it
- **Connect:** Drag from a node's output handle to another node's input handle
- **Delete:** Select a node or edge and press Delete key
- **Undo/Redo:** Ctrl+Z / Ctrl+Shift+Z

### 13.2 Node Types

| Node Type | Icon | Purpose | Configuration |
|-----------|------|---------|---------------|
| **Start** | 🟢 | Entry point of the flow. Every flow must have exactly one Start node. | Trigger conditions (optional) |
| **Send Message** | 💬 | Sends a WhatsApp message to the contact. | Message text, media attachment, template selection |
| **Collect Input** | 📝 | Waits for the contact to reply and stores their response. | Variable name to store response, timeout duration, validation rules |
| **Send Buttons** | 🔘 | Sends a message with up to 3 interactive button options. | Button labels (max 3), message text. Each button creates a separate output path. |
| **Send List** | 📋 | Sends a message with a list menu of up to 10 options. | Section headers, item titles and descriptions. Selected item routes to corresponding output. |
| **Condition** | 🔀 | Evaluates a condition and routes to Yes or No path. | Field, operator, value (same operators as automation conditions) |
| **Set Tag** | 🏷️ | Adds or removes a tag on the contact. | Tag name, action (add/remove) |
| **Handoff** | 👤 | Transfers the conversation to a human agent and exits the flow. | Assignment rules (specific agent, round-robin, or unassigned) |
| **End** | 🔴 | Terminates the flow. A flow can have multiple End nodes for different paths. | Optional completion tag, status message |

### 13.3 Edges and Connections

Edges are the arrows connecting nodes:

- **Standard Edge:** Connects one node's output to another node's input (solid arrow)
- **Conditional Edge:** Connects from a Condition node's Yes or No output (labeled arrow)
- **Button Edge:** Connects from a Send Buttons node's specific button output (labeled with button text)
- **List Edge:** Connects from a Send List node's specific item output (labeled with item title)

**Connection Rules:**
- Every node (except End) must have at least one outgoing edge
- Every node (except Start) must have at least one incoming edge
- Condition nodes must have both Yes and No outgoing edges
- Button nodes must have one outgoing edge per button
- Loops are allowed (an edge can connect back to a previous node) but must include a Collect Input or Wait to prevent infinite loops

### 13.4 Validation Rules

Before a flow can be activated, it must pass validation:

| Rule | Description |
|------|-------------|
| **Single Start** | Exactly one Start node must exist |
| **At Least One End** | At least one End node must exist |
| **All Nodes Connected** | Every node must be reachable from the Start node |
| **No Orphan Nodes** | No nodes can exist without connections |
| **Condition Completeness** | All Condition nodes must have both Yes and No paths |
| **Button Completeness** | All Send Buttons nodes must have edges for every button |
| **No Empty Messages** | Send Message nodes must have content |
| **Variable Names Unique** | Collect Input variable names must be unique within the flow |

Validation errors are displayed as red badges on the affected nodes with descriptive error messages.

### 13.5 Activation and Deactivation

- **Draft:** Flow is being designed, not active. Can be edited freely.
- **Active:** Flow is live and will execute when triggered. Editing is restricted (must deactivate first).
- **Deactivated:** Flow was previously active but is now paused. Contacts currently in the flow will complete their current step but no new contacts will enter.

To activate:
1. Ensure the flow passes all validation rules
2. Click **Activate** in the top-right corner
3. Confirm in the dialog
4. The flow status changes to Active (green badge)

### 13.6 Flow Runs Tracking

The **Runs** tab on each flow shows execution history:

| Column | Description |
|--------|-------------|
| **Contact** | The contact who entered the flow |
| **Started** | When the contact entered the flow |
| **Current Node** | Which node the contact is currently at (if still in progress) |
| **Status** | In Progress, Completed, Failed, Handed Off |
| **Completed** | When the contact exited the flow |
| **Steps Taken** | Number of nodes traversed |
| **Responses** | Collected input values |

### 13.7 Flow Templates

The CRM includes pre-built flow templates to accelerate development:

| Template | Nodes | Purpose |
|----------|-------|---------|
| **Customer Onboarding** | 80 | Comprehensive intake questionnaire for new clients |
| **Product Recommendation** | 12 | Guided product selection based on customer preferences |
| **Appointment Booking** | 8 | Collect date, time, and service preferences for booking |
| **Feedback Collection** | 10 | Structured feedback with rating and open-ended questions |
| **FAQ Bot** | 15 | Common questions with button-based navigation |

To use a template:
1. Click **+ New Flow**
2. Select **Start from Template**
3. Choose a template
4. The template is loaded onto the canvas for customization
5. Edit nodes, add/remove steps, and customize messages
6. Save and activate when ready

---

## 14. AI Chatbot

The AI Chatbot provides automated, intelligent responses to customer messages using large language models (LLMs) accessed through the OpenRouter API. It can handle common inquiries, answer FAQs, and seamlessly hand off to human agents when needed.

**URL:** `/ai-chatbot`

### 14.1 Configuration Page

The AI Chatbot configuration page has several sections:

#### Enable/Disable Toggle

A master toggle at the top of the page controls whether the AI chatbot is active:
- **Enabled (green):** The chatbot processes incoming messages and responds automatically
- **Disabled (gray):** All messages go directly to the human inbox without AI processing

#### Model Selection

The chatbot uses OpenRouter to access various LLM models:

| Setting | Description | Default |
|---------|-------------|----------|
| **Model** | The LLM model to use for generating responses | `openai/gpt-4o-mini` |
| **Temperature** | Controls response creativity (0 = deterministic, 1 = creative) | `0.7` |
| **Max Tokens** | Maximum length of generated responses | `500` |
| **Confidence Threshold** | Minimum confidence score to send a response (0-1) | `0.7` |

**Available Models via OpenRouter:**

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| `openai/gpt-4o-mini` | Fast | Good | Low | General customer service, FAQ responses |
| `openai/gpt-4o` | Medium | Excellent | Medium | Complex inquiries, nuanced responses |
| `anthropic/claude-3.5-sonnet` | Medium | Excellent | Medium | Detailed explanations, empathetic responses |
| `anthropic/claude-3-haiku` | Fast | Good | Low | Quick responses, high-volume accounts |
| `google/gemini-pro` | Fast | Good | Low | Multilingual support, general queries |

> **Tip:** Start with `gpt-4o-mini` for cost efficiency. Upgrade to `gpt-4o` or `claude-3.5-sonnet` if response quality needs improvement.

#### System Prompt

The system prompt defines the chatbot's personality, knowledge boundaries, and behavior rules:

```
You are a helpful customer service assistant for [Business Name].
You help customers with questions about our products, services, and policies.

Rules:
- Always be polite and professional
- If you don't know the answer, say so and offer to connect them with a human agent
- Never make up information about products or prices
- Respond in the same language the customer uses
- Keep responses concise (2-3 sentences max)
- If the customer is angry or frustrated, acknowledge their feelings and escalate to a human
```

> **Warning:** The system prompt is critical for chatbot quality. A poorly written system prompt leads to irrelevant, inaccurate, or inappropriate responses. Always test thoroughly after changing the system prompt.

### 14.2 Knowledge Base Management

The knowledge base is a collection of FAQ entries that the chatbot references when generating responses. It provides grounded, accurate information specific to the business.

#### Adding FAQ Entries

1. Navigate to **AI Chatbot → Knowledge Base**
2. Click **+ Add Entry**
3. Fill in:
   - **Question:** The customer question or topic (e.g., "What are your opening hours?")
   - **Answer:** The accurate response (e.g., "We are open Monday to Saturday, 9am to 6pm.")
   - **Category:** Optional category for organization (e.g., "Hours", "Pricing", "Products")
   - **Keywords:** Optional keywords to improve matching (e.g., "hours, open, close, time")
4. Click **Save**

#### Bulk Import

Import multiple FAQ entries at once:

1. Click **Import** on the Knowledge Base page
2. Upload a CSV file with columns: `question`, `answer`, `category`, `keywords`
3. Review the import preview
4. Click **Import**

#### How the Knowledge Base Works

1. Customer sends a message
2. The AI engine searches the knowledge base for relevant entries using semantic similarity
3. Matching entries are included in the LLM prompt as context
4. The LLM generates a response grounded in the knowledge base content
5. If the confidence score exceeds the threshold, the response is sent
6. If confidence is below the threshold, the message is routed to a human agent

### 14.3 Test Chat Interface

The Test Chat panel allows you to test the chatbot before deploying it to live conversations:

1. Navigate to **AI Chatbot → Test Chat**
2. Type a test message in the input field
3. The chatbot generates a response using the current configuration
4. Review the response for accuracy, tone, and relevance
5. The test panel also shows:
   - **Confidence Score:** How confident the AI is in its response
   - **Knowledge Base Matches:** Which FAQ entries were referenced
   - **Token Usage:** How many tokens were consumed
   - **Response Time:** How long the response took to generate

### 14.4 Analytics

The AI Chatbot analytics dashboard provides performance metrics:

| Metric | Description |
|--------|-------------|
| **Total Conversations** | Number of conversations handled by the AI chatbot |
| **Average Response Time** | Mean time from customer message to AI response |
| **Handoff Rate** | Percentage of conversations transferred to human agents |
| **Satisfaction Score** | Average customer satisfaction rating (if feedback is collected) |
| **Resolution Rate** | Percentage of conversations resolved without human intervention |
| **Top Questions** | Most frequently asked questions |
| **Knowledge Gaps** | Questions the chatbot couldn't answer (opportunities to add FAQ entries) |

### 14.5 Conversation Logs

All AI chatbot conversations are logged for review and improvement:

1. Navigate to **AI Chatbot → Logs**
2. Each log entry shows:
   - Customer message
   - AI-generated response
   - Confidence score
   - Whether the response was sent or handed off
   - Knowledge base entries referenced
   - Timestamp and contact details
3. Filter logs by: date range, confidence level, handoff status, contact

### 14.6 Business Hours Configuration

Configure when the AI chatbot is active:

| Setting | Description |
|---------|-------------|
| **Always On** | Chatbot responds 24/7 |
| **Business Hours Only** | Chatbot responds only during configured hours; outside hours, messages go to inbox |
| **After Hours Only** | Chatbot responds only outside business hours; during hours, human agents handle messages |

Business hours are configured per day of the week with start and end times.

### 14.7 Nigerian Pidgin Support

The AI chatbot includes built-in support for Nigerian Pidgin English, which is widely used in informal WhatsApp conversations:

- The system prompt can include Pidgin language instructions
- The knowledge base can contain Pidgin question/answer pairs
- The AI model detects when a customer writes in Pidgin and responds accordingly
- Common Pidgin phrases are recognized: "wetin", "abeg", "how far", "no wahala", "e don tey", "I wan know"

**Example Pidgin Interaction:**
```
Customer: "Abeg, wetin be your price for the hair treatment?"
AI: "No wahala! Our premium hair treatment na ₦15,000. E include wash, treatment, and styling. You wan book appointment?"
```

### 14.8 Human Handoff Triggers

The chatbot automatically transfers conversations to human agents when:

| Trigger | Description |
|---------|-------------|
| **Low Confidence** | AI confidence score falls below the configured threshold |
| **Negative Sentiment** | Customer message contains anger, frustration, or complaint keywords |
| **Explicit Request** | Customer asks to speak to a human ("talk to agent", "speak to someone") |
| **Complex Query** | Question requires account-specific information the AI doesn't have |
| **Repeated Questions** | Customer asks the same question multiple times (indicating dissatisfaction) |
| **Payment/Billing** | Questions about payments, refunds, or billing are always escalated |
| **Complaint Keywords** | Messages containing words like "complaint", "manager", "refund", "terrible" |

When a handoff occurs:
1. The AI sends a transition message: "I'm connecting you with a team member who can help further. Please hold on!"
2. The conversation is flagged as "Needs Attention" in the inbox
3. The assigned agent (or next available agent) receives a notification
4. The full AI conversation history is preserved for the agent's context



## 15. E-Commerce Integration

The CRM integrates with Shopify and WooCommerce to synchronize customer data, track orders, detect cart abandonment, and trigger automated recovery campaigns.

**URL:** `/ecommerce`

### 15.1 Shopify Setup

#### Prerequisites
- Active Shopify store with a paid plan
- Shopify Admin API access (Custom App or Private App)
- Store URL in format: `your-store.myshopify.com`

#### Configuration Steps

1. Navigate to **E-Commerce → Shopify**
2. Click **Connect Shopify Store**
3. Enter the following credentials:

| Field | Where to Find It | Example |
|-------|------------------|----------|
| **Store URL** | Your Shopify admin URL | `my-store.myshopify.com` |
| **API Key** | Shopify Admin → Apps → Develop Apps → API Credentials | `shpat_abc123...` |
| **API Secret** | Same location as API Key | `shpss_def456...` |
| **Access Token** | Generated when installing the custom app | `shpat_xyz789...` |

4. Click **Test Connection** — verify the status shows "Connected" (green)
5. Click **Save**

#### Webhook Configuration

After connecting, configure Shopify webhooks to send real-time events to the CRM:

1. In Shopify Admin, navigate to **Settings → Notifications → Webhooks**
2. Add the following webhooks:

| Event | Webhook URL | Format |
|-------|------------|--------|
| **Order Created** | `https://crm.marketing4effect.com/api/webhooks/shopify` | JSON |
| **Order Updated** | `https://crm.marketing4effect.com/api/webhooks/shopify` | JSON |
| **Order Cancelled** | `https://crm.marketing4effect.com/api/webhooks/shopify` | JSON |
| **Cart Created** | `https://crm.marketing4effect.com/api/webhooks/shopify` | JSON |
| **Cart Updated** | `https://crm.marketing4effect.com/api/webhooks/shopify` | JSON |
| **Customer Created** | `https://crm.marketing4effect.com/api/webhooks/shopify` | JSON |
| **Customer Updated** | `https://crm.marketing4effect.com/api/webhooks/shopify` | JSON |

3. Copy the webhook signing secret and enter it in the CRM's Shopify settings for payload verification

#### What Gets Synced

| Shopify Data | CRM Equivalent | Sync Direction |
|-------------|----------------|----------------|
| Customers | Contacts | Shopify → CRM |
| Orders | Purchase History | Shopify → CRM |
| Products | Product Catalog | Shopify → CRM |
| Cart Events | Cart Abandonment Tracking | Shopify → CRM |
| Order Status | Deal Stage Updates | Shopify → CRM |

### 15.2 WooCommerce Setup

#### Prerequisites
- Active WordPress site with WooCommerce plugin installed
- WooCommerce REST API enabled
- Consumer Key and Consumer Secret generated

#### Configuration Steps

1. Navigate to **E-Commerce → WooCommerce**
2. Click **Connect WooCommerce Store**
3. Enter the following credentials:

| Field | Where to Find It | Example |
|-------|------------------|----------|
| **Store URL** | Your WordPress site URL | `https://my-store.com` |
| **Consumer Key** | WooCommerce → Settings → Advanced → REST API | `ck_abc123...` |
| **Consumer Secret** | Same location as Consumer Key | `cs_def456...` |

4. Click **Test Connection** — verify the status shows "Connected" (green)
5. Click **Save**

#### Webhook Configuration

1. In WordPress Admin, navigate to **WooCommerce → Settings → Advanced → Webhooks**
2. Add the following webhooks:

| Name | Topic | Delivery URL | Status |
|------|-------|-------------|--------|
| Order Created | Order created | `https://crm.marketing4effect.com/api/webhooks/woocommerce` | Active |
| Order Updated | Order updated | `https://crm.marketing4effect.com/api/webhooks/woocommerce` | Active |
| Customer Created | Customer created | `https://crm.marketing4effect.com/api/webhooks/woocommerce` | Active |
| Customer Updated | Customer updated | `https://crm.marketing4effect.com/api/webhooks/woocommerce` | Active |

3. Set the Secret field to match the webhook secret configured in the CRM

### 15.3 Cart Abandonment Tracking and Recovery

When e-commerce integration is active, the CRM automatically tracks cart abandonment:

**Detection Flow:**
1. Customer adds items to cart on the e-commerce store
2. Shopify/WooCommerce sends a cart event webhook to the CRM
3. CRM creates a cart record linked to the contact (matched by email or phone)
4. If no order is placed within 1 hour, the cart is flagged as "abandoned"
5. The cart-abandonment campaign (Template 5) is triggered automatically

**Cart Abandonment Dashboard:**

| Metric | Description |
|--------|-------------|
| **Active Carts** | Carts currently in progress (not yet abandoned) |
| **Abandoned Carts** | Carts flagged as abandoned (1+ hour, no order) |
| **Recovery Rate** | Percentage of abandoned carts that converted to orders |
| **Recovered Revenue** | Total value of orders from recovered carts |
| **Average Cart Value** | Mean value of abandoned carts |

### 15.4 Order Synchronization

Completed orders are automatically synced as purchase records:

1. Order webhook received from Shopify/WooCommerce
2. CRM matches the customer to an existing contact (by email or phone)
3. If no matching contact exists, a new contact is created
4. Order line items are recorded as purchase history entries
5. Contact's recency score is updated based on the new purchase date
6. If a deal exists for this contact, the deal stage may be updated

### 15.5 Catalog Sync

Product catalogs are synchronized between the e-commerce platform and the CRM:

- **Initial Sync:** When first connected, all products are imported from the store
- **Ongoing Sync:** New products and updates are synced via webhooks
- **Sync Direction:** One-way (e-commerce → CRM). Product changes in the CRM do not push back to the store.

### 15.6 Integration Status Indicators

The E-Commerce page displays connection status for each platform:

| Status | Indicator | Meaning |
|--------|-----------|----------|
| **Connected** | 🟢 Green badge | Integration is active and receiving webhooks |
| **Disconnected** | 🔴 Red badge | Integration credentials are invalid or expired |
| **Pending** | 🟡 Yellow badge | Connection is being established or tested |
| **Error** | ⚠️ Warning badge | Webhook errors detected, check logs |

---

## 16. QR Code Generator

The QR Code Generator creates customizable QR codes that open a WhatsApp conversation with the business when scanned.

**URL:** `/qr-codes`

### 16.1 QR Code Templates

Pre-built templates for common use cases:

| Template | Pre-filled Message | Use Case |
|----------|-------------------|----------|
| **General Inquiry** | "Hi! I'd like to learn more about your services." | Business cards, brochures |
| **Product Inquiry** | "Hi! I'm interested in [Product Name]." | Product packaging, shelf tags |
| **Support Request** | "Hi! I need help with an order." | Receipts, support desk |
| **Feedback** | "Hi! I'd like to share feedback about my experience." | In-store, post-service |
| **Appointment** | "Hi! I'd like to book an appointment." | Salon, clinic, office |
| **Custom** | User-defined message | Any custom scenario |

### 16.2 Customization Options

| Option | Description | Values |
|--------|-------------|--------|
| **Foreground Color** | Color of the QR code pattern | Any hex color (default: #000000) |
| **Background Color** | Color behind the QR code | Any hex color (default: #FFFFFF) |
| **Logo** | Center logo overlay | Upload PNG/SVG (recommended 100x100px) |
| **Size** | Output dimensions | 256px, 512px, 1024px, 2048px |
| **Error Correction** | Redundancy level (higher = more resilient to damage) | Low, Medium, Quartile, High |
| **Border** | White border around the QR code | None, Thin, Medium, Thick |

### 16.3 Pre-filled Message

Each QR code encodes a WhatsApp URL with an optional pre-filled message:

```
https://wa.me/2348012345678?text=Hi!%20I%27d%20like%20to%20learn%20more%20about%20your%20services.
```

When scanned:
1. The customer's WhatsApp opens
2. A new conversation with the business number is created
3. The pre-filled message appears in the text input (customer can edit before sending)
4. When the customer sends the message, it arrives in the CRM Inbox

### 16.4 Download Formats

| Format | Best For | Resolution |
|--------|----------|------------|
| **PNG** | Digital use (websites, social media, email) | Raster, configurable size |
| **SVG** | Print use (business cards, posters, packaging) | Vector, infinitely scalable |

### 16.5 Use Cases

| Location | Application | Recommended Template |
|----------|------------|---------------------|
| **In-Store** | Counter display, window sticker | General Inquiry |
| **Business Cards** | Personal networking | General Inquiry |
| **Product Packaging** | Product labels, boxes | Product Inquiry |
| **Receipts** | Post-purchase engagement | Feedback |
| **Flyers/Brochures** | Marketing materials | Custom |
| **Social Media** | Profile links, posts | General Inquiry |
| **Email Signatures** | Professional communication | General Inquiry |
| **Event Banners** | Trade shows, conferences | Custom |

---

## 17. WhatsApp Flows

WhatsApp Flows are Meta's native in-chat form feature that allows businesses to create structured, interactive forms within the WhatsApp conversation interface.

**URL:** `/whatsapp-flows`

### 17.1 What Are WhatsApp Flows?

Unlike regular WhatsApp messages (text, buttons, lists), Flows present a **native form interface** within WhatsApp. Customers interact with text inputs, dropdowns, radio buttons, checkboxes, and date pickers — all without leaving the chat.

**Key Differences from Regular Messages:**

| Feature | Regular Messages | WhatsApp Flows |
|---------|-----------------|----------------|
| Input Types | Text replies, button taps | Text fields, dropdowns, radio buttons, checkboxes, date pickers |
| Data Structure | Unstructured text | Structured form data (JSON) |
| Validation | None (manual parsing) | Built-in field validation |
| Multi-Step | Requires multiple messages | Single form with multiple screens |
| User Experience | Conversational | Form-like, familiar |

### 17.2 JSON Editor

Flows are defined using a JSON schema that describes the form structure:

```json
{
  "version": "3.0",
  "screens": [
    {
      "id": "WELCOME",
      "title": "Customer Feedback",
      "data": {},
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "TextHeading",
            "text": "We value your feedback!"
          },
          {
            "type": "TextInput",
            "name": "customer_name",
            "label": "Your Name",
            "required": true
          },
          {
            "type": "RadioButtonsGroup",
            "name": "rating",
            "label": "How would you rate us?",
            "data-source": [
              {"id": "5", "title": "Excellent"},
              {"id": "4", "title": "Good"},
              {"id": "3", "title": "Average"},
              {"id": "2", "title": "Poor"},
              {"id": "1", "title": "Very Poor"}
            ]
          },
          {
            "type": "TextArea",
            "name": "comments",
            "label": "Additional Comments"
          },
          {
            "type": "Footer",
            "label": "Submit",
            "on-click-action": {
              "name": "complete",
              "payload": {}
            }
          }
        ]
      }
    }
  ]
}
```

The CRM provides a JSON editor with syntax highlighting, validation, and preview.

### 17.3 Built-in Templates

| Template | Screens | Fields | Purpose |
|----------|---------|--------|---------|
| **Customer Feedback** | 1 | Name, Rating, Comments | Post-service satisfaction survey |
| **Appointment Booking** | 2 | Name, Service, Date, Time, Notes | Schedule appointments |
| **Product Inquiry** | 1 | Name, Product Interest, Budget, Timeline | Qualify product leads |
| **Event Registration** | 2 | Name, Email, Phone, Attendees, Dietary Needs | Event sign-ups |
| **Customer Onboarding** | 3 | Business Name, Industry, Size, Goals, Contact Info | New client intake |

### 17.4 Publishing Flows to Meta

1. Create or edit the flow JSON in the editor
2. Click **Validate** to check for schema errors
3. Click **Preview** to see how the flow will appear in WhatsApp
4. Click **Publish to Meta** to submit the flow to WhatsApp
5. Meta reviews and approves the flow (usually within minutes for simple flows)
6. Once approved, the flow can be sent to contacts

### 17.5 Sending Flows to Contacts

Flows can be sent through:
- **Inbox:** Click the Flow icon in the message input area, select a published flow
- **Campaigns:** Use the `whatsapp-flow-survey` campaign template
- **Automations:** Add a "Send Flow" step in an automation sequence
- **Broadcasts:** Include a flow as the broadcast content

### 17.6 Flow Response Collection

When a customer completes a flow:
1. The response data is sent to the CRM via webhook
2. Responses are stored as structured JSON linked to the contact
3. Individual field values can be mapped to contact custom fields
4. Responses appear in the contact's activity log
5. Automation triggers can fire based on flow completion

---

## 18. Click-to-WhatsApp Ad Leads (CTWA)

CTWA (Click-to-WhatsApp) ads are Facebook and Instagram ad formats that open a WhatsApp conversation when clicked. The CRM tracks and manages leads generated through these ads.

**URL:** `/ctwa`

### 18.1 What Is CTWA?

Click-to-WhatsApp ads appear in Facebook and Instagram feeds. When a user clicks the ad's CTA button ("Send Message", "Chat Now"), their WhatsApp opens with a pre-filled message directed to the business's WhatsApp number.

**CTWA Flow:**
```
Facebook/Instagram Ad → User Clicks CTA → WhatsApp Opens → 
Pre-filled Message Sent → CRM Receives Message → Lead Created → 
Nurture Campaign Triggered
```

### 18.2 Tracking Dashboard

The CTWA dashboard provides real-time visibility into ad lead performance:

| Widget | Metrics Displayed |
|--------|-------------------|
| **Lead Volume** | Total leads today, this week, this month, all time |
| **Conversion Funnel** | Lead → Engaged → Qualified → Converted |
| **Source Breakdown** | Leads by ad campaign, ad set, and ad creative |
| **Time Distribution** | Lead arrival times (hourly heatmap) |
| **Response Time** | Average time to first response for CTWA leads |

### 18.3 Lead Statistics

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Total Leads** | All contacts created from CTWA ads | Count of contacts with `ctwa` source tag |
| **Conversion Rate** | Percentage of leads that became customers | (Converted Leads / Total Leads) × 100% |
| **Cost Per Lead** | Average ad spend per lead (if ad cost data is available) | Total Ad Spend / Total Leads |
| **Lead Quality Score** | Average engagement score of CTWA leads | Mean of lead interaction scores |
| **Time to Conversion** | Average days from lead creation to first purchase | Mean days between contact creation and first purchase |

### 18.4 Lead Management

CTWA leads are automatically:
1. Created as contacts with the tag `ctwa-lead`
2. Tagged with the source ad campaign name (if available from the referral URL)
3. Assigned to the default pipeline with a "New Lead" deal
4. Enrolled in the `ad-lead-nurture` campaign (if active)
5. Flagged in the Inbox with a CTWA badge for priority handling

### 18.5 Integration with Ad Lead Nurture Campaign

The `ad-lead-nurture` campaign template (Template 13) is specifically designed for CTWA leads:

1. **Instant Response:** Automated welcome within 5 minutes of lead arrival
2. **Qualification:** Button-based questions to understand the lead's needs
3. **Value Delivery:** Relevant content based on the ad they clicked
4. **Offer:** Special incentive for ad leads
5. **Follow-Up:** Persistent but respectful follow-up sequence

See Section 11 (Template 13) for full campaign details.

---

## 19. Sentiment Analysis

The Sentiment Analysis module uses AI to detect the emotional tone of customer messages, enabling proactive customer service and automated escalation for unhappy customers.

**URL:** `/sentiment`

### 19.1 AI-Powered Sentiment Analysis

Every inbound message is analyzed by the AI engine to determine its sentiment:

**Analysis Process:**
1. Customer sends a WhatsApp message
2. The message text is sent to the AI model (via OpenRouter)
3. The AI classifies the sentiment as Positive, Neutral, or Negative
4. A confidence score (0-1) is assigned
5. The sentiment is stored with the message record
6. The contact's overall sentiment profile is updated

### 19.2 Keyword Detection

In addition to AI-based analysis, the system uses keyword detection for common sentiment indicators:

**Positive Keywords:** thank you, excellent, amazing, great, wonderful, love it, perfect, happy, satisfied, well done, God bless, you try

**Negative Keywords:** terrible, awful, worst, angry, frustrated, disappointed, complaint, refund, unacceptable, rubbish, useless, nonsense, scam

**Escalation Keywords:** manager, supervisor, lawyer, sue, report, FCCPC, consumer protection, social media, expose

### 19.3 Nigerian Pidgin Support

The sentiment engine recognizes Nigerian Pidgin expressions:

| Pidgin Expression | Sentiment | English Equivalent |
|------------------|-----------|--------------------|
| "E sweet me" | Positive | I'm pleased |
| "You try well well" | Positive | You did very well |
| "No wahala" | Positive/Neutral | No problem |
| "God go bless you" | Positive | God will bless you |
| "E no good at all" | Negative | It's not good at all |
| "Na wa o" | Negative | This is unacceptable |
| "Wetin be dis rubbish" | Negative | What is this nonsense |
| "I no happy" | Negative | I'm not happy |
| "Abeg help me" | Neutral/Negative | Please help me |
| "E don tey" | Negative | It's been too long |
| "I wan talk to oga" | Escalation | I want to speak to the boss |

### 19.4 Sentiment Badges

Sentiment is displayed throughout the CRM using color-coded badges:

| Badge | Color | Sentiment | Meaning |
|-------|-------|-----------|----------|
| 😊 | Green | **Positive** | Customer is happy, satisfied, or expressing gratitude |
| 😐 | Gray | **Neutral** | Customer is asking questions or making neutral statements |
| 😟 | Red | **Negative** | Customer is unhappy, frustrated, or complaining |

Badges appear on:
- Individual messages in the Inbox
- Contact cards in the contact list
- Contact sidebar in the Inbox
- Sentiment dashboard

### 19.5 Sentiment Dashboard

The Sentiment page displays aggregate sentiment analytics:

| Chart/Widget | Description |
|-------------|-------------|
| **Sentiment Distribution** | Donut chart showing % positive, neutral, negative |
| **Sentiment Trend** | Line chart showing sentiment over time (daily/weekly/monthly) |
| **Negative Sentiment Alerts** | List of recent negative sentiment messages requiring attention |
| **Top Positive Contacts** | Contacts with consistently positive sentiment |
| **Top Negative Contacts** | Contacts with recurring negative sentiment (churn risk) |
| **Sentiment by Tag** | Average sentiment broken down by contact tags |
| **Sentiment by Branch** | Average sentiment per branch location |

### 19.6 Auto-Escalation for Negative Sentiment

When negative sentiment is detected:

1. The message is flagged with a red sentiment badge
2. If the sentiment confidence score exceeds 0.8, the conversation is automatically:
   - Marked as "High Priority" in the Inbox
   - Assigned to a senior agent or manager (if configured)
   - Tagged with `negative-sentiment`
3. If the `sentiment-recovery` campaign is active, the contact is enrolled
4. A notification is sent to the account admin
5. The event is logged in the sentiment analytics

### 19.7 Sentiment Recovery Campaign Integration

The sentiment analysis module integrates directly with the `sentiment-recovery` campaign template (Template 14):

- Negative sentiment detection → Automatic campaign enrollment
- Recovery sequence: Acknowledgment → Escalation → Resolution → Follow-up → Compensation
- See Section 11 (Template 14) for full campaign details



## 20. Multi-Branch Management

The Multi-Branch system allows businesses with multiple locations to manage contacts, conversations, and metrics separately for each branch while maintaining a unified view at the account level.

**URL:** `/settings/branches` (configuration) — Branch filters available across all views

### 20.1 Creating Branches

1. Navigate to **Settings → Branches**
2. Click **+ Add Branch**
3. Fill in the branch details:

| Field | Required | Description | Example |
|-------|----------|-------------|----------|
| **Branch Name** | ✅ | Unique name for the branch | "Ikeja Branch" |
| **Address** | Optional | Physical address | "15 Allen Avenue, Ikeja, Lagos" |
| **Phone** | Optional | Branch phone number | "+234 801 234 5678" |
| **Manager** | Optional | Assigned branch manager (team member) | "Adaeze Okafor" |
| **Status** | ✅ | Active or Inactive | Active |

4. Click **Save**
5. The branch is immediately available for contact assignment and filtering

### 20.2 Assigning Contacts to Branches

Contacts can be assigned to branches in several ways:

| Method | How It Works |
|--------|-------------|
| **Manual Assignment** | Edit a contact → Select branch from dropdown |
| **CSV Import** | Include a `branch` column in the import CSV |
| **Automation** | Use a "Set Branch" step in automations |
| **Bulk Action** | Select multiple contacts → Actions → Assign Branch |
| **API** | Set the `branch_id` field via the API |

> **Note:** A contact can only belong to one branch at a time. Changing a contact's branch moves them entirely — their conversation history, deals, and tags travel with them.

### 20.3 Branch-Level Metrics

Each branch has its own performance metrics accessible from the Dashboard:

| Metric | Description |
|--------|-------------|
| **Total Contacts** | Number of contacts assigned to the branch |
| **Active Conversations** | Open conversations for branch contacts |
| **Messages Sent/Received** | Message volume for the branch |
| **Campaign Performance** | Campaign metrics filtered to branch contacts |
| **Deal Pipeline** | Deals associated with branch contacts |
| **Response Time** | Average response time for branch conversations |
| **Sentiment Score** | Average sentiment for branch contacts |

### 20.4 Branch Filtering Across All Views

A branch filter dropdown appears at the top of every major view:

| View | Branch Filter Effect |
|------|---------------------|
| **Dashboard** | All metric cards and charts filter to selected branch |
| **Inbox** | Only conversations from branch contacts are shown |
| **Contacts** | Contact list filters to branch members |
| **Deals** | Pipeline shows only deals linked to branch contacts |
| **Campaigns** | Campaign metrics filter to branch audience |
| **Broadcasts** | Audience selection can filter by branch |
| **Analytics** | All analytics charts filter to branch data |
| **Sentiment** | Sentiment dashboard filters to branch contacts |

**Filter Options:**
- **All Branches:** Shows data across all branches (default)
- **[Specific Branch]:** Shows data for only the selected branch
- **Unassigned:** Shows contacts not assigned to any branch

---

## 21. Team Management

The Team Management system controls who has access to the CRM account and what they can do. It supports role-based access control (RBAC) with four distinct roles.

**URL:** `/settings/members`

### 21.1 Inviting Members

1. Navigate to **Settings → Members & Invitations**
2. Click **+ Invite Member**
3. Enter the invitee's email address
4. Select a role (Admin, Agent, or Viewer)
5. Optionally assign to a specific branch
6. Click **Send Invitation**
7. The invitee receives an email with a link to accept the invitation
8. Upon acceptance, they create a password and gain access to the account

> **Note:** Invitations expire after 7 days. If not accepted, you can resend or cancel the invitation from the Members page.

### 21.2 Role Assignment

Four roles are available, each with different permission levels:

| Role | Description | Typical User |
|------|-------------|-------------|
| **Owner** | Full access to everything, including billing and account deletion | Business owner, CEO |
| **Admin** | Full access except billing and account deletion | Operations manager, senior staff |
| **Agent** | Can manage contacts, conversations, and campaigns | Sales rep, customer service agent |
| **Viewer** | Read-only access to dashboards and reports | Stakeholder, consultant, intern |

### 21.3 Permission Matrix

| Feature | Owner | Admin | Agent | Viewer |
|---------|-------|-------|-------|--------|
| **Dashboard** | ✅ View | ✅ View | ✅ View | ✅ View |
| **Inbox — View Messages** | ✅ | ✅ | ✅ | ✅ |
| **Inbox — Send Messages** | ✅ | ✅ | ✅ | ❌ |
| **Contacts — View** | ✅ | ✅ | ✅ | ✅ |
| **Contacts — Create/Edit** | ✅ | ✅ | ✅ | ❌ |
| **Contacts — Delete** | ✅ | ✅ | ❌ | ❌ |
| **Contacts — Import/Export** | ✅ | ✅ | ❌ | ❌ |
| **Tags — Manage** | ✅ | ✅ | ✅ | ❌ |
| **Deals — View** | ✅ | ✅ | ✅ | ✅ |
| **Deals — Create/Edit** | ✅ | ✅ | ✅ | ❌ |
| **Deals — Delete** | ✅ | ✅ | ❌ | ❌ |
| **Campaigns — View** | ✅ | ✅ | ✅ | ✅ |
| **Campaigns — Create/Edit** | ✅ | ✅ | ✅ | ❌ |
| **Campaigns — Activate/Pause** | ✅ | ✅ | ❌ | ❌ |
| **Campaigns — Delete** | ✅ | ✅ | ❌ | ❌ |
| **Broadcasts — View** | ✅ | ✅ | ✅ | ✅ |
| **Broadcasts — Create/Send** | ✅ | ✅ | ✅ | ❌ |
| **Automations — View** | ✅ | ✅ | ✅ | ✅ |
| **Automations — Create/Edit** | ✅ | ✅ | ❌ | ❌ |
| **Automations — Activate** | ✅ | ✅ | ❌ | ❌ |
| **Flows — View** | ✅ | ✅ | ✅ | ✅ |
| **Flows — Create/Edit** | ✅ | ✅ | ❌ | ❌ |
| **Flows — Activate** | ✅ | ✅ | ❌ | ❌ |
| **AI Chatbot — Configure** | ✅ | ✅ | ❌ | ❌ |
| **AI Chatbot — Knowledge Base** | ✅ | ✅ | ✅ | ❌ |
| **E-Commerce — Configure** | ✅ | ✅ | ❌ | ❌ |
| **QR Codes — Create** | ✅ | ✅ | ✅ | ❌ |
| **WhatsApp Flows — Create** | ✅ | ✅ | ❌ | ❌ |
| **Sentiment — View** | ✅ | ✅ | ✅ | ✅ |
| **Settings — Profile** | ✅ | ✅ | ✅ (own) | ✅ (own) |
| **Settings — WhatsApp Config** | ✅ | ✅ | ❌ | ❌ |
| **Settings — Email Config** | ✅ | ✅ | ❌ | ❌ |
| **Settings — Templates** | ✅ | ✅ | ❌ | ❌ |
| **Settings — Members** | ✅ | ✅ | ❌ | ❌ |
| **Settings — Branches** | ✅ | ✅ | ❌ | ❌ |
| **Settings — Custom Fields** | ✅ | ✅ | ❌ | ❌ |
| **Settings — Tags** | ✅ | ✅ | ✅ | ❌ |
| **Settings — Deals** | ✅ | ✅ | ❌ | ❌ |
| **Settings — Recency** | ✅ | ✅ | ❌ | ❌ |
| **Settings — Security** | ✅ | ❌ | ❌ | ❌ |
| **Settings — Appearance** | ✅ | ✅ | ✅ | ✅ |
| **Admin Panel** | ✅ (Super Admin only) | ❌ | ❌ | ❌ |

### 21.4 Removing Members

1. Navigate to **Settings → Members & Invitations**
2. Find the member in the list
3. Click the **⋮ menu** → **Remove Member**
4. Confirm the removal in the dialog
5. The member immediately loses access to the account
6. Their conversation history and actions are preserved in the system logs

> **Warning:** Removing a member is immediate and cannot be undone. The member will need a new invitation to regain access.

### 21.5 Transferring Ownership

The Owner role can be transferred to another team member:

1. Navigate to **Settings → Members & Invitations**
2. Find the target member (must be an existing Admin)
3. Click the **⋮ menu** → **Transfer Ownership**
4. Confirm by entering your password
5. The target member becomes the new Owner
6. You are demoted to Admin role

> **Warning:** Ownership transfer gives the new Owner full control including billing, account deletion, and the ability to remove you. Only transfer to trusted individuals.

### 21.6 Best Practices

1. **Principle of Least Privilege:** Assign the minimum role needed for each team member's responsibilities
2. **Limit Admin Access:** Only operations managers and senior staff should have Admin role
3. **Use Agent Role for Frontline Staff:** Sales reps and customer service agents should use the Agent role
4. **Viewer for Stakeholders:** Give Viewer access to business owners who want to monitor without making changes
5. **Regular Audits:** Review team members quarterly and remove inactive accounts
6. **Branch Assignment:** Assign agents to their specific branch for focused responsibility

---

## 22. Settings Reference

The Settings page provides comprehensive configuration options for every aspect of the CRM. Access Settings from the sidebar gear icon or navigate to `/settings`.

### 22.1 Profile Settings

**URL:** `/settings/profile`

Account-level profile information:

| Setting | Description | Default | Notes |
|---------|-------------|---------|-------|
| **Account Name** | Business name displayed throughout the CRM | Set during registration | Used in message templates as `{{business_name}}` |
| **Email** | Primary account email for notifications | Registration email | Used for system notifications and reports |
| **Currency** | Default currency for deals and revenue | NGN (₦) | Affects all monetary displays |
| **Timezone** | Account timezone for scheduling and timestamps | Africa/Lagos (WAT) | Affects campaign scheduling, cron jobs, and activity logs |
| **Language** | Interface language | English | Currently English only; Pidgin support in AI chatbot |
| **Logo** | Business logo displayed in the sidebar | M4E default | Upload PNG/SVG, recommended 200x200px |

### 22.2 Password Settings

**URL:** `/settings/password`

| Setting | Description |
|---------|-------------|
| **Current Password** | Enter your current password for verification |
| **New Password** | Minimum 8 characters, must include uppercase, lowercase, and number |
| **Confirm Password** | Re-enter the new password |

> **Tip:** Use a password manager to generate and store strong, unique passwords. Never reuse passwords across services.

### 22.3 Appearance Settings

**URL:** `/settings/appearance`

The CRM offers extensive visual customization with 6 dark themes and light/dark mode:

**Mode Toggle:**
- **Light Mode:** Bright backgrounds with dark text
- **Dark Mode:** Dark backgrounds with light text (default for M4E branding)

**Dark Themes:**

| Theme | Primary Color | Accent | Description |
|-------|--------------|--------|-------------|
| **Midnight Indigo** | Deep navy (#1a1a2e) | Champagne Gold (#d4af37) | M4E default — premium, professional |
| **Obsidian** | Pure black (#0a0a0a) | Silver (#c0c0c0) | Minimalist, high contrast |
| **Deep Ocean** | Dark teal (#0d2137) | Aqua (#00d4ff) | Cool, modern, tech-forward |
| **Charcoal** | Dark gray (#1e1e1e) | Amber (#ffb300) | Warm, balanced, easy on eyes |
| **Forest Night** | Dark green (#0d1f0d) | Emerald (#50c878) | Natural, calming |
| **Royal Purple** | Deep purple (#1a0a2e) | Lavender (#b388ff) | Bold, creative |

### 22.4 WhatsApp Configuration

**URL:** `/settings/whatsapp`

This is the most critical settings panel — it connects the CRM to the WhatsApp Business API.

| Setting | Description | Where to Find It |
|---------|-------------|------------------|
| **Phone Number ID** | The WhatsApp phone number identifier | Meta Business Suite → WhatsApp → Phone Numbers |
| **Business Account ID** | The WhatsApp Business Account (WABA) ID | Meta Business Suite → WhatsApp → Account |
| **Access Token** | Permanent access token for API calls | Meta Developer Portal → System Users → Generate Token |
| **Webhook Verify Token** | Custom string for webhook verification | You create this — any random string |
| **Webhook URL** | The URL Meta sends events to | `https://crm.marketing4effect.com/api/webhooks/whatsapp` |

**Connection Status Indicators:**

| Status | Meaning | Action Required |
|--------|---------|----------------|
| 🟢 **Connected** | API credentials are valid, webhooks are active | None |
| 🟡 **Pending** | Credentials entered but not yet verified | Click "Test Connection" |
| 🔴 **Disconnected** | Credentials are invalid or expired | Re-enter valid credentials |
| ⚠️ **Error** | Connection was active but encountered errors | Check error logs, verify token hasn't expired |

**Setup Steps:**
1. Create a Meta Business account at business.facebook.com
2. Set up a WhatsApp Business account in Meta Business Suite
3. Add a phone number (can be a new number or existing business number)
4. Create a System User in Meta Developer Portal
5. Generate a permanent access token with `whatsapp_business_messaging` permission
6. Enter all credentials in the CRM settings
7. Click **Test Connection** to verify
8. Configure the webhook URL in Meta Developer Portal
9. Enter the Webhook Verify Token (must match what you set in Meta)
10. Send a test message to verify end-to-end connectivity

> **Warning:** The Access Token is a sensitive credential. Never share it publicly or commit it to version control. If compromised, regenerate immediately in Meta Developer Portal.

### 22.5 Email Configuration

**URL:** `/settings/email`

Email settings for sending transactional and notification emails:

| Setting | Description | Default |
|---------|-------------|----------|
| **Provider** | Email service provider | Brevo (Sendinblue) |
| **API Key** | Brevo API key for sending emails | Must be configured |
| **From Name** | Sender name displayed in emails | Account name |
| **From Email** | Sender email address | Must be verified in Brevo |
| **Reply-To** | Reply-to email address | Same as From Email |
| **Daily Limit** | Maximum emails per day | 300 (Brevo free tier) |

**Brevo Free Tier Limits:**
- 300 emails per day
- Unlimited contacts
- Transactional and marketing emails
- Email templates and automation

> **Tip:** For higher volume, upgrade to Brevo Starter (₦10,000/month for 20,000 emails/month) or Business plan.

### 22.6 SMS Configuration

**URL:** `/settings/sms`

| Setting | Description | Status |
|---------|-------------|--------|
| **Provider** | SMS service provider | Future feature |
| **API Key** | Provider API key | Not yet available |
| **Sender ID** | SMS sender name (e.g., "M4E CRM") | Not yet available |
| **Country Code** | Default country code for phone numbers | +234 (Nigeria) |

> **Note:** SMS integration is planned for a future release. Currently, all messaging is through WhatsApp.

### 22.7 Template Manager

**URL:** `/settings/templates`

Manage WhatsApp message templates that must be approved by Meta before use:

**Creating a Template:**
1. Click **+ New Template**
2. Fill in the template details:

| Field | Description | Example |
|-------|-------------|----------|
| **Name** | Template identifier (lowercase, underscores) | `welcome_message` |
| **Category** | Marketing, Utility, or Authentication | Marketing |
| **Language** | Template language | English (en) |
| **Header** | Optional header (text, image, video, or document) | Image: product photo |
| **Body** | Message body with variable placeholders | "Hi {{1}}, welcome to {{2}}!" |
| **Footer** | Optional footer text | "Reply STOP to unsubscribe" |
| **Buttons** | Optional CTA or quick reply buttons | "Shop Now" (URL button) |

3. Click **Submit for Approval**
4. Meta reviews the template (typically 1-24 hours)
5. Status updates: Pending → Approved or Rejected

**Template Statuses:**

| Status | Meaning | Can Be Used? |
|--------|---------|-------------|
| **Draft** | Not yet submitted | ❌ |
| **Pending** | Submitted, awaiting Meta review | ❌ |
| **Approved** | Approved by Meta | ✅ |
| **Rejected** | Rejected by Meta (with reason) | ❌ |
| **Paused** | Temporarily paused by Meta (quality issues) | ❌ |
| **Disabled** | Permanently disabled by Meta | ❌ |

**Syncing Templates:**
- Click **Sync Templates** to pull the latest template statuses from Meta
- This updates approval statuses and imports any templates created directly in Meta Business Suite

### 22.8 Members & Invitations

**URL:** `/settings/members`

See Section 21 (Team Management) for complete documentation.

### 22.9 Branches

**URL:** `/settings/branches`

See Section 20 (Multi-Branch Management) for complete documentation.

### 22.10 Custom Fields

**URL:** `/settings/custom-fields`

Custom fields extend the contact data model with business-specific attributes:

**5 Field Types:**

| Type | Description | Example Use | Input Widget |
|------|-------------|------------|---------------|
| **Text** | Free-form text string | Company name, notes | Text input |
| **Number** | Numeric value (integer or decimal) | Age, purchase count, score | Number input |
| **Date** | Calendar date | Birthday, anniversary, contract date | Date picker |
| **Boolean** | True/false toggle | VIP status, email opt-in, verified | Toggle switch |
| **Select** | Dropdown with predefined options | Industry, source, preferred language | Dropdown menu |

**Managing Custom Fields:**
1. Click **+ Add Field**
2. Enter field name, select type, set options (for Select type)
3. Optionally mark as required
4. Click **Save**
5. The field immediately appears on all contact detail pages

**Reordering Fields:**
- Drag and drop fields to change their display order on contact pages

**Editing/Deleting Fields:**
- Click the **✏️ Edit** icon to modify field name, type, or options
- Click the **🗑️ Delete** icon to remove a field

> **Warning:** Deleting a custom field permanently removes all data stored in that field across all contacts. This action cannot be undone.

### 22.11 Tags

**URL:** `/settings/tags`

Tags are color-coded labels for categorizing and segmenting contacts:

**Managing Tags:**

| Action | How |
|--------|-----|
| **Add Tag** | Click + Add Tag → Enter name → Select color → Save |
| **Edit Tag** | Click tag → Modify name or color → Save |
| **Delete Tag** | Click 🗑️ → Confirm deletion |
| **Merge Tags** | Select two tags → Click Merge → Choose surviving tag → Confirm |

**Tag Colors:**
Tags can be assigned any of 12 preset colors for visual distinction: Red, Orange, Yellow, Green, Teal, Blue, Indigo, Purple, Pink, Gray, Brown, Black.

**System Tags (Auto-Generated):**

| Tag | Created By | Purpose |
|-----|-----------|----------|
| `ctwa-lead` | CTWA tracking | Identifies leads from Click-to-WhatsApp ads |
| `imported` | CSV import | Marks contacts added via import |
| `win-back-failed` | Win-back campaign | Contacts who didn't respond to reactivation |
| `negative-sentiment` | Sentiment analysis | Contacts flagged for negative sentiment |
| `onboarding-complete` | Onboarding flow | Contacts who completed the onboarding flow |

### 22.12 Deals Settings

**URL:** `/settings/deals`

Configure pipeline stages and deal defaults:

| Setting | Description |
|---------|-------------|
| **Pipeline Stages** | Add, rename, reorder, delete, and color-code stages |
| **Default Pipeline** | Select which pipeline is shown by default on the Deals page |
| **Default Stage** | Select which stage new deals are created in |
| **Win Stage** | Designate which stage(s) count as "Won" for analytics |
| **Loss Stage** | Designate which stage(s) count as "Lost" for analytics |

### 22.13 Recency Settings

**URL:** `/settings/recency`

Configure the RFM recency scoring system:

| Setting | Description |
|---------|-------------|
| **Industry Preset** | Select from 6 industry presets that set default thresholds |
| **Active Threshold** | Days since last purchase to be considered "Active" |
| **At Risk Threshold** | Days since last purchase to be considered "At Risk" |
| **Dormant Threshold** | Days since last purchase to be considered "Dormant" |
| **Lost Threshold** | Days since last purchase to be considered "Lost" |
| **Adaptive Mode** | Enable/disable adaptive thresholds based on account data |

**Industry Presets:**

| Preset | Active | At Risk | Dormant | Lost | Best For |
|--------|--------|---------|---------|------|----------|
| **Retail** | 0-30 days | 31-60 days | 61-120 days | 121+ days | Fashion, electronics, general retail |
| **Restaurant** | 0-14 days | 15-30 days | 31-60 days | 61+ days | Restaurants, cafes, fast food |
| **Salon/Spa** | 0-30 days | 31-60 days | 61-90 days | 91+ days | Beauty salons, spas, barbershops |
| **Professional Services** | 0-60 days | 61-120 days | 121-180 days | 181+ days | Consulting, legal, accounting |
| **E-Commerce** | 0-30 days | 31-60 days | 61-90 days | 91+ days | Online stores |
| **Healthcare** | 0-90 days | 91-180 days | 181-365 days | 366+ days | Clinics, pharmacies, hospitals |

**Adaptive Mode:**
When enabled, the system automatically adjusts thresholds based on actual purchase patterns in the account's data. A confidence badge shows how reliable the adaptive thresholds are:

| Confidence | Badge | Meaning |
|-----------|-------|----------|
| **High** | 🟢 | 500+ contacts with purchase data, thresholds are reliable |
| **Medium** | 🟡 | 100-499 contacts, thresholds are reasonable estimates |
| **Low** | 🔴 | <100 contacts, using industry preset as fallback |

### 22.14 Security Settings (Danger Zone)

**URL:** `/settings/security`

> **Warning:** This section contains destructive actions. Only the account Owner has access.

| Action | Description | Reversible? |
|--------|-------------|------------|
| **Export All Data** | Download a complete export of all account data (contacts, messages, deals, campaigns) as a ZIP file | N/A (non-destructive) |
| **Delete All Contacts** | Permanently delete all contacts and their associated data | ❌ Irreversible |
| **Delete Account** | Permanently delete the entire account and all data | ❌ Irreversible |

Each destructive action requires:
1. Entering the account Owner's password
2. Typing a confirmation phrase (e.g., "DELETE ALL CONTACTS")
3. Clicking the red confirmation button
4. A 30-second countdown before execution (can be cancelled)



## 23. Admin Panel Overview

The Admin Panel is a separate interface accessible only to Super Admins — M4E staff with elevated privileges who manage the entire CRM platform across all client accounts.

**URL:** `/admin`

### 23.1 Super Admin Access Requirements

To access the Admin Panel, a user must:

1. Have an account in the CRM system
2. Be flagged as `is_super_admin = true` in the database
3. This flag is set directly in the Supabase `profiles` table — it cannot be set through the UI
4. Super Admin status is independent of account-level roles (Owner/Admin/Agent/Viewer)

> **Warning:** Super Admin access provides unrestricted access to ALL accounts, ALL data, and ALL system functions. Only M4E core team members should have this access.

### 23.2 Admin Sidebar Navigation

When a Super Admin is logged in, an additional "Admin" section appears in the sidebar:

| Menu Item | URL | Description |
|-----------|-----|-------------|
| **Admin Dashboard** | `/admin` | Platform-wide metrics and health overview |
| **Accounts** | `/admin/accounts` | Manage all client accounts |
| **Analytics** | `/admin/analytics` | Cross-account analytics with 4 tabs |
| **Campaign Analytics** | `/admin/campaigns` | Campaign performance across all accounts |
| **Revenue** | `/admin/revenue` | Revenue tracking and financial analytics |
| **Monitoring** | `/admin/monitoring` | System health, alerts, logs, security, cron jobs |

### 23.3 Who Gets Admin Access

| Role | Access Level |
|------|-------------|
| **M4E Founder/CEO** | Full Super Admin |
| **M4E CTO/Lead Developer** | Full Super Admin |
| **M4E Operations Manager** | Full Super Admin |
| **M4E Account Managers** | No Super Admin (use account-level access via impersonation) |
| **Client Users** | No Super Admin (account-level roles only) |

---

## 24. Admin Dashboard

The Admin Dashboard provides a bird's-eye view of the entire CRM platform's health, growth, and activity.

**URL:** `/admin`

### 24.1 Growth Charts

**Accounts Over Time:**
A line chart showing cumulative account registrations over time (daily, weekly, or monthly granularity). Includes:
- Total accounts created
- Active accounts (logged in within last 30 days)
- Churned accounts (no login in 60+ days)
- New accounts this period vs. previous period

**Contact Growth:**
A stacked area chart showing total contacts across all accounts over time, broken down by:
- New contacts added
- Contacts imported
- Contacts from CTWA ads
- Contacts from e-commerce sync

### 24.2 Onboarding Tracker

A pipeline view showing where each client account is in the onboarding process:

| Stage | Description | Count |
|-------|-------------|-------|
| **Registered** | Account created, no WhatsApp connected | Shows count |
| **WhatsApp Connected** | WhatsApp API configured and verified | Shows count |
| **Contacts Imported** | First contact import completed | Shows count |
| **First Campaign Sent** | At least one campaign or broadcast sent | Shows count |
| **Fully Active** | Regular usage (messages sent in last 7 days) | Shows count |

### 24.3 Metric Cards

Six key metric cards displayed at the top of the dashboard:

| Card | Metric | Description |
|------|--------|-------------|
| **Total Accounts** | Number | All registered accounts (active + inactive) |
| **Total Contacts** | Number | Sum of contacts across all accounts |
| **Total Messages** | Number | All WhatsApp messages sent + received platform-wide |
| **Active Campaigns** | Number | Currently running campaigns across all accounts |
| **Monthly Revenue** | ₦ Amount | Total subscription revenue for the current month |
| **System Health** | Percentage | Overall system health score (uptime, error rate, response time) |

Each card shows:
- Current value
- Change from previous period (↑ green or ↓ red with percentage)
- Sparkline trend chart (last 30 days)

---

## 25. Account Management

The Account Management page provides full control over all client accounts on the platform.

**URL:** `/admin/accounts`

### 25.1 Accounts Table

The main view is a sortable, filterable table of all accounts:

| Column | Description | Sortable | Filterable |
|--------|-------------|----------|------------|
| **Account Name** | Business name | ✅ | ✅ (search) |
| **Owner** | Account owner's name and email | ✅ | ✅ (search) |
| **Plan** | Subscription tier (Starter/Professional/Business) | ✅ | ✅ (dropdown) |
| **Status** | Active, Suspended, or Cancelled | ✅ | ✅ (dropdown) |
| **Contacts** | Number of contacts in the account | ✅ | ✅ (range) |
| **Messages** | Total messages sent/received | ✅ | ✅ (range) |
| **Last Active** | Last login or API activity timestamp | ✅ | ✅ (date range) |
| **Created** | Account creation date | ✅ | ✅ (date range) |
| **Actions** | View, Impersonate, Suspend, Delete | — | — |

### 25.2 Account Detail Page

Clicking on an account opens its detail page with comprehensive information:

**Overview Tab:**
- Account name, owner, plan, status
- WhatsApp connection status
- Contact count, message count, campaign count
- Team members list
- Branch list
- Creation date, last active date

**Usage Tab:**
- Message volume over time (chart)
- Campaign activity log
- API call volume
- Storage usage

**Billing Tab:**
- Current plan and pricing
- Payment history
- Next billing date
- Usage against plan limits

### 25.3 Impersonate

The Impersonate feature allows Super Admins to view the CRM exactly as a specific client sees it:

1. Click **Impersonate** on the account row or detail page
2. The CRM switches to the client's account context
3. A yellow banner appears at the top: "You are impersonating [Account Name]. Click here to exit."
4. All actions taken while impersonating are logged with the Super Admin's identity
5. Click the banner or navigate to `/admin` to exit impersonation

**Use Cases for Impersonation:**
- Debugging client-reported issues
- Setting up campaigns on behalf of clients
- Verifying WhatsApp configuration
- Training and onboarding support
- Quality assurance checks

> **Warning:** All actions taken during impersonation affect the client's real data. Be careful when sending messages, deleting contacts, or modifying settings.

### 25.4 Suspend

Suspending an account temporarily disables access:

1. Click **Suspend** on the account
2. Enter a suspension reason
3. Confirm the action
4. The account owner and all team members are immediately logged out
5. Login attempts show: "Your account has been suspended. Contact support."
6. All scheduled campaigns and automations are paused
7. Incoming WhatsApp messages are still received but not processed

**Unsuspending:**
1. Click **Unsuspend** on the suspended account
2. Access is immediately restored
3. Paused campaigns and automations remain paused (must be manually reactivated)

### 25.5 Delete

Deleting an account permanently removes all data:

1. Click **Delete** on the account
2. Enter the Super Admin password
3. Type the confirmation phrase: "DELETE [Account Name]"
4. Click the red **Delete Permanently** button
5. All data is permanently deleted: contacts, messages, campaigns, deals, settings, team members

> **Warning:** Account deletion is irreversible. Always offer to export the client's data before deletion. Consider suspension as an alternative.

---

## 26. Admin Analytics

The Admin Analytics page provides deep insights into platform usage across all accounts, organized into 4 tabs.

**URL:** `/admin/analytics`

### 26.1 Tab 1: Overview

| Widget | Description |
|--------|-------------|
| **KPI Summary Cards** | Total accounts, contacts, messages, campaigns, revenue, NPS |
| **Activity Heatmap** | Hour-by-day heatmap showing platform activity intensity |
| **Feature Adoption Table** | Percentage of accounts using each feature (Inbox, Campaigns, Automations, Flows, AI Chatbot, E-Commerce, QR Codes, CTWA, Sentiment) |
| **Top Accounts** | Ranked list of most active accounts by message volume |
| **Growth Rate** | Month-over-month growth in accounts, contacts, and messages |

**Feature Adoption Table Example:**

| Feature | Accounts Using | Adoption Rate | Trend |
|---------|---------------|---------------|-------|
| Inbox | 45/50 | 90% | → Stable |
| Campaigns | 38/50 | 76% | ↑ +5% |
| Automations | 22/50 | 44% | ↑ +8% |
| Flows | 15/50 | 30% | ↑ +3% |
| AI Chatbot | 12/50 | 24% | ↑ +12% |
| E-Commerce | 8/50 | 16% | → Stable |
| QR Codes | 30/50 | 60% | ↑ +2% |
| CTWA Tracking | 10/50 | 20% | ↑ +5% |
| Sentiment | 18/50 | 36% | ↑ +10% |

### 26.2 Tab 2: Engagement

| Widget | Description |
|--------|-------------|
| **Message Volume Chart** | Daily/weekly/monthly message volume (sent vs. received) |
| **Response Rate** | Average response rate across all accounts |
| **Average Response Time** | Mean time from customer message to agent reply |
| **Conversation Length** | Average messages per conversation |
| **Peak Hours** | Busiest hours for messaging activity |
| **Channel Distribution** | Breakdown of message types (text, image, video, audio, document) |

### 26.3 Tab 3: Campaigns

| Widget | Description |
|--------|-------------|
| **Campaign Launch Frequency** | Number of campaigns launched per week/month |
| **Template Popularity** | Most-used campaign templates ranked by usage count |
| **Campaign Performance** | Average delivery, read, reply, and conversion rates |
| **Campaign Type Distribution** | Pie chart of campaign categories (Reactivation, Engagement, Growth, Retention, Recovery) |
| **Top Performing Campaigns** | Ranked list of campaigns by conversion rate |

### 26.4 Tab 4: Growth

| Widget | Description |
|--------|-------------|
| **Account Signups** | New account registrations over time |
| **Contact Growth** | Net new contacts added across all accounts |
| **Churn Analysis** | Accounts that became inactive or cancelled |
| **Retention Cohorts** | Cohort analysis showing account retention over months |
| **Expansion Revenue** | Revenue from plan upgrades |
| **Net Revenue Retention** | NRR percentage (target: >100%) |

---

## 27. Admin Campaign Analytics

Dedicated campaign analytics view for cross-account campaign performance analysis.

**URL:** `/admin/campaigns`

### 27.1 Cross-Account Campaign Performance

A comprehensive table showing all campaigns across all accounts:

| Column | Description |
|--------|-------------|
| **Campaign Name** | Name of the campaign |
| **Account** | Which client account owns the campaign |
| **Template** | Campaign template used (or "Custom") |
| **Category** | Reactivation, Engagement, Growth, Retention, Recovery |
| **Tier** | Template tier (1, 2, or 3) |
| **Status** | Draft, Scheduled, Active, Paused, Completed, Cancelled |
| **Audience Size** | Number of contacts targeted |
| **Sent** | Messages sent |
| **Delivered** | Messages delivered |
| **Delivery Rate** | (Delivered / Sent) × 100% |
| **Read** | Messages read |
| **Read Rate** | (Read / Delivered) × 100% |
| **Replied** | Contacts who replied |
| **Reply Rate** | (Replied / Read) × 100% |
| **Converted** | Contacts who completed the desired action |
| **Conversion Rate** | (Converted / Audience) × 100% |
| **Revenue** | Revenue attributed to the campaign |
| **ROI** | Return on investment |
| **Started** | Campaign start date |
| **Completed** | Campaign completion date |

The table supports sorting by any column, filtering by account/template/category/status, and exporting to CSV.

---

## 28. Revenue Management

The Revenue Management page tracks all financial metrics for the CRM platform.

**URL:** `/admin/revenue`

### 28.1 Revenue by Account

A table showing revenue contribution from each client account:

| Column | Description |
|--------|-------------|
| **Account** | Client business name |
| **Plan** | Current subscription tier |
| **Monthly Fee** | Subscription amount |
| **Setup Fee** | One-time setup fee (if applicable) |
| **Add-ons** | Additional services revenue |
| **Total Revenue** | Cumulative revenue from this account |
| **LTV** | Lifetime value (total revenue since signup) |
| **Months Active** | Number of months as a paying customer |
| **Status** | Active, Overdue, Cancelled |

### 28.2 Revenue by Campaign Type

Breakdown of revenue attributed to different campaign types:

| Campaign Type | Revenue Generated | Campaigns Run | Avg Revenue/Campaign |
|--------------|-------------------|---------------|---------------------|
| Win-Back Dormant | ₦X,XXX,XXX | XX | ₦XXX,XXX |
| Birthday/Anniversary | ₦X,XXX,XXX | XX | ₦XXX,XXX |
| Post-Purchase | ₦X,XXX,XXX | XX | ₦XXX,XXX |
| VIP Exclusive | ₦X,XXX,XXX | XX | ₦XXX,XXX |
| Cart Abandonment | ₦X,XXX,XXX | XX | ₦XXX,XXX |
| Seasonal Promotion | ₦X,XXX,XXX | XX | ₦XXX,XXX |
| Other | ₦X,XXX,XXX | XX | ₦XXX,XXX |

### 28.3 Revenue Over Time

Line chart showing monthly recurring revenue (MRR) trends:
- **MRR:** Total monthly subscription revenue
- **New MRR:** Revenue from new accounts
- **Expansion MRR:** Revenue from plan upgrades
- **Churned MRR:** Revenue lost from cancellations
- **Net New MRR:** New + Expansion - Churned

### 28.4 Revenue by Channel

| Channel | Description | Revenue |
|---------|-------------|----------|
| **Subscriptions** | Monthly/annual plan fees | Primary revenue |
| **Setup Fees** | One-time onboarding charges | Secondary revenue |
| **Campaign Services** | Managed campaign execution fees | Service revenue |
| **Add-ons** | Additional features, extra users, premium support | Supplementary revenue |
| **Training** | Training sessions and workshops | Service revenue |

### 28.5 ROI Summary

Platform-wide return on investment metrics:

| Metric | Description |
|--------|-------------|
| **Total Platform Revenue** | All revenue generated through the CRM |
| **Total Client Revenue Generated** | Revenue generated for clients through campaigns |
| **Platform ROI** | Client revenue / Platform costs |
| **Average Client ROI** | Mean ROI across all active accounts |
| **Revenue Per Contact** | Total revenue / Total contacts |
| **Revenue Per Message** | Total revenue / Total messages sent |

---

## 29. System Monitoring

The System Monitoring page provides comprehensive visibility into the CRM platform's technical health, organized into 5 tabs.

**URL:** `/admin/monitoring`

### 29.1 Tab 1: Health

**Component Status Dashboard:**

| Component | Status | Uptime | Last Check |
|-----------|--------|--------|------------|
| **Web Application** | 🟢 Healthy | 99.9% | 2 min ago |
| **Supabase Database** | 🟢 Healthy | 99.95% | 1 min ago |
| **WhatsApp API** | 🟢 Healthy | 99.8% | 3 min ago |
| **OpenRouter AI** | 🟢 Healthy | 99.7% | 5 min ago |
| **Brevo Email** | 🟢 Healthy | 99.9% | 2 min ago |
| **Vercel Hosting** | 🟢 Healthy | 99.99% | 1 min ago |
| **Cron Jobs** | 🟢 Healthy | 99.5% | 10 min ago |

**Status Indicators:**
- 🟢 **Healthy:** Component is operating normally
- 🟡 **Degraded:** Component is experiencing slowness or partial issues
- 🔴 **Down:** Component is unavailable
- ⚪ **Unknown:** Status check failed or not configured

**Uptime Chart:**
A 30-day uptime chart showing availability percentage for each component, with incident markers for any downtime events.

### 29.2 Tab 2: Alerts

**Alert Severity Levels:**

| Severity | Color | Description | Response Time |
|----------|-------|-------------|---------------|
| **Critical** | 🔴 Red | System down, data loss risk | Immediate |
| **High** | 🟠 Orange | Major feature broken, many users affected | Within 1 hour |
| **Medium** | 🟡 Yellow | Minor feature issue, workaround available | Within 4 hours |
| **Low** | 🔵 Blue | Cosmetic issue, enhancement needed | Within 24 hours |
| **Info** | ⚪ Gray | Informational, no action needed | Review weekly |

**Alert Management:**
- View active alerts with timestamp, severity, component, and description
- Acknowledge alerts (marks as "being investigated")
- Resolve alerts (marks as "fixed" with resolution notes)
- Snooze alerts (temporarily hide for a set duration)
- Configure alert rules (thresholds, notification channels)

### 29.3 Tab 3: Logs

**Log Filtering:**

| Filter | Options |
|--------|----------|
| **Level** | Debug, Info, Warning, Error, Critical |
| **Component** | Web, API, Database, WhatsApp, AI, Email, Cron |
| **Account** | Filter by specific client account |
| **Date Range** | Start and end date/time |
| **Search** | Full-text search across log messages |

**Log Entry Detail View:**
Clicking a log entry expands it to show:
- Full log message
- Stack trace (for errors)
- Request/response data (for API logs)
- User/account context
- Related log entries (same request ID)

### 29.4 Tab 4: Security

**Failed Login Tracking:**

| Column | Description |
|--------|-------------|
| **Email** | Email address used in the failed attempt |
| **IP Address** | Source IP of the attempt |
| **Timestamp** | When the attempt occurred |
| **Reason** | Wrong password, account not found, account suspended |
| **Attempts** | Number of consecutive failures from this IP |
| **Blocked** | Whether the IP has been temporarily blocked |

**Brute Force Protection:**
- After 5 failed login attempts from the same IP within 15 minutes, the IP is temporarily blocked for 30 minutes
- After 10 failed attempts, the IP is blocked for 24 hours
- Super Admins can manually block/unblock IP addresses
- Blocked IPs are logged with the reason and duration

**IP Tracking:**
- Geographic location of login attempts (country, city)
- Unusual location alerts (login from a new country)
- Concurrent session detection (same account, different IPs)

### 29.5 Tab 5: Cron Jobs

**Cron Job Status Dashboard:**

| Cron Job | Schedule | Last Run | Status | Duration | Next Run |
|----------|----------|----------|--------|----------|----------|
| Automation Cron | Every 5 min | 2 min ago | ✅ Success | 1.2s | 3 min |
| Campaign Triggers | Every 5 min | 2 min ago | ✅ Success | 0.8s | 3 min |
| Flow Cron | Every 5 min | 2 min ago | ✅ Success | 0.5s | 3 min |
| Cart Abandonment | Every 15 min | 8 min ago | ✅ Success | 2.1s | 7 min |
| System Monitoring | Every 10 min | 4 min ago | ✅ Success | 3.5s | 6 min |

**Cron Job History:**
For each cron job, view the execution history:
- Timestamp of each execution
- Duration
- Status (Success, Failed, Timeout)
- Items processed (e.g., "Processed 12 automations, triggered 3")
- Error details (if failed)



## 30. API Reference

The M4E WhatsApp CRM exposes 88+ API routes organized by functional domain. All API endpoints are served from the base URL `https://crm.marketing4effect.com/api`.

### 30.1 Authentication

All API requests require authentication via Supabase session tokens:

```
Authorization: Bearer <supabase_access_token>
```

For cron job endpoints, authentication uses the `AUTOMATION_CRON_SECRET` header:

```
Authorization: Bearer <AUTOMATION_CRON_SECRET>
```

### 30.2 Response Format

All API responses follow a consistent JSON format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

### 30.3 Accounts API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | `GET` | `/api/accounts` | List all accounts (admin only) |
| 2 | `POST` | `/api/accounts` | Create a new account |
| 3 | `GET` | `/api/accounts/[id]` | Get account details |
| 4 | `PUT` | `/api/accounts/[id]` | Update account settings |
| 5 | `DELETE` | `/api/accounts/[id]` | Delete an account (admin only) |
| 6 | `POST` | `/api/accounts/[id]/suspend` | Suspend an account (admin only) |
| 7 | `POST` | `/api/accounts/[id]/unsuspend` | Unsuspend an account (admin only) |
| 8 | `POST` | `/api/accounts/[id]/impersonate` | Start impersonation session (admin only) |

**Example — Get Account Details:**
```bash
curl -X GET "https://crm.marketing4effect.com/api/accounts/abc-123"   -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc-123",
    "name": "Adeola Enterprises",
    "owner_email": "adeola@example.com",
    "plan": "professional",
    "status": "active",
    "whatsapp_connected": true,
    "contact_count": 2450,
    "created_at": "2025-03-15T10:30:00Z"
  }
}
```

### 30.4 Contacts API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 9 | `GET` | `/api/contacts` | List contacts with pagination, filtering, and search |
| 10 | `POST` | `/api/contacts` | Create a new contact |
| 11 | `GET` | `/api/contacts/[id]` | Get contact details with tags, custom fields, and history |
| 12 | `PUT` | `/api/contacts/[id]` | Update contact information |
| 13 | `DELETE` | `/api/contacts/[id]` | Delete a contact |
| 14 | `POST` | `/api/contacts/import` | Import contacts from CSV |
| 15 | `GET` | `/api/contacts/export` | Export contacts to CSV |
| 16 | `POST` | `/api/contacts/[id]/tags` | Add tags to a contact |
| 17 | `DELETE` | `/api/contacts/[id]/tags/[tagId]` | Remove a tag from a contact |
| 18 | `GET` | `/api/contacts/[id]/messages` | Get message history for a contact |
| 19 | `GET` | `/api/contacts/[id]/purchases` | Get purchase history for a contact |
| 20 | `POST` | `/api/contacts/[id]/purchases` | Add a purchase record |
| 21 | `GET` | `/api/contacts/[id]/deals` | Get deals associated with a contact |
| 22 | `POST` | `/api/contacts/bulk-tag` | Add tags to multiple contacts |
| 23 | `POST` | `/api/contacts/bulk-delete` | Delete multiple contacts |
| 24 | `GET` | `/api/contacts/segments` | Get contacts grouped by recency segment |
| 25 | `GET` | `/api/contacts/duplicates` | Find potential duplicate contacts |
| 26 | `POST` | `/api/contacts/merge` | Merge two duplicate contacts |

**Example — Import Contacts:**
```bash
curl -X POST "https://crm.marketing4effect.com/api/contacts/import"   -H "Authorization: Bearer <token>"   -H "Content-Type: multipart/form-data"   -F "file=@contacts.csv"   -F "tags=imported,lagos-branch"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_rows": 500,
    "imported": 485,
    "duplicates_skipped": 12,
    "errors": 3,
    "error_details": [
      {"row": 45, "error": "Invalid phone number format"},
      {"row": 123, "error": "Missing required field: name"},
      {"row": 301, "error": "Invalid phone number format"}
    ]
  }
}
```

### 30.5 Messages API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 27 | `GET` | `/api/messages` | List messages with filtering |
| 28 | `POST` | `/api/messages/send` | Send a WhatsApp message |
| 29 | `POST` | `/api/messages/send-template` | Send a template message |
| 30 | `GET` | `/api/messages/[id]` | Get message details |
| 31 | `POST` | `/api/messages/[id]/react` | React to a message |
| 32 | `GET` | `/api/messages/conversations` | List active conversations |
| 33 | `POST` | `/api/messages/mark-read` | Mark messages as read |

**Example — Send a WhatsApp Message:**
```bash
curl -X POST "https://crm.marketing4effect.com/api/messages/send"   -H "Authorization: Bearer <token>"   -H "Content-Type: application/json"   -d '{"contact_id": "contact-123", "message": "Hello! How can we help you today?", "type": "text"}'
```

**Example — Send a Template Message:**
```bash
curl -X POST "https://crm.marketing4effect.com/api/messages/send-template"   -H "Authorization: Bearer <token>"   -H "Content-Type: application/json"   -d '{"contact_id": "contact-123", "template_name": "welcome_message", "language": "en", "variables": ["Adeola", "Adeola Enterprises"]}'
```

### 30.6 Tags API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 34 | `GET` | `/api/tags` | List all tags |
| 35 | `POST` | `/api/tags` | Create a new tag |
| 36 | `PUT` | `/api/tags/[id]` | Update a tag |
| 37 | `DELETE` | `/api/tags/[id]` | Delete a tag |
| 38 | `POST` | `/api/tags/merge` | Merge two tags |

### 30.7 Deals API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 39 | `GET` | `/api/deals` | List deals with pipeline filtering |
| 40 | `POST` | `/api/deals` | Create a new deal |
| 41 | `GET` | `/api/deals/[id]` | Get deal details |
| 42 | `PUT` | `/api/deals/[id]` | Update a deal (including stage changes) |
| 43 | `DELETE` | `/api/deals/[id]` | Delete a deal |
| 44 | `GET` | `/api/deals/pipeline` | Get pipeline analytics |
| 45 | `PUT` | `/api/deals/[id]/stage` | Move deal to a different stage |
| 46 | `GET` | `/api/deals/stages` | List pipeline stages |
| 47 | `POST` | `/api/deals/stages` | Create a pipeline stage |
| 48 | `PUT` | `/api/deals/stages/[id]` | Update a pipeline stage |
| 49 | `DELETE` | `/api/deals/stages/[id]` | Delete a pipeline stage |

### 30.8 Campaigns API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 50 | `GET` | `/api/campaigns` | List all campaigns |
| 51 | `POST` | `/api/campaigns` | Create a new campaign |
| 52 | `GET` | `/api/campaigns/[id]` | Get campaign details |
| 53 | `PUT` | `/api/campaigns/[id]` | Update campaign configuration |
| 54 | `DELETE` | `/api/campaigns/[id]` | Delete a campaign |
| 55 | `POST` | `/api/campaigns/[id]/activate` | Activate a campaign |
| 56 | `POST` | `/api/campaigns/[id]/pause` | Pause an active campaign |
| 57 | `POST` | `/api/campaigns/[id]/resume` | Resume a paused campaign |
| 58 | `POST` | `/api/campaigns/[id]/cancel` | Cancel a campaign |
| 59 | `GET` | `/api/campaigns/[id]/analytics` | Get campaign performance metrics |
| 60 | `GET` | `/api/campaigns/templates` | List available campaign templates |
| 61 | `GET` | `/api/campaigns/templates/[slug]` | Get campaign template details |
| 62 | `POST` | `/api/campaigns/[id]/clone` | Clone an existing campaign |
| 63 | `GET` | `/api/campaigns/triggers/cron` | Cron endpoint for campaign triggers |

### 30.9 Broadcasts API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 64 | `GET` | `/api/broadcasts` | List all broadcasts |
| 65 | `POST` | `/api/broadcasts` | Create and send/schedule a broadcast |
| 66 | `GET` | `/api/broadcasts/[id]` | Get broadcast details and metrics |
| 67 | `DELETE` | `/api/broadcasts/[id]` | Delete a broadcast |
| 68 | `POST` | `/api/broadcasts/[id]/cancel` | Cancel a scheduled broadcast |

### 30.10 Automations API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 69 | `GET` | `/api/automations` | List all automations |
| 70 | `POST` | `/api/automations` | Create a new automation |
| 71 | `GET` | `/api/automations/[id]` | Get automation details |
| 72 | `PUT` | `/api/automations/[id]` | Update an automation |
| 73 | `DELETE` | `/api/automations/[id]` | Delete an automation |
| 74 | `POST` | `/api/automations/[id]/toggle` | Enable/disable an automation |
| 75 | `POST` | `/api/automations/[id]/duplicate` | Duplicate an automation |
| 76 | `GET` | `/api/automations/[id]/logs` | Get automation execution logs |
| 77 | `GET` | `/api/automations/cron` | Cron endpoint for scheduled automations |

### 30.11 Flows API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 78 | `GET` | `/api/flows` | List all flows |
| 79 | `POST` | `/api/flows` | Create a new flow |
| 80 | `GET` | `/api/flows/[id]` | Get flow details (nodes, edges, config) |
| 81 | `PUT` | `/api/flows/[id]` | Update flow (nodes, edges, config) |
| 82 | `DELETE` | `/api/flows/[id]` | Delete a flow |
| 83 | `POST` | `/api/flows/[id]/activate` | Activate a flow |
| 84 | `POST` | `/api/flows/[id]/deactivate` | Deactivate a flow |
| 85 | `GET` | `/api/flows/[id]/runs` | Get flow execution runs |
| 86 | `POST` | `/api/flows/[id]/validate` | Validate flow structure |
| 87 | `GET` | `/api/flows/cron` | Cron endpoint for flow processing |

### 30.12 AI Chatbot API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 88 | `GET` | `/api/ai-chatbot/config` | Get chatbot configuration |
| 89 | `PUT` | `/api/ai-chatbot/config` | Update chatbot configuration |
| 90 | `POST` | `/api/ai-chatbot/test` | Test chatbot with a message |
| 91 | `GET` | `/api/ai-chatbot/knowledge-base` | List knowledge base entries |
| 92 | `POST` | `/api/ai-chatbot/knowledge-base` | Add a knowledge base entry |
| 93 | `PUT` | `/api/ai-chatbot/knowledge-base/[id]` | Update a knowledge base entry |
| 94 | `DELETE` | `/api/ai-chatbot/knowledge-base/[id]` | Delete a knowledge base entry |
| 95 | `POST` | `/api/ai-chatbot/knowledge-base/import` | Bulk import knowledge base entries |
| 96 | `GET` | `/api/ai-chatbot/analytics` | Get chatbot analytics |
| 97 | `GET` | `/api/ai-chatbot/logs` | Get chatbot conversation logs |

### 30.13 Products API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 98 | `GET` | `/api/products` | List all products |
| 99 | `POST` | `/api/products` | Create a new product |
| 100 | `GET` | `/api/products/[id]` | Get product details |
| 101 | `PUT` | `/api/products/[id]` | Update a product |
| 102 | `DELETE` | `/api/products/[id]` | Delete a product |
| 103 | `GET` | `/api/products/categories` | List product categories |

### 30.14 E-Commerce API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 104 | `GET` | `/api/ecommerce/config` | Get e-commerce integration config |
| 105 | `PUT` | `/api/ecommerce/config` | Update e-commerce config |
| 106 | `POST` | `/api/ecommerce/config/test` | Test e-commerce connection |
| 107 | `GET` | `/api/ecommerce/carts` | List abandoned carts |
| 108 | `GET` | `/api/ecommerce/carts/[id]` | Get cart details |
| 109 | `GET` | `/api/ecommerce/carts/cron` | Cron endpoint for cart abandonment detection |
| 110 | `POST` | `/api/ecommerce/sync` | Trigger manual catalog sync |

### 30.15 WhatsApp Templates API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 111 | `GET` | `/api/templates` | List all WhatsApp templates |
| 112 | `POST` | `/api/templates` | Create a new template |
| 113 | `PUT` | `/api/templates/[id]` | Update a template |
| 114 | `DELETE` | `/api/templates/[id]` | Delete a template |
| 115 | `POST` | `/api/templates/[id]/submit` | Submit template for Meta approval |
| 116 | `POST` | `/api/templates/sync` | Sync templates from Meta |

### 30.16 WhatsApp Flows API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 117 | `GET` | `/api/whatsapp-flows` | List WhatsApp Flows |
| 118 | `POST` | `/api/whatsapp-flows` | Create a WhatsApp Flow |
| 119 | `PUT` | `/api/whatsapp-flows/[id]` | Update a WhatsApp Flow |
| 120 | `DELETE` | `/api/whatsapp-flows/[id]` | Delete a WhatsApp Flow |
| 121 | `POST` | `/api/whatsapp-flows/[id]/publish` | Publish flow to Meta |
| 122 | `POST` | `/api/whatsapp-flows/[id]/send` | Send flow to a contact |

### 30.17 QR Codes API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 123 | `GET` | `/api/qr-codes` | List QR codes |
| 124 | `POST` | `/api/qr-codes` | Generate a new QR code |
| 125 | `GET` | `/api/qr-codes/[id]` | Get QR code details |
| 126 | `DELETE` | `/api/qr-codes/[id]` | Delete a QR code |
| 127 | `GET` | `/api/qr-codes/[id]/download` | Download QR code image |

### 30.18 CTWA API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 128 | `GET` | `/api/ctwa/leads` | List CTWA leads |
| 129 | `GET` | `/api/ctwa/analytics` | Get CTWA analytics |
| 130 | `GET` | `/api/ctwa/leads/[id]` | Get CTWA lead details |

### 30.19 Sentiment API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 131 | `GET` | `/api/sentiment` | Get sentiment dashboard data |
| 132 | `GET` | `/api/sentiment/contacts/[id]` | Get sentiment history for a contact |
| 133 | `POST` | `/api/sentiment/analyze` | Analyze text sentiment (manual) |

### 30.20 Branches API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 134 | `GET` | `/api/branches` | List all branches |
| 135 | `POST` | `/api/branches` | Create a new branch |
| 136 | `PUT` | `/api/branches/[id]` | Update a branch |
| 137 | `DELETE` | `/api/branches/[id]` | Delete a branch |

### 30.21 Team Members API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 138 | `GET` | `/api/members` | List team members |
| 139 | `POST` | `/api/members/invite` | Send an invitation |
| 140 | `PUT` | `/api/members/[id]/role` | Change member role |
| 141 | `DELETE` | `/api/members/[id]` | Remove a team member |
| 142 | `POST` | `/api/members/transfer-ownership` | Transfer account ownership |
| 143 | `GET` | `/api/members/invitations` | List pending invitations |
| 144 | `DELETE` | `/api/members/invitations/[id]` | Cancel an invitation |
| 145 | `POST` | `/api/members/invitations/[id]/resend` | Resend an invitation |

### 30.22 Custom Fields API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 146 | `GET` | `/api/custom-fields` | List custom fields |
| 147 | `POST` | `/api/custom-fields` | Create a custom field |
| 148 | `PUT` | `/api/custom-fields/[id]` | Update a custom field |
| 149 | `DELETE` | `/api/custom-fields/[id]` | Delete a custom field |
| 150 | `PUT` | `/api/custom-fields/reorder` | Reorder custom fields |

### 30.23 Settings API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 151 | `GET` | `/api/settings` | Get all account settings |
| 152 | `PUT` | `/api/settings/profile` | Update profile settings |
| 153 | `PUT` | `/api/settings/whatsapp` | Update WhatsApp configuration |
| 154 | `POST` | `/api/settings/whatsapp/test` | Test WhatsApp connection |
| 155 | `PUT` | `/api/settings/email` | Update email configuration |
| 156 | `POST` | `/api/settings/email/test` | Send test email |
| 157 | `PUT` | `/api/settings/appearance` | Update appearance settings |
| 158 | `PUT` | `/api/settings/recency` | Update recency scoring settings |
| 159 | `POST` | `/api/settings/export` | Export all account data |
| 160 | `DELETE` | `/api/settings/contacts` | Delete all contacts (danger zone) |
| 161 | `DELETE` | `/api/settings/account` | Delete account (danger zone) |

### 30.24 Webhooks API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 162 | `POST` | `/api/webhooks/whatsapp` | WhatsApp webhook receiver |
| 163 | `GET` | `/api/webhooks/whatsapp` | WhatsApp webhook verification |
| 164 | `POST` | `/api/webhooks/paystack` | Paystack payment webhook |
| 165 | `POST` | `/api/webhooks/flutterwave` | Flutterwave payment webhook |
| 166 | `POST` | `/api/webhooks/shopify` | Shopify e-commerce webhook |
| 167 | `POST` | `/api/webhooks/woocommerce` | WooCommerce e-commerce webhook |

### 30.25 Admin API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 168 | `GET` | `/api/admin/dashboard` | Get admin dashboard metrics |
| 169 | `GET` | `/api/admin/accounts` | List all accounts with details |
| 170 | `GET` | `/api/admin/analytics` | Get platform-wide analytics |
| 171 | `GET` | `/api/admin/campaigns` | Get cross-account campaign analytics |
| 172 | `GET` | `/api/admin/revenue` | Get revenue analytics |
| 173 | `GET` | `/api/admin/monitoring` | Get system monitoring data |
| 174 | `GET` | `/api/admin/monitoring/health` | Get component health status |
| 175 | `GET` | `/api/admin/monitoring/alerts` | Get active alerts |
| 176 | `PUT` | `/api/admin/monitoring/alerts/[id]` | Update alert status |
| 177 | `GET` | `/api/admin/monitoring/logs` | Get system logs |
| 178 | `GET` | `/api/admin/monitoring/security` | Get security events |
| 179 | `GET` | `/api/admin/monitoring/cron` | Get cron job status |

### 30.26 Cron API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 180 | `GET` | `/api/automations/cron` | Execute scheduled automations |
| 181 | `GET` | `/api/campaigns/triggers/cron` | Execute campaign triggers |
| 182 | `GET` | `/api/flows/cron` | Process active flow runs |
| 183 | `GET` | `/api/ecommerce/carts/cron` | Detect abandoned carts |
| 184 | `GET` | `/api/cron/monitoring` | System health monitoring check |

### 30.27 Authentication API

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 185 | `POST` | `/api/auth/signup` | Register a new account |
| 186 | `POST` | `/api/auth/login` | Log in to an existing account |
| 187 | `POST` | `/api/auth/logout` | Log out and invalidate session |
| 188 | `POST` | `/api/auth/forgot-password` | Request password reset email |
| 189 | `POST` | `/api/auth/reset-password` | Reset password with token |
| 190 | `GET` | `/api/auth/session` | Get current session details |
| 191 | `POST` | `/api/auth/accept-invitation` | Accept a team invitation |



## 31. Webhook Integration

Webhooks allow external services to push real-time event data into the CRM. The platform supports webhooks from WhatsApp (Meta), payment processors (Paystack, Flutterwave), and e-commerce platforms (Shopify, WooCommerce).

### 31.1 WhatsApp Webhooks

**Endpoint:** `POST /api/webhooks/whatsapp`
**Verification Endpoint:** `GET /api/webhooks/whatsapp`

The WhatsApp webhook is the primary data ingestion point for all WhatsApp Business API events.

**Verification (GET):**
Meta sends a verification request when you first configure the webhook URL:

```
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING
```

The endpoint verifies that `hub.verify_token` matches the token configured in Settings → WhatsApp Configuration, then returns the `hub.challenge` value.

**Event Types Received:**

| Event Type | Description | CRM Action |
|-----------|-------------|------------|
| `messages` | Incoming message from a customer | Create/update conversation, trigger automations, run AI chatbot |
| `statuses` | Message delivery status update | Update message status (sent → delivered → read) |
| `contacts` | Contact information update | Update contact profile |
| `errors` | API error notification | Log error, trigger alert |
| `message_reactions` | Customer reacted to a message | Display reaction in inbox |
| `referral` | Customer came from a CTWA ad | Create CTWA lead record, apply `ctwa-lead` tag |

**Payload Example — Incoming Message:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "2348012345678",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "contacts": [{
          "profile": {"name": "Adeola Johnson"},
          "wa_id": "2348098765432"
        }],
        "messages": [{
          "from": "2348098765432",
          "id": "wamid.HBgLMjM0...",
          "timestamp": "1719561749",
          "text": {"body": "Hello, I want to place an order"},
          "type": "text"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

**Processing Pipeline:**
1. Verify webhook signature using the App Secret
2. Extract the event type from the payload
3. Match the Phone Number ID to a CRM account
4. For messages: find or create the contact, create the message record, update the conversation
5. Trigger any matching automations (keyword match, message received)
6. If AI chatbot is enabled and no agent is assigned, generate AI response
7. Update real-time inbox via WebSocket/polling

### 31.2 Paystack Webhooks

**Endpoint:** `POST /api/webhooks/paystack`

Paystack webhooks handle subscription payments and one-time charges for CRM billing.

**Verification:**
Paystack signs all webhook payloads with HMAC SHA-512 using your secret key. The CRM verifies the signature from the `x-paystack-signature` header before processing.

**Event Types:**

| Event | Description | CRM Action |
|-------|-------------|------------|
| `charge.success` | Payment was successful | Activate/renew subscription, update billing record |
| `subscription.create` | New subscription created | Link subscription to account |
| `subscription.disable` | Subscription cancelled | Mark account for downgrade at period end |
| `subscription.not_renew` | Subscription will not renew | Send retention email, flag account |
| `invoice.create` | New invoice generated | Store invoice record |
| `invoice.payment_failed` | Payment attempt failed | Send payment failure notification, retry logic |
| `transfer.success` | Payout completed | Update revenue records |
| `refund.processed` | Refund was processed | Update billing, adjust revenue |

**Payload Example — Successful Charge:**
```json
{
  "event": "charge.success",
  "data": {
    "id": 123456789,
    "domain": "live",
    "status": "success",
    "reference": "ref_abc123",
    "amount": 12000000,
    "currency": "NGN",
    "channel": "card",
    "customer": {
      "id": 987654,
      "email": "client@example.com",
      "customer_code": "CUS_abc123"
    },
    "plan": {
      "id": 54321,
      "name": "Professional Plan",
      "plan_code": "PLN_professional",
      "amount": 12000000,
      "interval": "monthly"
    },
    "paid_at": "2025-07-01T10:00:00.000Z"
  }
}
```

> **Note:** Amounts in Paystack are in kobo (1/100 of Naira). ₦120,000 = 12,000,000 kobo.

### 31.3 Flutterwave Webhooks

**Endpoint:** `POST /api/webhooks/flutterwave`

Flutterwave serves as an alternative payment processor, particularly for international payments.

**Verification:**
Flutterwave sends a `verif-hash` header that must match the secret hash configured in your Flutterwave dashboard.

**Event Types:**

| Event | Description | CRM Action |
|-------|-------------|------------|
| `charge.completed` | Payment completed | Activate/renew subscription |
| `subscription.cancelled` | Subscription cancelled | Mark for downgrade |
| `transfer.completed` | Payout completed | Update revenue records |

### 31.4 Shopify Webhooks

**Endpoint:** `POST /api/webhooks/shopify`

Shopify webhooks synchronize e-commerce data with the CRM for cart abandonment recovery and customer tracking.

**Verification:**
Shopify signs webhooks with HMAC SHA-256 using the shared secret. The CRM verifies the `X-Shopify-Hmac-Sha256` header.

**Event Types:**

| Event | Description | CRM Action |
|-------|-------------|------------|
| `orders/create` | New order placed | Create purchase record, update contact, trigger post-purchase campaign |
| `orders/updated` | Order status changed | Update purchase record |
| `orders/cancelled` | Order cancelled | Update purchase record, trigger recovery flow |
| `checkouts/create` | Checkout started | Start cart abandonment timer |
| `checkouts/update` | Checkout updated | Update cart data |
| `customers/create` | New customer registered | Create or update contact |
| `customers/update` | Customer info changed | Update contact details |
| `products/create` | New product added | Sync to product catalog |
| `products/update` | Product changed | Update product catalog |
| `products/delete` | Product removed | Remove from product catalog |

**Payload Example — New Order:**
```json
{
  "id": 820982911946154508,
  "email": "customer@example.com",
  "phone": "+2348098765432",
  "total_price": "45000.00",
  "currency": "NGN",
  "financial_status": "paid",
  "fulfillment_status": null,
  "line_items": [
    {
      "id": 866550311766439020,
      "title": "Premium Hair Oil",
      "quantity": 2,
      "price": "15000.00"
    },
    {
      "id": 141249953214522974,
      "title": "Silk Bonnet",
      "quantity": 1,
      "price": "15000.00"
    }
  ],
  "customer": {
    "id": 115310627314723954,
    "email": "customer@example.com",
    "first_name": "Ngozi",
    "last_name": "Okonkwo",
    "phone": "+2348098765432"
  },
  "created_at": "2025-07-01T14:30:00+01:00"
}
```

### 31.5 WooCommerce Webhooks

**Endpoint:** `POST /api/webhooks/woocommerce`

WooCommerce webhooks provide the same e-commerce synchronization for WordPress-based stores.

**Verification:**
WooCommerce signs webhooks with HMAC SHA-256 using the webhook secret. The CRM verifies the `X-WC-Webhook-Signature` header.

**Event Types:**

| Event | Description | CRM Action |
|-------|-------------|------------|
| `order.created` | New order placed | Create purchase record, update contact |
| `order.updated` | Order status changed | Update purchase record |
| `order.deleted` | Order deleted | Remove purchase record |
| `customer.created` | New customer registered | Create or update contact |
| `customer.updated` | Customer info changed | Update contact details |
| `product.created` | New product added | Sync to product catalog |
| `product.updated` | Product changed | Update product catalog |
| `product.deleted` | Product removed | Remove from product catalog |

**WooCommerce Webhook Setup:**
1. In WordPress admin, go to **WooCommerce → Settings → Advanced → Webhooks**
2. Click **Add Webhook**
3. Set the Delivery URL to `https://crm.marketing4effect.com/api/webhooks/woocommerce`
4. Set Status to **Active**
5. Select the Topic (e.g., "Order created")
6. Set Secret to match the value in CRM Settings → E-Commerce
7. Click **Save Webhook**
8. Repeat for each event type you want to track

---

## 32. Cron Jobs & Scheduled Tasks

The CRM uses cron jobs to execute recurring background tasks. These are triggered by external cron services (e.g., Vercel Cron, cron-job.org, or UptimeRobot) that call specific API endpoints at regular intervals.

### 32.1 Cron Endpoints Overview

| Endpoint | Schedule | Purpose |
|----------|----------|----------|
| `/api/automations/cron` | Every 5 minutes | Execute scheduled automations and process automation queues |
| `/api/campaigns/triggers/cron` | Every 5 minutes | Check campaign triggers, advance campaign stages, send scheduled messages |
| `/api/flows/cron` | Every 5 minutes | Process active flow runs, advance flow steps, handle timeouts |
| `/api/cron/monitoring` | Every 10 minutes | Check system health, generate alerts, update monitoring dashboard |
| `/api/ecommerce/carts/cron` | Every 15 minutes | Detect abandoned carts, trigger cart recovery campaigns |

### 32.2 Authentication

All cron endpoints require the `AUTOMATION_CRON_SECRET` for authentication:

```bash
curl -X GET "https://crm.marketing4effect.com/api/automations/cron"   -H "Authorization: Bearer YOUR_AUTOMATION_CRON_SECRET"
```

The secret is stored as an environment variable in Vercel and must match the value in the Supabase `system_config` table.

> **Warning:** Never expose the `AUTOMATION_CRON_SECRET` in client-side code, public repositories, or logs. Rotate the secret immediately if compromised.

### 32.3 Automations Cron

**Endpoint:** `GET /api/automations/cron`
**Schedule:** Every 5 minutes

**What It Does:**
1. Queries all active automations with `trigger_type = "scheduled"`
2. Checks if the scheduled time has elapsed since the last execution
3. Evaluates trigger conditions for each automation
4. Executes matching automations by processing their step sequences
5. Logs execution results (success/failure, contacts processed, messages sent)
6. Updates the `last_run_at` timestamp

**Processing Logic:**
- Automations are processed in priority order (lower number = higher priority)
- Each automation has a maximum execution time of 30 seconds
- If an automation fails, it is retried up to 3 times with exponential backoff
- Failed automations after 3 retries are marked as `error` and an alert is generated

### 32.4 Campaign Triggers Cron

**Endpoint:** `GET /api/campaigns/triggers/cron`
**Schedule:** Every 5 minutes

**What It Does:**
1. Queries all campaigns with status `active` or `scheduled`
2. For scheduled campaigns: checks if the scheduled start time has arrived, activates the campaign
3. For active campaigns: processes the next batch of messages in the send queue
4. Evaluates campaign triggers (e.g., contact enters a segment, tag is added)
5. Advances multi-step campaigns to the next step based on timing rules
6. Updates campaign metrics (sent, delivered, read, replied counts)
7. Checks for campaign completion conditions and marks completed campaigns

**Batch Processing:**
- Messages are sent in batches of 50 to respect WhatsApp API rate limits
- A 1-second delay is inserted between each message to avoid throttling
- If the WhatsApp API returns a rate limit error, the batch is paused and retried in the next cron cycle

### 32.5 Flows Cron

**Endpoint:** `GET /api/flows/cron`
**Schedule:** Every 5 minutes

**What It Does:**
1. Queries all active flow runs (contacts currently progressing through a flow)
2. Checks for timeout conditions (e.g., contact hasn't responded within the configured wait time)
3. Advances flows that have completed their wait period
4. Processes condition nodes and routes contacts to the appropriate branch
5. Executes action nodes (send message, set tag, create deal)
6. Marks completed flow runs
7. Handles flow errors and retries

### 32.6 System Monitoring Cron

**Endpoint:** `GET /api/cron/monitoring`
**Schedule:** Every 10 minutes

**What It Does:**
1. Checks connectivity to all external services (WhatsApp API, Supabase, OpenRouter, Brevo)
2. Measures response times for each service
3. Checks database connection pool health
4. Monitors disk usage and memory consumption
5. Checks for stale cron jobs (jobs that haven't run in 2× their expected interval)
6. Generates alerts for any degraded or failed components
7. Updates the monitoring dashboard with current status
8. Sends notifications for critical alerts (email to Super Admins)

### 32.7 Cart Abandonment Cron

**Endpoint:** `GET /api/ecommerce/carts/cron`
**Schedule:** Every 15 minutes

**What It Does:**
1. Queries all checkout events from Shopify/WooCommerce that are older than 1 hour but have no corresponding order
2. Marks these as abandoned carts
3. Matches cart data to existing CRM contacts (by email or phone)
4. Creates new contacts for unrecognized customers
5. Triggers the cart-abandonment campaign for eligible contacts
6. Applies the `cart-abandoned` tag
7. Logs cart abandonment metrics

### 32.8 Configuring External Cron Services

**Option 1: Vercel Cron (Recommended)**

Add to `vercel.json`:
```json
{
  "crons": [
    {"path": "/api/automations/cron", "schedule": "*/5 * * * *"},
    {"path": "/api/campaigns/triggers/cron", "schedule": "*/5 * * * *"},
    {"path": "/api/flows/cron", "schedule": "*/5 * * * *"},
    {"path": "/api/cron/monitoring", "schedule": "*/10 * * * *"},
    {"path": "/api/ecommerce/carts/cron", "schedule": "*/15 * * * *"}
  ]
}
```

> **Note:** Vercel Cron is available on Pro and Enterprise plans. For the Hobby plan, use an external service.

**Option 2: cron-job.org (Free)**
1. Create an account at cron-job.org
2. Add a new cron job for each endpoint
3. Set the URL, schedule, and add the Authorization header
4. Enable notifications for failures

**Option 3: UptimeRobot**
1. Create HTTP(s) monitors for each cron endpoint
2. Set the check interval to match the desired schedule
3. Add the Authorization header in advanced settings

---

## 33. Security Procedures

Security is built into every layer of the M4E WhatsApp CRM, from database access policies to API authentication and data protection.

### 33.1 Row-Level Security (RLS)

Supabase Row-Level Security ensures that every database query is automatically filtered to only return data belonging to the authenticated user's account.

**How RLS Works:**
1. Every table with tenant data has an `account_id` column
2. RLS policies are defined on each table that check `account_id` against the authenticated user's account
3. Even if application code has a bug that doesn't filter by account, RLS prevents data leakage
4. Super Admins bypass RLS for administrative functions

**Example RLS Policy:**
```sql
CREATE POLICY "Users can only view their own account contacts"
  ON contacts
  FOR SELECT
  USING (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can only insert contacts in their own account"
  ON contacts
  FOR INSERT
  WITH CHECK (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()));
```

**Tables with RLS Policies:**

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `contacts` | ✅ | ✅ | ✅ | ✅ |
| `messages` | ✅ | ✅ | ✅ | ❌ |
| `conversations` | ✅ | ✅ | ✅ | ✅ |
| `campaigns` | ✅ | ✅ | ✅ | ✅ |
| `automations` | ✅ | ✅ | ✅ | ✅ |
| `flows` | ✅ | ✅ | ✅ | ✅ |
| `deals` | ✅ | ✅ | ✅ | ✅ |
| `products` | ✅ | ✅ | ✅ | ✅ |
| `tags` | ✅ | ✅ | ✅ | ✅ |
| `custom_fields` | ✅ | ✅ | ✅ | ✅ |
| `branches` | ✅ | ✅ | ✅ | ✅ |
| `team_members` | ✅ | ✅ | ✅ | ✅ |
| `broadcasts` | ✅ | ✅ | ✅ | ✅ |
| `whatsapp_flows` | ✅ | ✅ | ✅ | ✅ |
| `qr_codes` | ✅ | ✅ | ✅ | ✅ |
| `knowledge_base` | ✅ | ✅ | ✅ | ✅ |

### 33.2 Role-Based Access Control (RBAC)

See Section 21.3 for the complete permission matrix. RBAC is enforced at two levels:

1. **API Level:** Each API endpoint checks the user's role before processing the request
2. **UI Level:** Navigation items, buttons, and forms are conditionally rendered based on the user's role

**Role Hierarchy:**
```
Owner > Admin > Agent > Viewer
```

Each role inherits all permissions of the roles below it, plus additional capabilities.

### 33.3 API Key Encryption

Sensitive credentials stored in the database are encrypted at rest:

| Credential | Encryption Method | Storage Location |
|-----------|-------------------|------------------|
| WhatsApp Access Token | AES-256-GCM | `account_settings.whatsapp_access_token` |
| Brevo API Key | AES-256-GCM | `account_settings.email_api_key` |
| Shopify API Secret | AES-256-GCM | `account_settings.shopify_api_secret` |
| WooCommerce Consumer Secret | AES-256-GCM | `account_settings.woocommerce_consumer_secret` |
| OpenRouter API Key | AES-256-GCM | `account_settings.openrouter_api_key` |

**Encryption Process:**
1. The `ENCRYPTION_KEY` environment variable provides the master encryption key
2. Each credential is encrypted with a unique initialization vector (IV)
3. The IV is stored alongside the encrypted data
4. Decryption only occurs server-side when the credential is needed for an API call
5. Encrypted values are never sent to the client/browser

### 33.4 NDPR Compliance

The Nigeria Data Protection Regulation (NDPR) and Nigeria Data Protection Act (NDPA) govern how the CRM handles personal data of Nigerian citizens.

**Compliance Measures:**

| Requirement | Implementation |
|------------|----------------|
| **Lawful Basis** | Consent collected during contact import and WhatsApp opt-in |
| **Data Minimization** | Only necessary contact fields are required |
| **Purpose Limitation** | Data is used only for the stated business communication purposes |
| **Storage Limitation** | Data retention policies with configurable deletion schedules |
| **Data Subject Rights** | Contacts can request data export and deletion via WhatsApp |
| **Data Protection Officer** | M4E designates a DPO for compliance oversight |
| **Breach Notification** | Automated breach detection with 72-hour notification procedure |
| **Cross-Border Transfer** | Data stored in Supabase (AWS) with appropriate safeguards |
| **Privacy Impact Assessment** | Conducted for all new features handling personal data |

### 33.5 Data Protection Measures

| Layer | Protection |
|-------|------------|
| **Transport** | All traffic encrypted with TLS 1.3 (HTTPS) |
| **Database** | Supabase encrypts data at rest with AES-256 |
| **Application** | Sensitive fields encrypted with application-level AES-256-GCM |
| **Backups** | Supabase automated backups with point-in-time recovery |
| **Access Logs** | All data access is logged with user identity and timestamp |
| **Session Management** | JWT tokens with 1-hour expiry, refresh tokens with 7-day expiry |

### 33.6 Brute Force Protection

| Threshold | Action |
|-----------|--------|
| 5 failed logins in 15 minutes | Temporary IP block (30 minutes) |
| 10 failed logins in 1 hour | Extended IP block (24 hours) |
| 20 failed logins in 24 hours | Permanent IP block (requires manual unblock) |
| 3 failed logins for same account | Account temporarily locked (15 minutes) |
| 5 failed logins for same account | Account locked, password reset required |

### 33.7 Session Management

| Setting | Value |
|---------|-------|
| **Access Token Lifetime** | 1 hour |
| **Refresh Token Lifetime** | 7 days |
| **Maximum Concurrent Sessions** | 5 per user |
| **Session Invalidation** | On password change, role change, or account suspension |
| **Idle Timeout** | 30 minutes of inactivity |
| **Secure Cookies** | HttpOnly, Secure, SameSite=Lax |

---

## 34. White-Label Partner Guide

The M4E WhatsApp CRM supports white-label deployment, allowing partners to offer the CRM under their own brand to their clients.

### 34.1 What is White-Labeling?

White-labeling allows a partner (e.g., a marketing agency, consulting firm, or technology reseller) to:
- Deploy the CRM under their own domain (e.g., `crm.partneragency.com`)
- Apply their own branding (logo, colors, fonts)
- Manage their own client accounts
- Set their own pricing and billing
- Provide their own support

The underlying technology, features, and updates are provided by M4E.

### 34.2 Setting Up a White-Label Instance

**Step 1: Infrastructure Setup**
1. Fork the M4E WhatsApp CRM repository (or receive a private copy)
2. Create a new Supabase project for the partner
3. Run all database migrations
4. Deploy to Vercel under the partner's account
5. Configure the partner's custom domain

**Step 2: Branding Customization**

| Element | How to Customize |
|---------|------------------|
| **Logo** | Replace `/public/logo.svg` and `/public/logo-icon.svg` |
| **Favicon** | Replace `/public/favicon.ico` and `/public/favicon.svg` |
| **App Name** | Update `NEXT_PUBLIC_APP_NAME` in `.env.local` |
| **Colors** | Modify the theme configuration in `src/lib/themes.ts` |
| **Fonts** | Update font imports in `src/app/layout.tsx` |
| **Email Templates** | Customize email templates in `templates/` directory |
| **Login Page** | Modify branding in `src/app/(auth)/login/page.tsx` |
| **Sidebar** | Update logo and branding in `src/components/layout/sidebar.tsx` |

**Step 3: Environment Configuration**

The partner must configure their own environment variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Partner's Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Partner's Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Partner's Supabase service role key |
| `ENCRYPTION_KEY` | Unique encryption key for the partner instance |
| `AUTOMATION_CRON_SECRET` | Unique cron secret for the partner instance |
| `NEXT_PUBLIC_APP_NAME` | Partner's app name |
| `NEXT_PUBLIC_APP_URL` | Partner's domain URL |

**Step 4: WhatsApp Business API**
Each partner must have their own Meta Business account and WhatsApp Business API access. Client accounts under the partner use the partner's WABA or their own individual WABAs.

### 34.3 Partner Onboarding Process

| Step | Timeline | Description |
|------|----------|-------------|
| 1. Agreement | Day 1 | Sign white-label partnership agreement |
| 2. Technical Setup | Days 2-3 | Infrastructure provisioning, deployment, domain configuration |
| 3. Branding | Days 3-4 | Apply partner branding, customize themes |
| 4. Testing | Days 4-5 | End-to-end testing of all features |
| 5. Training | Days 5-7 | Train partner team on CRM administration |
| 6. Launch | Day 7 | Go live with partner's first client |
| 7. Support Handoff | Day 7+ | Partner provides Tier 1 support, M4E provides Tier 2/3 |

### 34.4 Partner Admin Access

Partners receive Super Admin access on their own instance, giving them full control over:
- All client accounts on their instance
- Platform analytics and monitoring
- Revenue tracking for their clients
- System configuration and settings
- User management and access control

**Support Tiers:**

| Tier | Provider | Scope |
|------|----------|-------|
| **Tier 1** | Partner | Client-facing support, how-to questions, basic troubleshooting |
| **Tier 2** | M4E | Technical issues, bug reports, configuration problems |
| **Tier 3** | M4E | Infrastructure issues, security incidents, feature development |

### 34.5 Partner Pricing Model

Partners pay M4E a wholesale rate and set their own retail pricing:

| M4E Wholesale | Partner Retail (Suggested) | Partner Margin |
|--------------|---------------------------|----------------|
| ₦30,000/month per account | ₦50,000-75,000/month | 40-60% |
| ₦75,000/month per account (premium) | ₦120,000-180,000/month | 37-58% |
| ₦150,000/month per account (enterprise) | ₦250,000-400,000/month | 40-63% |

Partners handle their own billing and collections. M4E invoices partners monthly based on active account count.

### 34.6 Update Management

M4E releases updates to the CRM platform regularly. Partners can:
- **Auto-update:** Configure automatic deployment from the M4E upstream repository
- **Manual update:** Review changes and merge selectively
- **Custom features:** Partners can add custom features to their fork (M4E does not support custom code)

> **Note:** Partners who diverge significantly from the upstream codebase may experience merge conflicts during updates. It is recommended to keep customizations limited to branding and configuration.



## 35. CRM Pricing Tiers

The M4E WhatsApp CRM is offered as a SaaS product with three subscription tiers designed for Nigerian mid-market businesses.

### 35.1 Pricing Overview

| Feature | Starter | Professional | Business |
|---------|---------|-------------|----------|
| **Monthly Price** | ₦50,000/mo | ₦120,000/mo | ₦250,000/mo |
| **Annual Price** | ₦500,000/yr (save ₦100K) | ₦1,200,000/yr (save ₦240K) | ₦2,500,000/yr (save ₦500K) |
| **Annual Discount** | 17% off | 17% off | 17% off |
| **Contacts** | Up to 1,000 | Up to 5,000 | Up to 25,000 |
| **Team Members** | 2 | 5 | 15 |
| **Branches** | 1 | 3 | 10 |
| **WhatsApp Messages/mo** | 5,000 | 25,000 | 100,000 |
| **Campaigns/mo** | 3 | 10 | Unlimited |
| **Broadcasts/mo** | 5 | 20 | Unlimited |
| **Automations** | 3 | 10 | Unlimited |
| **Visual Flows** | 2 | 5 | Unlimited |
| **Campaign Templates** | Tier 1 only (4 templates) | Tier 1 + Tier 2 (10 templates) | All tiers (14 templates) |
| **AI Chatbot** | ❌ | ✅ (500 conversations/mo) | ✅ (Unlimited) |
| **Knowledge Base Entries** | ❌ | 50 | Unlimited |
| **E-Commerce Integration** | ❌ | ✅ (1 store) | ✅ (3 stores) |
| **Cart Abandonment Recovery** | ❌ | ✅ | ✅ |
| **QR Code Generator** | ✅ (5 codes) | ✅ (20 codes) | ✅ (Unlimited) |
| **WhatsApp Flows** | ❌ | ✅ (3 flows) | ✅ (Unlimited) |
| **CTWA Ad Tracking** | ❌ | ✅ | ✅ |
| **Sentiment Analysis** | ❌ | ✅ | ✅ |
| **Recency Scoring** | Basic (manual thresholds) | Advanced (adaptive mode) | Advanced (adaptive mode) |
| **Custom Fields** | 5 | 15 | Unlimited |
| **Deal Pipelines** | 1 | 3 | 10 |
| **Email Notifications** | 100/day | 300/day | 1,000/day |
| **Data Export** | CSV only | CSV + JSON | CSV + JSON + API |
| **API Access** | ❌ | Read-only | Full read/write |
| **White-Label** | ❌ | ❌ | ✅ (add-on) |
| **Dedicated Support** | Email (48hr response) | Email + WhatsApp (24hr) | Priority (4hr) + Phone |
| **Onboarding** | Self-service | Guided (1 session) | Full onboarding (3 sessions) |
| **Training** | Help docs only | Help docs + 1 video call | Help docs + 3 video calls + on-site option |

### 35.2 Campaign Template Tiers

| Tier | Templates Included | Available In |
|------|-------------------|-------------|
| **Tier 1** | win-back-dormant, birthday-anniversary, post-purchase-followup, vip-exclusive | Starter, Professional, Business |
| **Tier 2** | cart-abandonment, seasonal-promotion, referral-program, feedback-collection, new-product-launch, loyalty-program, sentiment-recovery | Professional, Business |
| **Tier 3** | whatsapp-flow-survey, catalog-browse, ad-lead-nurture | Business only |

### 35.3 WhatsApp API Costs (Pass-Through)

WhatsApp Business API charges per-conversation fees that are passed through to the client at cost:

| Conversation Type | Cost (Nigeria) | Description |
|------------------|----------------|-------------|
| **Marketing** | ~₦40-60/conversation | Business-initiated promotional messages |
| **Utility** | ~₦20-30/conversation | Business-initiated transactional messages |
| **Authentication** | ~₦15-25/conversation | OTP and verification messages |
| **Service** | Free | Customer-initiated conversations (24hr window) |

> **Note:** WhatsApp API costs are separate from the CRM subscription and are billed based on actual usage. Meta updates pricing periodically. The first 1,000 service conversations per month are free.

### 35.4 Competitor Comparison

| Feature | M4E CRM | Respond.io | WATI | Interakt |
|---------|---------|-----------|------|----------|
| **Starting Price** | ₦50,000/mo (~$30) | $79/mo | $49/mo | $15/mo |
| **Nigerian Market Focus** | ✅ Native | ❌ | ❌ | ❌ |
| **Naira Billing** | ✅ | ❌ (USD only) | ❌ (USD only) | ❌ (USD only) |
| **Campaign Templates** | 14 pre-built | Generic | 5 basic | 3 basic |
| **Recency Scoring** | ✅ Advanced | ❌ | ❌ | ❌ |
| **Visual Flow Builder** | ✅ | ✅ | ✅ | Basic |
| **AI Chatbot** | ✅ (OpenRouter) | ✅ (proprietary) | ✅ (basic) | ❌ |
| **E-Commerce Integration** | ✅ Shopify + WooCommerce | ✅ | ✅ Shopify only | ✅ Shopify only |
| **Sentiment Analysis** | ✅ + Pidgin support | ❌ | ❌ | ❌ |
| **NDPR Compliance** | ✅ Built-in | ❌ | ❌ | ❌ |
| **Local Support** | ✅ WhatsApp + Phone | Email only | Email only | Email only |
| **White-Label** | ✅ | Enterprise only | ❌ | ❌ |
| **Multi-Branch** | ✅ | ❌ | ❌ | ❌ |

### 35.5 Upsell Opportunities

When engaging with clients on pricing, highlight these upgrade triggers:

| Trigger | Current Plan | Recommended Upgrade |
|---------|-------------|--------------------|
| Contact limit approaching 80% | Starter | Professional |
| Requesting AI chatbot | Starter | Professional |
| Wanting e-commerce integration | Starter | Professional |
| Multiple store locations | Professional | Business |
| Needing API access | Starter/Professional | Business |
| Wanting white-label | Any | Business + White-Label add-on |
| Campaign template limitations | Starter | Professional |
| Team size exceeding limit | Any | Next tier up |

---

## 36. Deployment & DevOps

The M4E WhatsApp CRM is deployed on Vercel with Supabase as the backend database and authentication provider.

### 36.1 Technology Stack

| Layer | Technology | Version |
|-------|-----------|----------|
| **Frontend** | Next.js (App Router) | 14+ |
| **UI Framework** | Tailwind CSS | 3.x |
| **Component Library** | shadcn/ui | Latest |
| **State Management** | React hooks + Context | — |
| **Database** | PostgreSQL (Supabase) | 15 |
| **Authentication** | Supabase Auth | — |
| **Real-time** | Supabase Realtime | — |
| **File Storage** | Supabase Storage | — |
| **Hosting** | Vercel | — |
| **AI/LLM** | OpenRouter | — |
| **Email** | Brevo (Sendinblue) | — |
| **WhatsApp** | Meta Cloud API | v18+ |
| **Payments** | Paystack, Flutterwave | — |
| **E-Commerce** | Shopify API, WooCommerce REST API | — |

### 36.2 Vercel Deployment

**Deployment Flow:**
1. Developer pushes code to `main` branch on GitHub
2. Vercel automatically detects the push and starts a build
3. Next.js builds the application (SSR + SSG pages)
4. Vercel deploys to the edge network
5. The production URL updates: `https://crm.marketing4effect.com`

**Branch Deployments:**
- `main` → Production (`crm.marketing4effect.com`)
- `develop` → Staging (`staging-crm.marketing4effect.com`)
- Feature branches → Preview URLs (`m4e-whatsapp-crm-[hash].vercel.app`)

**Build Configuration:**
```json
{
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

### 36.3 Environment Variables

All environment variables are configured in Vercel's project settings:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | ✅ |
| `SUPABASE_DB_PASSWORD` | Direct database password | ✅ |
| `ENCRYPTION_KEY` | AES-256 encryption key for credentials | ✅ |
| `AUTOMATION_CRON_SECRET` | Secret for authenticating cron job requests | ✅ |
| `NEXT_PUBLIC_APP_URL` | Production URL of the CRM | ✅ |
| `NEXT_PUBLIC_APP_NAME` | Application name displayed in UI | ✅ |
| `BREVO_API_KEY` | Brevo email service API key | ✅ |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI chatbot | Optional |
| `PAYSTACK_SECRET_KEY` | Paystack payment processing secret | Optional |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave payment processing secret | Optional |

> **Warning:** Never commit `.env.local` to version control. Use `.env.local.example` as a template.

### 36.4 Supabase Configuration

**Project Details:**
- **Project ID:** `bxryvqxrcujrqipvcjoa`
- **Region:** West Africa (or nearest available)
- **Database:** PostgreSQL 15
- **Migrations:** 48 migration files in `supabase/migrations/`

**Running Migrations:**
```bash
# Link to the Supabase project
npx supabase link --project-ref bxryvqxrcujrqipvcjoa

# Push all migrations
npx supabase db push

# Create a new migration
npx supabase migration new <migration_name>
```

**Database Backup:**
- Supabase provides automatic daily backups with 7-day retention (Pro plan)
- Point-in-time recovery is available on the Pro plan
- Manual backups can be triggered from the Supabase dashboard

### 36.5 GitHub Workflow

**Repository:** `kembah17/m4e-whatsapp-crm`

**Branch Strategy:**
- `main` — Production-ready code
- `develop` — Integration branch for features
- `feature/*` — Individual feature branches
- `hotfix/*` — Emergency production fixes

**CI/CD Pipeline (GitHub Actions):**
```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx tsc --noEmit

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
```

### 36.6 Domain Setup

| Domain | Purpose | DNS Configuration |
|--------|---------|-------------------|
| `crm.marketing4effect.com` | Production CRM | CNAME → `cname.vercel-dns.com` |
| `marketing4effect.com` | Main website | A → Vercel IP |
| `staging-crm.marketing4effect.com` | Staging environment | CNAME → `cname.vercel-dns.com` |

**SSL:** Vercel automatically provisions and renews SSL certificates via Let's Encrypt.

### 36.7 Codebase Statistics

| Metric | Count |
|--------|-------|
| **Total Lines of Code** | 83,359 |
| **Database Migrations** | 48 |
| **API Routes** | 88 |
| **Frontend Pages** | 38 |
| **React Components** | 137 |
| **Library Modules** | 111 |
| **Campaign Templates** | 14 |
| **Dark Themes** | 6 |

---

## 37. Troubleshooting Guide

This section covers common issues encountered when operating the CRM, organized by category with Problem, Cause, and Solution for each.

### 37.1 Login Issues

| # | Problem | Cause | Solution |
|---|---------|-------|----------|
| 1 | "Invalid login credentials" error | Wrong email or password | Verify email address, use "Forgot Password" to reset |
| 2 | "Account suspended" message | Super Admin suspended the account | Contact M4E support to resolve suspension |
| 3 | "Account locked" message | Too many failed login attempts | Wait 15 minutes for auto-unlock, or reset password |
| 4 | Login page loads but submit button does nothing | JavaScript error or browser extension conflict | Clear browser cache, disable extensions, try incognito mode |
| 5 | "Session expired" after login | Access token expired, refresh token failed | Clear cookies, log in again. If persistent, check Supabase auth settings |
| 6 | Invitation link says "Invalid or expired" | Invitation expired (7-day limit) | Ask the account admin to resend the invitation |
| 7 | Can't access admin panel after login | User is not flagged as Super Admin | Verify `is_super_admin = true` in the `profiles` table in Supabase |

### 37.2 WhatsApp Issues

| # | Problem | Cause | Solution |
|---|---------|-------|----------|
| 1 | "WhatsApp not connected" status | Missing or invalid API credentials | Re-enter Phone Number ID, WABA ID, and Access Token in Settings → WhatsApp |
| 2 | Messages not sending | Access token expired | Generate a new permanent token in Meta Developer Portal |
| 3 | Messages sending but not delivered | Recipient hasn't opted in, or number is invalid | Verify the recipient's number, ensure they've messaged the business first |
| 4 | Template messages rejected | Template not approved by Meta | Check template status in Settings → Templates, fix and resubmit |
| 5 | Webhook not receiving messages | Webhook URL misconfigured in Meta | Verify webhook URL and verify token in Meta Developer Portal |
| 6 | Duplicate messages appearing | Webhook being called multiple times | Check for duplicate webhook subscriptions in Meta, ensure idempotency |
| 7 | Media messages failing | File too large or unsupported format | Check WhatsApp media limits: images 5MB, video 16MB, audio 16MB, documents 100MB |
| 8 | "Rate limit exceeded" error | Sending too many messages too quickly | Reduce batch size, add delays between messages, check Meta rate limits |
| 9 | Messages showing as "sent" but never "delivered" | Phone number quality rating dropped | Check phone number quality in Meta Business Suite, reduce message volume |

### 37.3 Campaign Issues

| # | Problem | Cause | Solution |
|---|---------|-------|----------|
| 1 | Campaign stuck in "Scheduled" status | Cron job not running | Verify cron endpoints are configured and the `AUTOMATION_CRON_SECRET` is correct |
| 2 | Campaign shows 0 audience | Audience filter matches no contacts | Review audience criteria, check tag assignments and segment membership |
| 3 | Low delivery rate (<80%) | Many invalid numbers or opted-out contacts | Clean contact list, remove invalid numbers, verify opt-in status |
| 4 | Campaign template not appearing | Template not approved or wrong category | Check template status in Settings → Templates, sync from Meta |
| 5 | Multi-step campaign not advancing | Wait step duration not elapsed, or cron not running | Check step timing configuration, verify cron job execution |
| 6 | Campaign metrics not updating | Webhook not processing status updates | Check webhook logs for errors, verify WhatsApp webhook subscription includes "statuses" |
| 7 | "Insufficient plan" error | Campaign template tier exceeds plan | Upgrade to a plan that includes the required template tier |

### 37.4 Import Issues

| # | Problem | Cause | Solution |
|---|---------|-------|----------|
| 1 | Import fails with "Invalid CSV" | File encoding or format issue | Save CSV as UTF-8, ensure comma-separated (not semicolon), remove BOM |
| 2 | Many rows skipped as duplicates | Contacts already exist with same phone/email | This is expected behavior — duplicates are skipped to prevent data corruption |
| 3 | Phone numbers not matching | Country code format mismatch | Ensure all numbers include country code (e.g., +234 or 234), no spaces or dashes |
| 4 | Custom fields not importing | Column names don't match custom field names | Ensure CSV column headers exactly match custom field names (case-sensitive) |
| 5 | Import hangs or times out | CSV file too large (>10,000 rows) | Split into smaller files (5,000 rows max per import), or use the API for bulk import |
| 6 | Tags not applied during import | Tag names misspelled or don't exist | Create tags first in Settings → Tags, then use exact tag names in the import |

### 37.5 AI Chatbot Issues

| # | Problem | Cause | Solution |
|---|---------|-------|----------|
| 1 | Chatbot not responding | AI chatbot disabled or no API key | Enable chatbot in Settings → AI Chatbot, verify OpenRouter API key |
| 2 | Chatbot giving wrong answers | Knowledge base incomplete or outdated | Update knowledge base entries, add more FAQ pairs, refine system prompt |
| 3 | Chatbot responding in English when Pidgin expected | System prompt doesn't specify language | Add language instructions to the system prompt (e.g., "Respond in Nigerian Pidgin when the customer writes in Pidgin") |
| 4 | Chatbot not handing off to human | Handoff triggers not configured | Configure handoff keywords and confidence threshold in chatbot settings |
| 5 | High chatbot costs | Too many conversations or high token usage | Reduce max tokens, increase confidence threshold, add more knowledge base entries to reduce fallback to LLM |
| 6 | "API key invalid" error | OpenRouter API key expired or incorrect | Generate a new API key at openrouter.ai and update in settings |
| 7 | Chatbot responding to agent messages | Chatbot active during human conversation | Implement conversation assignment — chatbot should pause when an agent is assigned |

### 37.6 E-Commerce Issues

| # | Problem | Cause | Solution |
|---|---------|-------|----------|
| 1 | Shopify connection failing | Invalid API credentials | Regenerate API key and secret in Shopify admin, re-enter in CRM |
| 2 | Orders not syncing | Webhooks not configured in Shopify | Set up order webhooks in Shopify pointing to `/api/webhooks/shopify` |
| 3 | Cart abandonment not detecting | Cart cron not running or threshold too short | Verify cart cron endpoint, check abandonment threshold (default: 1 hour) |
| 4 | Product catalog out of sync | Manual product changes not triggering webhooks | Click "Sync Catalog" in E-Commerce settings, or set up product webhooks |
| 5 | WooCommerce webhook verification failing | Secret mismatch | Ensure the webhook secret in WooCommerce matches the value in CRM settings |
| 6 | Duplicate orders appearing | Webhook retry delivering same event | Check for idempotency handling, verify webhook is returning 200 status |

### 37.7 Performance Issues

| # | Problem | Cause | Solution |
|---|---------|-------|----------|
| 1 | Dashboard loading slowly | Too many contacts or messages to aggregate | Check database indexes, consider pagination for large datasets |
| 2 | Inbox messages loading slowly | Large conversation history | Implement message pagination (load last 50 messages, load more on scroll) |
| 3 | Contact list taking long to load | No pagination or filtering | Use server-side pagination, add filters to reduce result set |
| 4 | Campaign creation wizard lagging | Large audience preview calculation | Defer audience count to background calculation, show estimate |
| 5 | API responses timing out | Complex queries or missing indexes | Check Supabase query performance, add appropriate database indexes |
| 6 | Vercel function timeout (10s limit) | Long-running operations | Move to background processing with cron jobs, use Vercel Pro for 60s limit |
| 7 | Real-time updates not appearing | WebSocket connection dropped | Refresh the page, check Supabase Realtime quotas |

---

## 38. Glossary

Alphabetical reference of all key terms used in the M4E WhatsApp CRM.

| Term | Definition |
|------|------------|
| **Access Token** | A credential issued by Meta that authenticates API requests to the WhatsApp Business API. Must be kept secret and rotated if compromised. |
| **Account** | A tenant in the CRM representing one business. Each account has its own contacts, messages, campaigns, and settings, isolated from other accounts. |
| **Active Contact** | A contact whose last purchase or interaction falls within the "Active" threshold defined in Recency Settings. |
| **Adaptive Thresholds** | A recency scoring feature that automatically adjusts segment boundaries based on actual purchase patterns in the account's data. |
| **Admin** | A user role with full access to all CRM features except billing, account deletion, and security settings. |
| **Agent** | A user role that can manage contacts, conversations, and campaigns but cannot modify settings or delete data. |
| **API** | Application Programming Interface — the set of HTTP endpoints that allow programmatic access to CRM data and functions. |
| **At Risk Contact** | A contact whose last purchase falls within the "At Risk" threshold, indicating they may stop buying soon. |
| **Automation** | A rule-based workflow that executes actions (send message, add tag, create deal) when specific triggers occur (message received, tag added, keyword match). |
| **Branch** | A subdivision of an account representing a physical business location. Contacts and metrics can be filtered by branch. |
| **Broadcast** | A one-time message sent to a group of contacts using a WhatsApp template. Unlike campaigns, broadcasts are single-send with no follow-up sequence. |
| **Campaign** | A multi-step, goal-oriented messaging program that targets a specific audience segment with a sequence of messages over time. |
| **Campaign Template** | A pre-built campaign configuration with predefined message sequences, audience filters, and timing. The CRM includes 14 templates across 3 tiers. |
| **Confidence Badge** | A visual indicator (🟢 High, 🟡 Medium, 🔴 Low) showing how reliable the adaptive recency thresholds are based on data volume. |
| **Contact** | A person in the CRM database, identified by phone number and/or email. Contacts have profiles, tags, custom fields, and interaction history. |
| **Conversation** | A thread of WhatsApp messages between the business and a contact. Conversations have a 24-hour customer service window. |
| **Cron Job** | A scheduled task that runs at regular intervals to process automations, campaigns, flows, and system monitoring. |
| **CTWA** | Click-to-WhatsApp — a Meta ad format that opens a WhatsApp conversation when clicked. The CRM tracks leads from CTWA ads. |
| **Custom Field** | A user-defined data field added to the contact profile. Supports Text, Number, Date, Boolean, and Select types. |
| **Dashboard** | The main overview page showing key metrics, charts, and activity feed for the account. |
| **Deal** | A potential revenue opportunity tracked through pipeline stages. Deals are linked to contacts and have values, stages, and dates. |
| **Deduplication** | The process of identifying and merging duplicate contacts based on phone number and email matching. |
| **Dormant Contact** | A contact whose last purchase exceeds the "Dormant" threshold, indicating significant disengagement. |
| **Edge** | A connection between two nodes in the Visual Flow Builder, defining the path a contact takes through the flow. |
| **Flow** | A visual workflow built in the Flow Builder that guides contacts through a series of interactive steps (messages, inputs, conditions). |
| **Flow Run** | A single execution of a flow for one contact, tracking their progress through the flow's nodes. |
| **Handoff** | The process of transferring a conversation from the AI chatbot to a human agent. |
| **Impersonate** | A Super Admin feature that allows viewing the CRM as a specific client account for debugging and support. |
| **Inbox** | The messaging interface where agents view and respond to WhatsApp conversations in real-time. |
| **Kanban Board** | The visual interface for the deal pipeline, showing deals as cards organized in columns by stage. |
| **Knowledge Base** | A collection of FAQ entries that the AI chatbot uses to answer customer questions without calling the LLM. |
| **Lost Contact** | A contact whose last purchase exceeds the "Lost" threshold, indicating they have likely churned. |
| **LLM** | Large Language Model — the AI model (accessed via OpenRouter) that powers the chatbot's conversational abilities. |
| **Meta Cloud API** | The official WhatsApp Business API provided by Meta, used for sending and receiving WhatsApp messages programmatically. |
| **Multi-Tenant** | The architecture pattern where a single CRM instance serves multiple business accounts with data isolation. |
| **NDPR** | Nigeria Data Protection Regulation — the legal framework governing personal data processing in Nigeria. |
| **Node** | A single step in a Visual Flow, such as sending a message, collecting input, or evaluating a condition. |
| **OpenRouter** | An API gateway that provides access to multiple AI models (GPT-4, Claude, Gemini, etc.) through a single API key. |
| **Owner** | The highest user role in an account with full access to all features including billing and account deletion. |
| **Pipeline** | A series of stages that deals progress through, from initial contact to won or lost. |
| **Quick Reply** | A pre-saved message snippet that agents can insert into conversations with one click. |
| **Recency Scoring** | An RFM-based system that segments contacts into Active, At Risk, Dormant, and Lost based on their last purchase date. |
| **RLS** | Row-Level Security — a Supabase/PostgreSQL feature that automatically filters database queries to only return data belonging to the authenticated user's account. |
| **Segment** | A dynamic group of contacts defined by criteria such as tags, recency score, custom fields, or behavior. |
| **Sentiment Analysis** | AI-powered analysis of message content to determine whether a contact's mood is positive, neutral, or negative. |
| **Service Window** | The 24-hour period after a customer sends a message during which the business can reply with free-form messages (not templates). |
| **Super Admin** | An M4E staff member with platform-wide access to all accounts, analytics, and system administration. |
| **Supabase** | The open-source Firebase alternative providing PostgreSQL database, authentication, real-time subscriptions, and file storage. |
| **Tag** | A color-coded label applied to contacts for categorization and segmentation. Tags can be applied manually, via import, or by automations. |
| **Template** | A pre-approved WhatsApp message format required for business-initiated conversations outside the 24-hour service window. |
| **Trigger** | The event that starts an automation (e.g., message_received, tag_added, keyword_match, contact_created, deal_stage_changed, scheduled). |
| **Vercel** | The cloud platform hosting the CRM's Next.js frontend and serverless API functions. |
| **Viewer** | The lowest user role with read-only access to dashboards and reports. |
| **WABA** | WhatsApp Business Account — the Meta account that owns WhatsApp phone numbers and templates. |
| **Webhook** | An HTTP callback that delivers real-time event data from external services (WhatsApp, Shopify, Paystack) to the CRM. |
| **WhatsApp Flow** | An in-chat interactive form built using Meta's WhatsApp Flows feature, allowing structured data collection within WhatsApp. |
| **White-Label** | A deployment model where a partner runs the CRM under their own brand and domain. |

---

## Document Information

| Field | Value |
|-------|-------|
| **Document Title** | M4E WhatsApp CRM — Employee Operating Guide |
| **Version** | 2.0 |
| **Last Updated** | June 2025 |
| **Author** | Marketing4Effect Engineering Team |
| **Classification** | Internal — M4E Staff Only |
| **CRM URL** | https://crm.marketing4effect.com |
| **GitHub Repository** | kembah17/m4e-whatsapp-crm |
| **Supabase Project** | bxryvqxrcujrqipvcjoa |
| **Total Sections** | 38 |
| **Total API Endpoints** | 191 |
| **Total Campaign Templates** | 14 |

---

*© 2025 Marketing4Effect. All rights reserved. This document is confidential and intended for M4E staff only. Do not distribute externally.*

