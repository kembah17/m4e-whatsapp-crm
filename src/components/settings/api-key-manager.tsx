"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
} from "lucide-react"
import { toast } from "sonner"

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  permissions: string[]
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
}

export function ApiKeyManager({ accountId, userId }: { accountId: string; userId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["read"])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/settings/api-keys?accountId=${accountId}`)
      const data = await res.json()
      if (data.keys) setKeys(data.keys)
    } catch {
      toast.error("Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }, [accountId])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  const createKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Key name is required")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          userId,
          name: newKeyName.trim(),
          permissions: newKeyPermissions,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setRevealedKey(data.rawKey)
      setNewKeyName("")
      setShowCreateForm(false)
      toast.success("API key created! Copy it now — it won't be shown again.")
      loadKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key")
    } finally {
      setCreating(false)
    }
  }

  const revokeKey = async (keyId: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, accountId }),
      })
      if (!res.ok) throw new Error("Failed to revoke")
      toast.success("API key revoked")
      loadKeys()
    } catch {
      toast.error("Failed to revoke API key")
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success("Copied to clipboard")
  }

  const togglePermission = (perm: string) => {
    setNewKeyPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  return (
    <div className="space-y-6">
      {/* Revealed key banner */}
      {revealedKey && (
        <Card className="border-yellow-500 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-500">Save your API key now!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This key will only be shown once. Copy it and store it securely.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <code className="flex-1 bg-background rounded px-3 py-2 text-sm font-mono break-all">
                    {revealedKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(revealedKey, "new")}
                  >
                    {copiedId === "new" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setRevealedKey(null)}
                >
                  I've saved it — dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage API keys for external integrations
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Key
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New API Key</CardTitle>
            <CardDescription>Create a key for external API access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Zapier Integration"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Permissions</label>
              <div className="flex gap-2 mt-1">
                {["read", "write", "admin"].map((perm) => (
                  <Badge
                    key={perm}
                    variant={newKeyPermissions.includes(perm) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePermission(perm)}
                  >
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createKey} disabled={creating}>
                {creating ? "Creating..." : "Create Key"}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : keys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No API keys yet</p>
            <p className="text-sm text-muted-foreground">Create one to enable external integrations</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.id} className={!key.is_active ? "opacity-50" : ""}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      {!key.is_active && (
                        <Badge variant="destructive" className="text-[10px]">
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-muted-foreground">
                        {key.key_prefix}...{'•'.repeat(20)}
                      </code>
                      <div className="flex gap-1">
                        {key.permissions.map((p: string) => (
                          <Badge key={p} variant="outline" className="text-[10px]">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Created {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at && (
                        <> · Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
                {key.is_active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => revokeKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
