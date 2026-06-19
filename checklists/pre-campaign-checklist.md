# Pre-Campaign Checklist

Complete ALL items before launching a database reactivation campaign.
Do not skip any step — each prevents a common failure mode.

---

## Data Preparation

- [ ] Customer database exported and consolidated into single file
- [ ] Records de-duplicated by email address and phone number
- [ ] Email addresses validated through NeverBounce or ZeroBounce
- [ ] Invalid, disposable, and spam-trap emails removed
- [ ] Email validity rate is 80%+ (if below, clean further)
- [ ] Phone numbers standardised with country codes
- [ ] Missing fields identified and enrichment plan in place
- [ ] Database segmented by inactivity duration
- [ ] Database segmented by customer value (VIP/mid/low)
- [ ] One-time buyers identified and tagged
- [ ] Lapsed VIPs identified and tagged
- [ ] Segment counts documented in campaign brief

## Email Setup

- [ ] Email sending platform configured (Brevo, Mailchimp, etc.)
- [ ] Sending domain authenticated (SPF record added)
- [ ] Sending domain authenticated (DKIM record added)
- [ ] Sending domain authenticated (DMARC record added)
- [ ] Sender name set (personal name, not company)
- [ ] Reply-to address set to monitored inbox
- [ ] Unsubscribe link working and tested
- [ ] Email templates loaded and personalisation fields mapped
- [ ] Test emails sent to internal addresses
- [ ] Test emails checked in Gmail, Outlook, Yahoo, and mobile
- [ ] Spam score checked (target: under 3.0 on mail-tester.com)
- [ ] Sending limits confirmed (daily/hourly caps)

## WhatsApp Setup

- [ ] WhatsApp Business account active and verified
- [ ] Business profile complete (name, description, photo, hours)
- [ ] Message templates approved (if using WhatsApp Business API)
- [ ] Contact list imported to WhatsApp
- [ ] Test messages sent and received correctly
- [ ] Response team briefed on handling replies

## Content Preparation

- [ ] All 6 email templates customised with client brand details
- [ ] All 4 WhatsApp messages customised
- [ ] Personalisation tokens tested ([First name], [specific thing], etc.)
- [ ] Offers confirmed with client (discount %, free items, etc.)
- [ ] Offer landing page live and tested (if applicable)
- [ ] Video recorded for Email 5 (or template video prepared)
- [ ] Voice note recorded for WhatsApp Message 4 (or script ready)
- [ ] All links tested and tracking UTMs added

## Automation Setup

- [ ] Email sequence automation configured with correct timing
- [ ] Trigger conditions set (no purchase in X days)
- [ ] Exit conditions set (purchase made, unsubscribed, replied)
- [ ] WhatsApp messages scheduled between email sends
- [ ] Re-engagement triggers configured (open → tag, click → tag)
- [ ] Reply routing set up (replies go to monitored inbox)
- [ ] CRM tags configured for tracking sequence progress

## Compliance

- [ ] Data privacy compliance confirmed (see data-privacy-compliance.md)
- [ ] Client has legal basis to contact these customers
- [ ] Unsubscribe mechanism tested and working
- [ ] Physical address included in email footer (CAN-SPAM)
- [ ] Data processing agreement signed with client
- [ ] Opt-out requests from previous campaigns honoured

## Tracking & Reporting

- [ ] UTM parameters configured for all links
- [ ] Conversion tracking set up (purchases from reactivated contacts)
- [ ] Dashboard or spreadsheet ready for tracking metrics
- [ ] Baseline metrics documented (current open rates, revenue, etc.)
- [ ] Reporting schedule agreed with client
- [ ] Success criteria defined and documented in campaign brief

## Team Readiness

- [ ] Team briefed on campaign timeline and sequence
- [ ] Response handling process documented (who replies to what)
- [ ] Escalation process for complaints or issues
- [ ] Sales team briefed on incoming reactivated leads
- [ ] Client informed of campaign start date

## Final Checks

- [ ] Campaign brief completed and approved
- [ ] All automations tested with test contacts
- [ ] Sending schedule confirmed (avoid weekends, holidays)
- [ ] Warm-up plan in place if sending volume is high
- [ ] Backup plan if deliverability drops
- [ ] Post-campaign review date scheduled

---

**Campaign approved by:** ______
**Date:** ______
**Launch date:** ______
