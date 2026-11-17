"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  History, RotateCcw, ChevronDown, ChevronRight,
  Clock, ArrowRight, Plus, Minus, Pencil,
} from 'lucide-react'
import type { ConfigVersion, VersionDiff } from '@/types/config-versions'

interface VersionHistoryProps {
  entityType: 'package_config' | 'campaign_template'
  entityId: string
  entityName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore?: () => void
}

// Compute diffs client-side for display
function computeClientDiff(
  oldSnap: Record<string, unknown>,
  newSnap: Record<string, unknown>
): VersionDiff[] {
  const IGNORE = ['id', 'created_at', 'updated_at']
  const diffs: VersionDiff[] = []
  const allKeys = new Set([...Object.keys(oldSnap), ...Object.keys(newSnap)])

  for (const key of allKeys) {
    if (IGNORE.includes(key)) continue
    const oldVal = oldSnap[key]
    const newVal = newSnap[key]

    if (!(key in oldSnap)) {
      diffs.push({ field: key, old_value: undefined, new_value: newVal, change_type: 'added' })
    } else if (!(key in newSnap)) {
      diffs.push({ field: key, old_value: oldVal, new_value: undefined, change_type: 'removed' })
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ field: key, old_value: oldVal, new_value: newVal, change_type: 'modified' })
    }
  }
  return diffs
}

function formatValue(val: unknown): string {
  if (val === undefined || val === null) return '(empty)'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'number') return val.toLocaleString()
  if (typeof val === 'string') {
    if (val.length > 80) return val.slice(0, 77) + '...'
    return val
  }
  if (Array.isArray(val)) return `[${val.length} items]`
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 80) + '...'
  return String(val)
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function DiffBadge({ type }: { type: 'added' | 'removed' | 'modified' }) {
  const config = {
    added: { label: 'Added', variant: 'default' as const, icon: Plus, className: 'bg-green-600' },
    removed: { label: 'Removed', variant: 'destructive' as const, icon: Minus, className: '' },
    modified: { label: 'Changed', variant: 'secondary' as const, icon: Pencil, className: 'bg-blue-600 text-white' },
  }
  const c = config[type]
  const Icon = c.icon
  return (
    <Badge variant={c.variant} className={`text-xs gap-1 ${c.className}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  )
}

function DiffRow({ diff }: { diff: VersionDiff }) {
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-md bg-muted/50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{formatFieldName(diff.field)}</span>
          <DiffBadge type={diff.change_type} />
        </div>
        {diff.change_type === 'modified' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="line-through text-red-400 max-w-[40%] truncate">
              {formatValue(diff.old_value)}
            </span>
            <ArrowRight className="h-3 w-3 flex-shrink-0" />
            <span className="text-green-400 max-w-[40%] truncate">
              {formatValue(diff.new_value)}
            </span>
          </div>
        )}
        {diff.change_type === 'added' && (
          <div className="text-xs text-green-400">{formatValue(diff.new_value)}</div>
        )}
        {diff.change_type === 'removed' && (
          <div className="text-xs text-red-400 line-through">{formatValue(diff.old_value)}</div>
        )}
      </div>
    </div>
  )
}

function VersionEntry({
  version,
  nextVersion,
  onRestore,
  isLatest,
}: {
  version: ConfigVersion
  nextVersion?: ConfigVersion
  onRestore: (v: ConfigVersion) => void
  isLatest: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const diffs = nextVersion
    ? computeClientDiff(
        version.snapshot as Record<string, unknown>,
        nextVersion.snapshot as Record<string, unknown>
      )
    : []

  const date = new Date(version.created_at)
  const timeAgo = getTimeAgo(date)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">v{version.version_number}</span>
            {isLatest && (
              <Badge variant="outline" className="text-xs">Latest Saved</Badge>
            )}
            {version.change_summary === 'Deleted' && (
              <Badge variant="destructive" className="text-xs">Deleted</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {version.change_summary && version.change_summary !== 'No changes detected'
              ? version.change_summary
              : `Snapshot saved`}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3">
          {diffs.length > 0 ? (
            <div className="space-y-2 mt-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Changes from v{version.version_number} → v{nextVersion!.version_number}
              </div>
              {diffs.map((diff, i) => (
                <DiffRow key={i} diff={diff} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-3">
              {isLatest ? 'This is the most recent saved version.' : 'No field differences detected.'}
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRestore(version)
              }}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore to v{version.version_number}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function VersionHistory({
  entityType,
  entityId,
  entityName,
  open,
  onOpenChange,
  onRestore,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<ConfigVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<ConfigVersion | null>(null)
  const [restoring, setRestoring] = useState(false)

  const fetchVersions = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/config-versions?entity_type=${entityType}&entity_id=${entityId}`
      )
      const data = await res.json()
      setVersions(data.versions ?? [])
    } catch (err) {
      console.error('Failed to fetch versions:', err)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    if (open) fetchVersions()
  }, [open, fetchVersions])

  const handleRestore = async () => {
    if (!restoreTarget) return
    setRestoring(true)
    try {
      const res = await fetch('/api/admin/config-versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_id: restoreTarget.id }),
      })
      if (res.ok) {
        setRestoreTarget(null)
        onRestore?.()
        onOpenChange(false)
      }
    } catch (err) {
      console.error('Failed to restore version:', err)
    } finally {
      setRestoring(false)
    }
  }

  const typeLabel = entityType === 'package_config' ? 'Package' : 'Campaign Template'

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </SheetTitle>
            <SheetDescription>
              {typeLabel}: <strong>{entityName}</strong>
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No version history yet</p>
                <p className="text-sm mt-1">
                  Versions are saved automatically when you edit this {typeLabel.toLowerCase()}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {versions.length} version{versions.length !== 1 ? 's' : ''} saved
                </div>
                {versions.map((version, idx) => (
                  <VersionEntry
                    key={version.id}
                    version={version}
                    nextVersion={idx > 0 ? versions[idx - 1] : undefined}
                    onRestore={setRestoreTarget}
                    isLatest={idx === 0}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!restoreTarget} onOpenChange={() => setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore to Version {restoreTarget?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the current {typeLabel.toLowerCase()} configuration with the
              snapshot from version {restoreTarget?.version_number}. A new version will be saved
              before restoring so you can undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoring}>
              {restoring ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Trigger button for use in editors
export function VersionHistoryButton({
  entityType,
  entityId,
  entityName,
  onRestore,
}: Omit<VersionHistoryProps, 'open' | 'onOpenChange'>) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-muted-foreground"
      >
        <History className="h-4 w-4" />
        History
      </Button>
      <VersionHistory
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        open={open}
        onOpenChange={setOpen}
        onRestore={onRestore}
      />
    </>
  )
}
