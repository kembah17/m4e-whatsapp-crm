# M4E WhatsApp Message Templates Reference

**Last Updated:** 2026-10-27 03:34 WAT
**WABA ID:** 1393900709625968
**Total Templates:** 19 (including hello_world default)

---

## Template Status Summary

| Status | Count |
|--------|-------|
| APPROVED | 4 |
| PENDING | 15 |
| **Total** | **19** |

---

## All Templates

### ✅ APPROVED Templates (Ready to Use)

| Template Name | Category | Purpose |
|--------------|----------|----------|
| `m4e_welcome_message` | MARKETING | Welcome new contacts to a business |
| `m4e_reactivation_checkin` | MARKETING | Casual reconnection with dormant customers |
| `m4e_reactivation_final` | MARKETING | Personal note from business owner |
| `hello_world` | UTILITY | Default Meta test template |

### ⏳ PENDING Templates (Awaiting Meta Approval)

#### Reactivation Campaign
| Template Name | Category | Purpose | Variables |
|--------------|----------|---------|----------|
| `m4e_reactivation_value` | MARKETING | Share helpful tip + social proof | name, tip, result |
| `m4e_reactivation_offer` | MARKETING | Exclusive WhatsApp-only offer | name, offer1, offer2, expiry |

#### Appointments & Bookings
| Template Name | Category | Purpose | Variables |
|--------------|----------|---------|----------|
| `m4e_appointment_reminder` | UTILITY | Remind about upcoming appointment | name, event, time, location |
| `m4e_booking_confirmation` | UTILITY | Confirm a booking | name, event, time, location |

#### Payments & Invoicing
| Template Name | Category | Purpose | Variables |
|--------------|----------|---------|----------|
| `m4e_payment_reminder` | UTILITY | Friendly payment reminder | name, amount, description, due_date |
| `m4e_payment_received` | UTILITY | Confirm payment received | name, amount, description |

#### Reviews & Feedback
| Template Name | Category | Purpose | Variables |
|--------------|----------|---------|----------|
| `m4e_satisfaction_check` | MARKETING | Ask for 1-5 satisfaction rating | name, service |
| `m4e_review_request` | MARKETING | Request public review (with URL button) | name, service |

#### Campaign Performance
| Template Name | Category | Purpose | Variables |
|--------------|----------|---------|----------|
| `m4e_campaign_report` | UTILITY | Share campaign metrics summary | name, campaign, sent, opened, replied, conversions |

#### Lead Capture & Follow-up
| Template Name | Category | Purpose | Variables |
|--------------|----------|---------|----------|
| `m4e_new_enquiry_reply` | MARKETING | Auto-reply to new enquiries | name, business, response_time |
| `m4e_followup_72hr` | MARKETING | Follow up after 72 hours | name, topic |

#### Operations
| Template Name | Category | Purpose | Variables |
|--------------|----------|---------|----------|
| `m4e_delivery_notification` | UTILITY | Order/delivery status update | name, business, order_id, status, eta |
| `m4e_out_of_office` | UTILITY | After-hours auto-reply | name, hours, email |

#### Promotions
| Template Name | Category | Purpose | Variables |
|--------------|----------|---------|----------|
| `m4e_seasonal_promo` | MARKETING | Seasonal/holiday promotions | name, headline, offer, expiry |
| `m4e_vip_exclusive` | MARKETING | VIP-only early access offers | name, offer_description |

---

## Usage in CRM

Templates are sent via the CRM's template picker in the Inbox, or programmatically via:
- **Automations** — trigger-based template sending
- **Campaigns** — bulk template broadcasts
- **Flows** — multi-step conversation flows

### Sending a Template via API
```bash
curl -X POST "https://graph.facebook.com/v21.0/PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "RECIPIENT_PHONE",
    "type": "template",
    "template": {
      "name": "m4e_reactivation_checkin",
      "language": { "code": "en" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Chidi" },
            { "type": "text", "text": "TechVille Solutions" }
          ]
        }
      ]
    }
  }'
```

---

## Template Approval Notes

- **UTILITY** templates are typically approved within minutes to hours
- **MARKETING** templates may take 24-48 hours
- If rejected, check Meta's [template guidelines](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines/)
- Variables cannot be at the start or end of template body text
- All MARKETING templates include "Reply STOP to opt out" footer

---

## Campaign-to-Template Mapping

| Campaign Type | Templates Used (in order) |
|--------------|---------------------------|
| **Database Reactivation** | checkin → value → offer → final |
| **New Client Onboarding** | welcome_message → satisfaction_check → review_request |
| **Payment Collection** | payment_reminder → payment_received |
| **Appointment Management** | booking_confirmation → appointment_reminder |
| **Lead Nurture** | new_enquiry_reply → followup_72hr |
| **Seasonal Promotion** | seasonal_promo or vip_exclusive |
| **Performance Reporting** | campaign_report |
