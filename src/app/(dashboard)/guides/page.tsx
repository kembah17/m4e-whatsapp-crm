"use client"

import { useState, useMemo } from "react"
import {
  Search,
  BookOpen,
  Briefcase,
  GraduationCap,
  Layers,
  ChevronRight,
  Clock,
  Users,
  Star,
  ArrowLeft,
  ShoppingCart,
  MessageSquare,
  BarChart3,
  Shield,
  Zap,
  Bot,
  CreditCard,
  Package,
  Workflow,
  FileText,
  Heart,
  Truck,
  Building2,
  Utensils,
  Hotel,
  Stethoscope,
  Wheat,
  Home,
  Scale,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Guide Data Types
// ---------------------------------------------------------------------------

interface GuideArticle {
  id: string
  title: string
  summary: string
  readTime: string
  audience: string
  content: string // Markdown-like content rendered as formatted text
}

interface GuideCategory {
  id: string
  title: string
  icon: React.ElementType
  description: string
  color: string
  articles: GuideArticle[]
}

// ---------------------------------------------------------------------------
// Guide Content
// ---------------------------------------------------------------------------

const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: "executive-briefs",
    title: "Executive Briefs",
    icon: Briefcase,
    description: "5-7 minute reads for business owners. Understand WHY each feature matters for your bottom line.",
    color: "text-amber-600 bg-amber-50",
    articles: [
      {
        id: "eb01",
        title: "Stop Losing Money to Bad Debtors",
        summary: "How the Debt Book feature helps you track, manage, and recover outstanding payments from customers.",
        readTime: "5 min",
        audience: "Business Owners",
        content: "The Debt Book is your digital \u2018owe me\u2019 book. It tracks every customer who owes you money, sends automatic reminders via WhatsApp, and lets you set up installment plans. No more forgotten debts or awkward conversations \u2014 the system handles it professionally.\n\nKey benefits: Automatic payment reminders, installment plan management, debt aging reports, and integration with your customer profiles so you always know who owes what.",
      },
      {
        id: "eb02",
        title: "Your Customers Will Sell For You",
        summary: "How the Loyalty & Referral Programme turns satisfied customers into your best salespeople.",
        readTime: "5 min",
        audience: "Business Owners",
        content: "Happy customers are your most powerful marketing channel. The Loyalty & Referral Programme rewards customers for repeat purchases and for bringing new customers. Points, tiers, and referral bonuses \u2014 all tracked automatically.\n\nKey benefits: Automated point tracking, tiered rewards, referral link generation, WhatsApp-based referral sharing, and ROI tracking per referral source.",
      },
      {
        id: "eb03",
        title: "Know Your Business Before Your Accountant",
        summary: "How the Dashboard and Reports give you real-time business intelligence at a glance.",
        readTime: "5 min",
        audience: "Business Owners",
        content: "Your dashboard shows you everything that matters: revenue trends, customer activity, campaign performance, and growth metrics. No waiting for monthly reports \u2014 see your numbers in real-time.\n\nKey benefits: Real-time revenue tracking, customer activity heatmaps, campaign ROI, product performance, and AI-powered insights that spot trends before you do.",
      },
      {
        id: "eb04",
        title: "Never Run Out of Stock Again",
        summary: "How Inventory Management prevents stockouts and reduces waste.",
        readTime: "5 min",
        audience: "Business Owners",
        content: "The inventory system tracks every item across locations, alerts you before stock runs low, and shows you which products move fastest. Multi-tier warehouse support means you can track stock at your main store, warehouse, and branches.\n\nKey benefits: Low-stock alerts, multi-location tracking, stock movement history, reorder suggestions, and waste reduction through expiry tracking.",
      },
      {
        id: "eb05",
        title: "Look Professional Without an Accountant",
        summary: "How Invoices, Quotations, and Receipts make your business look established.",
        readTime: "5 min",
        audience: "Business Owners",
        content: "Generate professional invoices, quotations, and receipts with your brand logo and colours. Send them via WhatsApp or email. Track payment status automatically. Your customers see a professional business, even if it\u2019s just you and your phone.\n\nKey benefits: Branded documents, one-click WhatsApp sharing, payment tracking, automatic receipt generation, and tax-ready records.",
      },
      {
        id: "eb06",
        title: "Turn WhatsApp Into a Sales Machine",
        summary: "How the WhatsApp Business API transforms your messaging into a revenue channel.",
        readTime: "6 min",
        audience: "Business Owners",
        content: "WhatsApp isn\u2019t just for chatting \u2014 it\u2019s your most powerful sales tool. With the Business API, you can send campaigns to thousands, automate responses, and track every conversation. The 24-hour window, message templates, and quality rating system all work together to keep your account healthy while maximising reach.\n\nKey benefits: Bulk messaging, automated responses, campaign tracking, conversation analytics, and the Ban Avoidance Engine that protects your account.",
      },
      {
        id: "eb07",
        title: "Bring Back Customers Who Stopped Buying",
        summary: "How Database Reactivation campaigns recover lost revenue from dormant customers.",
        readTime: "7 min",
        audience: "Business Owners",
        content: "Your existing customer database is a goldmine. The reactivation system identifies customers who haven\u2019t bought in 90+ days and sends them personalised win-back campaigns. Average results: 29% win-back rate, 390% ROI, zero ad spend.\n\nKey benefits: Automatic dormancy detection, personalised messaging, multi-step sequences, A/B testing, and revenue attribution so you see exactly how much each campaign earns.",
      },
      {
        id: "eb08",
        title: "Your Sales Funnel Works While You Sleep",
        summary: "How Automations and Flows create a 24/7 sales system.",
        readTime: "6 min",
        audience: "Business Owners",
        content: "Set up automations once and they work forever. New customer? Automatic welcome message. Abandoned cart? Automatic reminder. Birthday? Automatic greeting with a discount. Flows guide customers through booking, ordering, and enquiry processes without human intervention.\n\nKey benefits: Trigger-based automation, visual flow builder, 24/7 customer engagement, lead qualification, and handoff to human agents when needed.",
      },
      {
        id: "eb09",
        title: "Import Your Customers in 2 Minutes",
        summary: "How Smart Import gets your existing data into the system quickly and accurately.",
        readTime: "5 min",
        audience: "Business Owners",
        content: "Don\u2019t start from scratch. Import your existing customer list from Excel, CSV, Google Sheets, vCards, or even photos of handwritten lists. The Smart Import system automatically maps columns, validates phone numbers, and deduplicates contacts.\n\nKey benefits: 7 import sources, automatic column mapping, phone number validation, duplicate detection, and up to 10,000 contacts per session.",
      },
      {
        id: "eb10",
        title: "Protect Your Business, Stay Compliant",
        summary: "How the compliance features keep you on the right side of NDPR and WhatsApp rules.",
        readTime: "5 min",
        audience: "Business Owners",
        content: "Nigeria\u2019s data protection regulations (NDPR/NDPA) require businesses to handle customer data responsibly. The BGE has built-in compliance: consent tracking, opt-out management, data retention policies, and audit trails. Plus, the Ban Avoidance Engine keeps your WhatsApp account safe.\n\nKey benefits: Automatic consent tracking, opt-out handling, NDPR compliance tools, WhatsApp quality monitoring, and account protection.",
      },
      {
        id: "eb11",
        title: "Track Every Payment, Even Offline",
        summary: "How Offline Payment Verification captures cash, transfer, and POS payments.",
        readTime: "5 min",
        audience: "Business Owners",
        content: "Not every payment happens online. The offline payment system lets you record cash payments, bank transfers, and POS transactions. Customers can even submit payment proof via WhatsApp. Every naira is tracked, verified, and reconciled.\n\nKey benefits: Multi-channel payment recording, WhatsApp payment proof, verification workflows, reconciliation reports, and complete payment history per customer.",
      },
      {
        id: "eb12",
        title: "Your Business Speaks Its Own Language",
        summary: "How the Smart Item System adapts to your industry \u2014 restaurants see Menu Items, hotels see Room Types, clinics see Medications.",
        readTime: "7 min",
        audience: "Business Owners",
        content: "Most business software forces everything into a generic \u2018Products\u2019 table. M4E is different. When you select your industry, the system automatically adapts: restaurants see Menu Items and Ingredients, hotels see Room Types and Services, clinics see Medications and Medical Services. 10 item types, industry-specific fields, and smart import that recognises your business vocabulary.\n\nKey benefits: Industry-aware labels, revenue vs. operational separation, smart import matching, metadata fields per item type, and the flexibility to enable any type regardless of industry. Your business data finally makes sense \u2014 in YOUR language.",
      },
    ],
  },
  {
    id: "feature-guides",
    title: "Feature Guides",
    icon: BookOpen,
    description: "Detailed how-to guides for managers and supervisors. Learn every feature inside and out.",
    color: "text-blue-600 bg-blue-50",
    articles: [
      {
        id: "fg01",
        title: "Dashboard & Business Overview",
        summary: "Navigate your dashboard, understand KPIs, and use real-time metrics to make decisions.",
        readTime: "10 min",
        audience: "Managers",
        content: "Your dashboard is mission control. It shows: revenue trends (daily, weekly, monthly), active conversations, campaign performance, customer growth, and AI-generated insights. Each widget is interactive \u2014 click to drill down into details.\n\nKey sections: Revenue Overview, Customer Activity, Campaign Performance, Pipeline Summary, Recent Activity Feed, and AI Insights panel.",
      },
      {
        id: "fg02",
        title: "Contacts, Segments & Nigerian Fields",
        summary: "Manage contacts with Nigerian-specific fields, create smart segments, and organise your database.",
        readTime: "12 min",
        audience: "Managers",
        content: "The contact system includes Nigerian-specific fields: state, LGA, market/area, and preferred language. Smart segments auto-update based on rules you set (e.g., \u2018VIP customers in Lagos who bought in the last 30 days\u2019). Tags, custom fields, and activity timelines give you a complete view of every customer.",
      },
      {
        id: "fg03",
        title: "Inbox & Conversations",
        summary: "Master the real-time inbox: message status, team assignment, quick replies, and conversation management.",
        readTime: "10 min",
        audience: "Managers",
        content: "The inbox shows all WhatsApp conversations in real-time. Features include: message status tracking (sent, delivered, read), team member assignment, quick reply templates, conversation labels, search and filter, and the 24-hour window indicator.",
      },
      {
        id: "fg04",
        title: "Campaigns & Templates",
        summary: "Create, launch, and monitor marketing campaigns with pre-built templates and custom sequences.",
        readTime: "15 min",
        audience: "Managers",
        content: "The campaign system offers pre-built templates (Win-Back, Abandoned Cart, Post-Purchase, etc.) and custom campaign creation. Each campaign has 5 steps: database analysis, template selection, audience targeting, message customisation, and review/launch. Monitor performance with real-time metrics.",
      },
      {
        id: "fg05",
        title: "Broadcasts & Bulk Messaging",
        summary: "Send one-time messages to large audiences with targeting, scheduling, and compliance safeguards.",
        readTime: "8 min",
        audience: "Managers",
        content: "Broadcasts are one-time bulk messages for announcements, promotions, or updates. Select recipients by tags, segments, or individual contacts. Schedule for optimal timing. The system respects WhatsApp sending limits and quality ratings automatically.",
      },
      {
        id: "fg06",
        title: "Automations & Flows",
        summary: "Build trigger-based automations and interactive conversation flows with the visual builder.",
        readTime: "12 min",
        audience: "Managers",
        content: "Automations trigger actions based on events (new contact, keyword received, tag added, etc.). Flows are visual conversation trees that guide customers through structured interactions. Both work 24/7 without human intervention.",
      },
      {
        id: "fg07",
        title: "AI Chatbot & Playground",
        summary: "Configure the AI chatbot, build its knowledge base, and test conversations in the playground.",
        readTime: "12 min",
        audience: "Managers",
        content: "The AI chatbot answers customer questions using your knowledge base. Add FAQs, product info, pricing, and policies. The playground lets you test conversations before going live. Configure business hours, handoff rules, and response personality.",
      },
      {
        id: "fg08",
        title: "Debt Book & Installments",
        summary: "Track customer debts, set up installment plans, and automate payment reminders.",
        readTime: "10 min",
        audience: "Managers",
        content: "The Debt Book tracks every outstanding balance. Create installment plans with flexible schedules. Automatic WhatsApp reminders go out before due dates. Track partial payments, overdue amounts, and debt aging. Integration with the Trust Score system rewards good payers.",
      },
      {
        id: "fg09",
        title: "Invoices, Quotations & Receipts",
        summary: "Generate branded financial documents and share them via WhatsApp or email.",
        readTime: "8 min",
        audience: "Managers",
        content: "Create professional invoices, quotations, and receipts with your brand identity. One-click sharing via WhatsApp. Track payment status (draft, sent, paid, overdue). Convert quotations to invoices to receipts in a seamless flow.",
      },
      {
        id: "fg10",
        title: "Inventory Management",
        summary: "Track stock across locations, set reorder points, and manage multi-tier warehouses.",
        readTime: "12 min",
        audience: "Managers",
        content: "Multi-location inventory tracking with stock movement history. Set reorder points for automatic low-stock alerts. Transfer stock between locations. Track suppliers, purchase orders, and stock valuations. The ledger system records every movement.",
      },
      {
        id: "fg11",
        title: "Trust Score System",
        summary: "Understand how customer trust scores are calculated and how they affect business decisions.",
        readTime: "8 min",
        audience: "Managers",
        content: "The Trust Score rates customers based on payment history, engagement, and reliability. Higher scores unlock benefits like higher credit limits and priority service. The score updates automatically based on customer behaviour.",
      },
      {
        id: "fg12",
        title: "Loyalty & Referral Programmes",
        summary: "Set up point systems, reward tiers, and referral tracking to grow through word-of-mouth.",
        readTime: "10 min",
        audience: "Managers",
        content: "Configure point-earning rules (purchases, referrals, reviews), create reward tiers (Bronze, Silver, Gold), and track referral chains. Customers share referral links via WhatsApp. The system tracks who referred whom and calculates rewards automatically.",
      },
      {
        id: "fg15a",
        title: "Smart Import & Data Management",
        summary: "Import contacts and products from 7 sources with automatic mapping and validation.",
        readTime: "10 min",
        audience: "Managers",
        content: "Import from CSV/Excel, vCards, Google Sheets, photos (OCR), text paste, WhatsApp messages, and manual entry. The system auto-maps columns, validates phone numbers, detects duplicates, and supports up to 10,000 contacts per session.",
      },
      {
        id: "fg15b",
        title: "Offline Payments & Verification",
        summary: "Record cash, transfer, and POS payments with WhatsApp-based proof submission.",
        readTime: "8 min",
        audience: "Managers",
        content: "Record payments made outside digital channels. Customers can submit payment proof (screenshots, photos) via WhatsApp. Verification workflows ensure accuracy. Complete reconciliation reports show all payment channels.",
      },
      {
        id: "fg16a",
        title: "Hybrid Pipelines & Checklists",
        summary: "Track deals through customisable pipeline stages with built-in task checklists.",
        readTime: "10 min",
        audience: "Managers",
        content: "Visual Kanban boards track customers through sales stages. Each stage can have required checklists (tasks that must be completed before moving forward). Create multiple pipelines for different processes. Automation integration moves contacts between stages based on actions.",
      },
      {
        id: "fg16b",
        title: "Settings, Security & Compliance",
        summary: "Configure WhatsApp, email, team roles, 2FA, and compliance settings.",
        readTime: "12 min",
        audience: "Managers",
        content: "Comprehensive settings: WhatsApp connection, email (SMTP/Brevo), team member management with roles (Owner, Admin, Agent, Viewer), two-factor authentication, recency scoring configuration, and NDPR compliance tools.",
      },
      {
        id: "fg17",
        title: "Subscription Tiers & Usage",
        summary: "Understand plan limits, usage tracking, and how to upgrade for more capacity.",
        readTime: "8 min",
        audience: "Managers",
        content: "Three tiers: Starter (\u20A650K/mo), Professional (\u20A6120K/mo), Business (\u20A6250K/mo). Each tier has limits on contacts, messages, team members, and features. Usage tracking shows current consumption. Upgrade prompts appear when approaching limits.",
      },
      {
        id: "fg18",
        title: "Smart Item System: Industry-Aware Products & Services",
        summary: "How the system adapts to your industry with 10 item types, smart labels, and revenue/operational separation.",
        readTime: "12 min",
        audience: "Managers & Supervisors",
        content: "The Smart Item System recognises 10 item types: Product, Service, Menu Item, Asset, Programme, Property, Package, Subscription, Ingredient, and Supply. Each industry gets pre-configured defaults \u2014 restaurants see Menu Items and Ingredients, hotels see Room Types and Services, clinics see Medications and Medical Services.\n\nEvery item has a role: Revenue (things you sell), Operational (things you use), or Both. This separation gives instant clarity on costs vs. income. Smart Import recognises your industry\u2019s vocabulary in spreadsheet columns. Metadata fields provide industry-specific extra information (prep time for restaurants, bed type for hotels, practice area for lawyers).\n\nIndustry bundles are suggestions, not restrictions. Any business can enable any item type. A hotel with a restaurant enables Menu Items with one click. A clinic with a pharmacy already has Medications. The system grows with your business.",
      },
    ],
  },
  {
    id: "training-modules",
    title: "Training Modules",
    icon: GraduationCap,
    description: "Step-by-step learning paths from beginner to expert. 40 modules across 8 levels.",
    color: "text-green-600 bg-green-50",
    articles: [
      {
        id: "level1",
        title: "Level 1: Getting Started (Modules 1-6)",
        summary: "What is a CRM, account setup, adding customers, understanding your dashboard, first WhatsApp message, adding products.",
        readTime: "45 min total",
        audience: "New Users",
        content: "Module 1: What Is a CRM and Why Your Business Needs One \u2014 Understanding the basics of customer relationship management and how it transforms Nigerian businesses.\n\nModule 2: Setting Up Your M4E Account \u2014 Step-by-step account creation, industry selection, and initial configuration.\n\nModule 3: Adding Your First Customers \u2014 Manual entry, CSV import, and contact validation.\n\nModule 4: Your Dashboard \u2014 Understanding the Numbers \u2014 Reading KPIs, interpreting trends, and using the dashboard for daily decisions.\n\nModule 5: Sending Your First WhatsApp Message \u2014 Connecting WhatsApp, understanding templates, and sending your first campaign message.\n\nModule 6: Adding Your Products and Services \u2014 Product catalog setup, categories, pricing, and the Smart Item System basics.",
      },
      {
        id: "level2",
        title: "Level 2: Daily Operations (Modules 7-12)",
        summary: "Inbox management, customer pipeline, broadcasting, campaigns, reports, and daily routines.",
        readTime: "60 min total",
        audience: "Active Users",
        content: "Module 7: Managing Your Inbox Like a Pro \u2014 Conversation management, quick replies, team assignment, and the 24-hour window.\n\nModule 8: The Customer Pipeline \u2014 Moving Customers Forward \u2014 Pipeline stages, deal tracking, and conversion optimisation.\n\nModule 9: Broadcasting Messages to Many Customers \u2014 Audience selection, scheduling, compliance, and performance tracking.\n\nModule 10: Running Your First Campaign \u2014 Template selection, audience targeting, message customisation, and launch.\n\nModule 11: Reading Your Reports and Numbers \u2014 Campaign metrics, revenue reports, customer analytics, and trend identification.\n\nModule 12: Your Daily CRM Routine \u2014 The 15-minute daily checklist that keeps your business running smoothly.",
      },
      {
        id: "level3",
        title: "Level 3: Growth Features (Modules 13-18)",
        summary: "Automation, AI chatbot, e-commerce, advanced campaigns, QR codes, and customer segments.",
        readTime: "75 min total",
        audience: "Growing Businesses",
        content: "Module 13: Automation Magic \u2014 Let the CRM Work for You \u2014 Trigger-based automations, common recipes, and testing.\n\nModule 14: AI Chatbot \u2014 Your 24/7 Customer Service Agent \u2014 Knowledge base setup, conversation flows, and handoff rules.\n\nModule 15: Connecting Your Online Store \u2014 Shopify and WooCommerce integration, data sync, and abandoned cart recovery.\n\nModule 16: Advanced Campaigns That Bring Customers Back \u2014 Multi-step sequences, A/B testing, and reactivation strategies.\n\nModule 17: QR Codes and WhatsApp Links \u2014 Generate QR codes for in-store, print, and digital use.\n\nModule 18: Customer Segments \u2014 The Right Message to the Right Person \u2014 Smart segments, behavioural targeting, and personalisation.",
      },
    ],
  },
  {
    id: "industry-guides",
    title: "Industry Guides",
    icon: Layers,
    description: "Tailored guides for specific industries showing how to get the most from BGE.",
    color: "text-purple-600 bg-purple-50",
    articles: [
      {
        id: "ind-retail",
        title: "Retail & FMCG",
        summary: "Product management, inventory tracking, customer loyalty, and seasonal campaigns for retail businesses.",
        readTime: "15 min",
        audience: "Retail Business Owners",
        content: "Your BGE is configured with Products and Store Supplies. Key features for retail: inventory management with low-stock alerts, customer purchase history for targeted campaigns, loyalty programmes with point-per-naira earning, seasonal campaign templates, and abandoned cart recovery if you have an online store.\n\nQuick wins: Import your product catalog, set up a Win-Back campaign for customers who haven\u2019t bought in 90 days, and enable the AI chatbot to answer product enquiries 24/7.",
      },
      {
        id: "ind-restaurant",
        title: "Restaurant & Food Service",
        summary: "Menu management, ingredient tracking, reservation handling, and food delivery campaigns.",
        readTime: "15 min",
        audience: "Restaurant Owners",
        content: "Your BGE shows Menu Items and Ingredients instead of generic \u2018Products\u2019. Track food costs separately from menu revenue. Set up flows for table reservations and delivery orders. Use campaigns to promote daily specials and bring back customers who haven\u2019t ordered in a while.\n\nQuick wins: Add your menu items with prices, set up a \u2018Daily Special\u2019 broadcast template, and create an automation that sends a \u2018We miss you\u2019 message to customers who haven\u2019t ordered in 30 days.",
      },
      {
        id: "ind-hotel",
        title: "Hotels & Hospitality",
        summary: "Room type management, booking flows, guest services, and seasonal package promotions.",
        readTime: "15 min",
        audience: "Hotel Owners",
        content: "Your BGE shows Room Types, Hotel Services, and Stay Packages. Each room type has fields for bed type, amenities, and occupancy. Set up WhatsApp flows for booking enquiries and check-in/check-out. Create seasonal packages and promote them to past guests.\n\nQuick wins: Add your room types with rates and amenities, set up a booking enquiry flow, and create a campaign targeting past guests with a seasonal package offer.",
      },
      {
        id: "ind-healthcare",
        title: "Healthcare & Clinics",
        summary: "Medical services, medication tracking, appointment flows, and patient reactivation.",
        readTime: "15 min",
        audience: "Healthcare Providers",
        content: "Your BGE shows Medical Services, Medications (with dual revenue/operational role), and Medical Supplies. Track consultation fees separately from medication sales. Set up appointment booking flows via WhatsApp. Send health tips and check-up reminders to patients.\n\nQuick wins: Add your services with consultation fees, set up an appointment booking flow, and create a campaign reminding patients about annual check-ups.",
      },
      {
        id: "ind-professional",
        title: "Professional Services",
        summary: "Service packages, retainer management, consultation booking, and client nurturing for lawyers, accountants, and consultants.",
        readTime: "15 min",
        audience: "Professional Service Providers",
        content: "Your BGE shows Services, Service Packages, and Retainers. Track billable hours, manage retainer agreements, and create consultation booking flows. Use campaigns to nurture leads and cross-sell additional services to existing clients.\n\nQuick wins: Add your services with hourly/fixed rates, set up a consultation booking flow, and create a newsletter broadcast sharing industry insights with your client base.",
      },
      {
        id: "ind-beauty",
        title: "Beauty & Salon",
        summary: "Service booking, product sales, loyalty rewards, and appointment reminders for beauty businesses.",
        readTime: "15 min",
        audience: "Salon & Beauty Business Owners",
        content: "Your BGE combines Services (treatments, styling) with Products (beauty products for retail). Set up appointment booking flows, send automatic reminders, and reward loyal customers with points. Track which services are most popular and which products sell best.\n\nQuick wins: Add your services with durations and prices, set up an appointment reminder automation, and create a loyalty programme that rewards repeat visits.",
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GuidesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedArticle, setSelectedArticle] = useState<GuideArticle | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return GUIDE_CATEGORIES

    const query = searchQuery.toLowerCase()
    return GUIDE_CATEGORIES.map((cat) => ({
      ...cat,
      articles: cat.articles.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.summary.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query)
      ),
    })).filter(
      (cat) =>
        cat.articles.length > 0 ||
        cat.title.toLowerCase().includes(query) ||
        cat.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const totalArticles = GUIDE_CATEGORIES.reduce((sum, c) => sum + c.articles.length, 0)

  // Article detail view
  if (selectedArticle) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedArticle(null)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Guides
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {selectedArticle.readTime}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {selectedArticle.audience}
              </Badge>
            </div>
            <CardTitle className="text-xl">{selectedArticle.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedArticle.summary}
            </p>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {selectedArticle.content.split("\n\n").map((paragraph, idx) => (
                <p key={idx} className="text-sm text-foreground/80 leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Feature Guides & Training
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalArticles} guides across {GUIDE_CATEGORIES.length} categories.
          In-depth documentation for every BGE feature.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search guides... (e.g. \u2018smart item\u2019, \u2018campaign\u2019, \u2018restaurant\u2019)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Cards */}
      {!searchQuery && !selectedCategory && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GUIDE_CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-start gap-3 p-5 rounded-xl border transition-all duration-200 text-left hover:shadow-md hover:border-primary/30"
              >
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", cat.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{cat.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {cat.articles.length} guides
                </Badge>
              </button>
            )
          })}
        </div>
      )}

      {/* Category filter chips */}
      {(selectedCategory || searchQuery) && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedCategory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="gap-1 text-xs"
            >
              <ArrowLeft className="h-3 w-3" />
              All Categories
            </Button>
          )}
          {searchQuery && (
            <span className="text-xs text-muted-foreground">
              Found {filteredCategories.reduce((sum, c) => sum + c.articles.length, 0)} results
            </span>
          )}
        </div>
      )}

      {/* Article Lists */}
      <div className="space-y-6">
        {filteredCategories
          .filter((cat) => !selectedCategory || selectedCategory === cat.id)
          .map((cat) => {
            const Icon = cat.icon
            return (
              <Card key={cat.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", cat.color)}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{cat.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {cat.articles.length} guides
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y divide-border/50">
                    {cat.articles.map((article) => (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => setSelectedArticle(article)}
                        className="flex items-center gap-4 py-3 px-2 w-full text-left hover:bg-muted/50 rounded-lg transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium group-hover:text-primary transition-colors">
                            {article.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {article.summary}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-[9px] px-1.5">
                            {article.readTime}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>

      {/* Empty state */}
      {searchQuery && filteredCategories.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No guides found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              No guides match \u201c{searchQuery}\u201d. Try different keywords.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Want more training?</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Our full training curriculum includes 40 modules, audio podcasts, and industry-specific tracks.
                Contact your account manager for access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
