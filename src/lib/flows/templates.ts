/**
 * Starter flow templates.
 *
 * Three pre-canned flows users can clone with one click instead of
 * building from scratch. Each template is a plain JS object describing
 * the same shape `/api/flows` PUT accepts — name, trigger config,
 * entry_node_id, fallback_policy, nodes[] — keyed by a stable
 * `slug`.
 *
 * The clone path (`/api/flows` POST with `template_slug`) creates a
 * NEW flow_row + flow_nodes rows for the user. `node_key`s are kept
 * verbatim (they're stable strings, not UUIDs, so cloning never
 * needs to rewrite edge references).
 *
 * Choosing a single static module over a DB-backed gallery for v1
 * because: (a) the set is small and changes with code releases, not
 * data; (b) keeps templates portable across self-hosted instances
 * without migrations; (c) editing in source is the lowest-friction
 * way to add the next template.
 */

import type {
  CollectInputNodeConfig,
  ConditionNodeConfig,
  HandoffNodeConfig,
  KeywordTriggerConfig,
  SendButtonsNodeConfig,
  SendListNodeConfig,
  SendMessageNodeConfig,
  StartNodeConfig,
} from "./types";

export type FlowTemplateNodeType =
  | "start"
  | "send_message"
  | "send_buttons"
  | "send_list"
  | "collect_input"
  | "condition"
  | "set_tag"
  | "handoff"
  | "end";

export interface FlowTemplateNode {
  node_key: string;
  node_type: FlowTemplateNodeType;
  config:
    | StartNodeConfig
    | SendMessageNodeConfig
    | SendButtonsNodeConfig
    | SendListNodeConfig
    | CollectInputNodeConfig
    | ConditionNodeConfig
    | HandoffNodeConfig
    | Record<string, unknown>;
}

export interface FlowTemplate {
  slug: string;
  name: string;
  description: string;
  /** Used by the gallery to surface a relevant icon. lucide-react name. */
  icon: "MessageSquare" | "HelpCircle" | "UserPlus" | "Home" | "UtensilsCrossed" | "Hotel" | "Calendar" | "Truck" | "CreditCard" | "AlertCircle" | "PartyPopper" | "Key" | "GraduationCap";
  trigger_type: "keyword" | "first_inbound_message" | "manual";
  trigger_config: KeywordTriggerConfig | Record<string, unknown>;
  entry_node_id: string;
  nodes: FlowTemplateNode[];
}

// ============================================================
// 1. Welcome menu — the example from the owner's brief
// ============================================================
const WELCOME_MENU: FlowTemplate = {
  slug: "welcome_menu",
  name: "Welcome menu",
  description:
    "Greet customers who type a keyword and route them to the right agent based on whether they're new or existing.",
  icon: "MessageSquare",
  trigger_type: "keyword",
  trigger_config: { keywords: ["support", "help", "hi"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "welcome" },
    },
    {
      node_key: "welcome",
      node_type: "send_buttons",
      config: {
        text: "Hi! 👋 Welcome to support. Are you an existing customer or new here?",
        footer_text: "Tap a button below to continue.",
        buttons: [
          {
            reply_id: "existing",
            title: "Existing customer",
            next_node_key: "existing_handoff",
          },
          {
            reply_id: "new",
            title: "New customer",
            next_node_key: "new_handoff",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "existing_handoff",
      node_type: "handoff",
      config: {
        note: "Existing customer needs assistance — please check account history before replying.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "new_handoff",
      node_type: "handoff",
      config: {
        note: "New customer — share pricing + onboarding link.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 2. FAQ bot — list-message answers, fully automated
// ============================================================
const FAQ_BOT: FlowTemplate = {
  slug: "faq_bot",
  name: "FAQ bot",
  description:
    "Answer common questions automatically. Customer picks a topic from a list; the bot replies with the answer and ends.",
  icon: "HelpCircle",
  trigger_type: "keyword",
  trigger_config: {
    keywords: ["faq", "question", "info"],
    match_type: "contains",
  },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "topics" },
    },
    {
      node_key: "topics",
      node_type: "send_list",
      config: {
        text: "What can I help you with?",
        button_label: "View topics",
        sections: [
          {
            title: "Common questions",
            rows: [
              {
                reply_id: "hours",
                title: "Opening hours",
                next_node_key: "answer_hours",
              },
              {
                reply_id: "pricing",
                title: "Pricing",
                next_node_key: "answer_pricing",
              },
              {
                reply_id: "refunds",
                title: "Refund policy",
                next_node_key: "answer_refunds",
              },
            ],
          },
          {
            title: "Other",
            rows: [
              {
                reply_id: "human",
                title: "Talk to a human",
                next_node_key: "human_handoff",
              },
            ],
          },
        ],
      } as SendListNodeConfig,
    },
    {
      node_key: "answer_hours",
      node_type: "send_message",
      config: {
        text: "We're open Mon–Fri, 9am–6pm local time. Weekend support is limited to urgent issues.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "answer_pricing",
      node_type: "send_message",
      config: {
        text: "Our pricing starts at $9/mo. Visit https://example.com/pricing for the full breakdown.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "answer_refunds",
      node_type: "send_message",
      config: {
        text: "Refunds are honored within 30 days of purchase. Reply with your order number and we'll process it.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "human_handoff",
      node_type: "handoff",
      config: {
        note: "Customer asked to talk to a human from the FAQ bot.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "end",
      node_type: "end",
      config: {},
    },
  ],
};

// ============================================================
// 3. Lead capture — collect_input chain, ends in a handoff
// ============================================================
const LEAD_CAPTURE: FlowTemplate = {
  slug: "lead_capture",
  name: "Lead capture",
  description:
    "Greet first-time inbounds, capture name + email + company, then hand off to sales with the answers in the note.",
  icon: "UserPlus",
  trigger_type: "first_inbound_message",
  trigger_config: {},
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "intro" },
    },
    {
      node_key: "intro",
      node_type: "send_message",
      config: {
        text: "Welcome! 👋 I'll ask a few quick questions so we can get you to the right person.",
        next_node_key: "ask_name",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_name",
      node_type: "collect_input",
      config: {
        prompt_text: "What's your name?",
        var_key: "name",
        next_node_key: "ask_email",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_email",
      node_type: "collect_input",
      config: {
        prompt_text: "Thanks {{vars.name}}! What's your work email?",
        var_key: "email",
        next_node_key: "ask_company",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_company",
      node_type: "collect_input",
      config: {
        prompt_text: "Almost done — what's your company name?",
        var_key: "company",
        next_node_key: "handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "handoff",
      node_type: "handoff",
      config: {
        note: "New lead — name={{vars.name}}, email={{vars.email}}, company={{vars.company}}.",
      } as HandoffNodeConfig,
    },
  ],
};


// ============================================================
// 4. Appointment reminder — healthcare, hospitality, services
// ============================================================
const APPOINTMENT_REMINDER: FlowTemplate = {
  slug: "appointment_reminder",
  name: "Appointment reminder",
  description:
    "Send appointment reminders and let customers confirm, reschedule, or cancel via buttons.",
  icon: "MessageSquare",
  trigger_type: "manual",
  trigger_config: {},
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "reminder" },
    },
    {
      node_key: "reminder",
      node_type: "send_buttons",
      config: {
        text: "Hi! This is a reminder about your upcoming appointment. Can you confirm your attendance?",
        footer_text: "Tap a button to respond.",
        buttons: [
          {
            reply_id: "confirm",
            title: "Confirm",
            next_node_key: "confirmed",
          },
          {
            reply_id: "reschedule",
            title: "Reschedule",
            next_node_key: "reschedule_handoff",
          },
          {
            reply_id: "cancel",
            title: "Cancel",
            next_node_key: "cancelled",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "confirmed",
      node_type: "send_message",
      config: {
        text: "Great! Your appointment is confirmed. We look forward to seeing you!",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "reschedule_handoff",
      node_type: "handoff",
      config: {
        note: "Customer wants to reschedule their appointment.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "cancelled",
      node_type: "send_message",
      config: {
        text: "Your appointment has been cancelled. Feel free to book again anytime. Thank you!",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "end",
      node_type: "end",
      config: {},
    },
  ],
};

// ============================================================
// 5. Order status — retail, manufacturing, agriculture
// ============================================================
const ORDER_STATUS: FlowTemplate = {
  slug: "order_status",
  name: "Order status checker",
  description:
    "Let customers check their order status by entering an order number. Routes to support if needed.",
  icon: "MessageSquare",
  trigger_type: "keyword",
  trigger_config: { keywords: ["order", "status", "tracking", "delivery"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "ask_order" },
    },
    {
      node_key: "ask_order",
      node_type: "collect_input",
      config: {
        prompt_text: "Please enter your order number and I will check the status for you.",
        var_key: "order_number",
        next_node_key: "status_options",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "status_options",
      node_type: "send_buttons",
      config: {
        text: "I have noted order #{{vars.order_number}}. What would you like to know?",
        footer_text: "Select an option below.",
        buttons: [
          {
            reply_id: "delivery",
            title: "Delivery update",
            next_node_key: "delivery_handoff",
          },
          {
            reply_id: "issue",
            title: "Report issue",
            next_node_key: "issue_handoff",
          },
          {
            reply_id: "done",
            title: "That is all",
            next_node_key: "end",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "delivery_handoff",
      node_type: "handoff",
      config: {
        note: "Customer asking about delivery for order #{{vars.order_number}}.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "issue_handoff",
      node_type: "handoff",
      config: {
        note: "Customer reporting issue with order #{{vars.order_number}}.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "end",
      node_type: "end",
      config: {},
    },
  ],
};

// ============================================================
// 6. Feedback collector — post-purchase satisfaction
// ============================================================
const FEEDBACK_COLLECTOR: FlowTemplate = {
  slug: "feedback_collector",
  name: "Feedback collector",
  description:
    "Collect customer satisfaction feedback after a purchase or service. Routes unhappy customers to support.",
  icon: "MessageSquare",
  trigger_type: "manual",
  trigger_config: {},
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "ask_rating" },
    },
    {
      node_key: "ask_rating",
      node_type: "send_buttons",
      config: {
        text: "Hi! We would love your feedback on your recent experience. How would you rate it?",
        footer_text: "Your feedback helps us improve.",
        buttons: [
          {
            reply_id: "great",
            title: "Great!",
            next_node_key: "ask_review",
          },
          {
            reply_id: "okay",
            title: "Okay",
            next_node_key: "ask_improvement",
          },
          {
            reply_id: "poor",
            title: "Not good",
            next_node_key: "unhappy_handoff",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "ask_review",
      node_type: "send_message",
      config: {
        text: "Wonderful! We are so glad you had a great experience. Would you mind leaving us a review? It really helps! Thank you!",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_improvement",
      node_type: "collect_input",
      config: {
        prompt_text: "Thanks for the feedback! What could we do better next time?",
        var_key: "improvement_suggestion",
        next_node_key: "thanks",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "thanks",
      node_type: "send_message",
      config: {
        text: "Thank you for sharing! We will use your feedback to improve.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "unhappy_handoff",
      node_type: "handoff",
      config: {
        note: "Customer rated experience as poor. Needs immediate attention for service recovery.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "end",
      node_type: "end",
      config: {},
    },
  ],
};

// ============================================================
// 7. Reactivation outreach — dormant customer win-back
// ============================================================
const REACTIVATION_OUTREACH: FlowTemplate = {
  slug: "reactivation_outreach",
  name: "Reactivation outreach",
  description:
    "Re-engage dormant customers with a special offer. Captures interest or removes uninterested contacts.",
  icon: "UserPlus",
  trigger_type: "manual",
  trigger_config: {},
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "reactivation_msg" },
    },
    {
      node_key: "reactivation_msg",
      node_type: "send_buttons",
      config: {
        text: "Hi! We noticed it has been a while since your last visit. We would love to welcome you back with a special offer!",
        footer_text: "Are you interested?",
        buttons: [
          {
            reply_id: "interested",
            title: "Yes, tell me more!",
            next_node_key: "offer_details",
          },
          {
            reply_id: "not_now",
            title: "Maybe later",
            next_node_key: "noted",
          },
          {
            reply_id: "unsubscribe",
            title: "Stop messages",
            next_node_key: "unsubscribed",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "offer_details",
      node_type: "handoff",
      config: {
        note: "Dormant customer is interested in reactivation offer. Share the current promotion and close the sale.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "noted",
      node_type: "send_message",
      config: {
        text: "No problem! We will check in again soon. Have a great day!",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "unsubscribed",
      node_type: "send_message",
      config: {
        text: "We have noted your preference. You will not receive further promotional messages. Thank you!",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "end",
      node_type: "end",
      config: {},
    },
  ],
};

// ============================================================
// 8. Product enquiry — retail, e-commerce, agriculture
// ============================================================
const PRODUCT_ENQUIRY: FlowTemplate = {
  slug: "product_enquiry",
  name: "Product enquiry",
  description:
    "Handle product enquiries by collecting what the customer needs and routing to the right team.",
  icon: "HelpCircle",
  trigger_type: "keyword",
  trigger_config: { keywords: ["buy", "price", "product", "catalog", "catalogue"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "ask_product" },
    },
    {
      node_key: "ask_product",
      node_type: "collect_input",
      config: {
        prompt_text: "Hi! What product or service are you interested in?",
        var_key: "product_interest",
        next_node_key: "ask_quantity",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_quantity",
      node_type: "collect_input",
      config: {
        prompt_text: "How many units do you need, or what quantity are you looking for?",
        var_key: "quantity",
        next_node_key: "sales_handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "sales_handoff",
      node_type: "handoff",
      config: {
        note: "Product enquiry — interested in: {{vars.product_interest}}, quantity: {{vars.quantity}}. Please send pricing and availability.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 9. Property enquiry — real estate
// ============================================================
const PROPERTY_ENQUIRY_FLOW: FlowTemplate = {
  slug: "property_enquiry_flow",
  name: "Property Enquiry",
  description:
    "Collect property requirements from prospective buyers or tenants: location, budget, property type, and timeline.",
  icon: "Home",
  trigger_type: "keyword",
  trigger_config: { keywords: ["property", "house", "land", "rent", "buy"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "greeting" },
    },
    {
      node_key: "greeting",
      node_type: "send_message",
      config: {
        text: "Welcome! 🏠 Thank you for your interest in our properties. Let me help you find the perfect match.",
        next_node_key: "ask_type",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_type",
      node_type: "send_buttons",
      config: {
        text: "What type of property are you looking for?",
        footer_text: "Select one option",
        buttons: [
          { reply_id: "buy", title: "Buy property", next_node_key: "ask_property_type" },
          { reply_id: "rent", title: "Rent property", next_node_key: "ask_property_type" },
          { reply_id: "land", title: "Buy land", next_node_key: "ask_location" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "ask_property_type",
      node_type: "send_list",
      config: {
        text: "What kind of property do you prefer?",
        button_text: "View options",
        sections: [
          {
            title: "Property Types",
            rows: [
              { id: "detached", title: "Detached house", description: "Standalone building with compound" },
              { id: "semi_detached", title: "Semi-detached", description: "Shared wall with one neighbour" },
              { id: "flat", title: "Flat / Apartment", description: "Unit in a multi-storey building" },
              { id: "terrace", title: "Terrace duplex", description: "Row house with shared walls" },
              { id: "commercial", title: "Commercial space", description: "Office or shop space" },
            ],
          },
        ],
        on_select: { save_as: "property_type", next_node_key: "ask_location" },
      } as SendListNodeConfig,
    },
    {
      node_key: "ask_location",
      node_type: "collect_input",
      config: {
        text: "Which area or location are you interested in? (e.g., Lekki, Ikeja, Abuja, Port Harcourt)",
        save_as: "preferred_location",
        next_node_key: "ask_budget",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_budget",
      node_type: "send_buttons",
      config: {
        text: "What is your budget range?",
        footer_text: "Select your range",
        buttons: [
          { reply_id: "under_50m", title: "Under ₦50M", next_node_key: "ask_timeline" },
          { reply_id: "50m_150m", title: "₦50M - ₦150M", next_node_key: "ask_timeline" },
          { reply_id: "above_150m", title: "Above ₦150M", next_node_key: "ask_timeline" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "ask_timeline",
      node_type: "send_buttons",
      config: {
        text: "When are you looking to move or close?",
        footer_text: "Select timeline",
        buttons: [
          { reply_id: "immediate", title: "Immediately", next_node_key: "handoff" },
          { reply_id: "1_3_months", title: "1-3 months", next_node_key: "handoff" },
          { reply_id: "exploring", title: "Just exploring", next_node_key: "handoff" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "handoff",
      node_type: "handoff",
      config: {
        note: "Property enquiry — Location: {{vars.preferred_location}}, Type: {{vars.property_type}}. Please share matching listings.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 10. Restaurant order — food ordering
// ============================================================
const RESTAURANT_ORDER_FLOW: FlowTemplate = {
  slug: "restaurant_order_flow",
  name: "Restaurant Order",
  description:
    "Take food orders via WhatsApp: menu selection, quantity, delivery address, and payment method.",
  icon: "UtensilsCrossed",
  trigger_type: "keyword",
  trigger_config: { keywords: ["order", "menu", "food", "hungry"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "greeting" },
    },
    {
      node_key: "greeting",
      node_type: "send_message",
      config: {
        text: "Welcome! 🍽️ Ready to take your order. Let me know what you’d like.",
        next_node_key: "ask_order_type",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_order_type",
      node_type: "send_buttons",
      config: {
        text: "How would you like to receive your food?",
        footer_text: "Select one",
        buttons: [
          { reply_id: "delivery", title: "Delivery", next_node_key: "ask_items" },
          { reply_id: "pickup", title: "Pickup", next_node_key: "ask_items" },
          { reply_id: "dine_in", title: "Dine in", next_node_key: "ask_items" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "ask_items",
      node_type: "collect_input",
      config: {
        text: "Please type your order. Include item names and quantities.\n\nExample:\n2x Jollof Rice\n1x Pepper Soup\n3x Chapman",
        save_as: "order_items",
        next_node_key: "ask_address",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_address",
      node_type: "collect_input",
      config: {
        text: "Please share your delivery address (or type PICKUP if collecting):",
        save_as: "delivery_address",
        next_node_key: "ask_payment",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_payment",
      node_type: "send_buttons",
      config: {
        text: "How would you like to pay?",
        footer_text: "Select payment method",
        buttons: [
          { reply_id: "transfer", title: "Bank transfer", next_node_key: "order_handoff" },
          { reply_id: "pos", title: "POS on delivery", next_node_key: "order_handoff" },
          { reply_id: "cash", title: "Cash on delivery", next_node_key: "order_handoff" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "order_handoff",
      node_type: "handoff",
      config: {
        note: "Food order — Items: {{vars.order_items}}, Address: {{vars.delivery_address}}. Confirm pricing and process.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 11. Hotel booking — room reservation
// ============================================================
const HOTEL_BOOKING_FLOW: FlowTemplate = {
  slug: "hotel_booking_flow",
  name: "Hotel Booking",
  description:
    "Collect hotel reservation details: check-in/out dates, room type, guest count, and special requests.",
  icon: "Hotel",
  trigger_type: "keyword",
  trigger_config: { keywords: ["book", "room", "reservation", "hotel", "stay"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "greeting" },
    },
    {
      node_key: "greeting",
      node_type: "send_message",
      config: {
        text: "Welcome! 🏨 Thank you for choosing us. Let me help you book a room.",
        next_node_key: "ask_checkin",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_checkin",
      node_type: "collect_input",
      config: {
        text: "When would you like to check in? (e.g., 15 March 2026)",
        save_as: "checkin_date",
        next_node_key: "ask_checkout",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_checkout",
      node_type: "collect_input",
      config: {
        text: "And when will you check out?",
        save_as: "checkout_date",
        next_node_key: "ask_room_type",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_room_type",
      node_type: "send_buttons",
      config: {
        text: "What type of room would you prefer?",
        footer_text: "Select room type",
        buttons: [
          { reply_id: "standard", title: "Standard Room", next_node_key: "ask_guests" },
          { reply_id: "deluxe", title: "Deluxe Room", next_node_key: "ask_guests" },
          { reply_id: "suite", title: "Suite", next_node_key: "ask_guests" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "ask_guests",
      node_type: "collect_input",
      config: {
        text: "How many guests will be staying? (e.g., 2 adults, 1 child)",
        save_as: "guest_count",
        next_node_key: "ask_special",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_special",
      node_type: "collect_input",
      config: {
        text: "Any special requests? (e.g., airport pickup, extra bed, late check-in). Type NONE if not.",
        save_as: "special_requests",
        next_node_key: "booking_handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "booking_handoff",
      node_type: "handoff",
      config: {
        note: "Hotel booking — Check-in: {{vars.checkin_date}}, Check-out: {{vars.checkout_date}}, Guests: {{vars.guest_count}}, Requests: {{vars.special_requests}}. Send availability and quote.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 12. Appointment booking — healthcare / professional services
// ============================================================
const APPOINTMENT_BOOKING_FLOW: FlowTemplate = {
  slug: "appointment_booking_flow",
  name: "Appointment Booking",
  description:
    "Schedule appointments for healthcare, consulting, or professional services with date, time, and service selection.",
  icon: "Calendar",
  trigger_type: "keyword",
  trigger_config: { keywords: ["appointment", "schedule", "book", "consult"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "greeting" },
    },
    {
      node_key: "greeting",
      node_type: "send_message",
      config: {
        text: "Hello! 📅 I can help you book an appointment. Let me collect a few details.",
        next_node_key: "ask_service",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_service",
      node_type: "collect_input",
      config: {
        text: "What service or consultation do you need? (e.g., General consultation, Legal advice, Tax filing, Dental checkup)",
        save_as: "service_type",
        next_node_key: "ask_date",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_date",
      node_type: "collect_input",
      config: {
        text: "What date works for you? (e.g., Monday 15 March)",
        save_as: "preferred_date",
        next_node_key: "ask_time",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_time",
      node_type: "send_buttons",
      config: {
        text: "What time slot do you prefer?",
        footer_text: "Select a time",
        buttons: [
          { reply_id: "morning", title: "Morning (9-12)", next_node_key: "ask_name" },
          { reply_id: "afternoon", title: "Afternoon (12-3)", next_node_key: "ask_name" },
          { reply_id: "evening", title: "Evening (3-6)", next_node_key: "ask_name" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "ask_name",
      node_type: "collect_input",
      config: {
        text: "Please share your full name for the booking:",
        save_as: "client_name",
        next_node_key: "appointment_handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "appointment_handoff",
      node_type: "handoff",
      config: {
        note: "Appointment request — Service: {{vars.service_type}}, Date: {{vars.preferred_date}}, Name: {{vars.client_name}}. Confirm availability and send confirmation.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 13. Delivery tracking — logistics / retail
// ============================================================
const DELIVERY_TRACKING_FLOW: FlowTemplate = {
  slug: "delivery_tracking_flow",
  name: "Delivery Tracking",
  description:
    "Let customers check their order or shipment status by providing a tracking number or order ID.",
  icon: "Truck",
  trigger_type: "keyword",
  trigger_config: { keywords: ["track", "tracking", "where is my order", "delivery status", "waybill"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "greeting" },
    },
    {
      node_key: "greeting",
      node_type: "send_message",
      config: {
        text: "🚚 Let me help you track your order or shipment.",
        next_node_key: "ask_tracking",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_tracking",
      node_type: "collect_input",
      config: {
        text: "Please enter your order number, waybill number, or tracking ID:",
        save_as: "tracking_number",
        next_node_key: "tracking_handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "tracking_handoff",
      node_type: "handoff",
      config: {
        note: "Delivery tracking request — Tracking/Order #: {{vars.tracking_number}}. Look up status and respond to customer.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 14. Payment confirmation — universal
// ============================================================
const PAYMENT_CONFIRMATION_FLOW: FlowTemplate = {
  slug: "payment_confirmation_flow",
  name: "Payment Confirmation",
  description:
    "Verify customer payments: collect payment reference, amount, and sender name for bank transfer verification.",
  icon: "CreditCard",
  trigger_type: "keyword",
  trigger_config: { keywords: ["paid", "payment", "transferred", "sent money", "receipt"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "greeting" },
    },
    {
      node_key: "greeting",
      node_type: "send_message",
      config: {
        text: "Thank you! 💳 Let me verify your payment. I need a few details.",
        next_node_key: "ask_amount",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_amount",
      node_type: "collect_input",
      config: {
        text: "How much did you pay? (e.g., 50000 or ₦50,000)",
        save_as: "payment_amount",
        next_node_key: "ask_reference",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_reference",
      node_type: "collect_input",
      config: {
        text: "Please share the payment reference or transaction ID from your bank app:",
        save_as: "payment_reference",
        next_node_key: "ask_sender",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_sender",
      node_type: "collect_input",
      config: {
        text: "What name was the transfer sent from? (Account holder name)",
        save_as: "sender_name",
        next_node_key: "ask_purpose",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_purpose",
      node_type: "collect_input",
      config: {
        text: "What is this payment for? (e.g., Order #123, Invoice INV-001, School fees for John)",
        save_as: "payment_purpose",
        next_node_key: "payment_handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "payment_handoff",
      node_type: "handoff",
      config: {
        note: "Payment verification — Amount: {{vars.payment_amount}}, Ref: {{vars.payment_reference}}, From: {{vars.sender_name}}, For: {{vars.payment_purpose}}. Verify against bank statement and confirm.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 15. Complaint resolution — universal
// ============================================================
const COMPLAINT_RESOLUTION_FLOW: FlowTemplate = {
  slug: "complaint_resolution_flow",
  name: "Complaint Resolution",
  description:
    "Structured complaint intake: collect issue details, order reference, and urgency for proper routing and resolution.",
  icon: "AlertCircle",
  trigger_type: "keyword",
  trigger_config: { keywords: ["complaint", "problem", "issue", "not happy", "damaged", "wrong"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "greeting" },
    },
    {
      node_key: "greeting",
      node_type: "send_message",
      config: {
        text: "We’re sorry to hear you’re having an issue. 🙏 Let me get the details so we can resolve this quickly.",
        next_node_key: "ask_category",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_category",
      node_type: "send_buttons",
      config: {
        text: "What is your complaint about?",
        footer_text: "Select category",
        buttons: [
          { reply_id: "product", title: "Product/Service", next_node_key: "ask_reference" },
          { reply_id: "delivery", title: "Delivery", next_node_key: "ask_reference" },
          { reply_id: "billing", title: "Billing/Payment", next_node_key: "ask_reference" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "ask_reference",
      node_type: "collect_input",
      config: {
        text: "Please share your order number, invoice number, or any reference (type NONE if you don’t have one):",
        save_as: "complaint_reference",
        next_node_key: "ask_details",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_details",
      node_type: "collect_input",
      config: {
        text: "Please describe the issue in detail. Include what happened, when it happened, and what you expected:",
        save_as: "complaint_details",
        next_node_key: "ask_urgency",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_urgency",
      node_type: "send_buttons",
      config: {
        text: "How urgent is this issue?",
        footer_text: "Select urgency",
        buttons: [
          { reply_id: "urgent", title: "Urgent - need help now", next_node_key: "complaint_tag" },
          { reply_id: "normal", title: "Normal - can wait", next_node_key: "complaint_tag" },
          { reply_id: "low", title: "Low - just feedback", next_node_key: "complaint_tag" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "complaint_tag",
      node_type: "set_tag",
      config: { tag_name: "complaint", next_node_key: "complaint_handoff" },
    },
    {
      node_key: "complaint_handoff",
      node_type: "handoff",
      config: {
        note: "Complaint — Ref: {{vars.complaint_reference}}, Details: {{vars.complaint_details}}. Prioritise and resolve.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 16. Catering enquiry — restaurant / events
// ============================================================
const CATERING_ENQUIRY_FLOW: FlowTemplate = {
  slug: "catering_enquiry_flow",
  name: "Catering Enquiry",
  description:
    "Collect event catering requirements: event date, guest count, menu preferences, budget, and venue details.",
  icon: "PartyPopper",
  trigger_type: "keyword",
  trigger_config: { keywords: ["catering", "event", "party", "owambe", "wedding food"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "greeting" },
    },
    {
      node_key: "greeting",
      node_type: "send_message",
      config: {
        text: "Welcome! 🎉 We’d love to cater your event. Let me get the details.",
        next_node_key: "ask_event_date",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_event_date",
      node_type: "collect_input",
      config: {
        text: "When is your event? (e.g., Saturday 20 March 2026)",
        save_as: "event_date",
        next_node_key: "ask_guest_count",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_guest_count",
      node_type: "collect_input",
      config: {
        text: "How many guests are you expecting?",
        save_as: "guest_count",
        next_node_key: "ask_event_type",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_event_type",
      node_type: "send_buttons",
      config: {
        text: "What type of event is this?",
        footer_text: "Select event type",
        buttons: [
          { reply_id: "wedding", title: "Wedding / Owambe", next_node_key: "ask_menu" },
          { reply_id: "corporate", title: "Corporate event", next_node_key: "ask_menu" },
          { reply_id: "birthday", title: "Birthday / Party", next_node_key: "ask_menu" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "ask_menu",
      node_type: "collect_input",
      config: {
        text: "Any menu preferences or must-have dishes? (e.g., Jollof rice, small chops, pepper soup, continental)",
        save_as: "menu_preferences",
        next_node_key: "ask_budget",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_budget",
      node_type: "collect_input",
      config: {
        text: "What is your catering budget? (e.g., ₦500,000 or ₦5,000 per head)",
        save_as: "catering_budget",
        next_node_key: "catering_handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "catering_handoff",
      node_type: "handoff",
      config: {
        note: "Catering enquiry — Date: {{vars.event_date}}, Guests: {{vars.guest_count}}, Menu: {{vars.menu_preferences}}, Budget: {{vars.catering_budget}}. Prepare quote.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 17. Tenant application — real estate
// ============================================================
const TENANT_APPLICATION_FLOW: FlowTemplate = {
  slug: "tenant_application_flow",
  name: "Tenant Application",
  description:
    "Collect rental application details: employment info, preferred property, move-in date, and references.",
  icon: "Key",
  trigger_type: "keyword",
  trigger_config: { keywords: ["rent", "tenant", "apartment", "flat", "apply"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "greeting" },
    },
    {
      node_key: "greeting",
      node_type: "send_message",
      config: {
        text: "Welcome! 🔑 Let me collect your rental application details.",
        next_node_key: "ask_name",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_name",
      node_type: "collect_input",
      config: {
        text: "Please share your full name:",
        save_as: "applicant_name",
        next_node_key: "ask_employment",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_employment",
      node_type: "collect_input",
      config: {
        text: "What do you do for a living? (e.g., Software developer at GTBank, Business owner - fashion retail)",
        save_as: "employment_info",
        next_node_key: "ask_property",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_property",
      node_type: "collect_input",
      config: {
        text: "Which property or unit are you interested in? (Share the listing reference or describe it)",
        save_as: "property_interest",
        next_node_key: "ask_movein",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_movein",
      node_type: "collect_input",
      config: {
        text: "When would you like to move in?",
        save_as: "movein_date",
        next_node_key: "ask_occupants",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_occupants",
      node_type: "collect_input",
      config: {
        text: "How many people will be living in the property? (e.g., 2 adults, 1 child)",
        save_as: "occupant_count",
        next_node_key: "tenant_handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "tenant_handoff",
      node_type: "handoff",
      config: {
        note: "Tenant application — Name: {{vars.applicant_name}}, Employment: {{vars.employment_info}}, Property: {{vars.property_interest}}, Move-in: {{vars.movein_date}}, Occupants: {{vars.occupant_count}}. Schedule viewing and verify.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 18. Admission enquiry — education
// ============================================================
const ADMISSION_ENQUIRY_FLOW: FlowTemplate = {
  slug: "admission_enquiry_flow",
  name: "Admission Enquiry",
  description:
    "Collect school admission enquiry details: student info, grade/programme, and parent contact for follow-up.",
  icon: "GraduationCap",
  trigger_type: "keyword",
  trigger_config: { keywords: ["admission", "enrol", "register", "school", "programme"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "greeting" },
    },
    {
      node_key: "greeting",
      node_type: "send_message",
      config: {
        text: "Welcome! 🎓 Thank you for your interest. Let me collect some details about the prospective student.",
        next_node_key: "ask_student_name",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_student_name",
      node_type: "collect_input",
      config: {
        text: "What is the student’s full name?",
        save_as: "student_name",
        next_node_key: "ask_programme",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_programme",
      node_type: "send_list",
      config: {
        text: "Which programme or level is the student applying for?",
        button_text: "View programmes",
        sections: [
          {
            title: "Programmes",
            rows: [
              { id: "nursery", title: "Nursery", description: "Ages 2-5" },
              { id: "primary", title: "Primary School", description: "Ages 6-11" },
              { id: "secondary", title: "Secondary School", description: "JSS1-SS3" },
              { id: "diploma", title: "Diploma / Certificate", description: "Professional courses" },
              { id: "degree", title: "Degree Programme", description: "Undergraduate" },
            ],
          },
        ],
        on_select: { save_as: "programme_level", next_node_key: "ask_current_school" },
      } as SendListNodeConfig,
    },
    {
      node_key: "ask_current_school",
      node_type: "collect_input",
      config: {
        text: "What school does the student currently attend? (Type NEW if starting school for the first time)",
        save_as: "current_school",
        next_node_key: "ask_parent_name",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_parent_name",
      node_type: "collect_input",
      config: {
        text: "Parent/Guardian full name:",
        save_as: "parent_name",
        next_node_key: "ask_start_term",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_start_term",
      node_type: "send_buttons",
      config: {
        text: "When would the student like to start?",
        footer_text: "Select term",
        buttons: [
          { reply_id: "next_term", title: "Next term", next_node_key: "admission_handoff" },
          { reply_id: "next_session", title: "Next session", next_node_key: "admission_handoff" },
          { reply_id: "asap", title: "As soon as possible", next_node_key: "admission_handoff" },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "admission_handoff",
      node_type: "handoff",
      config: {
        note: "Admission enquiry — Student: {{vars.student_name}}, Programme: {{vars.programme_level}}, Parent: {{vars.parent_name}}, Current school: {{vars.current_school}}. Share prospectus and schedule visit.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// Registry
// ============================================================

const TEMPLATES: Record<string, FlowTemplate> = {
  welcome_menu: WELCOME_MENU,
  faq_bot: FAQ_BOT,
  lead_capture: LEAD_CAPTURE,
  appointment_reminder: APPOINTMENT_REMINDER,
  order_status: ORDER_STATUS,
  feedback_collector: FEEDBACK_COLLECTOR,
  reactivation_outreach: REACTIVATION_OUTREACH,
  product_enquiry: PRODUCT_ENQUIRY,
  // Industry-specific flows
  property_enquiry_flow: PROPERTY_ENQUIRY_FLOW,
  restaurant_order_flow: RESTAURANT_ORDER_FLOW,
  hotel_booking_flow: HOTEL_BOOKING_FLOW,
  appointment_booking_flow: APPOINTMENT_BOOKING_FLOW,
  delivery_tracking_flow: DELIVERY_TRACKING_FLOW,
  payment_confirmation_flow: PAYMENT_CONFIRMATION_FLOW,
  complaint_resolution_flow: COMPLAINT_RESOLUTION_FLOW,
  catering_enquiry_flow: CATERING_ENQUIRY_FLOW,
  tenant_application_flow: TENANT_APPLICATION_FLOW,
  admission_enquiry_flow: ADMISSION_ENQUIRY_FLOW,
};

export function getFlowTemplate(slug: string): FlowTemplate | null {
  return TEMPLATES[slug] ?? null;
}

export function listFlowTemplates(): FlowTemplate[] {
  return Object.values(TEMPLATES);
}
