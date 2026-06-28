"use client"

import { QRGenerator } from "@/components/qr/qr-generator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Lightbulb } from "lucide-react"

export default function QRCodesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <QrCode className="h-6 w-6" /> QR Codes
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate WhatsApp QR codes for your business. Customers scan to start a conversation.
        </p>
      </div>

      <QRGenerator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4" /> Usage Ideas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>• Print on business cards and flyers</li>
            <li>• Add to product packaging</li>
            <li>• Display at your store or office</li>
            <li>• Include in email signatures</li>
            <li>• Use on social media posts</li>
            <li>• Add to invoices and receipts</li>
            <li>• Place on event banners</li>
            <li>• Embed on your website</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
