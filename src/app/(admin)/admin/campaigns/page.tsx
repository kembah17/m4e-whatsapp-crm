"use client"

import { AdminCampaignTable } from "@/components/admin/admin-campaign-table"

export default function AdminCampaignsPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Campaign Monitor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track all campaigns across every customer account on the platform.
        </p>
      </div>

      {/* Campaign table with built-in filters */}
      <AdminCampaignTable />
    </div>
  )
}
