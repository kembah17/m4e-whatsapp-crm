"use client"

import { SentimentDashboard } from "@/components/sentiment/sentiment-dashboard"
import { Card, CardContent } from "@/components/ui/card"
import { Brain, Info } from "lucide-react"

export default function SentimentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Brain className="h-6 w-6" /> Sentiment Analysis
        </h1>
        <p className="text-sm text-muted-foreground">
          AI-powered analysis of customer message sentiment with Nigerian Pidgin support.
        </p>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How it works</p>
            <p className="mt-1">
              Every incoming message is automatically analyzed for sentiment using AI.
              Messages are classified as positive, neutral, negative, or urgent.
              Negative and urgent messages are flagged for immediate attention.
              The system understands both English and Nigerian Pidgin.
            </p>
          </div>
        </CardContent>
      </Card>

      <SentimentDashboard />
    </div>
  )
}
