"use client"

import { CTWADashboard } from "@/components/ctwa/ctwa-dashboard"
import { Card, CardContent } from "@/components/ui/card"
import { Megaphone, Info } from "lucide-react"

export default function AdLeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Megaphone className="h-6 w-6" /> Ad Leads
        </h1>
        <p className="text-sm text-muted-foreground">
          Track leads from Click-to-WhatsApp ads and organic posts.
        </p>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How it works</p>
            <p className="mt-1">
              When someone clicks a Click-to-WhatsApp ad on Facebook or Instagram,
              Meta sends referral data with their first message. We automatically
              capture the ad source, headline, and creative so you can track which
              ads drive the most conversations.
            </p>
          </div>
        </CardContent>
      </Card>

      <CTWADashboard />
    </div>
  )
}
