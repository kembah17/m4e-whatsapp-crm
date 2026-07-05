"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AIPlayground } from "@/components/ai/ai-playground"

export default function AIPlaygroundPage() {
  const [accountId, setAccountId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("user_id", user.id)
        .single()

      if (profile?.account_id) {
        setAccountId(profile.account_id)
      }
    }
    loadAccount()
  }, [supabase])

  if (!accountId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">AI Playground</h1>
      <AIPlayground accountId={accountId} />
    </div>
  )
}
