# WhatsApp Business Messaging Rules
## Your Complete Guide to WhatsApp Business API

**Version:** 1.0  
**Date:** July 2026  
**For:** M4E Clients and Their Teams

---

## How WhatsApp Business API Works

There are three types of WhatsApp:

| Type | Who Uses It | What It Does |
|------|------------|-------------|
| **WhatsApp Personal** | Everyone | Chat with friends and family |
| **WhatsApp Business App** | Small businesses | Free app with basic business features |
| **WhatsApp Business API** | Growing businesses | Automated messaging, campaigns, CRM integration |

The **WhatsApp Business API** is what powers your M4E CRM. It allows you to:
- Send messages to thousands of customers at once
- Automate responses and follow-ups
- Track delivery, reads, and responses
- Run reactivation campaigns
- Connect with your customer database

---

## The 24-Hour Conversation Window

This is the most important rule to understand:

### How It Works

```
Customer sends you a message
        ↓
24-hour window OPENS
        ↓
You can reply freely (text, images, videos, documents)
        ↓
After 24 hours with no new customer message
        ↓
Window CLOSES
        ↓
You must use an APPROVED TEMPLATE to message them
```

### What This Means for You

- **When a customer messages you first**, you have 24 hours to reply with any message — no template needed
- **If the customer replies again**, the 24-hour window resets from their latest message
- **After the window closes**, you can only reach them using pre-approved message templates
- **Your M4E CRM handles this automatically** — you do not need to track windows manually

### Free Entry Point Conversations (72 Hours)

When a customer contacts you through certain entry points, you get a **72-hour free window** instead of 24 hours:
- Clicking a WhatsApp button on your Facebook or Instagram ad
- Clicking a WhatsApp link on your website
- Scanning your WhatsApp QR code

These conversations are **completely free** — no per-message charges.

---

## Message Templates

### What Are Templates?

Templates are pre-written message formats that Meta (WhatsApp's parent company) must approve before you can use them. They are required for:
- Sending the first message to a customer (outside the 24-hour window)
- Broadcasting to multiple customers
- Automated campaign messages

### Template Categories

| Category | Purpose | Example | Cost |
|----------|---------|---------|------|
| **Marketing** | Promotions, offers, announcements | "Hi {{name}}, we have a special 20% discount this weekend!" | Highest |
| **Utility** | Order updates, confirmations, reminders | "Your order #{{order_id}} has been shipped" | Medium |
| **Authentication** | Login codes, verification | "Your verification code is {{code}}" | Lowest |
| **Service** | Customer service replies within 24hr window | Free-form replies | Free |

### Template Approval Process

1. **You write the template** (or M4E writes it for you)
2. **We submit it to Meta** through the CRM
3. **Meta reviews it** (usually 24-72 hours)
4. **If approved**, it becomes available for campaigns
5. **If rejected**, we adjust and resubmit

### Common Reasons Templates Get Rejected

| Reason | How to Avoid It |
|--------|----------------|
| Too promotional without value | Always include a clear benefit for the customer |
| Missing opt-out option | Always include "Reply STOP to unsubscribe" |
| Misleading content | Be honest and accurate in all claims |
| URL shorteners (bit.ly, etc.) | Use full URLs only |
| All caps or excessive punctuation | Write naturally — no "BUY NOW!!!" |
| Requesting sensitive information | Never ask for passwords, PINs, or bank details |

### Template Tips

- **Keep it personal** — Use the customer's name: "Hi {{name}}"
- **Be clear about who you are** — Start with your business name
- **Include a clear call to action** — Tell them what to do next
- **Add an opt-out** — "Reply STOP to unsubscribe" at the end
- **Test before sending** — M4E validates templates before submission

---

## What You CAN Send ✅

These types of messages are allowed and encouraged:

### To Opted-In Customers
- ✅ Promotional offers and discounts
- ✅ New product or service announcements
- ✅ Seasonal greetings and holiday offers
- ✅ Birthday wishes and loyalty rewards
- ✅ Event invitations
- ✅ Customer satisfaction surveys
- ✅ Product recommendations based on purchase history

### To Any Customer Who Messages You
- ✅ Customer service responses
- ✅ Order confirmations and updates
- ✅ Delivery notifications
- ✅ Appointment reminders
- ✅ Payment confirmations
- ✅ Product information they requested

### Media You Can Send
- ✅ Images (product photos, flyers, menus)
- ✅ Videos (product demos, tutorials)
- ✅ Documents (invoices, receipts, catalogues)
- ✅ Voice notes
- ✅ Location pins
- ✅ Contact cards

---

## What You CANNOT Send ❌

These will get your account restricted or banned:

- ❌ **Messages to people who have not opted in** — You must have their permission
- ❌ **Spam or unsolicited bulk messages** — Every recipient must have agreed to receive messages
- ❌ **Misleading or deceptive content** — No fake urgency, false claims, or bait-and-switch
- ❌ **Adult content** — No sexually explicit material
- ❌ **Illegal products or services** — No drugs, weapons, counterfeit goods
- ❌ **Gambling promotions** — Not allowed on WhatsApp
- ❌ **Messages outside the 24-hour window without templates** — The system blocks these automatically
- ❌ **Requesting sensitive information** — Never ask for passwords, PINs, BVN, or bank details via WhatsApp
- ❌ **Threatening or harassing content** — Zero tolerance
- ❌ **Content that violates Meta's Commerce Policy** — Check [Meta's Commerce Policy](https://www.facebook.com/policies/commerce) if unsure

---

## Opt-In Requirements

Before you can send marketing messages to a customer, they must **opt in** — meaning they agree to receive messages from you.

### What Counts as Valid Opt-In

| Method | Valid? | Notes |
|--------|:---:|-------|
| Customer messages you first on WhatsApp | ✅ | Implied consent for that conversation |
| Customer fills a form on your website | ✅ | Must clearly state they will receive WhatsApp messages |
| Customer scans your QR code | ✅ | The QR code should indicate WhatsApp messaging |
| Customer gives verbal consent in-store | ✅ | Best to follow up with written confirmation |
| Customer ticks a checkbox during purchase | ✅ | Checkbox must not be pre-ticked |
| You bought a phone number list | ❌ | Never valid — this is spam |
| You scraped numbers from the internet | ❌ | Never valid — this is spam |
| Someone gave you their friend's number | ❌ | The friend did not consent |

### How to Collect Opt-In

1. **QR Codes** — Place in your shop, on receipts, on business cards. When scanned, the customer sends a pre-filled message to your WhatsApp number.
2. **Website Forms** — Add a WhatsApp opt-in checkbox to your contact or order forms.
3. **In-Store** — Ask customers "Can we send you offers on WhatsApp?" and record their consent.
4. **Social Media** — Use Click-to-WhatsApp ads that let customers start the conversation.
5. **Existing Database** — For customers you already have, send a one-time opt-in request.

### Handling Opt-Outs

- Every marketing message must include an opt-out option (e.g., "Reply STOP to unsubscribe")
- When a customer opts out, **stop messaging them immediately**
- Your M4E CRM automatically detects opt-out keywords and removes customers from campaigns
- Common opt-out keywords: STOP, UNSUBSCRIBE, CANCEL, REMOVE, QUIT

---

## Quality Rating and Account Health

Meta monitors how customers respond to your messages and assigns a quality rating to your account.

### Quality Levels

| Rating | Meaning | What Happens |
|--------|---------|-------------|
| 🟢 **High (Green)** | Customers are engaging well | Full messaging capacity |
| 🟡 **Medium (Yellow)** | Some customers are reporting or blocking you | Warning — improve message quality |
| 🔴 **Low (Red)** | Too many reports or blocks | Messaging limits reduced, risk of restriction |

### What Affects Your Quality Rating

**Positive signals (improve rating):**
- Customers reply to your messages
- Customers click buttons in your messages
- Low block/report rate
- High read rate

**Negative signals (lower rating):**
- Customers block your number
- Customers report your messages as spam
- Customers do not read your messages
- Sending too many messages too quickly

### Messaging Tier Limits

New WhatsApp Business API accounts start with limited sending capacity that increases as you maintain good quality:

| Tier | Messages Per 24 Hours | How to Reach It |
|------|:---:|------------------|
| **Tier 1** | 250 unique customers | Starting tier for new accounts |
| **Tier 2** | 1,000 unique customers | Maintain green quality for 7 days |
| **Tier 3** | 10,000 unique customers | Maintain green quality at Tier 2 |
| **Tier 4** | 100,000 unique customers | Maintain green quality at Tier 3 |
| **Unlimited** | No limit | Maintain green quality at Tier 4 |

**Important:** These limits are per 24-hour rolling window, not per day. Your M4E CRM automatically manages sending within your tier limits.

### How to Improve a Low Quality Rating

1. **Pause marketing campaigns** until rating recovers
2. **Review recent messages** — were they relevant to recipients?
3. **Reduce frequency** — are you messaging too often?
4. **Improve targeting** — send to engaged customers only
5. **Check opt-in quality** — are all recipients genuinely opted in?
6. **Wait** — ratings typically recover within 7 days of improved behaviour

---

## WhatsApp API Pricing

Meta charges per conversation, not per message. Here is how pricing works:

### How Conversations Are Counted

- A **conversation** is a 24-hour messaging window
- Multiple messages within one conversation = one charge
- The conversation starts when you send a template OR when a customer messages you

### Nigeria Rate Card (July 2026)

| Conversation Type | Cost Per Conversation | When It Applies |
|-------------------|:---:|------------------|
| **Marketing** | ~₦45-75 | Promotional templates (offers, announcements) |
| **Utility** | ~₦20-35 | Transactional templates (order updates, confirmations) |
| **Authentication** | ~₦15-25 | Verification codes |
| **Service** | Free | Customer-initiated within 24-hour window |
| **Free Entry Point** | Free | Customer clicks WhatsApp ad or QR code (72-hour window) |

*Rates are approximate and may vary. Exact rates are shown in your CRM dashboard.*

### Monthly Cost Examples

| Business Size | Monthly Campaigns | Estimated WhatsApp Cost |
|--------------|:---:|:---:|
| Small (500 contacts, 2 campaigns) | 1,000 conversations | ₦45,000 - ₦75,000 |
| Medium (2,000 contacts, 3 campaigns) | 6,000 conversations | ₦180,000 - ₦300,000 |
| Large (5,000 contacts, 4 campaigns) | 20,000 conversations | ₦600,000 - ₦1,000,000 |

### How M4E Helps You Save on Messaging Costs

Your CRM includes several cost-saving features:

1. **Smart Scheduling** — Messages are sent at optimal times to maximise the 24-hour window
2. **Ban Avoidance Engine** — Prevents account restrictions that would halt all messaging
3. **Warm-Up Period** — New accounts are gradually ramped up to avoid quality issues
4. **Frequency Capping** — Prevents over-messaging individual customers
5. **Opt-Out Detection** — Automatically stops messaging customers who unsubscribe
6. **Quality Monitoring** — Alerts you before quality rating drops to dangerous levels
7. **Template Validation** — Catches issues before submission to reduce rejections
8. **Cost Dashboard** — Real-time visibility into your messaging spend

---

## M4E's Built-In Protections

Your CRM includes a **Ban Avoidance Engine** with 7 automatic rules that protect your WhatsApp account:

| # | Rule | What It Does |
|---|------|--------------|
| 1 | **New Number Warm-Up** | Gradually increases sending volume over the first 14 days |
| 2 | **Hourly Rate Limiting** | Prevents sending too many messages per hour |
| 3 | **Daily Frequency Cap** | Limits how many times one customer is messaged per day |
| 4 | **Weekly Frequency Cap** | Limits how many times one customer is messaged per week |
| 5 | **Opt-Out Detection** | Automatically stops messaging customers who say STOP |
| 6 | **Quality Score Monitoring** | Pauses campaigns if quality rating drops to yellow |
| 7 | **Template Pre-Validation** | Checks templates against Meta's rules before submission |

These rules run automatically — you do not need to configure or manage them. They work silently in the background to keep your account safe.

---

## Quick Reference: Do's and Don'ts

### ✅ DO

- Send relevant, valuable content to opted-in customers
- Personalise messages with the customer's name
- Include a clear opt-out option in every marketing message
- Respond to customer enquiries within 24 hours
- Use approved templates for outbound campaigns
- Monitor your quality rating in the CRM dashboard
- Start with small campaign batches and scale up
- Test messages before sending to your full list

### ❌ DON'T

- Send messages to people who have not opted in
- Buy or scrape phone number lists
- Send the same message too frequently
- Use misleading subject lines or fake urgency
- Ignore opt-out requests
- Send messages late at night or very early morning
- Use URL shorteners in templates
- Ask for sensitive information (passwords, BVN, bank details)

---

## Getting Help

If you have questions about messaging rules or need help with templates:

- **Check your CRM Help page** — Answers to common questions are built into the platform
- **Contact your M4E account manager** — We are here to help with template creation and campaign strategy
- **Visit our website** — [marketing4effect.vercel.app/faq](https://marketing4effect.vercel.app/faq)

---

*© 2026 Marketing4Effect. All rights reserved.*  
*"We make the people who need you, know you."*
