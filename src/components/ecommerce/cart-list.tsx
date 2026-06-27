"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/currency"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Cart {
  id: string
  external_cart_id: string | null
  customer_email: string | null
  customer_phone: string | null
  line_items: Array<{ title: string; quantity: number; price: number }>
  total_amount: number | null
  currency: string
  cart_url: string | null
  status: string
  abandoned_at: string | null
  recovered_at: string | null
  created_at: string
  contact?: { id: string; name: string | null; phone: string | null; email: string | null } | null
}

const CART_STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border-blue-200",
  abandoned: "bg-red-50 text-red-700 border-red-200",
  recovered: "bg-green-50 text-green-700 border-green-200",
  completed: "bg-gray-50 text-gray-700 border-gray-200",
}

function timeSince(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h ago`
  if (hours > 0) return `${hours}h ago`
  const minutes = Math.floor(ms / (1000 * 60))
  return `${minutes}m ago`
}

export function CartList() {
  const [carts, setCarts] = useState<Cart[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 25

  const fetchCarts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/ecommerce/carts?${params}`)
      if (!res.ok) throw new Error("Failed to fetch carts")
      const data = await res.json()
      setCarts(data.carts ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load carts")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchCarts()
  }, [fetchCarts])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? ''); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Carts</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
            <SelectItem value="recovered">Recovered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : carts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium">No carts found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Cart data will appear here once your store starts syncing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Abandoned Since</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carts.map((cart) => (
                  <TableRow key={cart.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {cart.contact?.name ?? cart.customer_email ?? cart.customer_phone ?? "Unknown"}
                        </p>
                        {cart.contact?.phone && (
                          <p className="text-xs text-muted-foreground">{cart.contact.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {Array.isArray(cart.line_items) && cart.line_items.length > 0
                          ? cart.line_items.map((li) => li.title).join(", ")
                          : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {cart.total_amount != null
                        ? formatCurrency(cart.total_amount)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("capitalize", CART_STATUS_COLORS[cart.status] ?? "")}
                      >
                        {cart.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cart.abandoned_at ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {timeSince(cart.abandoned_at)}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {cart.cart_url && cart.status === "abandoned" && (
                        <a
                          href={cart.cart_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
