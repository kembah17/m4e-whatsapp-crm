"use client"


import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { LogOut, Menu, Shield, User } from "lucide-react"
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
import { ModeToggle } from "@/components/layout/mode-toggle"
import { SignOutDialog } from "@/components/auth/sign-out-dialog"

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Platform Overview",
  "/admin/accounts": "Customer Accounts",
  "/admin/analytics": "Platform Analytics",
}

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith("/admin/accounts/")) return "Account Detail"
  const match = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path),
  )
  return match ? match[1] : "Admin"
}

interface AdminHeaderProps {
  onOpenSidebar?: () => void
}

export function AdminHeader({ onOpenSidebar }: AdminHeaderProps) {
  const pathname = usePathname()
  const { profile, signOut } = useAdminAuth()
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const title = getPageTitle(pathname)

  const initial =
    profile?.full_name?.charAt(0)?.toUpperCase() ??
    profile?.email?.charAt(0)?.toUpperCase() ??
    "A"

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-amber-500/20 bg-background px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-500" />
          <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ModeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/70 focus:bg-muted/70 focus:outline-none sm:gap-3 sm:pl-1 sm:pr-3"
            aria-label="Open account menu"
          >
            <Avatar className="size-8">
              {profile?.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "Avatar"}
                />
              ) : null}
              <AvatarFallback className="bg-amber-500/10 text-sm font-medium text-amber-500">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium text-foreground sm:inline">
              {profile?.full_name ?? "Admin"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="min-w-56 bg-popover text-popover-foreground ring-border"
          >
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium text-foreground">
                {profile?.full_name ?? "Admin"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile?.email ?? ""}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-amber-500">
                Super Admin
              </p>
            </div>
            <DropdownMenuSeparator className="bg-border" />
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

      <SignOutDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onConfirm={signOut}
        userName={profile?.full_name || profile?.email || undefined}
      />
    </header>
  )
}
