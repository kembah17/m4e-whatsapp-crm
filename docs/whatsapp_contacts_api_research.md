# WhatsApp Cloud API – Contact Card & File Handling Research

**Date:** 2026-07-05  
**Purpose:** Technical reference for M4E CRM webhook processing of contact cards, documents, and images  
**Status:** Complete

---

## Table of Contents

1. [Contact Card Messages (contacts type)](#1-contact-card-messages-contacts-type)
2. [vCard Data in Webhooks](#2-vcard-data-in-webhooks)
3. [Multiple Contacts](#3-multiple-contacts)
4. [Limitations on Contact Sharing](#4-limitations-on-contact-sharing)
5. [VCF Files as Document Attachments](#5-vcf-files-as-document-attachments)
6. [CSV/Excel as Document Attachments](#6-csvexcel-as-document-attachments)
7. [Image Messages (Photos)](#7-image-messages-photos)
8. [User-Side Contact Sharing Limits](#8-user-side-contact-sharing-limits)
9. [Maximum Document File Size](#9-maximum-document-file-size)
10. [WhatsApp Flows for Contact Collection](#10-whatsapp-flows-for-contact-collection)
11. [Implementation Recommendations for M4E CRM](#11-implementation-recommendations-for-m4e-crm)

---

## 1. Contact Card Messages (`contacts` type)

### Webhook Payload Structure

When a WhatsApp user sends or forwards a contact card, the webhook receives a message with `type: "contacts"`. The payload follows the standard WhatsApp Cloud API webhook envelope:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "BUSINESS_PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": {
                  "name": "SENDER_NAME"
                },
                "wa_id": "SENDER_WHATSAPP_ID"
              }
            ],
            "messages": [
              {
                "from": "SENDER_PHONE_NUMBER",
                "id": "wamid.MESSAGE_ID",
                "timestamp": "1234567890",
                "type": "contacts",
                "contacts": [
                  {
                    "addresses": [
                      {
                        "city": "Lagos",
                        "country": "Nigeria",
                        "country_code": "NG",
                        "state": "Lagos",
                        "street": "123 Victoria Island",
                        "type": "HOME",
                        "zip": "101001"
                      }
                    ],
                    "birthday": "1990-05-15",
                    "emails": [
                      {
                        "email": "contact@example.com",
                        "type": "WORK"
                      }
                    ],
                    "name": {
                      "first_name": "John",
                      "formatted_name": "John Doe",
                      "last_name": "Doe",
                      "middle_name": "",
                      "prefix": "Mr.",
                      "suffix": ""
                    },
                    "org": {
                      "company": "Acme Corp",
                      "department": "Marketing",
                      "title": "Director"
                    },
                    "phones": [
                      {
                        "phone": "+2348012345678",
                        "type": "CELL",
                        "wa_id": "2348012345678"
                      },
                      {
                        "phone": "+2341234567",
                        "type": "WORK"
                      }
                    ],
                    "urls": [
                      {
                        "url": "https://example.com",
                        "type": "WORK"
                      }
                    ]
                  }
                ]
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### Key Points

- The `contacts` array is nested **inside** the `messages[].contacts` field (not at the top level `contacts` which refers to the sender)
- Top-level `value.contacts` = **sender info** (who sent the message)
- `messages[].contacts` = **shared contact cards** (the actual contact data being shared)
- The `type` field in the message object is `"contacts"`

---

## 2. vCard Data in Webhooks

### Does the webhook include raw vCard data?

**No.** The WhatsApp Cloud API does **not** include raw vCard (`.vcf`) text in the webhook payload. Instead, it **parses the vCard** and delivers structured JSON fields.

### Available Fields

| Field | Sub-fields | Description |
|-------|-----------|-------------|
| `name` | `formatted_name` (required), `first_name`, `last_name`, `middle_name`, `prefix`, `suffix` | Contact name components |
| `phones` | `phone`, `type` (CELL, MAIN, IPHONE, HOME, WORK), `wa_id` | Phone numbers; `wa_id` present only if number is on WhatsApp |
| `emails` | `email`, `type` (HOME, WORK) | Email addresses |
| `addresses` | `street`, `city`, `state`, `zip`, `country`, `country_code`, `type` | Physical addresses |
| `org` | `company`, `department`, `title` | Organization info |
| `urls` | `url`, `type` | Website URLs |
| `birthday` | (string, YYYY-MM-DD format) | Date of birth |

### Important Notes

- **`formatted_name`** is the only **required** field; all others are optional
- Fields only appear if they exist in the original vCard/contact
- The `wa_id` sub-field in `phones` is only populated if WhatsApp can verify the number is registered
- Nigerian phone numbers will typically appear in international format (`+234...`)
- **No photo/avatar data** is included in the contacts webhook — even if the original contact has a profile picture

---

## 3. Multiple Contacts

### Can a user send multiple contact cards at once?

**Yes.** WhatsApp allows users to select and share multiple contacts in a single message.

### How the API handles it

When multiple contacts are shared in one message, the `messages[].contacts` array contains **multiple objects** — one per shared contact:

```json
{
  "messages": [
    {
      "from": "2348012345678",
      "id": "wamid.xxx",
      "timestamp": "1720185600",
      "type": "contacts",
      "contacts": [
        {
          "name": { "formatted_name": "Alice Okafor" },
          "phones": [{ "phone": "+2348011111111", "type": "CELL" }]
        },
        {
          "name": { "formatted_name": "Bob Adeyemi" },
          "phones": [{ "phone": "+2348022222222", "type": "CELL" }]
        },
        {
          "name": { "formatted_name": "Clara Nwosu" },
          "phones": [{ "phone": "+2348033333333", "type": "CELL" }]
        }
      ]
    }
  ]
}
```

### Processing Consideration

- Each contact in the array is a separate contact card
- The CRM webhook handler should iterate over `messages[].contacts[]` and process each one
- All contacts in a single message share the same `message_id` and `timestamp`

---

## 4. Limitations on Contact Sharing

### WhatsApp Client-Side Limits

| Platform | Max contacts per share | Notes |
|----------|----------------------|-------|
| Android | **~20 contacts** per single share action | Users can repeat the action to share more |
| iPhone (iOS) | **~20 contacts** per single share action | Same limit as Android |
| WhatsApp Web/Desktop | **~20 contacts** per single share action | Mirrors mobile limits |

### API-Side Limits

- The Cloud API webhook will deliver **all contacts** included in a single message
- There is **no documented hard limit** on the `contacts` array size in the webhook payload
- In practice, the limit is enforced by the WhatsApp client (\~20 per message)
- For **sending** contact cards via the API (business → user), the limit is also multiple contacts per message

### Practical Implication for Bulk Import

- Users **cannot** select "all contacts" and share them in one go
- Sharing 100+ contacts requires multiple messages (5+ messages of 20 contacts each)
- This makes contact card sharing **impractical for bulk import** — document-based import (CSV/VCF file) is far more efficient

---

## 5. VCF Files as Document Attachments

### When a user sends a `.vcf` file as a document (not as a contact card)

If a user explicitly sends a `.vcf` file as a document attachment (e.g., from a file manager), the webhook receives it as a **document message**, not a contacts message:

```json
{
  "messages": [
    {
      "from": "2348012345678",
      "id": "wamid.xxx",
      "timestamp": "1720185600",
      "type": "document",
      "document": {
        "id": "MEDIA_ID",
        "mime_type": "text/x-vcard",
        "sha256": "HASH",
        "filename": "contacts.vcf",
        "caption": "Here are my contacts"
      }
    }
  ]
}
```

### Key Details

| Field | Value |
|-------|-------|
| `type` | `"document"` |
| `mime_type` | `"text/x-vcard"` or `"text/vcard"` |
| `filename` | Original filename (e.g., `contacts.vcf`, `My Contacts.vcf`) |
| `id` | Media ID — must be downloaded via `GET /{media-id}` endpoint |

### Downloading the VCF File

1. **Get media URL:** `GET https://graph.facebook.com/v21.0/{media-id}` with auth header
2. **Download file:** `GET {url}` from the response with auth header
3. **Parse vCard:** Use a vCard parser library (e.g., Python's `vobject` or `vcard` package)

### VCF File Advantages for Bulk Import

- A single `.vcf` file can contain **thousands of contacts**
- No per-message limit on number of contacts in the file
- Contains richer data than the parsed contacts webhook (notes, custom fields, photos)
- Standard format exportable from all phone contact apps

---

## 6. CSV/Excel as Document Attachments

### CSV Files (`.csv`)

```json
{
  "messages": [
    {
      "type": "document",
      "document": {
        "id": "MEDIA_ID",
        "mime_type": "text/csv",
        "sha256": "HASH",
        "filename": "customer_list.csv"
      }
    }
  ]
}
```

| Format | Expected `mime_type` | Notes |
|--------|---------------------|-------|
| `.csv` | `text/csv` | May also appear as `application/csv` or `text/plain` depending on the sending device |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Standard OOXML MIME type |
| `.xls` | `application/vnd.ms-excel` | Legacy Excel format |
| `.ods` | `application/vnd.oasis.opendocument.spreadsheet` | LibreOffice format (rare on WhatsApp) |

### Excel Files (`.xlsx`)

```json
{
  "messages": [
    {
      "type": "document",
      "document": {
        "id": "MEDIA_ID",
        "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "sha256": "HASH",
        "filename": "customer_database.xlsx"
      }
    }
  ]
}
```

### Processing Pipeline

1. Download via Media API (same as VCF)
2. Parse with appropriate library:
   - CSV: Python `csv` module or `pandas`
   - XLSX: `openpyxl` or `pandas`
   - XLS: `xlrd` or `pandas`
3. Map columns to contact fields
4. Validate and normalize phone numbers (especially Nigerian `+234` format)

---

## 7. Image Messages (Photos)

### Webhook Format for Image Messages

When a user sends a photo (e.g., of a notebook page with handwritten contacts):

```json
{
  "messages": [
    {
      "from": "2348012345678",
      "id": "wamid.xxx",
      "timestamp": "1720185600",
      "type": "image",
      "image": {
        "id": "MEDIA_ID",
        "mime_type": "image/jpeg",
        "sha256": "HASH",
        "caption": "Here are the contacts from my notebook"
      }
    }
  ]
}
```

### Image MIME Types

| Format | `mime_type` |
|--------|------------|
| JPEG/JPG | `image/jpeg` |
| PNG | `image/png` |
| WebP | `image/webp` |
| GIF (static) | `image/gif` |

### Processing for Contact Extraction (OCR)

1. Download image via Media API
2. Run OCR (e.g., Gemini 2.0 Flash via OpenRouter — already implemented in M4E CRM Batch 6)
3. Extract structured contact data from OCR text
4. Validate and normalize

### Key Notes

- `caption` field is optional — only present if user added a caption
- Images are compressed by WhatsApp before delivery
- Maximum image size: **5 MB** (after WhatsApp compression)
- For OCR quality, higher resolution originals produce better results

---

## 8. User-Side Contact Sharing Limits

### Can users select ALL contacts and share via WhatsApp?

#### Android
- Open WhatsApp chat → Attach → Contact
- Can select **multiple contacts** (up to ~20 per share action)
- **Cannot select "all"** — must manually tap each contact
- Workaround: Export all contacts as a `.vcf` file from the Contacts app, then share the file via WhatsApp as a document

#### iPhone (iOS)
- Open WhatsApp chat → + button → Contact
- Can select **multiple contacts** (up to ~20 per share action)
- **Cannot select "all"** — same manual selection required
- Workaround: Export contacts via iCloud (Settings → Contacts → Export vCard), then share `.vcf` file

#### Bulk Export Workarounds

| Method | Platform | Steps | Result |
|--------|----------|-------|--------|
| Google Contacts Export | Android | contacts.google.com → Export → Google CSV or vCard | `.csv` or `.vcf` file |
| iCloud Export | iPhone | icloud.com/contacts → Select All → Export vCard | `.vcf` file |
| Phone Contacts App | Both | Share/Export all → Save as `.vcf` | `.vcf` file |
| Third-party apps | Both | Apps like "Easy Backup" or "Contact to Excel" | `.csv` or `.xlsx` file |

**Recommendation for M4E clients:** Guide them to export contacts as CSV or VCF from their phone/Google Contacts, then send the file via WhatsApp as a document attachment.

---

## 9. Maximum Document File Size

### WhatsApp Document Size Limits

| Media Type | Maximum Size | Supported Formats |
|-----------|-------------|-------------------|
| **Documents** | **100 MB** | PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX, TXT, VCF, and others |
| Images | 5 MB | JPEG, PNG, WebP |
| Video | 16 MB | MP4, 3GPP |
| Audio | 16 MB | AAC, MP3, MP4 audio, AMR, OGG |
| Stickers | 100 KB (static), 500 KB (animated) | WebP |

### Important Notes

- The **100 MB document limit** is generous and easily accommodates even large contact databases
- A CSV with 10,000 contacts is typically under 1 MB
- A VCF with 10,000 contacts (with photos stripped) is typically 5-15 MB
- WhatsApp does **not** compress documents (unlike images/videos)

---

## 10. WhatsApp Flows for Contact Collection

### WhatsApp Flows Overview

WhatsApp Flows is a feature of the WhatsApp Business Platform that allows businesses to create **structured, interactive forms** within WhatsApp.

### Relevance to Contact Collection

| Feature | Capability | Limitation |
|---------|-----------|------------|
| **Text Input Fields** | Collect name, email, phone number via form fields | One contact at a time |
| **Dropdown/Select** | Pre-defined options (e.g., contact type) | Not suitable for bulk data |
| **Date Picker** | Collect dates (e.g., birthday) | Single value |
| **Multi-step Forms** | Chain multiple screens for detailed contact info | Complex to build for bulk |
| **Data Validation** | Validate phone format, email format in real-time | Client-side only |

### WhatsApp Flows JSON Structure (Contact Collection Example)

```json
{
  "version": "3.0",
  "screens": [
    {
      "id": "CONTACT_FORM",
      "title": "Add a Contact",
      "data": {},
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "TextInput",
            "name": "contact_name",
            "label": "Full Name",
            "required": true,
            "input-type": "text"
          },
          {
            "type": "TextInput",
            "name": "contact_phone",
            "label": "Phone Number",
            "required": true,
            "input-type": "phone"
          },
          {
            "type": "TextInput",
            "name": "contact_email",
            "label": "Email Address",
            "required": false,
            "input-type": "email"
          },
          {
            "type": "TextInput",
            "name": "contact_company",
            "label": "Company Name",
            "required": false,
            "input-type": "text"
          },
          {
            "type": "Footer",
            "label": "Submit Contact",
            "on-click-action": {
              "name": "complete",
              "payload": {
                "contact_name": "${form.contact_name}",
                "contact_phone": "${form.contact_phone}",
                "contact_email": "${form.contact_email}",
                "contact_company": "${form.contact_company}"
              }
            }
          }
        ]
      }
    }
  ]
}
```

### Flows Response Webhook

When a user completes a Flow, the webhook receives:

```json
{
  "messages": [
    {
      "type": "interactive",
      "interactive": {
        "type": "nfm_reply",
        "nfm_reply": {
          "response_json": "{\"contact_name\":\"Chidi Okonkwo\",\"contact_phone\":\"+2348012345678\",\"contact_email\":\"chidi@example.com\",\"contact_company\":\"Okonkwo Enterprises\",\"flow_token\":\"abc123\"}",
          "body": "Sent",
          "name": "flow"
        }
      }
    }
  ]
}
```

### Flows Limitations for Contact Collection

- **One contact at a time** — no bulk entry capability
- **No file upload** — users cannot upload CSV/VCF through Flows
- **10 screens max** per Flow
- **Best for:** Structured single-contact collection (e.g., referral forms, lead capture)
- **Not suitable for:** Bulk contact import (use document upload instead)

---

## 11. Implementation Recommendations for M4E CRM

### Webhook Handler Priority Matrix

| Message Type | Detection | Processing | Priority |
|-------------|-----------|------------|----------|
| `contacts` | `message.type == "contacts"` | Parse JSON contacts array directly | High |
| `document` (VCF) | `message.type == "document"` AND `mime_type` contains `vcard` | Download → Parse vCard → Extract contacts | High |
| `document` (CSV) | `message.type == "document"` AND (`mime_type == "text/csv"` OR filename ends `.csv`) | Download → Parse CSV → Map columns | High |
| `document` (XLSX) | `message.type == "document"` AND mime_type contains `spreadsheet` | Download → Parse with openpyxl/pandas | Medium |
| `image` | `message.type == "image"` | Download → OCR (Gemini) → Extract contacts | Medium |
| `interactive` (Flow) | `message.type == "interactive"` AND `nfm_reply` | Parse `response_json` | High |

### Recommended MIME Type Detection Logic

```python
def detect_import_type(message):
    """Detect the type of contact import from a WhatsApp webhook message."""
    msg_type = message.get("type")

    if msg_type == "contacts":
        return "contact_card"

    if msg_type == "document":
        doc = message.get("document", {})
        mime = doc.get("mime_type", "").lower()
        filename = doc.get("filename", "").lower()

        # VCF detection
        if "vcard" in mime or filename.endswith(".vcf"):
            return "vcf_file"

        # CSV detection
        if mime in ("text/csv", "application/csv") or filename.endswith(".csv"):
            return "csv_file"

        # Excel detection
        if "spreadsheet" in mime or "excel" in mime or            filename.endswith(".xlsx") or filename.endswith(".xls"):
            return "excel_file"

        return "other_document"

    if msg_type == "image":
        return "image_ocr"

    if msg_type == "interactive":
        interactive = message.get("interactive", {})
        if interactive.get("type") == "nfm_reply":
            return "flow_response"

    return "unknown"
```

### Nigerian Market Considerations

1. **Phone number normalization:** Always normalize to `+234` international format
2. **Multiple numbers:** Nigerian contacts often have 2-3 phone numbers (MTN, Glo, Airtel)
3. **Name formats:** Handle single names, reversed names, and titles (Chief, Alhaji, etc.)
4. **WhatsApp prevalence:** Most Nigerian phone numbers will have `wa_id` populated
5. **Paper-to-digital:** Many Nigerian SMEs still keep contacts in notebooks — image/OCR pipeline is critical
6. **File sharing literacy:** Guide clients to use CSV/VCF export rather than contact card sharing for bulk imports

---

## Sources

- [Meta WhatsApp Cloud API — Messages Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components)
- [Meta WhatsApp Cloud API — Media Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media)
- [Meta WhatsApp Flows Documentation](https://developers.facebook.com/docs/whatsapp/flows)
- [WhatsApp Business Platform — Message Types](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
- M4E CRM existing implementation (Batch 6 — OCR via Gemini 2.0 Flash)
- M4E competitor data import research (existing project research)

---

*Research compiled for Marketing4Effect WhatsApp CRM development.*
