# Google My Business Review Workflow Integration

**Version:** 1.0.0  
**Last Updated:** June 2025  
**Author:** Marketing4Effect (M4E)  
**Status:** Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Review Link Generation](#1-review-link-generation)
3. [Satisfaction Gate Integration](#2-satisfaction-gate-integration)
4. [Video Testimonial Collection](#3-video-testimonial-collection)
5. [Website Embedding](#4-website-embedding)
6. [GMB Profile Management](#5-gmb-profile-management)
7. [CRM Integration Points](#6-crm-integration-points)
8. [Automation Sequences](#7-automation-sequences)
9. [Metrics & Tracking](#8-metrics--tracking)
10. [Troubleshooting](#9-troubleshooting)

---

## Overview

This document defines the complete workflow for integrating Google My Business (GMB) reviews into the M4E Database Reactivation service. The GMB review collection is an **add-on service** that layers on top of the core reactivation workflow and the satisfaction-gated-reviews process.

### Why GMB Reviews Matter for Nigerian SMEs

- **Local SEO dominance**: GMB reviews are the #1 ranking factor for Google Maps/Local Pack
- **Trust signal**: 93% of Nigerian consumers read online reviews before visiting a business
- **Free marketing**: Each review is permanent, free advertising on Google
- **Competitive moat**: Most Nigerian SMEs have 0-5 reviews; 20+ reviews creates massive advantage
- **Conversion driver**: Businesses with 4.0+ stars get 12x more clicks than those below 3.5

### Service Flow Summary

```
Reactivation Purchase
    → 3-day wait
    → Satisfaction Check (WhatsApp/Email)
    → IF satisfied:
        → Step 1: Send GMB review link (immediate)
        → Step 2: Track click (CRM logs)
        → Step 3: 48hr reminder if no review detected
        → Step 4: Request video testimonial (Day 5)
        → Step 5: Request referral (Day 7)
    → IF unsatisfied:
        → Service recovery sequence
        → Do NOT request review
```

---

## 1. Review Link Generation

### How Google Review Links Work

Every Google Business Profile has a unique **Place ID** — an alphanumeric identifier that Google assigns. From this Place ID, we construct a direct review link that opens the Google review dialog immediately.

### Direct Review Link Format

```
https://search.google.com/local/writereview?placeid=<PLACE_ID>
```

**Example:**
```
https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4
```

### How to Find a Client\'s Place ID

#### Method 1: Google Maps URL (Easiest)

1. Go to [Google Maps](https://maps.google.com)
2. Search for the client\'s business
3. Click on the business listing
4. Copy the URL from the browser address bar
5. The Place ID can be extracted from the URL or via the Places API

#### Method 2: Google Place ID Finder

1. Go to: https://developers.google.com/maps/documentation/places/web-service/place-id
2. Enter the business name and location
3. Copy the Place ID from the result

#### Method 3: Google Maps Platform API

```bash
curl "https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=BUSINESS_NAME+CITY&inputtype=textquery&fields=place_id&key=YOUR_API_KEY"
```

#### Method 4: Automated Script

Use the provided script:
```bash
python scripts/generate_gmb_review_link.py --url "https://maps.google.com/maps?cid=XXXXX"
python scripts/generate_gmb_review_link.py --place-id "ChIJN1t_tDeuEmsRUsoyG83frY4"
python scripts/generate_gmb_review_link.py --search "Mama Put Restaurant Lagos"
```

### Short Link Creation

For WhatsApp messages, long URLs look unprofessional. Create short links:

1. **Google\'s built-in short link**: Available in GMB dashboard under "Get more reviews"
2. **Custom short link**: Use bit.ly or client\'s domain (e.g., `review.clientbusiness.com`)
3. **CRM-tracked link**: Route through CRM to track clicks before redirecting to Google

**Recommended approach:** CRM-tracked link for attribution, falling back to Google\'s short link.

---

## 2. Satisfaction Gate Integration

The satisfaction gate ensures we ONLY request reviews from happy customers. This protects the client\'s GMB rating and builds genuine social proof.

### Gate Flow

```
┌─────────────────────────────────────────────────┐
│           SATISFACTION CHECK                      │
│                                                   │
│  "Hi [Name]! Thanks for visiting [Business]       │
│   recently. On a scale of 1-5, how would you      │
│   rate your experience?"                          │
│                                                   │
│  Customer responds: 1 | 2 | 3 | 4 | 5            │
└─────────────┬───────────────────┬─────────────────┘
              │                   │
         Score 1-3           Score 4-5
              │                   │
              ▼                   ▼
    ┌─────────────────┐  ┌──────────────────────┐
    │ SERVICE RECOVERY │  │ REVIEW REQUEST       │
    │                  │  │                      │
    │ "We\'re sorry to  │  │ "We\'re so glad! 😊   │
    │  hear that. Our  │  │  Would you mind      │
    │  manager [Name]  │  │  sharing your         │
    │  will reach out  │  │  experience on        │
    │  within 24hrs."  │  │  Google? It really    │
    │                  │  │  helps [Business]."   │
    │ → Route to owner │  │                      │
    │ → Log complaint  │  │ → Send GMB link      │
    │ → Follow up      │  │ → Track click        │
    └─────────────────┘  │ → 48hr reminder       │
                         └──────────────────────┘
```

### Satisfaction Check Templates

#### WhatsApp Template (Primary Channel)

```
Hi {customer_name}! 👋

Thanks for visiting {business_name} recently. We hope you had a great experience!

Quick question — on a scale of 1-5, how would you rate your visit?

⭐ 1 - Poor
⭐⭐ 2 - Below average  
⭐⭐⭐ 3 - Average
⭐⭐⭐⭐ 4 - Good
⭐⭐⭐⭐⭐ 5 - Excellent

Just reply with a number. Your feedback helps us serve you better! 🙏
```

#### Email Template (Fallback)

**Subject:** How was your visit to {business_name}?

```
Hi {customer_name},

Thank you for choosing {business_name}! We\'d love to hear about your experience.

How would you rate your recent visit?

[⭐ Poor] [⭐⭐ Below Avg] [⭐⭐⭐ Average] [⭐⭐⭐⭐ Good] [⭐⭐⭐⭐⭐ Excellent]

(Each star links to a CRM endpoint that records the rating)

Your feedback helps us improve and serve you better.

Warm regards,
{business_name} Team
```

### Review Request Templates (Score 4-5 Only)

#### WhatsApp Review Request

```
That\'s wonderful to hear, {customer_name}! 😊 Thank you!

Would you mind taking 30 seconds to share your experience on Google? It really helps {business_name} and other customers find us.

👉 {review_link}

Just tap the link and leave a quick review. Even a few words make a huge difference! 🙏
```

#### 48-Hour Reminder (If No Click Detected)

```
Hi {customer_name}! 👋

Just a gentle reminder — we\'d really appreciate your Google review for {business_name}. It takes less than 30 seconds!

👉 {review_link}

Thank you for supporting local business! 💚
```

---

## 3. Video Testimonial Collection

Video testimonials are the highest-value social proof asset. WhatsApp makes collection frictionless because customers can record and send video messages directly.

### Video Collection Flow

```
Day 5 after purchase (if satisfaction score was 4-5):

"Hi {customer_name}! 🎥

Your kind words about {business_name} meant so much to us!

Would you be willing to record a quick 15-30 second video sharing your experience? You can just send it as a WhatsApp video message right here!

Here are some ideas of what to say:
• What brought you to {business_name}?
• What did you enjoy most?
• Would you recommend us to a friend?

No pressure at all — but if you do, we\'d love to feature you on our page! 🌟"
```

### Video Processing Pipeline

1. **Receive**: Customer sends WhatsApp video message
2. **Download**: CRM webhook captures and downloads the video
3. **Store**: Upload to Supabase Storage (`testimonials/{client_id}/{customer_id}/`)
4. **Review**: Client approves video for public use
5. **Process**: Optionally add branding overlay, subtitles
6. **Publish**: Embed on client website, use in ad creatives

### Storage Structure

```
supabase-storage/
└── testimonials/
    └── {client_account_id}/
        └── {video_id}/
            ├── original.mp4          # Raw WhatsApp video
            ├── thumbnail.jpg         # Auto-generated thumbnail
            ├── processed.mp4         # Branded version (optional)
            └── metadata.json         # Customer name, date, consent
```

### Consent Management

Before publishing any video testimonial:

1. Send consent request:
```
"Thank you for the amazing video, {customer_name}! 🙏

We\'d love to share it on {business_name}\'s website and social media to help other customers. 

Is that okay with you? Just reply YES or NO.

(Your video will only be used with your permission and you can ask us to remove it anytime.)"
```

2. Log consent in CRM with timestamp
3. Only publish after explicit "YES" response
4. Maintain withdrawal mechanism (customer can request removal)

---

## 4. Website Embedding

### Testimonial Display Options

#### Option A: Testimonial Carousel (Recommended)

A rotating carousel of video thumbnails with play buttons, customer names, and star ratings.

```html
<!-- Embed code for client websites -->
<div id="m4e-testimonials" 
     data-client-id="{client_id}" 
     data-style="carousel"
     data-max="6">
</div>
<script src="https://crm.marketing4effect.com/embed/testimonials.js"></script>
```

#### Option B: Testimonial Wall

Grid layout showing all approved testimonials with filtering by rating.

#### Option C: Single Featured Testimonial

Highlight one testimonial prominently, rotating weekly.

### Google Review Widget

Display aggregated Google reviews on the client\'s website:

1. **Google Places API**: Fetch reviews programmatically
2. **Third-party widgets**: Elfsight, Trustindex (free tiers available)
3. **Custom embed**: Build with CRM data + Google API

### SEO Benefits

- Video testimonials with Schema.org `Review` markup boost local SEO
- Embedded Google reviews create fresh, user-generated content
- Star ratings in search results increase CTR by 35%

---

## 5. GMB Profile Management

### For Clients WITHOUT a GMB Profile

Many Nigerian SMEs don\'t have a Google Business Profile. M4E offers profile creation as part of the add-on.

#### Creation Process

1. **Gather Information**:
   - Business name (exactly as registered)
   - Physical address or service area
   - Phone number (preferably the M4E-provisioned number)
   - Business category (Google\'s taxonomy)
   - Operating hours
   - Website URL
   - Business description (250 words max)
   - Logo and cover photo

2. **Create Profile**:
   - Go to https://business.google.com
   - Sign in with client\'s Google account (or M4E management account)
   - Follow the setup wizard
   - Select accurate business category

3. **Verify Profile**:
   - **Postcard verification**: Google sends a postcard with PIN to business address (5-14 days)
   - **Phone verification**: Available for some businesses (instant)
   - **Email verification**: Available for some businesses (instant)
   - **Video verification**: Record a video of the business location (1-5 days)

4. **Optimize Profile**:
   - Add all business categories (primary + secondary)
   - Upload 10+ high-quality photos
   - Write keyword-rich business description
   - Add products/services with prices
   - Set up messaging
   - Add booking link (if applicable)
   - Post first Google Post

### For Clients WITH an Existing GMB Profile

#### Claiming Process (If Unclaimed)

1. Search for the business on Google Maps
2. Click "Claim this business" or "Own this business?"
3. Follow verification steps
4. If another account owns it, submit a claim request

#### Optimization Audit

Run through this checklist for existing profiles:

- [ ] Business name matches real-world name exactly
- [ ] Address is accurate and formatted correctly
- [ ] Phone number is correct and answered
- [ ] Website URL is correct and working
- [ ] Business hours are accurate (including holidays)
- [ ] Primary category is the most specific option available
- [ ] Secondary categories added (up to 9)
- [ ] Business description is complete (750 chars)
- [ ] At least 10 photos uploaded
- [ ] Products/services listed with prices
- [ ] Google Posts published (at least monthly)
- [ ] Q&A section has owner-provided answers
- [ ] Messaging is enabled
- [ ] Booking link added (if applicable)

### Multi-Location Management

For clients with multiple locations:

1. Create a Business Group in Google Business Profile
2. Add each location as a separate listing
3. Maintain consistent NAP (Name, Address, Phone) across all
4. Generate unique review links per location
5. Track reviews per location in CRM

---

## 6. CRM Integration Points

### Database Schema Additions

The following tables/columns need to be added to the M4E CRM:

#### `gmb_config` Table

```sql
CREATE TABLE gmb_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    place_id VARCHAR(255),
    review_link TEXT,
    short_review_link TEXT,
    gmb_profile_url TEXT,
    business_name VARCHAR(255),
    total_reviews INTEGER DEFAULT 0,
    average_rating DECIMAL(2,1) DEFAULT 0.0,
    last_review_sync TIMESTAMPTZ,
    auto_request_enabled BOOLEAN DEFAULT true,
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_delay_hours INTEGER DEFAULT 48,
    video_testimonials_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id)
);
```

#### `review_requests` Table

```sql
CREATE TABLE review_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
    satisfaction_checked_at TIMESTAMPTZ,
    review_link_sent_at TIMESTAMPTZ,
    review_link_clicked_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    review_completed_at TIMESTAMPTZ,
    review_rating INTEGER CHECK (review_rating BETWEEN 1 AND 5),
    video_requested_at TIMESTAMPTZ,
    video_received_at TIMESTAMPTZ,
    video_approved BOOLEAN DEFAULT false,
    video_storage_path TEXT,
    referral_requested_at TIMESTAMPTZ,
    channel VARCHAR(20) DEFAULT 'whatsapp',
    status VARCHAR(30) DEFAULT 'pending',
    -- pending, satisfaction_sent, satisfied, unsatisfied, 
    -- review_sent, review_clicked, review_completed,
    -- video_requested, video_received, completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_requests_account ON review_requests(account_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_review_requests_contact ON review_requests(contact_id);
```

#### `video_testimonials` Table

```sql
CREATE TABLE video_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    review_request_id UUID REFERENCES review_requests(id),
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    processed_path TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    consent_given BOOLEAN DEFAULT false,
    consent_given_at TIMESTAMPTZ,
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    customer_name VARCHAR(255),
    customer_quote TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Automation Triggers

Add these triggers to the automation engine (`src/lib/automations/engine.ts`):

#### Trigger: Post-Purchase Satisfaction Check

```typescript
// Trigger: 3 days after a reactivation purchase
{
  trigger: 'deal_won',
  delay: { days: 3 },
  action: 'send_satisfaction_check',
  channel: 'whatsapp', // primary
  fallback_channel: 'email',
  template: 'satisfaction_check',
  variables: {
    customer_name: '{{contact.name}}',
    business_name: '{{account.business_name}}',
  }
}
```

#### Trigger: Satisfaction Response → Review Request

```typescript
// Trigger: Customer responds with score 4 or 5
{
  trigger: 'satisfaction_score_received',
  condition: 'score >= 4',
  action: 'send_review_request',
  channel: 'whatsapp',
  template: 'review_request',
  variables: {
    customer_name: '{{contact.name}}',
    business_name: '{{account.business_name}}',
    review_link: '{{account.gmb_config.review_link}}',
  }
}
```

#### Trigger: No Click After 48 Hours → Reminder

```typescript
// Trigger: Review link sent but not clicked within 48 hours
{
  trigger: 'review_link_sent',
  delay: { hours: 48 },
  condition: 'review_request.review_link_clicked_at IS NULL',
  action: 'send_review_reminder',
  channel: 'whatsapp',
  template: 'review_reminder',
}
```

#### Trigger: Review Completed → Video Request

```typescript
// Trigger: 2 days after review link clicked (assume review left)
{
  trigger: 'review_link_clicked',
  delay: { days: 2 },
  action: 'send_video_request',
  channel: 'whatsapp',
  template: 'video_testimonial_request',
}
```

### API Endpoints Needed

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/gmb/config` | GET/PUT | Get/update GMB configuration |
| `/api/gmb/review-link` | POST | Generate review link from Place ID |
| `/api/reviews/satisfaction` | POST | Record satisfaction score |
| `/api/reviews/track-click` | GET | Track review link click (redirect) |
| `/api/reviews/requests` | GET | List review requests with status |
| `/api/testimonials` | GET/POST | List/upload video testimonials |
| `/api/testimonials/:id/approve` | PUT | Approve testimonial for publishing |
| `/api/testimonials/embed` | GET | Public endpoint for website embed |

### Settings UI Components

Add to the CRM settings page (`src/components/settings/`):

1. **GMB Configuration Panel** (`gmb-config.tsx`):
   - Place ID input with validation
   - Auto-generated review link display
   - Test review link button
   - Toggle: Auto-request reviews after satisfaction check
   - Toggle: Send reminders
   - Reminder delay (hours) input
   - Toggle: Video testimonials

2. **Review Dashboard** (`review-dashboard.tsx`):
   - Total reviews requested vs completed
   - Average satisfaction score
   - Review funnel visualization
   - Recent review requests with status
   - Video testimonials gallery

---

## 7. Automation Sequences

### Complete Sequence Timeline

```
Day 0:  Reactivation purchase confirmed
Day 3:  Send satisfaction check (WhatsApp)
Day 3:  IF no response → Send satisfaction check (Email)
Day 4:  IF no response → Send satisfaction check (SMS)
Day 5:  IF score 4-5 → Send GMB review link
        IF score 1-3 → Trigger service recovery
        IF no response → Close (don\'t pursue)
Day 7:  IF review link not clicked → Send reminder
Day 7:  Request video testimonial
Day 10: IF video received → Send consent request
Day 12: Request referral
Day 14: Sequence complete → Log results
```

### Sequence Rules

1. **Never request a review from an unsatisfied customer** (score 1-3)
2. **Maximum 1 reminder** for review link (don\'t spam)
3. **Video request is optional** — only if client has video testimonials enabled
4. **Respect opt-outs** — if customer says "stop" at any point, exit sequence
5. **Business hours only** — send messages between 9am-7pm WAT
6. **Weekend handling** — delay weekend messages to Monday morning

---

## 8. Metrics & Tracking

### Key Performance Indicators

| Metric | Formula | Target |
|---|---|---|
| Satisfaction Response Rate | Responses / Checks Sent | >40% |
| Satisfaction Score (Avg) | Sum of scores / Responses | >4.0 |
| Review Request Rate | Reviews Requested / Satisfied | 100% |
| Review Link Click Rate | Clicks / Links Sent | >30% |
| Review Completion Rate | Reviews Left / Links Clicked | >50% |
| Video Collection Rate | Videos Received / Requested | >15% |
| Overall Funnel Rate | Reviews Left / Purchases | >10% |

### Dashboard Queries

```sql
-- Review funnel for a specific account
SELECT 
    COUNT(*) as total_requests,
    COUNT(satisfaction_checked_at) as satisfaction_sent,
    COUNT(CASE WHEN satisfaction_score >= 4 THEN 1 END) as satisfied,
    COUNT(review_link_sent_at) as review_links_sent,
    COUNT(review_link_clicked_at) as review_links_clicked,
    COUNT(review_completed_at) as reviews_completed,
    COUNT(video_received_at) as videos_received,
    AVG(satisfaction_score) as avg_satisfaction
FROM review_requests
WHERE account_id = $1
  AND created_at >= $2;
```

---

## 9. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Review link shows "This place doesn\'t exist" | Wrong Place ID | Re-verify Place ID using Google Maps |
| Customer can\'t leave review | No Google account | Guide them to create one, or skip |
| Review not appearing | Google moderation | Wait 24-48hrs; reviews are moderated |
| Video too large to send | WhatsApp 16MB limit | Ask customer to record shorter video |
| Low satisfaction scores | Service quality issue | Route to client for service improvement |
| Review link blocked on WhatsApp | URL flagged | Use short link or CRM redirect URL |

### Google Review Policies to Know

1. **Don\'t offer incentives** for reviews (violates Google policy)
2. **Don\'t gate reviews** publicly (ask all customers, not just happy ones) — our satisfaction gate is internal and compliant because we simply don\'t ASK unhappy customers; we route them to service recovery instead
3. **Don\'t bulk-request** reviews (spread over time naturally)
4. **Don\'t use review stations** (reviews from same IP get flagged)
5. **Do respond to all reviews** (positive and negative)

---

## Appendix: Script Reference

### generate_gmb_review_link.py

Location: `scripts/generate_gmb_review_link.py`

```bash
# From a Google Maps URL
python scripts/generate_gmb_review_link.py --url "https://maps.google.com/?cid=12345"

# From a Place ID
python scripts/generate_gmb_review_link.py --place-id "ChIJN1t_tDeuEmsRUsoyG83frY4"

# Search by business name (requires Google API key)
python scripts/generate_gmb_review_link.py --search "Mama Put Restaurant Lagos"

# Generate with WhatsApp message template
python scripts/generate_gmb_review_link.py --place-id "ChIJ..." --business-name "Mama Put" --template
```

See script file for full documentation.

---

*Document maintained by Marketing4Effect (M4E)*  
*CRM: crm.marketing4effect.com*
