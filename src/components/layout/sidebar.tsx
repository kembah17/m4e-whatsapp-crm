"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import {
  Crown,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Package,
  MessageSquare,
  Radio,
  Rocket,
  Settings,
  Shield,
  User,
  UserCog,
  Users,
  UsersRound,
  ShoppingCart,
  Workflow,
  X,
  Zap,
  Bot,
  HelpCircle,
  QrCode,
  FileInput,
  Filter,
  Megaphone,
  Brain,
  Target,
  Sparkles,
  FileText,
  Warehouse,
  BookOpen,
  CalendarClock,
  CreditCard,
  UserPlus,
  Award,
  Headphones,
  Lightbulb,
  ChevronDown,
  Database,
  DollarSign,
  TrendingUp,
  Cpu,
  Activity,
  HeartPulse,
  Compass,
  MonitorCheck,
} from "lucide-react";
import type { AccountRole } from "@/lib/auth/roles";

// Per-role chip metadata used in the sidebar's account strip + the
// Members tab roster.
const ROLE_CHIP: Record<
  AccountRole,
  { icon: typeof Crown; label: string; className: string }
> = {
  owner: {
    icon: Crown,
    label: "Owner",
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  admin: {
    icon: Shield,
    label: "Admin",
    className:
      "border-primary/40 bg-primary/10 text-primary",
  },
  agent: {
    icon: UserCog,
    label: "Agent",
    className:
      "border-border bg-muted text-foreground",
  },
  viewer: {
    icon: User,
    label: "Viewer",
    className:
      "border-border bg-card text-muted-foreground",
  },
};
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  beta?: boolean;
  /** When true, only visible to super-admin users (M4E staff). */
  superAdminOnly?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
}

// ── Core items (always visible, no group header) ──────────
const coreItems: NavItem[] = [
  { href: "/getting-started", label: "Getting Started", icon: Compass, superAdminOnly: true },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/my-package", label: "Package Manager", icon: Package, superAdminOnly: true },
];

// ── Grouped navigation ────────────────────────────────────
const navGroups: NavGroup[] = [
  {
    id: "sales",
    label: "Sales & Pipeline",
    icon: TrendingUp,
    items: [
      { href: "/pipelines", label: "Pipelines", icon: GitBranch },
      { href: "/funnel", label: "Funnel", icon: Filter },
      { href: "/ecommerce", label: "E-Commerce", icon: ShoppingCart },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    items: [
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/installments", label: "Installments", icon: CalendarClock },
      { href: "/debt-book", label: "Debt Book", icon: BookOpen },
      { href: "/billing", label: "Billing", icon: CreditCard },
    ],
  },
  {
    id: "products",
    label: "Products & Inventory",
    icon: Package,
    items: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Warehouse },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    items: [
      { href: "/broadcasts", label: "Broadcasts", icon: Radio },
      { href: "/campaigns", label: "Campaigns", icon: Rocket },
      { href: "/ad-leads", label: "Ad Leads", icon: Megaphone, beta: true },
      { href: "/segments", label: "Segments", icon: Target, beta: true },
    ],
  },
  {
    id: "automation",
    label: "Automation & AI",
    icon: Cpu,
    items: [
      { href: "/automations", label: "Automations", icon: Zap },
      { href: "/flows", label: "Workflow Builder", icon: Workflow, beta: true },
      { href: "/whatsapp-flows", label: "WA Forms", icon: FileInput, beta: true },
      { href: "/ai-playground", label: "Ask AI", icon: Sparkles },
      { href: "/insights", label: "AI Insights", icon: Lightbulb },
      { href: "/ai-chatbot", label: "AI Chatbot", icon: Bot, beta: true },
    ],
  },
  {
    id: "growth",
    label: "Growth & Retention",
    icon: Award,
    items: [
      { href: "/referrals", label: "Referrals", icon: UserPlus },
      { href: "/loyalty", label: "Loyalty", icon: Award },
      { href: "/qr-codes", label: "QR Codes", icon: QrCode },
      { href: "/sentiment", label: "Sentiment", icon: Brain, beta: true },
      { href: "/success-metrics", label: "Success Metrics", icon: HeartPulse, superAdminOnly: true },
    ],
  },
  {
    id: "data",
    label: "Data & Support",
    icon: Database,
    items: [
      { href: "/data-center", label: "Data Center", icon: Database },
      { href: "/support", label: "Support Desk", icon: Headphones },
      { href: "/subscribers", label: "Subscribers", icon: MonitorCheck, superAdminOnly: true },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { href: "/help", label: "Help & Guides", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

// ── Collapsible group component ───────────────────────────
function NavGroupSection({
  group,
  pathname,
  expanded,
  onToggle,
}: {
  group: NavGroup;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasActiveChild = group.items.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
          hasActiveChild
            ? "text-primary"
            : "text-muted-foreground/70 hover:text-muted-foreground",
        )}
      >
        <group.icon className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            expanded ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      <ul
        className={cn(
          "flex flex-col gap-0.5 overflow-hidden transition-all duration-200",
          expanded ? "mt-0.5 max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        {group.items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 pl-8 text-sm font-medium transition-colors lg:py-1.5",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.beta && (
                  <span
                    aria-label="Beta feature"
                    className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300"
                  >
                    Beta
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { profile, profileLoading, account, accountRole, signOut } = useAuth();
  const totalUnread = useTotalUnread();
  const isSuperAdmin = profile?.is_super_admin ?? false;

  // Track which groups are expanded. Auto-expand the group containing
  // the active page so users always see where they are.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of navGroups) {
      const hasActive = group.items.some(
        (item) => pathname === item.href || pathname.startsWith(item.href),
      );
      initial[group.id] = hasActive;
    }
    return initial;
  });

  // When route changes, auto-expand the group containing the new page
  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const group of navGroups) {
        if (
          group.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href),
          )
        ) {
          next[group.id] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const showAccountStrip =
    !profileLoading &&
    !!account?.name &&
    account.name !== profile?.full_name;

  // Close the drawer when route changes
  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll and allow Escape to close while the drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-border bg-card",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-0 lg:w-60 lg:translate-x-0 lg:transition-none",
        )}
        aria-label="Primary"
      >
        {/* Logo row */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground leading-tight">
                Business Growth Engine
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                Your growth partner
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {/* Core items — always visible */}
          <ul className="flex flex-col gap-0.5">
            {coreItems.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              const showUnreadDot =
                item.href === "/inbox" && totalUnread > 0 && !isActive;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {showUnreadDot && (
                      <span
                        aria-label={`${totalUnread} unread conversation${totalUnread === 1 ? "" : "s"}`}
                        className="relative flex h-2 w-2"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Grouped sections */}
          <ul className="mt-3 flex flex-col gap-2">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter(
                (item) => !item.superAdminOnly || isSuperAdmin
              );
              if (visibleItems.length === 0) return null;
              return (
                <NavGroupSection
                  key={group.id}
                  group={{ ...group, items: visibleItems }}
                  pathname={pathname}
                  expanded={expandedGroups[group.id] ?? false}
                  onToggle={() => toggleGroup(group.id)}
                />
              );
            })}
          </ul>

          <div className="my-3 border-t border-border" />

          <ul className="flex flex-col gap-0.5">
            {bottomNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Super Admin panel link */}
          {profile?.is_super_admin && (
            <>
              <div className="my-3 border-t border-amber-500/20" />
              <Link
                href="/admin/dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                  pathname.startsWith("/admin")
                    ? "bg-amber-500/15 text-amber-300"
                    : "text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-300",
                )}
              >
                <Shield className="h-4 w-4" />
                <span className="flex-1">Admin Panel</span>
                <span
                  className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300"
                >
                  Super
                </span>
              </Link>
            </>
          )}
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-border p-3">
          {showAccountStrip && account?.name ? (
            <div className="mb-2 flex items-center gap-2 px-3 text-xs text-muted-foreground">
              <UsersRound className="size-3.5 shrink-0" />
              <span className="truncate" title={account.name}>
                {account.name}
              </span>
              {accountRole ? (
                (() => {
                  const meta = ROLE_CHIP[accountRole];
                  const Icon = meta.icon;
                  return (
                    <span
                      className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.className}`}
                    >
                      <Icon className="size-3" />
                      {meta.label}
                    </span>
                  );
                })()
              ) : null}
            </div>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none data-popup-open:bg-muted/60">
              <Avatar className="size-8 shrink-0">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ??
                    profile?.email?.charAt(0)?.toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile?.full_name ?? "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.email ?? ""}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={6}
              className="min-w-56 bg-popover text-popover-foreground ring-border"
            >
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <User className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
