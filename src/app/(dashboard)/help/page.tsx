"use client"

import { useState, useMemo } from "react"
import {
  Search,
  LayoutDashboard,
  MessageSquare,
  Users,
  Radio,
  Rocket,
  Zap,
  Workflow,
  Bot,
  ShoppingCart,
  Package,
  GitBranch,
  Settings,
  HelpCircle,
  BookOpen,
  Shield,
  CreditCard,
  Activity,
  Headphones,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Help Data
// ---------------------------------------------------------------------------

interface HelpFAQ {
  question: string
  answer: string
}

interface HelpSection {
  id: string
  title: string
  icon: React.ElementType
  description: string
  faqs: HelpFAQ[]
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    description: "Quick start guide to set up your account and start reactivating customers.",
    faqs: [
      {
        question: "How do I get started with the Business Growth Engine?",
        answer:
          "Start by connecting your WhatsApp Business account in Settings \u2192 WhatsApp. Then import your customer contacts via the Contacts page. Once connected, you can create your first campaign from the Campaigns page using one of our pre-built templates.",
      },
      {
        question: "How do I connect my WhatsApp Business account?",
        answer:
          "Go to Settings \u2192 WhatsApp and follow the connection wizard. You\u2019ll need a Meta Business account and a WhatsApp Business API number. The wizard walks you through each step including webhook configuration and message template approval.",
      },
      {
        question: "How do I import my existing contacts?",
        answer:
          "Navigate to Contacts \u2192 Import. You can upload a CSV file with columns for name, phone number, email, and any custom fields. The system automatically deduplicates contacts and validates phone numbers. You can also add contacts manually one at a time.",
      },
      {
        question: "What\u2019s the recommended first campaign to run?",
        answer:
          "We recommend starting with the Win-Back Campaign. It targets customers who haven\u2019t purchased in 90+ days with a series of personalized messages. It\u2019s the safest way to test the system because these customers already know your brand.",
      },
      {
        question: "Is there a limit on how many contacts I can have?",
        answer:
          "Your contact limit depends on your subscription plan. The system will show a warning when you\u2019re approaching your limit. You can always upgrade your plan in Settings \u2192 Billing to accommodate more contacts.",
      },
    ],
  },
  {
    id: "campaigns",
    title: "Campaigns",
    icon: Rocket,
    description: "Create and manage automated marketing campaigns to re-engage customers.",
    faqs: [
      {
        question: "What is a campaign and how does it work?",
        answer:
          "A campaign is an automated sequence of messages sent to a targeted group of customers. You choose a template (like Win-Back or Abandoned Cart), select your audience, customize the messages, and launch. The system then sends messages automatically according to the sequence timing.",
      },
      {
        question: "What\u2019s the difference between campaign templates?",
        answer:
          "Each template is designed for a specific goal. Win-Back targets dormant customers, Abandoned Cart recovers lost sales, Post-Purchase builds loyalty, and so on. Each template comes with pre-written message sequences, optimal timing, and proven strategies. You can see full details by clicking \u2018Learn more\u2019 on any template card.",
      },
      {
        question: "How do I create a new campaign?",
        answer:
          "Click \u2018New Campaign\u2019 on the Campaigns page. You\u2019ll go through 5 steps: 1) Analyze your database, 2) Choose a template, 3) Select your audience, 4) Customize messages, and 5) Review and launch. Each step has clear instructions.",
      },
      {
        question: "Can I pause or stop a running campaign?",
        answer:
          "Yes. Open the campaign details page and click \u2018Pause\u2019 to temporarily stop it, or \u2018Cancel\u2019 to stop it permanently. Paused campaigns can be resumed. Messages already in the queue will still be delivered, but no new messages will be scheduled.",
      },
      {
        question: "How do I read campaign performance results?",
        answer:
          "Each campaign shows key metrics: Sent (messages dispatched), Delivered (confirmed received), Replied (customer responded), and Converted (customer took desired action like making a purchase). The performance bars on each campaign card give you a quick visual overview.",
      },
    ],
  },
  {
    id: "contacts",
    title: "Contacts",
    icon: Users,
    description: "Manage your customer database, import contacts, and organize with tags.",
    faqs: [
      {
        question: "How do I organize my contacts with tags?",
        answer:
          "Tags are labels you attach to contacts for easy filtering and targeting. Go to any contact\u2019s profile and click \u2018Add Tag\u2019. Common tags include \u2018VIP\u2019, \u2018New Customer\u2019, \u2018Dormant\u2019, etc. You can also bulk-tag contacts from the contact list. Tags are used when selecting campaign audiences.",
      },
      {
        question: "How do I import contacts from a CSV file?",
        answer:
          "Go to Contacts \u2192 Import. Download our CSV template first to see the expected format. Required columns are \u2018name\u2019 and \u2018phone\u2019. Optional columns include \u2018email\u2019, \u2018company\u2019, \u2018tags\u2019, and any custom fields. Upload your file and map columns before confirming the import.",
      },
      {
        question: "What is the recency score?",
        answer:
          "The recency score measures how recently a customer interacted with your business. It\u2019s calculated automatically based on their last purchase date, last message, and last visit. Higher scores mean more recent activity. This helps you identify dormant customers who need reactivation.",
      },
      {
        question: "What are the import limits for each method?",
        answer:
          "Each import method has its own limit: CSV/Excel files support up to 10,000 contacts per file, vCard (.vcf) files up to 5,000, Google Sheets up to 10,000 rows, photo/OCR up to 50 contacts per image, and text paste up to 200 contacts. Via WhatsApp: contact cards support 20 per message, VCF files up to 5,000, Excel/CSV files up to 10,000, photos up to 50, and typed lists up to 100 per message. Each import session supports up to 10,000 contacts total.",
      },
      {
        question: "Can I import more than 10,000 contacts?",
        answer:
          "Yes! Each import session supports up to 10,000 contacts. Simply start a new session for additional contacts. You can run up to 10 import sessions per day, allowing up to 100,000 contacts daily. For very large databases, we recommend splitting your file into chunks of 10,000 and importing them one at a time.",
      },
      {
        question: "Can I segment contacts for targeted campaigns?",
        answer:
          "Yes! You can create segments based on tags, recency scores, purchase history, location, and custom fields. When creating a campaign, you\u2019ll choose which segment to target. Smart segments update automatically as contact data changes.",
      },
    ],
  },
  {
    id: "inbox",
    title: "Inbox",
    icon: MessageSquare,
    description: "Read and reply to customer messages in real-time.",
    faqs: [
      {
        question: "How does the inbox work?",
        answer:
          "The inbox shows all WhatsApp conversations with your customers in real-time. New messages appear instantly. Click any conversation to read the full history and reply. You can also see message status (sent, delivered, read) with tick icons.",
      },
      {
        question: "What do the message status icons mean?",
        answer:
          "Single grey tick = sent from your system. Double grey ticks = delivered to customer\u2019s phone. Double blue ticks = customer has read the message. A clock icon means the message is still being processed.",
      },
      {
        question: "Can multiple team members use the inbox?",
        answer:
          "Yes! All team members with Agent or Admin roles can access the inbox. Conversations can be assigned to specific team members. You\u2019ll see who\u2019s handling each conversation to avoid duplicate replies.",
      },
      {
        question: "Is there a 24-hour messaging window?",
        answer:
          "Yes, WhatsApp Business API has a 24-hour window. You can send free-form messages within 24 hours of the customer\u2019s last message. Outside this window, you must use pre-approved message templates. The system handles this automatically.",
      },
    ],
  },
  {
    id: "broadcasts",
    title: "Broadcasts",
    icon: Radio,
    description: "Send bulk messages to groups of customers at once.",
    faqs: [
      {
        question: "What is a broadcast?",
        answer:
          "A broadcast sends a single message to many contacts at once. Unlike campaigns (which are automated sequences), broadcasts are one-time sends. Use them for announcements, promotions, or updates that need to reach many people quickly.",
      },
      {
        question: "How do I choose who receives my broadcast?",
        answer:
          "When creating a broadcast, you can select recipients by: tags, segments, individual contacts, or all contacts. You can also exclude specific tags or contacts. Always preview the recipient count before sending.",
      },
      {
        question: "Are there sending limits?",
        answer:
          "Yes, WhatsApp enforces daily sending limits based on your account tier. New accounts start with 1,000 messages/day and can increase to 10,000, then 100,000 as your quality rating improves. The system shows your current limit and usage.",
      },
    ],
  },
  {
    id: "automations",
    title: "Automations",
    icon: Zap,
    description: "Set up automatic actions triggered by customer behavior.",
    faqs: [
      {
        question: "What are automations?",
        answer:
          "Automations are rules that trigger actions automatically when something happens. For example: \u2018When a new contact is added, send a welcome message\u2019 or \u2018When a customer hasn\u2019t purchased in 90 days, add them to the win-back campaign.\u2019 They save you time by handling repetitive tasks.",
      },
      {
        question: "What triggers are available?",
        answer:
          "Available triggers include: new contact added, tag added/removed, keyword received in message, contact status changed, purchase made, cart abandoned, and time-based triggers (e.g., X days after last purchase). More triggers are added regularly.",
      },
      {
        question: "Can I create custom automation rules?",
        answer:
          "Yes! Go to Automations \u2192 Create New. Choose a trigger, set conditions (optional filters), and define actions. Actions include: send message, add/remove tag, start campaign, assign to team member, send notification, and update contact fields.",
      },
      {
        question: "What are some common automation recipes?",
        answer:
          "Popular recipes include: Welcome new contacts with a greeting message, Auto-tag customers based on purchase amount (VIP for high spenders), Send birthday wishes automatically, Follow up 3 days after a purchase asking for feedback, and Alert your team when a VIP customer messages.",
      },
    ],
  },
  {
    id: "flows",
    title: "Flows",
    icon: Workflow,
    description: "Build interactive conversation trees for guided customer interactions.",
    faqs: [
      {
        question: "What are flows?",
        answer:
          "Flows are interactive conversation trees that guide customers through a structured interaction. Think of them as chatbot scripts \u2014 you design the questions, response options, and branching logic. Flows are great for onboarding, surveys, appointment booking, and order taking.",
      },
      {
        question: "How do I build a flow?",
        answer:
          "Go to Flows \u2192 Create New. Use the visual builder to add nodes: Send Message (what you say), Collect Input (what you ask), Send Buttons (give options), and Branch (different paths based on answers). Connect nodes by dragging between them.",
      },
      {
        question: "Can flows collect customer data?",
        answer:
          "Yes! Collect Input nodes can gather text, numbers, dates, and selections. The data is automatically saved to the contact\u2019s profile or custom fields. This is perfect for intake forms, surveys, and qualification questionnaires.",
      },
    ],
  },
  {
    id: "ai-chatbot",
    title: "AI Chatbot",
    icon: Bot,
    description: "Set up intelligent auto-replies powered by AI.",
    faqs: [
      {
        question: "How does the AI chatbot work?",
        answer:
          "The AI chatbot uses your knowledge base (FAQs, product info, business details) to automatically answer customer questions. It understands natural language, so customers can ask questions in their own words. When it can\u2019t answer, it hands off to a human team member.",
      },
      {
        question: "How do I set up the knowledge base?",
        answer:
          "Go to AI Chatbot \u2192 Knowledge Base. Add your FAQs, product descriptions, pricing, business hours, and policies. The more information you provide, the better the AI can answer questions. You can also upload documents and the AI will learn from them.",
      },
      {
        question: "Can I set business hours for the chatbot?",
        answer:
          "Yes! In AI Chatbot \u2192 Settings, set your business hours. During business hours, the AI can hand off to human agents. Outside business hours, the AI handles everything and lets customers know when a human will be available.",
      },
      {
        question: "How do I improve the AI\u2019s responses?",
        answer:
          "Review the AI\u2019s conversation logs regularly. When you see incorrect or incomplete answers, update your knowledge base. You can also mark specific responses as \u2018good\u2019 or \u2018needs improvement\u2019 to help the AI learn over time.",
      },
    ],
  },
  {
    id: "ecommerce",
    title: "E-Commerce",
    icon: ShoppingCart,
    description: "Connect your online store and sync customer purchase data.",
    faqs: [
      {
        question: "Which e-commerce platforms are supported?",
        answer:
          "We currently support Shopify and WooCommerce. Connect your store in Settings \u2192 E-Commerce. Once connected, customer purchases, cart data, and product information sync automatically.",
      },
      {
        question: "What data syncs from my store?",
        answer:
          "We sync: customer profiles (name, email, phone), order history (products, amounts, dates), cart activity (items added, abandoned carts), and product catalog (names, prices, images). This data powers campaign targeting and personalization.",
      },
      {
        question: "How does abandoned cart recovery work with my store?",
        answer:
          "Once your store is connected, the system automatically detects when a customer adds items to their cart but doesn\u2019t complete checkout. The Abandoned Cart campaign template then sends recovery messages with the specific products they left behind.",
      },
    ],
  },
  {
    id: "products",
    title: "Products",
    icon: Package,
    description: "Manage your product catalog and track purchase history.",
    faqs: [
      {
        question: "How do I add products to the catalog?",
        answer:
          "Go to Products \u2192 Add Product. Enter the product name, description, price, and optionally an image. Products can be organized into categories. If you\u2019ve connected an e-commerce store, products sync automatically.",
      },
      {
        question: "How is purchase history used?",
        answer:
          "Purchase history powers several features: campaign targeting (e.g., target customers who bought Product A), recency scoring (when did they last buy), upsell recommendations (suggest complementary products), and VIP identification (top spenders).",
      },
      {
        question: "Can I track purchases made outside my online store?",
        answer:
          "Yes! You can manually record purchases for in-store or offline sales. Go to a contact\u2019s profile \u2192 Purchases \u2192 Add Purchase. This ensures your customer data is complete even for offline transactions.",
      },
    ],
  },
  {
    id: "pipelines",
    title: "Pipelines",
    icon: GitBranch,
    description: "Track deals and customer journeys through sales stages.",
    faqs: [
      {
        question: "What are pipelines?",
        answer:
          "Pipelines are visual boards (like Kanban) that track customers through stages of a process. The default sales pipeline has stages like Lead, Contacted, Qualified, Proposal, and Won/Lost. Drag contacts between stages as they progress.",
      },
      {
        question: "Can I create custom pipeline stages?",
        answer:
          "Yes! Go to Pipelines \u2192 Settings to add, remove, or rename stages. You can also create entirely new pipelines for different processes (e.g., onboarding pipeline, support pipeline, reactivation pipeline).",
      },
      {
        question: "How do pipelines connect to campaigns?",
        answer:
          "Automations can move contacts between pipeline stages based on campaign results. For example, when a win-back campaign gets a reply, the contact can automatically move to the \u2018Re-engaged\u2019 stage. This gives you a visual overview of your reactivation progress.",
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    description: "Configure WhatsApp, email, team members, and system preferences.",
    faqs: [
      {
        question: "How do I configure WhatsApp settings?",
        answer:
          "Go to Settings \u2192 WhatsApp. Here you\u2019ll find your connection status, webhook URL, API credentials, and message template management. You can also set default reply messages and configure auto-assignment rules.",
      },
      {
        question: "How do I set up email notifications?",
        answer:
          "Go to Settings \u2192 Email. Configure your SMTP settings or connect Brevo (recommended \u2014 free tier allows 300 emails/day). Email is used for team notifications, customer receipts, and backup communication when WhatsApp isn\u2019t available.",
      },
      {
        question: "How do I add team members?",
        answer:
          "Go to Settings \u2192 Members \u2192 Invite. Enter their email address and select a role: Owner (full access), Admin (manage everything except billing), Agent (handle conversations and contacts), or Viewer (read-only access).",
      },
      {
        question: "What is recency scoring and how do I configure it?",
        answer:
          "Recency scoring automatically rates how recently each customer interacted with your business. Go to Settings \u2192 Recency Scoring to configure the scoring rules: which activities count (purchases, messages, visits), how much weight each gets, and the decay rate over time.",
      },
    ],
  },
  {
    id: "meta-verification",
    title: "Meta Verification & Setup",
    icon: Shield,
    description: "Understanding Meta Business Verification and WhatsApp API setup",
    faqs: [
      {
        question: "What is Meta Business Verification?",
        answer:
          "Meta verifies your business identity before allowing WhatsApp API access. M4E handles the entire process. You need: CAC certificate, business email, Facebook Business Page (optional but helpful).",
      },
      {
        question: "How long does verification take?",
        answer:
          "Usually 24–72 hours. Some businesses may take up to 7 days if Meta requests additional documentation.",
      },
      {
        question: "What if my business is not registered with CAC?",
        answer:
          "We can explore alternative verification paths. Contact your M4E account manager to discuss options.",
      },
      {
        question: "Can I use my existing WhatsApp number?",
        answer:
          "Yes. Meta\u2019s Coexistence feature allows the WhatsApp Business App and API to work on the same number simultaneously.",
      },
    ],
  },
  {
    id: "messaging-rules",
    title: "WhatsApp Messaging Rules",
    icon: MessageSquare,
    description: "Rules, templates, and compliance for WhatsApp Business messaging",
    faqs: [
      {
        question: "What is the 24-hour conversation window?",
        answer:
          "When a customer messages you, a 24-hour window opens where you can reply freely. After it closes, you must use approved message templates. The CRM handles this automatically.",
      },
      {
        question: "What are message templates?",
        answer:
          "Pre-approved message formats required for outbound campaigns. Four categories: Marketing (promotions), Utility (order updates), Authentication (verification codes), Service (free replies within 24hr window).",
      },
      {
        question: "What can I NOT send on WhatsApp?",
        answer:
          "Messages to non-opted-in contacts, spam, misleading content, adult content, requests for sensitive info (passwords, BVN, bank details). The CRM\u2019s Ban Avoidance Engine blocks most violations automatically.",
      },
      {
        question: "How do I handle opt-outs?",
        answer:
          "Include \u2018Reply STOP to unsubscribe\u2019 in marketing messages. The CRM automatically detects opt-out keywords (STOP, UNSUBSCRIBE, CANCEL) and removes contacts from campaigns.",
      },
      {
        question: "What is the quality rating?",
        answer:
          "Meta rates your account Green (good), Yellow (warning), or Red (restricted) based on customer engagement. The CRM monitors this and pauses campaigns if quality drops.",
      },
    ],
  },
  {
    id: "pricing-costs",
    title: "Pricing & Costs",
    icon: CreditCard,
    description: "Understanding WhatsApp API messaging costs and how to optimise spend",
    faqs: [
      {
        question: "How much do WhatsApp messages cost?",
        answer:
          "Meta charges per conversation (24-hour window). Marketing: approximately N45–75, Utility: approximately N20–35, Authentication: approximately N15–25, Service (customer-initiated): Free. Entry point conversations (from ads/QR codes): Free for 72 hours.",
      },
      {
        question: "How can I see my messaging costs?",
        answer:
          "Your CRM dashboard shows real-time cost tracking. Go to the Cost Transparency section in your dashboard for detailed breakdowns.",
      },
      {
        question: "How does M4E help reduce costs?",
        answer:
          "Smart scheduling maximises the 24-hour window, ban avoidance prevents costly account restrictions, frequency capping prevents over-messaging, and quality monitoring keeps your account in good standing.",
      },
    ],
  },
  {
    id: "account-health",
    title: "Account Health",
    icon: Activity,
    description: "Monitoring and maintaining your WhatsApp Business account health",
    faqs: [
      {
        question: "What are messaging tier limits?",
        answer:
          "New accounts start at Tier 1 (250 unique customers/day). Maintaining green quality for 7 days upgrades you: Tier 2 (1,000), Tier 3 (10,000), Tier 4 (100,000), Unlimited. The CRM manages sending within your tier.",
      },
      {
        question: "How do I improve a low quality rating?",
        answer:
          "Pause marketing campaigns, review message relevance, reduce frequency, improve targeting to engaged customers only, and wait 7 days for recovery.",
      },
      {
        question: "What is the Ban Avoidance Engine?",
        answer:
          "Seven automatic rules protecting your account: new number warm-up, hourly rate limiting, daily/weekly frequency caps, opt-out detection, quality score monitoring, and template pre-validation.",
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return HELP_SECTIONS

    const query = searchQuery.toLowerCase()
    return HELP_SECTIONS.map((section) => ({
      ...section,
      faqs: section.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      ),
    })).filter(
      (section) =>
        section.faqs.length > 0 ||
        section.title.toLowerCase().includes(query) ||
        section.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const totalFAQs = HELP_SECTIONS.reduce((sum, s) => sum + s.faqs.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-primary" />
          Help & Guides
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you need to know about using the Customer Reactivation
          Manager. {totalFAQs} answers across {HELP_SECTIONS.length} topics.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for help... (e.g. \u2018import contacts\u2019, \u2018campaign\u2019, \u2018WhatsApp\u2019)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Links Grid */}
      {!searchQuery && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {HELP_SECTIONS.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                type="button"
                onClick={() =>
                  setActiveSection(
                    activeSection === section.id ? null : section.id
                  )
                }
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 text-center hover:shadow-md",
                  activeSection === section.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    activeSection === section.id
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium leading-tight">
                  {section.title}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0"
                >
                  {section.faqs.length} answers
                </Badge>
              </button>
            )
          })}
        </div>
      )}

      {/* Search results count */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          Found{" "}
          {filteredSections.reduce((sum, s) => sum + s.faqs.length, 0)} results
          in {filteredSections.length} sections
          {filteredSections.length === 0 && (
            <span className="text-muted-foreground">
              {" "}
              \u2014 try different keywords
            </span>
          )}
        </div>
      )}

      {/* Help Sections */}
      <div className="space-y-4">
        {filteredSections
          .filter(
            (section) =>
              !activeSection ||
              activeSection === section.id ||
              searchQuery.trim()
          )
          .map((section) => {
            const Icon = section.icon
            return (
              <Card key={section.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        {section.title}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {section.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {section.faqs.length} questions
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Accordion>
                    {section.faqs.map((faq, idx) => (
                      <AccordionItem key={idx} className="border-border/50">
                        <AccordionTrigger className="text-sm font-medium text-foreground hover:text-primary py-3">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 pl-7">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )
          })}
      </div>

      {/* Empty state for search */}
      {searchQuery && filteredSections.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <HelpCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No results found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              We couldn\u2019t find any help articles matching \u201c{searchQuery}\u201d.
              Try different keywords or browse the sections above.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Still need help?</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Can\u2019t find what you\u2019re looking for? Reach out to our support
                team and we\u2019ll get back to you within 24 hours.
              </p>
            </div>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 px-3 py-1.5 text-xs"
            >
              support@marketing4effect.com
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
