"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AdminProfile {
  user_id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  is_super_admin: boolean
}

interface AdminAuthContextValue {
  user: User | null
  profile: AdminProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (cancelled) return

        if (!u) {
          router.push("/login")
          return
        }

        setUser(u)

        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url, is_super_admin")
          .eq("user_id", u.id)
          .maybeSingle()

        if (cancelled) return

        if (!p?.is_super_admin) {
          router.push("/dashboard")
          return
        }

        setProfile(p)
      } catch (err) {
        console.error("[admin-auth] load failed:", err)
        router.push("/dashboard")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [supabase, router])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }, [supabase, router])

  return (
    <AdminAuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
