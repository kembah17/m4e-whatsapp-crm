# Cal.com Migration Guide: Switching from Calendly

**Document Version:** 1.0  
**Date:** 1 July 2026  
**Prepared by:** Agent Zero — AI Operations  
**Status:** Pre-Migration Planning  

---

## Executive Summary

This guide walks you through migrating Marketing4Effect's scheduling from Calendly to Cal.com. The switch is recommended because Cal.com offers self-hosting capability, white-label branding, a generous free tier, open API for CRM integration, and lower total cost of ownership for a multi-client agency model.

**Current State:** Calendly is embedded on marketing4effect.com at the `/book` page.  
**Target State:** Cal.com replaces Calendly with full M4E branding and CRM integration.

---

## Pre-Migration Checklist

Before making any changes, complete these items:

- [ ] **Inventory existing Calendly setup**
  - List all event types (e.g., "Strategy Call", "Discovery Session")
  - Note durations, buffer times, and availability windows
  - Check for any Calendly integrations (Google Calendar, Zoom, etc.)
  - Export any existing booking data/contacts from Calendly
  - Note your Calendly plan (Free/Standard/Teams/Enterprise)

- [ ] **Decide Cal.com deployment model**
  - **Option A: Cal.com Cloud (Recommended to start)** — Sign up at cal.com, free tier
  - **Option B: Self-hosted** — Deploy on your own server (requires Docker/Node.js)
  - Recommendation: Start with Cloud, migrate to self-hosted when you have 10+ clients

- [ ] **Set up Cal.com account**
  - Go to https://cal.com and create an account
  - Use info@marketing4effect.com as the primary email
  - Connect Google Calendar (same calendar currently linked to Calendly)
  - Connect Zoom/Google Meet for video calls

---

## Step-by-Step Migration

### Step 1: Recreate Event Types in Cal.com (30 minutes)

1. Log into Cal.com dashboard
2. Go to **Event Types** → **New Event Type**
3. Recreate each Calendly event type with matching:
   - Name and description
   - Duration (15min, 30min, 60min, etc.)
   - Location (Zoom, Google Meet, Phone, In-person)
   - Availability schedule (match your Calendly hours)
   - Buffer time before/after meetings
   - Minimum notice period
   - Questions/fields to collect from bookers
4. Set your booking page URL: `cal.com/marketing4effect` or custom domain

### Step 2: Configure Branding (15 minutes)

1. Go to **Settings** → **Appearance**
2. Upload M4E logo (from `/brand/logos/`)
3. Set brand colors:
   - Primary: `#1a1a2e` (Midnight Indigo)
   - Accent: `#d4af37` (Champagne Gold)
4. Customize booking page text and confirmation messages
5. On paid plans: Remove Cal.com branding for full white-label

### Step 3: Set Up Workflows/Notifications (15 minutes)

1. Go to **Workflows** → **New Workflow**
2. Create these automated workflows:
   - **Booking confirmation** → Email to client + WhatsApp notification to you
   - **24-hour reminder** → Email reminder to client
   - **1-hour reminder** → SMS/WhatsApp reminder to client
   - **Post-meeting follow-up** → Thank you email with next steps
3. Customize email templates with M4E branding

### Step 4: Update the Website (20 minutes)

The current Calendly embed is in the M4E website at the `/book` page.

**Current code** (in your Next.js website):
```jsx
// Current Calendly embed - to be replaced
<InlineWidget url="https://calendly.com/marketing4effect/..." />
```

**Replace with Cal.com embed:**
```jsx
// Option A: Cal.com embed (simplest)
<Cal
  calLink="marketing4effect/strategy-call"
  style={{ width: "100%", height: "100%", overflow: "scroll" }}
  config={{
    layout: "month_view",
    theme: "dark",
  }}
/>

// Option B: Cal.com inline embed via script
<div id="cal-inline" style={{ width: "100%", minHeight: "600px" }}></div>
<script>
  (function (C, A, L) {
    let p = function (a, ar) { a.q.push(ar); };
    let d = C.document;
    C.Cal = C.Cal || function () {
      let cal = C.Cal;
      if (!cal.loaded) {
        cal.ns = {}; cal.q = cal.q || [];
        d.head.appendChild(d.createElement("script")).src = A;
        cal.loaded = true;
      }
      if (ar[0] === L) { const api = function () { p(api, arguments); };
        const namespace = ar[1]; api.q = api.q || [];
        if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api;
          p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar);
        return;
      }
      p(cal, ar);
    };
  })(window, "https://app.cal.com/embed/embed.js", "init");
  Cal("init", { origin: "https://app.cal.com" });
  Cal("inline", {
    elementOrSelector: "#cal-inline",
    calLink: "marketing4effect/strategy-call",
    layout: "month_view",
    config: { theme: "dark" }
  });
</script>

// Option C: Simple link (no embed)
<a href="https://cal.com/marketing4effect/strategy-call" 
   className="btn-primary">
  Book a Conversation
</a>
```

**For Next.js specifically**, install the Cal.com React package:
```bash
npm install @calcom/embed-react
```

Then use:
```tsx
import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function BookingPage() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      cal("ui", {
        theme: "dark",
        styles: { branding: { brandColor: "#d4af37" } },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);

  return (
    <Cal
      calLink="marketing4effect/strategy-call"
      style={{ width: "100%", height: "100%", overflow: "scroll" }}
      config={{ layout: "month_view" }}
    />
  );
}
```

### Step 5: Test Everything (30 minutes)

1. **Test booking flow:**
   - Visit your `/book` page
   - Select a time slot and complete a test booking
   - Verify confirmation email arrives
   - Verify calendar event is created
   - Verify reminder workflows trigger

2. **Test on mobile:**
   - Open `/book` on a phone
   - Complete a booking
   - Verify responsive layout

3. **Test cancellation/rescheduling:**
   - Cancel the test booking
   - Verify cancellation notification
   - Reschedule and verify update

### Step 6: Go Live (10 minutes)

1. Commit and push the website changes to GitHub
2. Vercel auto-deploys
3. Verify the live `/book` page works
4. Update any other places that link to Calendly:
   - Email signatures
   - WhatsApp auto-replies
   - Social media bios
   - Google Business Profile
   - CRM templates

### Step 7: Decommission Calendly (After 2 weeks)

Wait 2 weeks to ensure no issues, then:
1. Set up a redirect from your old Calendly link to the new Cal.com link
2. Cancel your Calendly subscription (if paid)
3. Export any remaining data from Calendly
4. Delete your Calendly account

---

## Cal.com Free Tier vs Calendly Free Tier

| Feature | Cal.com Free | Calendly Free |
|---------|-------------|---------------|
| Event types | **Unlimited** | 1 only |
| Bookings/month | **Unlimited** | Unlimited |
| Calendar connections | **Unlimited** | 1 only |
| Workflows/automations | **Yes** | No |
| Payment collection | **Yes (Stripe/PayPal)** | No |
| Custom branding | Partial | No |
| API access | **Yes** | No |
| Team scheduling | **Yes** | No |
| Embed options | **Yes** | Yes |
| Round-robin | **Yes** | No |
| White-label | Paid plans | No |

---

## Future CRM Integration

Once Cal.com is running, we can integrate it with the M4E WhatsApp CRM:

1. **Webhook integration:** Cal.com sends booking events to CRM API
2. **Auto-create contacts:** New bookings automatically create CRM contacts
3. **Pipeline automation:** Bookings move contacts through the sales pipeline
4. **WhatsApp notifications:** Booking confirmations sent via WhatsApp
5. **Calendar sync:** CRM dashboard shows upcoming appointments

This integration is straightforward with Cal.com's webhook API and will be implemented after the basic migration is complete.

---

## Timeline

| Phase | Duration | What Happens |
|-------|----------|--------------|
| **Setup** | Day 1 (2 hours) | Create Cal.com account, recreate events, configure branding |
| **Website Update** | Day 2 (1 hour) | Replace Calendly embed with Cal.com, deploy |
| **Testing** | Days 2-3 | Test all booking flows, mobile, notifications |
| **Parallel Run** | Days 3-14 | Both systems active, Cal.com primary |
| **Decommission** | Day 15+ | Remove Calendly, full Cal.com |

**Total effort:** ~4 hours of active work + 2 weeks monitoring.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Existing Calendly links break | Keep Calendly active for 2 weeks; set up redirects |
| Cal.com embed doesn't match site design | Use dark theme + custom CSS; test before going live |
| Calendar sync issues | Connect same Google Calendar; verify no double-bookings |
| Clients confused by change | Send brief email: "We've upgraded our booking system" |
| Cal.com downtime | Keep Calendly as backup for first month; add WhatsApp fallback |

---

## Decision: When to Self-Host

Stay on Cal.com Cloud until:
- You have 5+ team members needing scheduling
- You want full white-label for client portals
- You need custom integrations beyond the API
- Data sovereignty requirements demand it

Self-hosting requires: Docker, PostgreSQL, Node.js 18+, ~2GB RAM VPS (~$10-20/month).

---

## Next Steps

1. **You do:** Create Cal.com account and set up event types
2. **I do:** Update the website code to replace Calendly with Cal.com embed
3. **Together:** Test and verify everything works
4. **You do:** Update external links (email signature, social media, etc.)

Ready to proceed? Just say "switch to Cal.com" and I'll update the website code.
