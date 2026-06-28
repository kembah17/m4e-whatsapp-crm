"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, Copy, Save, Trash2, Loader2 } from "lucide-react"

interface QRTemplate {
  id: string
  name: string
  phone: string
  message: string | null
  fg_color: string
  bg_color: string
  size: number
  created_at: string
}

export function QRGenerator() {
  const [phone, setPhone] = useState("")
  const [message, setMessage] = useState("")
  const [size, setSize] = useState("512")
  const [fgColor, setFgColor] = useState("#000000")
  const [bgColor, setBgColor] = useState("#FFFFFF")
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [waLink, setWaLink] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templates, setTemplates] = useState<QRTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/qr/templates")
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch {
      // silent
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const generateQR = async () => {
    if (!phone) {
      toast.error("Phone number is required")
      return
    }
    setGenerating(true)
    try {
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          prefillMessage: message || undefined,
          size: parseInt(size),
          fgColor,
          bgColor,
        }),
      })
      if (!res.ok) throw new Error("Failed to generate QR code")
      const data = await res.json()
      setDataUrl(data.dataUrl)
      setWaLink(data.waLink)
      toast.success("QR code generated!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const downloadQR = (format: "png" | "svg") => {
    if (!dataUrl) return
    const link = document.createElement("a")
    if (format === "svg" && dataUrl.startsWith("<svg")) {
      const blob = new Blob([dataUrl], { type: "image/svg+xml" })
      link.href = URL.createObjectURL(blob)
      link.download = `whatsapp-qr-${phone}.svg`
    } else {
      link.href = dataUrl
      link.download = `whatsapp-qr-${phone}.png`
    }
    link.click()
  }

  const copyLink = () => {
    if (!waLink) return
    navigator.clipboard.writeText(waLink)
    toast.success("Link copied to clipboard!")
  }

  const saveTemplate = async () => {
    if (!templateName || !phone) {
      toast.error("Template name and phone are required")
      return
    }
    try {
      const res = await fetch("/api/qr/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          phone,
          message: message || null,
          fgColor,
          bgColor,
          size: parseInt(size),
        }),
      })
      if (!res.ok) throw new Error("Failed to save template")
      toast.success("Template saved!")
      setTemplateName("")
      fetchTemplates()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    }
  }

  const loadTemplate = (t: QRTemplate) => {
    setPhone(t.phone)
    setMessage(t.message || "")
    setFgColor(t.fg_color)
    setBgColor(t.bg_color)
    setSize(String(t.size))
    setDataUrl(null)
    setWaLink(null)
    toast.info(`Loaded template: ${t.name}`)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Generate QR Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (with country code)</Label>
            <Input
              id="phone"
              placeholder="2348012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Pre-filled Message (optional)</Label>
            <Input
              id="message"
              placeholder="Hi! I scanned your QR code..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Size</Label>
              <Select value={size} onValueChange={(v: string | null) => setSize(v ?? "")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="256">256px</SelectItem>
                  <SelectItem value="512">512px</SelectItem>
                  <SelectItem value="1024">1024px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Foreground</Label>
              <Input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Background</Label>
              <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
            </div>
          </div>
          <Button onClick={generateQR} disabled={generating} className="w-full">
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate QR Code
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dataUrl ? (
            <>
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <img src={dataUrl} alt="WhatsApp QR Code" className="max-w-[300px]" />
              </div>
              {waLink && (
                <p className="text-xs text-muted-foreground break-all text-center">{waLink}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => downloadQR("png")}>
                  <Download className="h-4 w-4 mr-1" /> PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadQR("svg")}>
                  <Download className="h-4 w-4 mr-1" /> SVG
                </Button>
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="h-4 w-4 mr-1" /> Copy Link
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Template name..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
                <Button variant="outline" onClick={saveTemplate}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              QR code preview will appear here
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Templates */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Saved Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTemplates ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No saved templates yet. Generate a QR code and save it as a template.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => loadTemplate(t)}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.phone}</p>
                    {t.message && (
                      <p className="text-xs text-muted-foreground truncate">{t.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-4 w-4 rounded border" style={{ backgroundColor: t.fg_color }} />
                    <div className="h-4 w-4 rounded border" style={{ backgroundColor: t.bg_color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
