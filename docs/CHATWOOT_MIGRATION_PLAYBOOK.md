# Chatwoot Migration Playbook

## M4E CRM → Chatwoot + Evolution API Migration Guide

**Author:** Marketing4Effect (M4E)  
**Date:** June 2025  
**Status:** Planning Phase  
**Classification:** Internal Technical Document — Confidential

---

## Table of Contents

1. [Current Architecture](#1-current-architecture)
2. [Target Architecture](#2-target-architecture)
3. [Data Mapping](#3-data-mapping)
4. [Migration Scripts](#4-migration-scripts)
5. [Parallel Run Strategy](#5-parallel-run-strategy)
6. [Cutover Checklist](#6-cutover-checklist)
7. [Rollback Plan](#7-rollback-plan)
8. [Feature Gap Analysis](#8-feature-gap-analysis)
9. [Timeline Estimate](#9-timeline-estimate)
10. [Client Communication](#10-client-communication)

---

## 1. Current Architecture

### 1.1 Technology Stack

| Component | Technology | Details |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router) | TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Next.js API Routes | Serverless functions on Vercel |
| **Database** | Supabase (PostgreSQL) | 28 tables, RLS policies, Edge Functions |
| **Auth** | Supabase Auth | Email/password, magic links |
| **Storage** | Supabase Storage | Profile avatars, flow media |
| **WhatsApp** | Meta Cloud API (Direct) | Webhook-based, per-account config |
| **Email** | Brevo Transactional API | SMTP + API integration |
| **SMS** | Brevo Transactional SMS | API integration (new) |
| **Deployment** | Vercel | crm.marketing4effect.com |

### 1.2 Database Schema (28 Tables)

#### Core Tables

```
accounts              — Multi-tenant account container
├── profiles          — User profiles linked to Supabase Auth
├── account_invitations — Team member invitations
├── whatsapp_config   — Per-account WhatsApp API configuration
├── email_config      — Per-account Brevo email configuration
└── sms_config        — Per-account Brevo SMS configuration
```

#### Contact Management

```
contacts              — Customer/lead records (phone, email, name, etc.)
├── contact_tags      — Many-to-many contact ↔ tag associations
├── contact_notes     — Free-text notes on contacts
├── contact_custom_values — Custom field values per contact
└── tags              — Tag definitions per account
custom_fields         — Custom field definitions per account
```

#### Messaging

```
conversations         — WhatsApp conversation threads
├── messages          — Individual messages (inbound + outbound)
└── message_reactions — Emoji reactions on messages
message_templates     — WhatsApp message template definitions (synced with Meta)
```

#### Broadcasts

```
broadcasts            — Bulk message campaigns
└── broadcast_recipients — Per-recipient delivery tracking
```

#### Automations

```
automations           — Automation workflow definitions
├── automation_steps  — Steps within each automation (ordered tree)
├── automation_logs   — Execution history and results
└── automation_pending_executions — Scheduled/delayed step executions
```

#### Visual Flows

```
flows                 — Visual chatbot flow definitions
├── flow_nodes        — Individual nodes in each flow
├── flow_runs         — Active flow execution instances
└── flow_run_events   — Events during flow execution
```

#### Deals / CRM Pipeline

```
pipelines             — Sales pipeline definitions
├── pipeline_stages   — Stages within each pipeline
└── deals             — Individual deals linked to contacts and stages
```

#### Logging

```
sms_log               — SMS delivery tracking
```

### 1.3 API Routes (20 Endpoints)

| Route | Method(s) | Purpose |
|---|---|---|
| `/api/account` | GET, PUT | Account management |
| `/api/account/members` | GET, DELETE | Team member management |
| `/api/account/invitations` | GET, POST, DELETE | Invitation management |
| `/api/account/transfer-ownership` | POST | Ownership transfer |
| `/api/automations` | GET, POST | List/create automations |
| `/api/automations/[id]` | GET, PUT, DELETE | CRUD single automation |
| `/api/automations/engine` | POST | Automation execution engine |
| `/api/automations/cron` | GET | Cron-triggered automation checks |
| `/api/email/config` | GET, PUT | Email configuration |
| `/api/sms/config` | GET, PUT | SMS configuration |
| `/api/sms/send` | POST | Send SMS message |
| `/api/flows` | GET, POST | List/create flows |
| `/api/flows/[id]` | GET, PUT, DELETE | CRUD single flow |
| `/api/flows/cron` | GET | Cron-triggered flow checks |
| `/api/flows/templates` | GET | Flow template library |
| `/api/whatsapp/config` | GET, PUT | WhatsApp configuration |
| `/api/whatsapp/send` | POST | Send WhatsApp message |
| `/api/whatsapp/broadcast` | POST | Send broadcast campaign |
| `/api/whatsapp/react` | POST | Send message reaction |
| `/api/whatsapp/webhook` | GET, POST | Meta webhook handler |

### 1.4 Key Features

| Feature | Status | Complexity |
|---|---|---|
| Multi-tenant accounts | ✅ Live | High |
| WhatsApp messaging (send/receive) | ✅ Live | High |
| Contact management with custom fields | ✅ Live | Medium |
| Conversation threading | ✅ Live | Medium |
| Message templates (Meta sync) | ✅ Live | High |
| Broadcast campaigns | ✅ Live | Medium |
| Automation engine (trigger → steps) | ✅ Live | Very High |
| Visual flow builder | ✅ Live | Very High |
| Deal pipeline management | ✅ Live | Medium |
| Team management (roles, invitations) | ✅ Live | Medium |
| Email sending (Brevo) | ✅ Live | Low |
| SMS sending (Brevo) | ✅ Live | Low |
| Account sharing | ✅ Live | Medium |
| Contact deduplication | ✅ Live | Medium |
| Dashboard analytics | ✅ Live | Medium |

---

## 2. Target Architecture

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  Chatwoot Agent   │    │  M4E Custom Dashboard        │  │
│  │  Dashboard        │    │  (Next.js — deals, flows,    │  │
│  │  (conversations,  │    │   analytics, billing)        │  │
│  │   contacts, teams)│    │                              │  │
│  └────────┬─────────┘    └──────────────┬───────────────┘  │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            ▼                              ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│  Chatwoot Server     │    │  M4E API (Next.js)           │
│  (Self-hosted or     │    │  - Deals / Pipeline          │
│   Cloud)             │    │  - Visual Flows              │
│                      │    │  - Advanced Automations      │
│  - Conversations     │◄──►│  - Billing / Subscriptions   │
│  - Contacts          │    │  - SMS Integration           │
│  - Teams / Agents    │    │  - Custom Reporting          │
│  - Automation Rules  │    │  - Database Reactivation     │
│  - Reports           │    │                              │
│  - Canned Responses  │    └──────────────┬───────────────┘
│  - Labels            │                   │
└──────────┬───────────┘                   │
           │                               │
           ▼                               ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│  Evolution API       │    │  Supabase                    │
│  (Cloud Mode)        │    │  (Custom Data Store)         │
│                      │    │                              │
│  - WhatsApp Web      │    │  - deals, pipelines          │
│    connection         │    │  - flows, flow_nodes         │
│  - Multi-number      │    │  - advanced automations      │
│    support           │    │  - sms_config, sms_log       │
│  - QR code pairing   │    │  - billing, subscriptions    │
│  - Webhook events    │    │  - custom analytics          │
│                      │    │                              │
└──────────────────────┘    └──────────────────────────────┘
```

### 2.2 Component Responsibilities

| Component | Responsibility | Why |
|---|---|---|
| **Chatwoot** | Conversations, contacts, teams, basic automations, reports, canned responses | Battle-tested open-source platform; handles 80% of CRM needs |
| **Evolution API** | WhatsApp connectivity (Cloud mode) | Multi-number support; works with both official API and WhatsApp Web; easier number management |
| **M4E Custom (Next.js)** | Deals/pipeline, visual flows, advanced automations, SMS, billing, reactivation campaigns | Chatwoot lacks these features natively; preserves M4E's competitive advantage |
| **Supabase** | Custom data storage for M4E features | Already in use; handles data Chatwoot can't store |

### 2.3 Why Chatwoot + Evolution API?

| Benefit | Details |
|---|---|
| **Reduced maintenance** | Chatwoot handles conversation UI, contact management, team routing — no need to maintain custom code |
| **Proven at scale** | Chatwoot serves thousands of businesses; battle-tested for reliability |
| **Rich agent experience** | Desktop/mobile apps, keyboard shortcuts, canned responses, agent assignment |
| **Evolution API flexibility** | Supports both official WhatsApp API and WhatsApp Web; easier multi-number management |
| **Open source** | No vendor lock-in; self-hostable; active community |
| **API-first** | Comprehensive REST API for custom integrations |
| **Cost efficiency** | Self-hosted Chatwoot is free; Evolution API Cloud mode has predictable pricing |

### 2.4 Chatwoot Deployment Options

| Option | Cost | Pros | Cons | Recommendation |
|---|---|---|---|---|
| **Chatwoot Cloud** | $19–$99/agent/month | Zero maintenance; automatic updates | Monthly cost; less control | Good for pilot |
| **Self-hosted (Docker)** | Server cost only (~$20–50/month VPS) | Full control; no per-agent fees | Maintenance burden; updates manual | Best for scale |
| **Self-hosted (Kubernetes)** | Server cost (~$50–100/month) | High availability; auto-scaling | Complex setup | Enterprise only |

**Recommendation:** Start with **Chatwoot Cloud** for the pilot phase (3 months), then migrate to **self-hosted Docker** on a DigitalOcean/Hetzner VPS once stable.

---

## 3. Data Mapping

### 3.1 Table-by-Table Migration Map

#### accounts → Chatwoot Account

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `id` | `account.id` | New IDs generated; maintain mapping table |
| `name` | `account.name` | Direct mapping |
| `owner_id` | Account admin user | Map to Chatwoot user with admin role |
| `default_currency` | Custom attribute | Chatwoot doesn't have native currency |
| `created_at` | `account.created_at` | Preserve original timestamp |

**Migration:** One M4E account = one Chatwoot account. Multi-tenant isolation preserved.

#### profiles → Chatwoot Users/Agents

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `id` | `user.id` | New IDs; maintain mapping |
| `email` | `user.email` | Direct mapping |
| `full_name` | `user.name` | Direct mapping |
| `avatar_url` | `user.avatar_url` | Migrate from Supabase Storage |
| `role` | `account_user.role` | Map: owner→administrator, admin→administrator, agent→agent |
| `beta_features` | N/A | Drop — Chatwoot has its own feature flags |

#### contacts → Chatwoot Contacts

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `id` | `contact.id` | New IDs; maintain mapping |
| `account_id` | Scoped to Chatwoot account | Implicit via account context |
| `phone` | `contact.phone_number` | Ensure E.164 format (+234...) |
| `email` | `contact.email` | Direct mapping |
| `name` | `contact.name` | Direct mapping |
| `whatsapp_name` | `contact.additional_attributes.whatsapp_name` | Custom attribute |
| `profile_pic_url` | `contact.avatar_url` | Direct mapping |
| `is_blocked` | `contact.blocked` | Direct mapping (Chatwoot 3.x+) |
| `last_seen_at` | `contact.last_seen_at` | Direct mapping |
| `created_at` | `contact.created_at` | Preserve timestamp |

#### contact_tags → Chatwoot Labels

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `contact_id` + `tag_id` | `contact.labels[]` | Chatwoot uses label strings, not IDs |
| `tags.name` | Label name | Direct mapping |
| `tags.color` | N/A | Chatwoot labels don't have colors (use custom CSS) |

**Migration:** Convert tag associations to Chatwoot label assignments via API.

#### contact_notes → Chatwoot Contact Notes

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `id` | `note.id` | New IDs |
| `contact_id` | `note.contact_id` | Map via contact ID mapping |
| `content` | `note.content` | Direct mapping |
| `created_by` | `note.user_id` | Map via user ID mapping |
| `created_at` | `note.created_at` | Preserve timestamp |

#### contact_custom_values + custom_fields → Chatwoot Custom Attributes

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `custom_fields.name` | `custom_attribute_definition.attribute_display_name` | Define attribute first |
| `custom_fields.field_type` | `custom_attribute_definition.attribute_display_type` | Map: text→text, number→number, date→date, select→list |
| `contact_custom_values.value` | `contact.custom_attributes[key]` | Set on contact object |

**Migration:**
1. Create custom attribute definitions in Chatwoot
2. Set values on each contact during import

#### conversations → Chatwoot Conversations

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `id` | `conversation.id` | New IDs; maintain mapping |
| `account_id` | Scoped to account | Implicit |
| `contact_id` | `conversation.contact_id` | Map via contact mapping |
| `status` | `conversation.status` | Map: open→open, closed→resolved |
| `assigned_to` | `conversation.assignee_id` | Map via user mapping |
| `last_message_at` | `conversation.last_activity_at` | Direct mapping |
| `created_at` | `conversation.created_at` | Preserve timestamp |

#### messages → Chatwoot Messages

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `id` | `message.id` | New IDs |
| `conversation_id` | `message.conversation_id` | Map via conversation mapping |
| `direction` | `message.message_type` | Map: inbound→incoming(0), outbound→outgoing(1) |
| `content` | `message.content` | Direct mapping |
| `content_type` | `message.content_type` | Map: text→text, image→image, etc. |
| `wa_message_id` | `message.source_id` | WhatsApp message ID for dedup |
| `status` | `message.status` | Map: sent→sent, delivered→delivered, read→read, failed→failed |
| `created_at` | `message.created_at` | Preserve timestamp |

**Note:** Chatwoot message import via API is limited. For large volumes, consider direct database insertion with careful ID management.

#### message_reactions → Chatwoot (Limited)

Chatwoot does not natively support message reactions in the same way. Options:
- Store as message metadata via `additional_attributes`
- Drop reactions (low business value)
- **Recommendation:** Drop — reactions are cosmetic and not business-critical

#### message_templates → Chatwoot + Evolution API

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `name` | Chatwoot doesn't manage WA templates | Templates managed via Meta Business Manager |
| `category` | N/A | |
| `status` | N/A | |
| `components` | N/A | |

**Migration:** Message templates are managed at the Meta/Evolution API level, not in Chatwoot. The M4E custom dashboard will handle template management.

#### broadcasts + broadcast_recipients → Chatwoot Campaigns

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `broadcasts.id` | `campaign.id` | Chatwoot has "Campaigns" feature |
| `broadcasts.name` | `campaign.title` | Direct mapping |
| `broadcasts.template_name` | `campaign.message` | Different structure |
| `broadcast_recipients` | Campaign audience | Chatwoot uses audience filters, not explicit recipient lists |

**Gap:** Chatwoot campaigns are simpler than M4E broadcasts. For advanced broadcast functionality, keep in M4E custom dashboard.

#### automations + automation_steps → Chatwoot Automation Rules (Partial)

| M4E Feature | Chatwoot Equivalent | Gap |
|---|---|---|
| Trigger-based workflows | Automation Rules | Chatwoot rules are simpler (single action per rule) |
| Multi-step sequences | ❌ Not supported | Chatwoot can't do multi-step automations |
| Wait/delay steps | ❌ Not supported | No time-based delays |
| Condition branching | ❌ Not supported | No if/else logic |
| Send email action | ✅ Supported | Via Chatwoot's email channel |
| Send WhatsApp action | ❌ Limited | Can send canned responses, not templates |
| Create deal action | ❌ Not supported | Chatwoot has no deals |
| Send SMS action | ❌ Not supported | No native SMS |

**Migration:** Chatwoot automation rules handle ~20% of M4E's automation capabilities. **Advanced automations MUST remain in the M4E custom dashboard.** Chatwoot rules can handle simple routing (assign conversation, add label, send notification).

#### flows + flow_nodes + flow_runs + flow_run_events → Custom (No Chatwoot Equivalent)

Chatwoot does **not** have a visual flow builder. This entire feature must remain in the M4E custom dashboard.

**Migration:** No migration needed — flows stay in Supabase, accessed via M4E custom dashboard.

#### deals + pipelines + pipeline_stages → Custom (No Chatwoot Equivalent)

Chatwoot does **not** have a deals/pipeline feature. This must remain in the M4E custom dashboard.

**Migration:** No migration needed — deals stay in Supabase, accessed via M4E custom dashboard.

#### whatsapp_config → Evolution API Instance

| M4E Field | Evolution API Equivalent | Notes |
|---|---|---|
| `phone_number_id` | Instance ID | Evolution API uses instance-based config |
| `waba_id` | N/A | Evolution API abstracts this |
| `access_token` | Instance API key | Different auth model |
| `display_phone` | Instance phone number | Direct mapping |
| `webhook_verify_token` | Webhook URL config | Different mechanism |

**Migration:** Create Evolution API instances for each WhatsApp number. Configure Chatwoot channel to connect via Evolution API.

#### email_config → Chatwoot Email Channel

| M4E Field | Chatwoot Equivalent | Notes |
|---|---|---|
| `brevo_api_key` | SMTP configuration | Chatwoot uses SMTP, not API |
| `from_email` | Channel email address | Direct mapping |
| `from_name` | Channel name | Direct mapping |

**Migration:** Configure Chatwoot email channel with Brevo SMTP credentials.

#### sms_config + sms_log → Custom (No Chatwoot Equivalent)

Chatwoot has a basic SMS channel (via Twilio) but not Brevo SMS. Options:
- Use Chatwoot's Twilio SMS channel (requires Twilio account)
- Keep Brevo SMS in M4E custom dashboard
- Build a custom Chatwoot channel connector for Brevo SMS

**Recommendation:** Keep SMS in M4E custom dashboard initially. Evaluate Chatwoot SMS channel later.

### 3.2 ID Mapping Strategy

During migration, maintain a mapping table to cross-reference old and new IDs:

```sql
CREATE TABLE migration_id_map (
  entity_type TEXT NOT NULL,     -- 'account', 'contact', 'conversation', etc.
  m4e_id UUID NOT NULL,          -- Original M4E ID
  chatwoot_id BIGINT NOT NULL,   -- New Chatwoot ID
  migrated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (entity_type, m4e_id)
);

CREATE INDEX idx_migration_chatwoot ON migration_id_map(entity_type, chatwoot_id);
```

This table lives in Supabase and is used by:
- Migration scripts (to track progress)
- M4E custom dashboard (to link deals/flows to Chatwoot contacts/conversations)
- Rollback scripts (to reverse the migration if needed)

---

## 4. Migration Scripts

### 4.1 Script Overview

| Script | Purpose | Input | Output |
|---|---|---|---|
| `export_all_data.py` | Export all M4E data from Supabase | Supabase credentials | JSON files per table |
| `transform_to_chatwoot.py` | Transform M4E schema to Chatwoot format | Exported JSON files | Chatwoot-ready JSON files |
| `import_to_chatwoot.py` | Bulk import via Chatwoot API | Transformed JSON files | Import results + ID mapping |
| `verify_migration.py` | Verify data integrity post-migration | Both databases | Verification report |
| `migrate_files.py` | Migrate Supabase Storage files | Supabase Storage | Chatwoot/S3 storage |

All scripts are located in `/scripts/migration/` and should be run in order.

### 4.2 Script 1: export_all_data.py

**Purpose:** Export all M4E CRM data from Supabase as JSON files.

**Usage:**
```
python scripts/migration/export_all_data.py --output ./export/
python scripts/migration/export_all_data.py --output ./export/ --account-id <uuid>
```

**Implementation outline:**

```python
import os, json, argparse
from datetime import datetime, date
from supabase import create_client

# Tables to export in dependency order
TABLES = [
    'accounts', 'profiles', 'account_invitations',
    'whatsapp_config', 'email_config', 'sms_config',
    'tags', 'custom_fields', 'contacts', 'contact_tags',
    'contact_notes', 'contact_custom_values',
    'conversations', 'messages', 'message_reactions',
    'message_templates', 'broadcasts', 'broadcast_recipients',
    'automations', 'automation_steps', 'automation_logs',
    'automation_pending_executions',
    'flows', 'flow_nodes', 'flow_runs', 'flow_run_events',
    'pipelines', 'pipeline_stages', 'deals', 'sms_log',
]

def export_table(supabase, table_name, output_dir, account_id=None):
    query = supabase.table(table_name).select('*')
    if account_id and table_name != 'profiles':
        query = query.eq('account_id', account_id)

    all_rows = []
    offset = 0
    batch_size = 1000
    while True:
        result = query.range(offset, offset + batch_size - 1).execute()
        if not result.data:
            break
        all_rows.extend(result.data)
        if len(result.data) < batch_size:
            break
        offset += batch_size

    output_path = os.path.join(output_dir, f"{table_name}.json")
    with open(output_path, 'w') as f:
        json.dump(all_rows, f, indent=2, default=str)

    return len(all_rows)

def main():
    parser = argparse.ArgumentParser(description='Export M4E CRM data')
    parser.add_argument('--output', required=True)
    parser.add_argument('--account-id', help='Export specific account only')
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)
    supabase = create_client(
        os.environ['SUPABASE_URL'],
        os.environ['SUPABASE_SERVICE_ROLE_KEY']
    )

    manifest = {'exported_at': datetime.now().isoformat(), 'tables': {}}
    for table in TABLES:
        try:
            count = export_table(supabase, table, args.output, args.account_id)
            manifest['tables'][table] = {'count': count, 'status': 'ok'}
            print(f"  OK {table}: {count} rows")
        except Exception as e:
            manifest['tables'][table] = {'count': 0, 'status': 'error', 'error': str(e)}
            print(f"  FAIL {table}: {e}")

    with open(os.path.join(args.output, '_manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f"Export complete -> {args.output}")

if __name__ == '__main__':
    main()
```

### 4.3 Script 2: transform_to_chatwoot.py

**Purpose:** Transform M4E CRM data to Chatwoot-compatible format.

**Usage:**
```
python scripts/migration/transform_to_chatwoot.py --input ./export/ --output ./chatwoot-import/
```

**Key transformations:**

| Entity | Transformation |
|---|---|
| **Contacts** | Merge custom fields into `custom_attributes`; convert tags to label strings; map phone to E.164 |
| **Conversations** | Map status (closed→resolved); link to contact via ID mapping |
| **Messages** | Map direction (inbound→0, outbound→1); preserve `wa_message_id` as `source_id` |
| **Notes** | Direct mapping with user ID translation |
| **Labels** | Flatten tag names into string arrays |

**Implementation outline:**

```python
import os, json, argparse

def load_json(path):
    with open(path) as f:
        return json.load(f)

def transform_contacts(contacts, tags, contact_tags, custom_fields, custom_values):
    tag_map = {t['id']: t['name'] for t in tags}
    field_map = {f['id']: f['name'] for f in custom_fields}

    # Build lookups
    contact_labels = {}  # contact_id -> [label_names]
    for ct in contact_tags:
        cid = ct['contact_id']
        contact_labels.setdefault(cid, []).append(tag_map.get(ct['tag_id'], ''))

    contact_customs = {}  # contact_id -> {field_name: value}
    for cv in custom_values:
        cid = cv['contact_id']
        fname = field_map.get(cv['custom_field_id'], '')
        if fname:
            contact_customs.setdefault(cid, {})[fname] = cv['value']

    result = []
    for c in contacts:
        result.append({
            '_m4e_id': c['id'],
            'name': c.get('name', ''),
            'email': c.get('email'),
            'phone_number': c.get('phone'),
            'avatar_url': c.get('profile_pic_url'),
            'identifier': c['id'],
            'custom_attributes': {
                **contact_customs.get(c['id'], {}),
                'whatsapp_name': c.get('whatsapp_name', ''),
                'm4e_original_id': c['id'],
            },
            'labels': [l for l in contact_labels.get(c['id'], []) if l],
        })
    return result

def transform_conversations(conversations, messages):
    conv_msgs = {}
    for m in messages:
        conv_msgs.setdefault(m['conversation_id'], []).append(m)

    result = []
    for conv in conversations:
        msgs = sorted(conv_msgs.get(conv['id'], []), key=lambda x: x.get('created_at', ''))
        cw_msgs = [{
            '_m4e_id': msg['id'],
            'content': msg.get('content', ''),
            'message_type': 0 if msg.get('direction') == 'inbound' else 1,
            'content_type': msg.get('content_type', 'text'),
            'source_id': msg.get('wa_message_id'),
            'created_at': msg.get('created_at'),
        } for msg in msgs]

        result.append({
            '_m4e_id': conv['id'],
            '_m4e_contact_id': conv.get('contact_id'),
            'status': 'resolved' if conv.get('status') == 'closed' else 'open',
            'created_at': conv.get('created_at'),
            'messages': cw_msgs,
        })
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    os.makedirs(args.output, exist_ok=True)

    contacts = load_json(os.path.join(args.input, 'contacts.json'))
    tags = load_json(os.path.join(args.input, 'tags.json'))
    contact_tags = load_json(os.path.join(args.input, 'contact_tags.json'))
    custom_fields = load_json(os.path.join(args.input, 'custom_fields.json'))
    custom_values = load_json(os.path.join(args.input, 'contact_custom_values.json'))
    conversations = load_json(os.path.join(args.input, 'conversations.json'))
    messages = load_json(os.path.join(args.input, 'messages.json'))

    cw_contacts = transform_contacts(contacts, tags, contact_tags, custom_fields, custom_values)
    cw_conversations = transform_conversations(conversations, messages)

    with open(os.path.join(args.output, 'contacts.json'), 'w') as f:
        json.dump(cw_contacts, f, indent=2)
    with open(os.path.join(args.output, 'conversations.json'), 'w') as f:
        json.dump(cw_conversations, f, indent=2)

    print(f"Transformed: {len(cw_contacts)} contacts, {len(cw_conversations)} conversations")

if __name__ == '__main__':
    main()
```

### 4.4 Script 3: import_to_chatwoot.py

**Purpose:** Bulk import transformed data into Chatwoot via REST API.

**Usage:**
```
python scripts/migration/import_to_chatwoot.py \
    --input ./chatwoot-import/ \
    --chatwoot-url https://chatwoot.example.com \
    --api-token <token> \
    --account-id 1 \
    --inbox-id 1
```

**Key features:**
- Rate-limit aware (exponential backoff on 429)
- Builds and persists ID mapping table (`_id_mapping.json`)
- Imports contacts first, then conversations with messages
- Labels applied per-contact after creation
- Progress logging every 100 records

**Implementation outline:**

```python
import os, json, time, argparse, requests

class ChatwootImporter:
    def __init__(self, base_url, api_token, account_id):
        self.base_url = base_url.rstrip('/')
        self.account_id = account_id
        self.headers = {'api_access_token': api_token, 'Content-Type': 'application/json'}
        self.id_map = {}

    def _url(self, path):
        return f"{self.base_url}/api/v1/accounts/{self.account_id}/{path}"

    def _post(self, path, data, retries=3):
        for attempt in range(retries):
            resp = requests.post(self._url(path), json=data, headers=self.headers)
            if resp.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
            return resp.json()
        raise Exception(f"Rate limited after {retries} retries")

    def import_contacts(self, contacts):
        self.id_map['contact'] = {}
        imported = errors = 0
        for contact in contacts:
            m4e_id = contact.pop('_m4e_id')
            labels = contact.pop('labels', [])
            try:
                result = self._post('contacts', contact)
                cw_id = result['id']
                self.id_map['contact'][m4e_id] = cw_id
                if labels:
                    try:
                        self._post(f"contacts/{cw_id}/labels", {'labels': labels})
                    except Exception:
                        pass
                imported += 1
                if imported % 100 == 0:
                    print(f"  Imported {imported} contacts...")
            except Exception as e:
                errors += 1
                print(f"  FAIL Contact {m4e_id}: {e}")
        print(f"  Contacts: {imported} imported, {errors} errors")

    def import_conversations(self, conversations, inbox_id):
        self.id_map['conversation'] = {}
        imported = errors = 0
        for conv in conversations:
            m4e_id = conv.pop('_m4e_id')
            m4e_contact_id = conv.pop('_m4e_contact_id')
            messages = conv.pop('messages', [])
            cw_contact_id = self.id_map.get('contact', {}).get(m4e_contact_id)
            if not cw_contact_id:
                errors += 1
                continue
            try:
                result = self._post('conversations', {
                    'contact_id': cw_contact_id,
                    'inbox_id': inbox_id,
                    'status': conv.get('status', 'open'),
                })
                cw_conv_id = result['id']
                self.id_map['conversation'][m4e_id] = cw_conv_id
                for msg in messages:
                    msg.pop('_m4e_id', None)
                    try:
                        self._post(f"conversations/{cw_conv_id}/messages", msg)
                    except Exception:
                        pass
                imported += 1
            except Exception as e:
                errors += 1
                print(f"  FAIL Conversation {m4e_id}: {e}")
        print(f"  Conversations: {imported} imported, {errors} errors")

    def save_id_map(self, path):
        with open(path, 'w') as f:
            json.dump(self.id_map, f, indent=2)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--chatwoot-url', required=True)
    parser.add_argument('--api-token', required=True)
    parser.add_argument('--account-id', type=int, required=True)
    parser.add_argument('--inbox-id', type=int, required=True)
    args = parser.parse_args()

    importer = ChatwootImporter(args.chatwoot_url, args.api_token, args.account_id)

    print("Importing contacts...")
    contacts = json.load(open(os.path.join(args.input, 'contacts.json')))
    importer.import_contacts(contacts)

    print("Importing conversations...")
    convs = json.load(open(os.path.join(args.input, 'conversations.json')))
    importer.import_conversations(convs, args.inbox_id)

    map_path = os.path.join(args.input, '_id_mapping.json')
    importer.save_id_map(map_path)
    print(f"ID mapping saved -> {map_path}")

if __name__ == '__main__':
    main()
```

### 4.5 Script 4: verify_migration.py

**Purpose:** Verify migration integrity by comparing record counts and spot-checking data.

**Usage:**
```
python scripts/migration/verify_migration.py \
    --export-dir ./export/ \
    --id-map ./chatwoot-import/_id_mapping.json \
    --chatwoot-url https://chatwoot.example.com \
    --api-token <token> \
    --account-id 1
```

**Checks performed:**
- Count comparison: exported vs imported per entity type
- Random sample verification: fetch 10 random contacts from Chatwoot API
- Field integrity: compare name, phone, email for sampled contacts
- Report generation: markdown summary of verification results

---

## 5. Parallel Run Strategy

### 5.1 Overview

Run both systems simultaneously for **2 weeks** before cutover to ensure:
- Data flows correctly in Chatwoot
- Agents are comfortable with the new interface
- No messages are lost
- Custom features (deals, flows) work alongside Chatwoot

### 5.2 Parallel Run Architecture

```
                    WhatsApp Messages
                          |
                          v
                  +---------------+
                  |  Evolution API |
                  |  (Webhook Hub) |
                  +---+-------+---+
                      |       |
              +-------v--+  +-v----------+
              | Chatwoot  |  | M4E CRM    |
              | (Primary) |  | (Shadow)   |
              |           |  |            |
              | Agents    |  | Read-only  |
              | respond   |  | monitoring |
              | here      |  |            |
              +-----------+  +------------+
```

### 5.3 Parallel Run Phases

#### Phase 1: Shadow Mode (Days 1-5)
- **Chatwoot** receives all messages but agents DON'T respond there yet
- **M4E CRM** remains the primary system — agents respond here
- **Purpose:** Verify message delivery, contact creation, conversation threading in Chatwoot
- **Monitoring:** Compare message counts between systems daily

#### Phase 2: Dual Response (Days 6-10)
- **Chatwoot** becomes primary for NEW conversations
- **M4E CRM** handles existing/ongoing conversations
- **Purpose:** Agents learn Chatwoot interface with real conversations
- **Monitoring:** Agent feedback sessions daily; track response times

#### Phase 3: Chatwoot Primary (Days 11-14)
- **Chatwoot** handles ALL conversations
- **M4E CRM** receives messages in shadow mode (for verification)
- **Purpose:** Full production validation before cutover
- **Monitoring:** Compare metrics; ensure no degradation

### 5.4 Success Criteria for Cutover

| Metric | Threshold | Measurement |
|---|---|---|
| Message delivery rate | >=99% | Compare sent vs delivered in both systems |
| Agent response time | <= M4E CRM baseline | Chatwoot analytics |
| Contact sync accuracy | 100% | Spot-check 50 random contacts |
| Automation trigger rate | >=95% of M4E baseline | Compare automation logs |
| Agent satisfaction | >=7/10 NPS | Survey all agents |
| Zero critical bugs | 0 P0/P1 bugs | Bug tracker |

---

## 6. Cutover Checklist

### Pre-Cutover (1 Week Before)

- [ ] All parallel run success criteria met
- [ ] Final data sync completed (contacts, conversations)
- [ ] All agents trained on Chatwoot (minimum 2 training sessions)
- [ ] Chatwoot automation rules configured and tested
- [ ] Evolution API instances stable for all WhatsApp numbers
- [ ] M4E custom dashboard connected to Chatwoot API
- [ ] Deals/pipeline accessible via M4E dashboard
- [ ] Visual flows operational via M4E dashboard
- [ ] SMS sending operational via M4E dashboard
- [ ] Backup of all M4E CRM data completed
- [ ] Rollback procedure documented and tested
- [ ] Client communication sent (see Section 10)
- [ ] DNS/domain changes prepared (if applicable)

### Cutover Day (D-Day)

- [ ] **06:00** — Final data sync from M4E to Chatwoot
- [ ] **06:30** — Verify sync completion and data integrity
- [ ] **07:00** — Switch Evolution API webhooks to Chatwoot only
- [ ] **07:15** — Disable M4E CRM webhook endpoint
- [ ] **07:30** — Verify first messages flowing through Chatwoot
- [ ] **08:00** — Agents begin work in Chatwoot
- [ ] **08:30** — Monitor for issues (dedicated Slack/WhatsApp channel)
- [ ] **10:00** — First checkpoint: all metrics green?
- [ ] **12:00** — Second checkpoint: any issues reported?
- [ ] **14:00** — Third checkpoint: agent feedback
- [ ] **17:00** — End of day review: GO/NO-GO for continued operation
- [ ] **18:00** — If NO-GO: execute rollback plan

### Post-Cutover (Week 1)

- [ ] Daily monitoring of all metrics
- [ ] Daily agent feedback collection
- [ ] Bug triage and fix cycle (same-day for P0/P1)
- [ ] Verify all automations firing correctly
- [ ] Verify all client-facing features operational
- [ ] Update documentation and SOPs
- [ ] Decommission M4E CRM webhook (keep data for 90 days)

### Post-Cutover (Month 1)

- [ ] Weekly metrics review
- [ ] Agent satisfaction survey
- [ ] Performance comparison (Chatwoot vs M4E CRM baseline)
- [ ] Identify and address any feature gaps
- [ ] Plan for M4E CRM data archival
- [ ] Update client-facing documentation

---

## 7. Rollback Plan

### 7.1 Rollback Triggers

Execute rollback if ANY of these occur during cutover:

| Trigger | Severity | Decision Maker |
|---|---|---|
| Messages not delivering for >15 minutes | P0 — Critical | Automatic |
| >5% message loss detected | P0 — Critical | Tech Lead |
| Chatwoot server down for >30 minutes | P0 — Critical | Automatic |
| Agent unable to respond to customers for >1 hour | P1 — High | Tech Lead |
| Data corruption detected | P0 — Critical | Automatic |
| >50% of agents report blocking issues | P1 — High | Operations Lead |

### 7.2 Rollback Procedure

**Estimated rollback time: 30-45 minutes**

```
Step 1 (5 min):  Switch Evolution API webhooks back to M4E CRM
                  -> Edit webhook URL in Evolution API dashboard
                  -> Verify M4E CRM receiving messages

Step 2 (5 min):  Re-enable M4E CRM webhook endpoint
                  -> Redeploy with webhook enabled (or toggle feature flag)
                  -> Verify endpoint responding

Step 3 (10 min): Sync any new data from Chatwoot back to M4E
                  -> Export contacts created during Chatwoot period
                  -> Export conversations/messages from Chatwoot period
                  -> Import into M4E CRM Supabase

Step 4 (5 min):  Notify agents to switch back to M4E CRM
                  -> WhatsApp group message
                  -> Email notification

Step 5 (10 min): Verify M4E CRM fully operational
                  -> Send test messages
                  -> Verify automations firing
                  -> Confirm agent access

Step 6 (5 min):  Post-rollback communication
                  -> Notify stakeholders
                  -> Schedule post-mortem
```

### 7.3 Data Preservation During Rollback

- **Chatwoot data is NOT deleted** during rollback
- Any conversations that occurred in Chatwoot are exported and imported to M4E CRM
- ID mapping table is preserved for future migration attempt
- Rollback is a "pause", not a "cancel" — migration can be reattempted after fixes

### 7.4 Rollback Testing

Before the actual cutover, perform a **dry-run rollback** to verify:
- Webhook switching works within 5 minutes
- M4E CRM resumes message processing immediately
- No data loss during the switch
- Agents can access M4E CRM without issues

---

## 8. Feature Gap Analysis

### 8.1 Feature Comparison Matrix

| Feature | M4E CRM | Chatwoot | Gap | Resolution |
|---|---|---|---|---|
| **WhatsApp messaging** | Meta Cloud API | Via Evolution API | None | Evolution API provides equivalent |
| **Contact management** | Custom | Native | None | Chatwoot contacts are more feature-rich |
| **Conversation threading** | Custom | Native | None | Chatwoot is superior |
| **Team management** | Roles + invitations | Teams + roles | None | Chatwoot has more granular permissions |
| **Agent assignment** | Basic | Advanced (round-robin, auto) | Chatwoot better | Upgrade |
| **Canned responses** | Not built | Native | M4E gap filled | New feature |
| **Contact notes** | Custom | Native | None | Direct mapping |
| **Custom fields** | Custom | Custom attributes | None | Direct mapping |
| **Tags/Labels** | Custom | Labels | Minor | Labels are string-based (no colors) |
| **Email channel** | Brevo API | SMTP channel | None | Different mechanism, same result |
| **SMS channel** | Brevo SMS | Twilio only | Gap | Keep in M4E custom dashboard |
| **Message templates** | Meta sync | Limited | Gap | Manage via M4E dashboard |
| **Broadcasts** | Custom | Campaigns (simpler) | Gap | Keep advanced broadcasts in M4E |
| **Automations (simple)** | Custom | Automation rules | None | Chatwoot handles simple rules |
| **Automations (advanced)** | Multi-step, branching | Not supported | Major gap | Keep in M4E custom dashboard |
| **Visual flow builder** | Custom | Not supported | Major gap | Keep in M4E custom dashboard |
| **Deal pipeline** | Custom | Not supported | Major gap | Keep in M4E custom dashboard |
| **Dashboard analytics** | Custom | Native reports | Partial | Chatwoot reports + M4E custom |
| **Message reactions** | Custom | Not supported | Minor gap | Drop (low value) |
| **Contact deduplication** | Custom | Basic (merge) | Minor gap | Chatwoot merge is sufficient |
| **Multi-account** | Custom | Native | None | Chatwoot supports multi-account |
| **Mobile app** | Web only | iOS + Android | Chatwoot better | Major upgrade |
| **Desktop notifications** | Not built | Native | Chatwoot better | New feature |
| **Keyboard shortcuts** | Not built | Native | Chatwoot better | New feature |
| **CSAT surveys** | Not built | Native | Chatwoot better | New feature |
| **Pre-chat forms** | Not built | Native | Chatwoot better | New feature |

### 8.2 Features That Stay in M4E Custom Dashboard

These features have no Chatwoot equivalent and represent M4E's competitive advantage:

1. **Advanced Automations** — Multi-step workflows with delays, conditions, branching
2. **Visual Flow Builder** — Chatbot flow design and execution
3. **Deal Pipeline** — Sales pipeline management with custom stages
4. **SMS Integration** — Brevo SMS sending and tracking
5. **Advanced Broadcasts** — Template-based bulk messaging with per-recipient tracking
6. **Message Template Management** — Meta template sync and lifecycle management
7. **Database Reactivation** — Campaign management and performance tracking
8. **Performance Fee Calculator** — Revenue attribution and billing
9. **Custom Analytics** — Business-specific dashboards and reports

### 8.3 Features Gained from Chatwoot

New capabilities that M4E clients will receive at no additional development cost:

1. **Mobile Apps** — iOS and Android agent apps for on-the-go responses
2. **Canned Responses** — Quick reply templates with `/` shortcut
3. **Advanced Agent Routing** — Round-robin, auto-assignment, capacity limits
4. **CSAT Surveys** — Post-conversation satisfaction surveys (automatic)
5. **Desktop Notifications** — Browser push notifications for new messages
6. **Keyboard Shortcuts** — Power-user productivity (`?` to see all shortcuts)
7. **Pre-chat Forms** — Collect customer info before conversation starts
8. **Conversation Continuity** — Seamless handoff between agents
9. **Supervisor Dashboard** — Real-time agent monitoring and performance
10. **Rich API Webhooks** — Event system for custom integrations

### 8.4 Integration Architecture (Post-Migration)

```
+-----------------------------------------------------+
|                  Agent Workflow                       |
|                                                      |
|  +-------------+         +----------------------+   |
|  |  Chatwoot    | <-----> |  M4E Dashboard       |   |
|  |  (Daily use) |  Link   |  (When needed)       |   |
|  |              |         |                      |   |
|  |  - Chat      |         |  - Create deal       |   |
|  |  - Contacts  |         |  - Manage pipeline   |   |
|  |  - Assign    |         |  - Build flows       |   |
|  |  - Labels    |         |  - Advanced auto     |   |
|  |  - Notes     |         |  - SMS campaigns     |   |
|  |  - CSAT      |         |  - Reactivation      |   |
|  +-------------+         +----------------------+   |
|                                                      |
|  Navigation: Chatwoot sidebar link to M4E Dashboard  |
|  Data sync: Chatwoot webhooks -> M4E API             |
+-----------------------------------------------------+
```

**Sync mechanism:** Chatwoot fires webhooks on conversation/contact events. M4E API receives these and updates Supabase (deals, flows, analytics). The M4E dashboard reads from both Chatwoot API (contacts, conversations) and Supabase (deals, flows, custom data).

---

## 9. Timeline Estimate

### 9.1 Migration Phases

| Phase | Duration | Activities |
|---|---|---|
| **Phase 0: Planning** | 1 week | Finalise this playbook; get stakeholder approval; set up Chatwoot instance |
| **Phase 1: Infrastructure** | 1 week | Deploy Chatwoot; configure Evolution API; set up domains/SSL; connect WhatsApp |
| **Phase 2: Data Migration** | 1 week | Run export/transform/import scripts; verify data integrity; fix issues |
| **Phase 3: Custom Integration** | 2 weeks | Build M4E dashboard <-> Chatwoot API bridge; deals, flows, SMS integration |
| **Phase 4: Agent Training** | 1 week | Training sessions; documentation; practice with test data |
| **Phase 5: Parallel Run** | 2 weeks | Shadow mode -> dual response -> Chatwoot primary |
| **Phase 6: Cutover** | 1 day | Execute cutover checklist |
| **Phase 7: Stabilisation** | 2 weeks | Monitor, fix bugs, optimise, gather feedback |
| **Total** | **~10 weeks** | |

### 9.2 Detailed Week-by-Week Plan

| Week | Phase | Key Deliverables |
|---|---|---|
| **Week 1** | Planning | Playbook approved; Chatwoot Cloud account created; Evolution API account created |
| **Week 2** | Infrastructure | Chatwoot configured; Evolution API instances for all numbers; webhook routing tested |
| **Week 3** | Data Migration | All data exported, transformed, imported; verification passed |
| **Week 4** | Custom Integration | M4E dashboard reads Chatwoot contacts/conversations via API |
| **Week 5** | Custom Integration | Deals, flows, SMS fully operational alongside Chatwoot |
| **Week 6** | Training | All agents trained; documentation complete; test conversations done |
| **Week 7** | Parallel Run | Shadow mode: messages flowing to both systems |
| **Week 8** | Parallel Run | Dual response -> Chatwoot primary; success criteria evaluated |
| **Week 9** | Cutover | D-Day execution; immediate stabilisation |
| **Week 10** | Stabilisation | Bug fixes; performance tuning; agent feedback; final sign-off |

### 9.3 Resource Requirements

| Role | Allocation | Duration |
|---|---|---|
| **Lead Developer** | 80% | 10 weeks |
| **Backend Developer** | 50% | Weeks 2-5 |
| **DevOps** | 30% | Weeks 1-2, 9 |
| **QA Tester** | 50% | Weeks 3-8 |
| **Operations Lead** | 20% | Weeks 6-10 |
| **Agent Trainer** | 100% | Week 6 |

### 9.4 Risk-Adjusted Timeline

| Scenario | Duration | Probability |
|---|---|---|
| **Best case** | 8 weeks | 20% |
| **Expected** | 10 weeks | 60% |
| **Worst case** | 14 weeks | 20% |

**Main risks that could extend timeline:**
- Evolution API stability issues with Nigerian carriers
- Chatwoot API limitations discovered during integration
- Agent resistance to new interface
- Data migration edge cases requiring manual intervention
- WhatsApp Business API number porting complications

---

## 10. Client Communication

### 10.1 Communication Timeline

| When | What | Channel | Audience |
|---|---|---|---|
| **4 weeks before** | Announcement of upcoming upgrade | Email + WhatsApp | All clients |
| **2 weeks before** | Detailed changes + FAQ | Email | All clients |
| **1 week before** | Reminder + training offer | WhatsApp | All clients |
| **D-Day** | "We're live" notification | WhatsApp + Email | All clients |
| **D+1** | Check-in: any issues? | WhatsApp | All clients |
| **D+7** | First week summary | Email | All clients |
| **D+30** | One month review | Email | All clients |

### 10.2 Announcement Template (4 Weeks Before)

**Subject:** Exciting Upgrade to Your M4E CRM Experience

---

Dear [Client Name],

We're upgrading the M4E CRM platform to give you a significantly better experience managing your customer conversations.

**What's changing:**
- Faster, more responsive interface — New conversation management system
- Mobile app access — Respond to customers from your phone (iOS & Android)
- Better notifications — Never miss a customer message
- Canned responses — Save and reuse common replies instantly
- Customer satisfaction surveys — Automatic post-conversation feedback

**What's NOT changing:**
- Your WhatsApp number stays the same
- Your contacts and conversation history are preserved
- Your deals pipeline and automations continue working
- Your billing and pricing remain unchanged

**When:** [Date — 4 weeks from now]

**What you need to do:** Nothing right now! We'll handle everything. We'll send you updated login details and a quick training video before the switch.

Questions? Reply to this message or call us at [phone number].

Best regards,
The M4E Team

---

### 10.3 Detailed Changes Template (2 Weeks Before)

**Subject:** Your M4E CRM Upgrade — What to Expect

---

Dear [Client Name],

Our CRM upgrade is happening on **[Date]**. Here's everything you need to know:

**New Login:**
- You'll receive a new login link: [Chatwoot URL]
- Your email remains the same
- You'll set a new password on first login

**New Features You'll Love:**
1. **Mobile App** — Download "Chatwoot" from App Store / Play Store
2. **Quick Replies** — Type `/` to access saved responses
3. **Keyboard Shortcuts** — Press `?` to see all shortcuts
4. **Team Collaboration** — See who's handling which conversation

**Your Existing Features:**
- Deals & Pipeline: Access via [M4E Dashboard URL]
- Automations: Continue running automatically
- Broadcasts: Access via [M4E Dashboard URL]
- Reports: Available in both Chatwoot and M4E Dashboard

**Training:**
- Video walkthrough: [Link — to be created]
- Live training session: [Date/Time] — [Zoom link]
- Quick start guide: [Link — to be created]

**FAQ:**

*Q: Will I lose any messages or contacts?*
A: No. Everything is migrated. Your full history is preserved.

*Q: Will my customers notice any change?*
A: No. Your WhatsApp number and business name stay exactly the same.

*Q: Can I still use the old system?*
A: The old system will be available in read-only mode for 30 days after the switch.

*Q: What if I have problems?*
A: Our support team is on standby. WhatsApp us at [number] or email [email].

Best regards,
The M4E Team

---

### 10.4 Go-Live Notification (D-Day)

**WhatsApp Message:**

> Hi [Name]! Your M4E CRM has been upgraded! Here's what you need:
>
> New login: [URL]
> Mobile app: Search "Chatwoot" on App Store / Play Store
>
> Your WhatsApp number, contacts, and conversations are all there.
>
> Need help? Reply here or call [number].
>
> — M4E Team

### 10.5 Post-Cutover Check-In (D+1)

**WhatsApp Message:**

> Hi [Name]! How's the new CRM working for you? We switched over yesterday and want to make sure everything is smooth.
>
> Any questions or issues? Just reply here and we'll sort it out immediately.
>
> — M4E Team

---

## Appendix A: Chatwoot API Quick Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/accounts/{id}/contacts` | POST | Create contact |
| `/api/v1/accounts/{id}/contacts/{id}` | GET/PUT | Read/update contact |
| `/api/v1/accounts/{id}/conversations` | POST | Create conversation |
| `/api/v1/accounts/{id}/conversations/{id}/messages` | POST | Create message |
| `/api/v1/accounts/{id}/contacts/{id}/labels` | POST | Add labels |
| `/api/v1/accounts/{id}/contacts/{id}/notes` | POST | Add note |
| `/api/v1/accounts/{id}/custom_attribute_definitions` | POST | Create custom attribute |
| `/api/v1/accounts/{id}/automation_rules` | POST | Create automation rule |

Full API docs: https://www.chatwoot.com/developers/api/

## Appendix B: Evolution API Quick Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/instance/create` | POST | Create WhatsApp instance |
| `/instance/connect/{instance}` | GET | Get QR code for pairing |
| `/message/sendText/{instance}` | POST | Send text message |
| `/message/sendMedia/{instance}` | POST | Send media message |
| `/message/sendTemplate/{instance}` | POST | Send template message |
| `/chat/findMessages/{instance}` | POST | Retrieve messages |
| `/webhook/set/{instance}` | PUT | Configure webhook URL |

Full API docs: https://doc.evolution-api.com/

## Appendix C: Chatwoot Self-Hosting Requirements

| Component | Minimum | Recommended |
|---|---|---|
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 25 GB SSD | 50 GB SSD |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04 |
| **Database** | PostgreSQL 14+ | PostgreSQL 15 |
| **Redis** | Redis 6+ | Redis 7 |
| **Docker** | Docker 20+ | Docker 24+ |

Estimated monthly cost (DigitalOcean/Hetzner): $20-$50/month

## Appendix D: Glossary

| Term | Definition |
|---|---|
| **WABA** | WhatsApp Business Account — the Meta-level account that owns phone numbers |
| **Evolution API** | Open-source WhatsApp gateway supporting both official API and WhatsApp Web |
| **Chatwoot** | Open-source customer engagement platform (conversations, contacts, teams) |
| **Inbox** | Chatwoot concept: a communication channel (WhatsApp, email, web chat, etc.) |
| **Canned Response** | Pre-written reply template accessible via `/` shortcut in Chatwoot |
| **Automation Rule** | Chatwoot's simple if-then automation (single trigger, single action) |
| **CSAT** | Customer Satisfaction score — post-conversation survey |
| **RLS** | Row Level Security — Supabase/PostgreSQL access control per row |

---

*This document is confidential and proprietary to Marketing4Effect. Distribution outside M4E requires written approval.*
