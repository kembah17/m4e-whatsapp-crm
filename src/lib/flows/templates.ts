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
  icon: "MessageSquare" | "HelpCircle" | "UserPlus";
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
};

export function getFlowTemplate(slug: string): FlowTemplate | null {
  return TEMPLATES[slug] ?? null;
}

export function listFlowTemplates(): FlowTemplate[] {
  return Object.values(TEMPLATES);
}
