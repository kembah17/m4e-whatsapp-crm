"use client"

import { useAdminAuth } from "@/hooks/use-admin-auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { BanAvoidanceDashboard } from "@/components/admin/ban-avoidance-dashboard"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { useState } from "react"

export default function BanAvoidancePage() {
  const { profile, loading } = useAdminAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!profile?.account_id) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto">
        <div className="border-b p-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6">
          <BanAvoidanceDashboard accountId={profile.account_id} />
        </div>
      </main>
    </div>
  )
}
