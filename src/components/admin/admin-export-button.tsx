"use client"

import { Download } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminExportButtonProps {
  data: Record<string, unknown>[]
  filename: string
  className?: string
}

export function AdminExportButton({
  data,
  filename,
  className,
}: AdminExportButtonProps) {
  const handleExport = () => {
    if (!data.length) return

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h]
            const str = val === null || val === undefined ? "" : String(val)
            // Escape quotes and wrap in quotes if contains comma/quote/newline
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          })
          .join(","),
      ),
    ]

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!data.length}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </button>
  )
}
