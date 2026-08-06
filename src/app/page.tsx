import Image from 'next/image'
import Link from 'next/link'
import {
  MessageSquare,
  Megaphone,
  Receipt,
  Bot,
  Gift,
  HeadphonesIcon,
  Wifi,
  Upload,
  Rocket,
  Check,
  ArrowRight,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'M4E Business Growth Engine — Manage Customers, Sales & WhatsApp in One Place',
  description:
    'The M4E Business Growth Engine gives Nigerian businesses everything they need to manage customers, track sales, send WhatsApp messages, and grow — all in one place. Built by Marketing4Effect.',
  openGraph: {
    title: 'M4E Business Growth Engine — Manage Customers, Sales & WhatsApp in One Place',
    description:
      'The M4E Business Growth Engine gives Nigerian businesses everything they need to manage customers, track sales, send WhatsApp messages, and grow — all in one place.',
    type: 'website',
  },
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const stats = [
  { value: '28', label: 'Business Tools' },
  { value: '14', label: 'Campaign Templates' },
  { value: '5', label: 'Industry Presets' },
  { value: 'AI', label: 'Powered' },
]

const features = [
  {
    icon: MessageSquare,
    title: 'WhatsApp Inbox',
    description: 'Real-time customer messaging with smart routing and quick replies',
  },
  {
    icon: Megaphone,
    title: 'Smart Campaigns',
    description: '14 ready-made marketing campaigns tailored for Nigerian businesses',
  },
  {
    icon: Receipt,
    title: 'Debt & Invoice',
    description: 'Track credit sales, generate professional invoices, and manage payments',
  },
  {
    icon: Bot,
    title: 'AI Chatbot',
    description: '24/7 automated customer responses that understand Pidgin English',
  },
  {
    icon: Gift,
    title: 'Loyalty & Referrals',
    description: 'Reward repeat customers and turn them into brand ambassadors',
  },
  {
    icon: HeadphonesIcon,
    title: 'Support Desk',
    description: 'Ticket system with SLA tracking to keep customers happy',
  },
]

const steps = [
  {
    number: '01',
    icon: Wifi,
    title: 'Connect WhatsApp',
    description: 'Link your business number in minutes with our guided setup',
  },
  {
    number: '02',
    icon: Upload,
    title: 'Import Customers',
    description: 'CSV, photos, WhatsApp contacts, or email — 7 ways to import',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Start Growing',
    description: 'Launch campaigns, track sales, and delight customers',
  },
]

const tiers = [
  {
    name: 'Starter',
    price: '50,000',
    period: '/mo',
    description: 'Perfect for small businesses getting started',
    features: [
      'Up to 500 contacts',
      '5 campaign templates',
      'WhatsApp inbox',
      'Basic invoicing',
      'Email support',
    ],
    highlighted: false,
    cta: 'Start 14-Day Trial',
  },
  {
    name: 'Professional',
    price: '120,000',
    period: '/mo',
    description: 'For growing businesses that need more power',
    features: [
      'Up to 2,000 contacts',
      'All 14 campaign templates',
      'AI chatbot included',
      'Debt book & invoicing',
      'Loyalty programme',
      'Priority support',
    ],
    highlighted: true,
    cta: 'Get Started',
  },
  {
    name: 'Business',
    price: '250,000',
    period: '/mo',
    description: 'Unlimited power for established businesses',
    features: [
      'Unlimited contacts',
      'All features included',
      'Advanced AI chatbot',
      'Inventory tracking',
      'Custom automations',
      'Dedicated account manager',
    ],
    highlighted: false,
    cta: 'Contact Sales',
  },
]

const advantages = [
  'Only Nigerian CRM with debt book and invoicing',
  'AI chatbot that understands Pidgin English',
  '7 ways to import customers (including WhatsApp)',
  'Built-in inventory tracking',
  'Customer trust scores',
  '5-stage automated growth funnel',
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#1B1F3B]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-m4e-200.png"
              alt="M4E"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="font-heading text-lg font-semibold text-white">
              M4E Growth Engine
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-[#1B1F3B] transition-colors hover:bg-[#C9A84C]/90"
            >
              Start 14-Day Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#1B1F3B] pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#C9A84C]/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-[#C9A84C]/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto mb-6 flex justify-center">
            <Image
              src="/logo-m4e-200.png"
              alt="M4E Business Growth Engine"
              width={80}
              height={80}
              className="rounded-full"
              priority
            />
          </div>

          <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            The M4E{' '}
            <span className="text-[#C9A84C]">Business Growth Engine</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
            Everything you need to manage your customers, track your sales,
            send WhatsApp messages, and grow your business — all in one place.
            No more juggling different apps and spreadsheets.
          </p>
          <p className="mx-auto mt-3 text-base text-[#C9A84C]">
            Grow Your Business with WhatsApp
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-8 py-3.5 text-base font-semibold text-[#1B1F3B] shadow-lg shadow-[#C9A84C]/20 transition-all hover:bg-[#C9A84C]/90 hover:shadow-xl hover:shadow-[#C9A84C]/30"
            >
              Start 14-Day Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-3.5 text-base font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <section className="border-b border-[#1B1F3B]/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-heading text-3xl font-bold text-[#1B1F3B] sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-[#1B1F3B]/60">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────── */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold text-[#1B1F3B] sm:text-4xl">
              Everything You Need to{' '}
              <span className="text-[#C9A84C]">Run and Grow</span> Your Business
            </h2>
            <p className="mt-4 text-lg text-[#1B1F3B]/60">
              28 powerful tools designed specifically for Nigerian businesses
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-[#C9A84C]/30 hover:shadow-md hover:shadow-[#C9A84C]/5"
              >
                <div className="mb-4 inline-flex rounded-xl bg-[#1B1F3B]/5 p-3 transition-colors group-hover:bg-[#C9A84C]/10">
                  <feature.icon className="h-6 w-6 text-[#1B1F3B] transition-colors group-hover:text-[#C9A84C]" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-[#1B1F3B]">
                  {feature.title}
                </h3>
                <p className="mt-2 leading-relaxed text-[#1B1F3B]/60">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold text-[#1B1F3B] sm:text-4xl">
              Up and Running in{' '}
              <span className="text-[#C9A84C]">3 Simple Steps</span>
            </h2>
            <p className="mt-4 text-lg text-[#1B1F3B]/60">
              Get started in minutes, not weeks
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1B1F3B]">
                  <step.icon className="h-7 w-7 text-[#C9A84C]" />
                </div>
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 font-heading text-6xl font-bold text-[#C9A84C]/10">
                  {step.number}
                </span>
                <h3 className="font-heading text-xl font-semibold text-[#1B1F3B]">
                  {step.title}
                </h3>
                <p className="mt-2 leading-relaxed text-[#1B1F3B]/60">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold text-[#1B1F3B] sm:text-4xl">
              Simple, Transparent{' '}
              <span className="text-[#C9A84C]">Pricing</span>
            </h2>
            <p className="mt-4 text-lg text-[#1B1F3B]/60">
              Start with a 14-day trial. Upgrade as you grow.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-8 transition-shadow ${
                  tier.highlighted
                    ? 'border-[#C9A84C] bg-white shadow-xl shadow-[#C9A84C]/10'
                    : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#C9A84C] px-4 py-1 text-xs font-semibold text-[#1B1F3B]">
                    Most Popular
                  </span>
                )}

                <h3 className="font-heading text-xl font-semibold text-[#1B1F3B]">
                  {tier.name}
                </h3>
                <p className="mt-1 text-sm text-[#1B1F3B]/60">{tier.description}</p>

                <div className="mt-6 flex items-baseline">
                  <span className="text-sm font-medium text-[#1B1F3B]/60">₦</span>
                  <span className="font-heading text-4xl font-bold text-[#1B1F3B]">
                    {tier.price}
                  </span>
                  <span className="ml-1 text-sm text-[#1B1F3B]/60">{tier.period}</span>
                </div>

                <ul className="mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A84C]" />
                      <span className="text-sm text-[#1B1F3B]/70">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                    tier.highlighted
                      ? 'bg-[#C9A84C] text-[#1B1F3B] shadow-lg shadow-[#C9A84C]/20 hover:bg-[#C9A84C]/90'
                      : 'bg-[#1B1F3B] text-white hover:bg-[#1B1F3B]/90'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Competitive Advantages ──────────────────────────────── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-heading text-3xl font-bold text-[#1B1F3B] sm:text-4xl">
              Why Nigerian Businesses{' '}
              <span className="text-[#C9A84C]">Choose M4E</span>
            </h2>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {advantages.map((advantage) => (
                <div
                  key={advantage}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/10">
                    <Check className="h-3 w-3 text-[#C9A84C]" />
                  </div>
                  <span className="text-sm font-medium text-[#1B1F3B]/80">
                    {advantage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#1B1F3B] py-20 sm:py-28">
        <div className="pointer-events-none absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full bg-[#C9A84C]/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-[#C9A84C]/5 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Ready to Grow Your Business?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Join Nigerian businesses using M4E to manage customers, track sales,
            and grow revenue
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-8 py-3.5 text-base font-semibold text-[#1B1F3B] shadow-lg shadow-[#C9A84C]/20 transition-all hover:bg-[#C9A84C]/90 hover:shadow-xl hover:shadow-[#C9A84C]/30"
          >
            Start 14-Day Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-m4e-200.png"
                alt="M4E"
                width={36}
                height={36}
                className="rounded-full"
              />
              <span className="font-heading text-base font-semibold text-[#1B1F3B]">
                M4E Growth Engine
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6">
              <Link
                href="/login"
                className="text-sm text-[#1B1F3B]/60 transition-colors hover:text-[#1B1F3B]"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm text-[#1B1F3B]/60 transition-colors hover:text-[#1B1F3B]"
              >
                Sign Up
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-[#1B1F3B]/60 transition-colors hover:text-[#1B1F3B]"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-[#1B1F3B]/60 transition-colors hover:text-[#1B1F3B]"
              >
                Terms
              </Link>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-8 text-center">
            <p className="text-sm text-[#1B1F3B]/50">
              © 2026 Marketing4Effect. All rights reserved.
            </p>
            <p className="mt-1 text-xs text-[#1B1F3B]/40">
              Powered by Marketing Effect Limited
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
