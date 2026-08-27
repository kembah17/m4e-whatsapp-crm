"use client"

import { FlowManager } from "@/components/whatsapp-flows/flow-manager"
import { Card, CardContent } from "@/components/ui/card"
import { FileInput, Info } from "lucide-react"

export default function WhatsAppFlowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileInput className="h-6 w-6" /> WhatsApp Interactive Forms
        </h1>
        <p className="text-sm text-muted-foreground">
          Create interactive forms and surveys that run natively inside WhatsApp.
        </p>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">About WhatsApp Interactive Forms</p>
            <p className="mt-1">
              WhatsApp Interactive Forms let you build structured forms (lead capture, surveys, bookings)
              that customers fill out without leaving WhatsApp. Create from a template or
              write custom JSON. Flows must be published via Meta before sending.
            </p>
          </div>
        </CardContent>
      </Card>

      <FlowManager />
    </div>
  )
}
