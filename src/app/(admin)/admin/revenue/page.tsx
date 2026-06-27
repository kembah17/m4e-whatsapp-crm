"use client"

import { AdminRevenueOverview } from "@/components/admin/admin-revenue-overview"

export default function AdminRevenuePage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Revenue &amp; Billing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscription tiers, projected MRR, and billing overview.
        </p>
      </div>

      {/* Revenue overview with tier management */}
      <AdminRevenueOverview />
    </div>
  )
}
