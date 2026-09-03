"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Building2,
  DollarSign,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Shield,
  ShieldAlert,
  Target,
  TrendingUp,
  Brain,
  Headphones,
  User,
  Users,
  X,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SignOutDialog } from "@/components/auth/sign-out-dialog"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/accounts", label: "Accounts", icon: Building2 },
  { href: "/admin/contacts", label: "Contacts", icon: Users },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
  { href: "/admin/monitoring", label: "Monitoring", icon: Activity },
  { href: "/admin/infrastructure", label: "Infrastructure", icon: HardDrive },
  { href: "/admin/safety", label: "AI & Safety", icon: Shield },
  { href: "/admin/ban-avoidance", label: "Ban Avoidance", icon: ShieldAlert },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/insights", label: "Insights", icon: TrendingUp },
  { href: "/admin/strategy-session", label: "Strategy", icon: Target },
  { href: "/admin/learning", label: "Learning", icon: Brain },
  { href: "/admin/support", label: "Support", icon: Headphones },
]

interface AdminSidebarProps {
  open?: boolean
  onClose?: () => void
}

export function AdminSidebar({ open = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const { profile, signOut } = useAdminAuth()
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)

  // Close drawer on route change (mobile)
  useEffect(() => {
    onClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Lock body scroll + Escape key on mobile drawer
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  return (
    <>
      {/* Mobile backdrop */}
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
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-amber-500/20 bg-card",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-0 lg:w-60 lg:translate-x-0 lg:transition-none",
        )}
        aria-label="Admin navigation"
      >
        {/* Logo row */}
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-amber-500/20 px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-black">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground leading-tight">
                M4E Admin
              </span>
              <span className="text-[10px] text-amber-500/70 leading-tight">
                Platform Management
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
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin/dashboard" &&
                  pathname.startsWith(item.href))

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                      isActive
                        ? "bg-amber-500/10 text-amber-500"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="my-4 border-t border-border" />

          {/* Back to CRM link */}
          <ul className="flex flex-col gap-1">
            <li>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:py-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to CRM
              </Link>
            </li>
          </ul>
        </nav>

        {/* User section */}
        <div className="shrink-0 border-t border-amber-500/20 p-3">
          <div className="mb-2 flex items-center gap-2 px-3 text-xs text-amber-500/70">
            <Shield className="size-3.5 shrink-0" />
            <span className="truncate">Super Admin</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none">
              <Avatar className="size-8 shrink-0">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? "Avatar"}
                  />
                ) : null}
                <AvatarFallback className="bg-amber-500/10 text-sm font-medium text-amber-500">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ??
                    profile?.email?.charAt(0)?.toUpperCase() ??
                    "A"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {profile?.full_name ?? "Admin"}
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
                    href="/dashboard"
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <User className="size-4" />
                Back to CRM
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => setShowSignOutDialog(true)}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <SignOutDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={signOut}
        userName={profile?.full_name || profile?.email || undefined}
      />
    </>
  )
}
