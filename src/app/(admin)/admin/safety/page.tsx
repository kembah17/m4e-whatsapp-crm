"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Brain, Shield } from "lucide-react"
import { AIUsageDashboard } from "@/components/admin/ai-usage-dashboard"
import { CircuitBreakerPanel } from "@/components/admin/circuit-breaker-panel"

type SafetyTab = "ai-usage" | "circuit-breaker"

const TABS: { key: SafetyTab; label: string; icon: typeof Brain }[] = [
  { key: "ai-usage", label: "AI Usage", icon: Brain },
  { key: "circuit-breaker", label: "Safety", icon: Shield },
]

export default function AdminSafetyPage() {
  const [activeTab, setActiveTab] = useState<SafetyTab>("ai-usage")

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI & Safety</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor AI costs, usage patterns, and message safety controls.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-card text-amber-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "ai-usage" && <AIUsageDashboard />}
      {activeTab === "circuit-breaker" && <CircuitBreakerPanel />}
    </div>
  )
}
