# Customer Reactivation Manager

> **Your dormant customer reclamation engine!**

Multi-channel CRM platform for reactivating dormant customers through WhatsApp, Email, and SMS — powered by [Marketing4Effect](https://marketing4effect.vercel.app).

## Overview

Customer Reactivation Manager (CRM) is a purpose-built platform that helps businesses win back dormant customers through coordinated multi-channel outreach. Built on the official Meta WhatsApp Cloud API, it provides a professional, compliant, and scalable approach to customer reactivation.

## Features

- **WhatsApp Integration** — Official Meta Cloud API (no ban risk)
- **Shared Inbox** — Team-based conversation management
- **Contact Management** — Import, segment, and track customer lifecycle
- **Broadcast Campaigns** — Targeted bulk messaging with templates
- **Sales Pipelines** — Visual deal tracking and management
- **Automations** — Rule-based workflow automation
- **Flow Builder** — Visual conversation flow designer
- **Multi-Tenant** — Account-based isolation with role management
- **Nigerian Localization** — Naira formatting, Nigerian date/phone formats

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS + M4E Indigo Theme |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| WhatsApp | Meta Cloud API v22.0 |
| Email | Brevo SMTP (planned) |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project ([supabase.com](https://supabase.com))
- Meta WhatsApp Business API access

### Setup

```bash
git clone https://github.com/kembah17/m4e-whatsapp-crm.git
cd m4e-whatsapp-crm
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase and Meta credentials
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `WHATSAPP_TOKEN` | Meta WhatsApp API token |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL |

## Multi-Channel Roadmap

- [x] WhatsApp (Meta Cloud API)
- [ ] Email (Brevo SMTP integration)
- [ ] SMS (Termii / Africa's Talking)
- [ ] Agent Zero automation bridge

## Brand

- **Primary**: Midnight Indigo (`#1a1a3e`)
- **Accent**: Champagne Gold (`#d4af37`)
- **Font**: Source Sans 3
- **Theme**: M4E Indigo (default)

## License

MIT — forked from [ArnasDon/wacrm](https://github.com/ArnasDon/wacrm)

---

**Marketing4Effect** — *We make businesses that need you, know you.*
