import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageSquare,
  Users,
  BarChart3,
  Zap,
  Bot,
  ShoppingBag,
  QrCode,
  Megaphone,
  Heart,
  Shield,
  Clock,
  CheckCircle2,
  ArrowRight,
  Star,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "M4E Customer Reactivation Manager — CRM Platform",
  description:
    "WhatsApp-first CRM built for Nigerian businesses. Reactivate dormant customers, automate campaigns, and grow revenue with AI-powered tools. Plans from ₦50,000/mo.",
  robots: { index: true, follow: true },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: MessageSquare,
    title: "WhatsApp Inbox",
    desc: "Real-time messaging with media, reactions, and quick replies — all in one place.",
  },
  {
    icon: Users,
    title: "Smart Contact CRM",
    desc: "RFM scoring, tags, segments, and import/export. Know every customer inside out.",
  },
  {
    icon: Zap,
    title: "14 Campaign Templates",
    desc: "Pre-built reactivation, cart recovery, post-purchase, and growth campaigns ready to launch.",
  },
  {
    icon: Bot,
    title: "AI Chatbot",
    desc: "OpenRouter-powered chatbot that understands Nigerian English and Pidgin. Works 24/7.",
  },
  {
    icon: BarChart3,
    title: "Deal Pipelines",
    desc: "Visual kanban boards to track every deal from first contact to closed-won.",
  },
  {
    icon: ShoppingBag,
    title: "E-Commerce Integration",
    desc: "Sync with Shopify & WooCommerce. Track carts, recover abandoned orders automatically.",
  },
  {
    icon: QrCode,
    title: "QR Code Generator",
    desc: "Branded WhatsApp QR codes for your store, packaging, and marketing materials.",
  },
  {
    icon: Megaphone,
    title: "Ad Lead Tracking",
    desc: "Capture and nurture Click-to-WhatsApp ad leads automatically with attribution.",
  },
  {
    icon: Heart,
    title: "Sentiment Analysis",
    desc: "AI detects unhappy customers in real-time — including Nigerian Pidgin — and auto-escalates.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Security",
    desc: "Row-level security, team roles, branch management, and encrypted data at rest.",
  },
  {
    icon: Clock,
    title: "Automation Engine",
    desc: "Event-driven triggers and multi-step sequences that run while you sleep.",
  },
  {
    icon: Sparkles,
    title: "WhatsApp Flows",
    desc: "In-chat forms for surveys, bookings, and lead capture — customers never leave WhatsApp.",
  },
];

interface PricingTier {
  name: string;
  price: string;
  annual: string;
  desc: string;
  badge?: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Starter",
    price: "₦50,000",
    annual: "₦480,000/yr",
    desc: "Perfect for small businesses getting started with WhatsApp CRM.",
    features: [
      "Up to 500 contacts",
      "2 team members",
      "1 branch",
      "WhatsApp Inbox",
      "500 broadcasts/month",
      "4 campaign templates",
      "1 deal pipeline",
      "50 products",
      "3 active automations",
      "QR code generator",
      "Basic RFM scoring",
      "Keyword sentiment detection",
      "Basic analytics dashboard",
    ],
    cta: "Start 14-Day Trial",
  },
  {
    name: "Professional",
    price: "₦120,000",
    annual: "₦1,152,000/yr",
    desc: "For growing businesses that need AI power and deeper automation.",
    badge: "Most Popular",
    highlighted: true,
    features: [
      "Up to 2,000 contacts",
      "5 team members",
      "3 branches",
      "Everything in Starter, plus:",
      "2,000 broadcasts/month",
      "10 campaign templates (Tier 1-2)",
      "3 deal pipelines",
      "200 products",
      "10 active automations",
      "Visual flow builder",
      "3 WhatsApp Flow templates",
      "AI chatbot (100 msgs/month)",
      "Full AI sentiment analysis",
      "Shopify/WooCommerce sync",
      "Cart abandonment recovery",
      "Basic CTWA ad tracking",
      "Adaptive RFM scoring",
      "Advanced analytics",
      "Email support",
    ],
    cta: "Get Started",
  },
  {
    name: "Business",
    price: "₦250,000",
    annual: "₦2,400,000/yr",
    desc: "For established businesses that want everything — no limits.",
    features: [
      "Unlimited contacts",
      "Unlimited team members",
      "Unlimited branches",
      "Everything in Professional, plus:",
      "10,000 broadcasts/month",
      "All 14 campaign templates",
      "Unlimited deal pipelines",
      "Unlimited products",
      "Unlimited automations",
      "All 5 WhatsApp Flow templates + custom",
      "AI chatbot (unlimited)",
      "Full catalog sync",
      "Full CTWA ad analytics",
      "System monitoring dashboard",
      "API access",
      "White-label option",
      "Priority WhatsApp + email support",
    ],
    cta: "Contact Sales",
  },
];

interface ComparisonRow {
  feature: string;
  starter: string;
  professional: string;
  business: string;
  category?: string;
}

const comparison: ComparisonRow[] = [
  { feature: "", starter: "", professional: "", business: "", category: "Core CRM" },
  { feature: "WhatsApp Inbox", starter: "✅", professional: "✅", business: "✅" },
  { feature: "Contacts", starter: "500", professional: "2,000", business: "Unlimited" },
  { feature: "Team Members", starter: "2", professional: "5", business: "Unlimited" },
  { feature: "Branches", starter: "1", professional: "3", business: "Unlimited" },
  { feature: "Deal Pipelines", starter: "1", professional: "3", business: "Unlimited" },
  { feature: "Products", starter: "50", professional: "200", business: "Unlimited" },
  { feature: "QR Code Generator", starter: "✅", professional: "✅", business: "✅" },
  { feature: "", starter: "", professional: "", business: "", category: "Messaging" },
  { feature: "Broadcasts/month", starter: "500", professional: "2,000", business: "10,000" },
  { feature: "Message Templates", starter: "5", professional: "20", business: "Unlimited" },
  { feature: "", starter: "", professional: "", business: "", category: "Campaigns" },
  { feature: "Campaign Templates", starter: "4 basic", professional: "10 (Tier 1-2)", business: "All 14" },
  { feature: "Campaign Wizard", starter: "✅", professional: "✅", business: "✅" },
  { feature: "Campaign Scheduling", starter: "—", professional: "✅", business: "✅" },
  { feature: "", starter: "", professional: "", business: "", category: "Automation" },
  { feature: "Active Automations", starter: "3", professional: "10", business: "Unlimited" },
  { feature: "Flow Builder", starter: "—", professional: "✅", business: "✅" },
  { feature: "WhatsApp Flows (Forms)", starter: "—", professional: "3 templates", business: "All 5 + custom" },
  { feature: "", starter: "", professional: "", business: "", category: "AI & Intelligence" },
  { feature: "Sentiment Analysis", starter: "Keyword-only", professional: "Full AI", business: "Full AI" },
  { feature: "AI Chatbot", starter: "—", professional: "100 msgs/mo", business: "Unlimited" },
  { feature: "RFM Scoring", starter: "Basic", professional: "Adaptive", business: "Adaptive" },
  { feature: "", starter: "", professional: "", business: "", category: "E-Commerce" },
  { feature: "Shopify/WooCommerce", starter: "—", professional: "✅", business: "✅" },
  { feature: "Catalog Sync", starter: "—", professional: "—", business: "✅" },
  { feature: "Cart Abandonment", starter: "—", professional: "✅", business: "✅" },
  { feature: "", starter: "", professional: "", business: "", category: "Advertising" },
  { feature: "CTWA Ad Lead Tracking", starter: "—", professional: "Basic stats", business: "Full analytics" },
  { feature: "", starter: "", professional: "", business: "", category: "Admin & Support" },
  { feature: "Analytics Dashboard", starter: "Basic", professional: "Advanced", business: "Full" },
  { feature: "System Monitoring", starter: "—", professional: "—", business: "✅" },
  { feature: "API Access", starter: "—", professional: "—", business: "✅" },
  { feature: "White-Label", starter: "—", professional: "—", business: "✅" },
  { feature: "Support", starter: "Email", professional: "Email", business: "WhatsApp + Email" },
];

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes! Every plan comes with a 14-day trial with full access to all features in your chosen tier. No credit card required to start.",
  },
  {
    q: "Do I need a WhatsApp Business API account?",
    a: "Yes. The CRM connects to the official WhatsApp Business API through Meta. We\u2019ll help you set up your Meta Business account and get verified during onboarding.",
  },
  {
    q: "Can I upgrade or downgrade my plan?",
    a: "Absolutely. You can change plans at any time. Upgrades take effect immediately, and downgrades apply at the start of your next billing cycle.",
  },
  {
    q: "Is the CRM included with M4E service packages?",
    a: "Yes! If you purchase any M4E marketing service package (Customer Reactivation, Online Presence, or Growth Engine), full CRM access is included at no extra cost for the duration of your engagement plus 3-6 months post-delivery.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept bank transfers, card payments via Paystack, and USSD payments. All prices are in Nigerian Naira (\u20a6).",
  },
  {
    q: "Can I import my existing contacts?",
    a: "Yes. You can import contacts via CSV file. The system handles deduplication automatically and preserves your existing tags and custom fields.",
  },
  {
    q: "How does the AI chatbot work?",
    a: "The AI chatbot uses advanced language models to understand and respond to customer messages in English and Nigerian Pidgin. You configure its knowledge base, personality, and business hours. It handles enquiries automatically and escalates complex issues to your team.",
  },
  {
    q: "What\u2019s the difference between the CRM and M4E service packages?",
    a: "The CRM is the software tool — it gives you the platform to manage WhatsApp conversations, campaigns, and customer data. M4E service packages include the CRM PLUS expert strategy, campaign design, copywriting, and hands-on management by our marketing team. Think of it as: CRM = the car, Service Package = the car + a professional driver.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use row-level security, encrypted data at rest, team-based access controls, and comply with NDPR (Nigeria Data Protection Regulation). Your data is hosted on enterprise-grade infrastructure.",
  },
  {
    q: "Can I get a CRM subscription credit if I upgrade to a service package?",
    a: "Yes! Starter clients get their first 3 months of CRM fees credited toward any service package. Professional clients get 6 months credited, and Business clients get 12 months credited.",
  },
];

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function NavBar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[oklch(0.13_0.01_260)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/platform" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8962e] text-xs font-bold text-[#1a1a2e]">
            M4E
          </div>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            Customer Reactivation Manager
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="https://marketing4effect.vercel.app"
            className="hidden text-sm text-white/60 transition-colors hover:text-white sm:block"
          >
            M4E Services
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b8962e] px-4 py-2 text-sm font-bold text-[#1a1a2e] transition-opacity hover:opacity-90"
          >
            Start 14-Day Trial
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-20 pt-32 sm:pb-28 sm:pt-40">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#d4af37]/5 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-violet-600/5 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-1.5 text-sm text-[#d4af37]">
          <Sparkles className="h-4 w-4" />
          Built for Nigerian Businesses
        </div>

        <h1 className="mx-auto max-w-4xl font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Turn Dormant Customers Into{" "}
          <span className="bg-gradient-to-r from-[#d4af37] to-[#f0d060] bg-clip-text text-transparent">
            Revenue
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl">
          The WhatsApp-first CRM that helps Nigerian businesses reactivate dormant
          customers, automate campaigns, and grow revenue with AI-powered tools
          that understand your market.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] px-8 py-3.5 text-base font-bold text-[#1a1a2e] shadow-lg shadow-[#d4af37]/20 transition-all hover:shadow-xl hover:shadow-[#d4af37]/30"
          >
            Start 14-Day Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-white/5"
          >
            View Pricing
            <ChevronDown className="h-5 w-5" />
          </Link>
        </div>

        <p className="mt-6 text-sm text-white/40">
          No credit card required &middot; 14-day full access &middot; Cancel anytime
        </p>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="border-t border-white/5 py-20 sm:py-28" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
            Everything You Need to Win Back Customers
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/50">
            17 integrated modules. 14 campaign templates. 1 powerful platform.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-[#d4af37]/20 hover:bg-white/[0.04]"
            >
              <div className="mb-4 inline-flex rounded-xl bg-[#d4af37]/10 p-3 text-[#d4af37] transition-colors group-hover:bg-[#d4af37]/20">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="border-t border-white/5 py-20 sm:py-28" id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/50">
            Choose the plan that fits your business. All plans include a 14-day trial.
          </p>
        </div>

        {/* Service package note */}
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4 text-center">
          <p className="text-sm text-[#d4af37]">
            <Star className="mb-0.5 mr-1 inline h-4 w-4" />
            <strong>Already an M4E client?</strong> Full CRM access is included FREE with
            any M4E marketing service package. No separate subscription needed.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all ${
                tier.highlighted
                  ? "border-[#d4af37]/40 bg-[#d4af37]/[0.03] shadow-xl shadow-[#d4af37]/5"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#d4af37] to-[#b8962e] px-4 py-1 text-xs font-bold text-[#1a1a2e]">
                  {tier.badge}
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                <p className="mt-2 text-sm text-white/50">{tier.desc}</p>
              </div>

              <div className="mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  <span className="text-white/40">/mo</span>
                </div>
                <p className="mt-1 text-sm text-white/30">
                  {tier.annual} (save 20%)
                </p>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {feat.endsWith(":") || feat.startsWith("Everything") ? (
                      <span className="mt-2 font-semibold text-[#d4af37]">{feat}</span>
                    ) : (
                      <>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af37]" />
                        <span className="text-white/70">{feat}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href={tier.name === "Business" ? "https://marketing4effect.vercel.app/#contact" : "/signup"}
                  className={`block w-full rounded-xl py-3 text-center text-sm font-bold transition-all ${
                    tier.highlighted
                      ? "bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-[#1a1a2e] shadow-lg shadow-[#d4af37]/20 hover:shadow-xl"
                      : "border border-white/20 text-white hover:bg-white/5"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="border-t border-white/5 py-20 sm:py-28" id="compare">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
          Feature Comparison
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-white/50">
          See exactly what&apos;s included in each plan.
        </p>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4 pr-4 text-left font-medium text-white/40">Feature</th>
                <th className="pb-4 px-4 text-center font-medium text-white/40">Starter</th>
                <th className="pb-4 px-4 text-center font-medium text-[#d4af37]">Professional</th>
                <th className="pb-4 pl-4 text-center font-medium text-white/40">Business</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row, i) =>
                row.category ? (
                  <tr key={`cat-${i}`}>
                    <td
                      colSpan={4}
                      className="pb-2 pt-6 text-xs font-bold uppercase tracking-wider text-[#d4af37]"
                    >
                      {row.category}
                    </td>
                  </tr>
                ) : (
                  <tr key={`row-${i}`} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-white/70">{row.feature}</td>
                    <td className="py-3 px-4 text-center text-white/50">{row.starter}</td>
                    <td className="py-3 px-4 text-center text-white/70">{row.professional}</td>
                    <td className="py-3 pl-4 text-center text-white/70">{row.business}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="border-t border-white/5 py-20 sm:py-28" id="faq">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
          Frequently Asked Questions
        </h2>

        <div className="mt-12 space-y-6">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] transition-colors open:border-[#d4af37]/20 open:bg-[#d4af37]/[0.02]"
            >
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-white marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="pr-4 font-medium">{faq.q}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-white/40 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-6 pb-5 text-sm leading-relaxed text-white/60">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="border-t border-white/5 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white sm:text-4xl">
          Ready to Reactivate Your Customers?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/50">
          Join Nigerian businesses already using M4E to turn dormant customers into
          repeat buyers. Start your 14-day trial today.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b8962e] px-8 py-3.5 text-base font-bold text-[#1a1a2e] shadow-lg shadow-[#d4af37]/20 transition-all hover:shadow-xl hover:shadow-[#d4af37]/30"
          >
            Start 14-Day Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="https://marketing4effect.vercel.app/#contact"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-white/5"
          >
            Talk to Our Team
          </Link>
        </div>

        <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-6">
          <p className="text-sm font-medium text-[#d4af37]">
            \u2728 Prefer the full service experience?
          </p>
          <p className="mt-2 text-sm text-white/50">
            Our marketing service packages (from \u20a62,000,000) include full CRM access
            PLUS expert strategy, campaign design, and hands-on management.{" "}
            <Link
              href="https://marketing4effect.vercel.app/#pricing"
              className="text-[#d4af37] underline decoration-[#d4af37]/30 underline-offset-2 hover:decoration-[#d4af37]"
            >
              View service packages \u2192
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8962e] text-[10px] font-bold text-[#1a1a2e]">
              M4E
            </div>
            <span className="text-sm text-white/40">
              \u00a9 {new Date().getFullYear()} Marketing4Effect. All rights reserved.
            </span>
          </div>
          <div className="flex gap-6 text-sm text-white/40">
            <Link href="https://marketing4effect.vercel.app" className="hover:text-white/60">
              Main Website
            </Link>
            <Link href="/login" className="hover:text-white/60">
              Log In
            </Link>
            <Link href="/signup" className="hover:text-white/60">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-[oklch(0.13_0.01_260)] text-white">
      <NavBar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <ComparisonSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
