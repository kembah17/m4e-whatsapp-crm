"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { PlatformAccountRow } from "@/types/admin"
import { cn } from "@/lib/utils"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"

const PAGE_SIZE = 20

type SortField = "created_at" | "contact_count" | "conversation_count" | "account_name"
type SortDir = "asc" | "desc"
type FilterStatus = "all" | "connected" | "not_connected"

export default function AdminAccountsPage() {
  const router = useRouter()

  const [accounts, setAccounts] = useState<PlatformAccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Filters
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [sortBy, setSortBy] = useState<SortField>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [page, setPage] = useState(0)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    const db = createClient()

    const { data, error } = await db.rpc("get_platform_accounts_overview", {
      p_sort_by: sortBy,
      p_sort_dir: sortDir,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    })

    if (error) {
      console.error("[admin] accounts load failed:", error)
      setLoading(false)
      return
    }

    let rows = (data as unknown as PlatformAccountRow[]) ?? []

    // Client-side filtering (search + status)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.account_name?.toLowerCase().includes(q) ||
          r.owner_name?.toLowerCase().includes(q) ||
          r.owner_email?.toLowerCase().includes(q),
      )
    }

    if (filterStatus === "connected") {
      rows = rows.filter((r) => r.whatsapp_connected)
    } else if (filterStatus === "not_connected") {
      rows = rows.filter((r) => !r.whatsapp_connected)
    }

    setAccounts(rows)
    setTotal(rows.length)
    setLoading(false)
  }, [sortBy, sortDir, page, debouncedSearch, filterStatus])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Accounts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage and monitor all registered business accounts.
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search accounts, owners, emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="flex rounded-lg border border-border">
            {(["all", "connected", "not_connected"] as FilterStatus[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setFilterStatus(status)
                    setPage(0)
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
                    filterStatus === status
                      ? "bg-amber-500/10 text-amber-500"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {status === "all"
                    ? "All"
                    : status === "connected"
                      ? "Connected"
                      : "Not Connected"}
                </button>
              ),
            )}
          </div>

          {/* Sort */}
          <select
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split(":") as [SortField, SortDir]
              setSortBy(field)
              setSortDir(dir)
              setPage(0)
            }}
            className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:border-amber-500/50 focus:outline-none"
          >
            <option value="created_at:desc">Newest first</option>
            <option value="created_at:asc">Oldest first</option>
            <option value="contact_count:desc">Most contacts</option>
            <option value="conversation_count:desc">Most conversations</option>
            <option value="account_name:asc">Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="p-5">
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              No accounts found
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {search
                ? "Try adjusting your search terms"
                : "No accounts have been created yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Account
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Owner
                  </th>
                  <th className="hidden px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                    Contacts
                  </th>
                  <th className="hidden px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                    Conversations
                  </th>
                  <th className="hidden px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">
                    Broadcasts
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    WhatsApp
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Signed Up
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((account) => (
                  <tr
                    key={account.account_id}
                    className="transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() =>
                      router.push(`/admin/accounts/${account.account_id}`)
                    }
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {account.account_name || "Unnamed"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-foreground">
                        {account.owner_name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {account.owner_email || ""}
                      </p>
                    </td>
                    <td className="hidden px-5 py-3 text-center text-sm text-foreground md:table-cell">
                      {account.contact_count.toLocaleString()}
                    </td>
                    <td className="hidden px-5 py-3 text-center text-sm text-foreground md:table-cell">
                      {account.conversation_count.toLocaleString()}
                    </td>
                    <td className="hidden px-5 py-3 text-center text-sm text-foreground lg:table-cell">
                      {account.broadcast_count.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {account.whatsapp_connected ? (
                        <Wifi className="mx-auto h-4 w-4 text-emerald-500" />
                      ) : (
                        <WifiOff className="mx-auto h-4 w-4 text-muted-foreground/50" />
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(account.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/accounts/${account.account_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-amber-500 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && accounts.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–
              {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
