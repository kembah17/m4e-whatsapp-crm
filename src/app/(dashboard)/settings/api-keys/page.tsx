"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ApiKeyManager } from "@/components/settings/api-key-manager"

export default function ApiKeysPage() {
  const [accountId, setAccountId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
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

  if (!accountId || !userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">API Keys</h1>
      <ApiKeyManager accountId={accountId} userId={userId} />
    </div>
  )
}
