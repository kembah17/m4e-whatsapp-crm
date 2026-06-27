"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Clock,
  User,
  Building2,
  Tag,
  Package,
  CheckCheck,
  Smartphone,
  Type,
  AlertTriangle,
  XCircle,
  Sparkles,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  CampaignMessageTemplate,
  CampaignSequenceStep,
} from "@/types/campaigns"

interface Step4CustomizeProps {
  messages: CampaignMessageTemplate[]
  sequenceSteps: CampaignSequenceStep[]
  onUpdate: (messages: CampaignMessageTemplate[]) => void
  onNext: () => void
  onBack: () => void
}

interface VariableButton {
  label: string
  value: string
  icon: React.ReactNode
  description: string
}

const VARIABLES: VariableButton[] = [
  {
    label: "Name",
    value: "{{name}}",
    icon: <User className="h-3.5 w-3.5" />,
    description: "Customer’s first name",
  },
  {
    label: "Business",
    value: "{{business_name}}",
    icon: <Building2 className="h-3.5 w-3.5" />,
    description: "Your business name",
  },
  {
    label: "Discount",
    value: "{{discount}}",
    icon: <Tag className="h-3.5 w-3.5" />,
    description: "Discount code or percentage",
  },
  {
    label: "Product",
    value: "{{product_name}}",
    icon: <Package className="h-3.5 w-3.5" />,
    description: "Product or service name",
  },
]

const CHAR_WARN = 1000
const CHAR_MAX = 4096

function formatDelay(minutes: number): string {
  if (minutes === 0) return "Sent immediately"
  if (minutes < 60) return `Sent after ${minutes} minute${minutes !== 1 ? "s" : ""}`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) {
    if (remainingMinutes === 0) return `Sent after ${hours} hour${hours !== 1 ? "s" : ""}`
    return `Sent after ${hours}h ${remainingMinutes}m`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0) return `Sent after ${days} day${days !== 1 ? "s" : ""}`
  return `Sent after ${days}d ${remainingHours}h`
}

function getCharCountColor(count: number): string {
  if (count >= CHAR_MAX) return "text-red-600"
  if (count >= CHAR_WARN) return "text-yellow-600"
  return "text-gray-400"
}

function getCharCountBg(count: number): string {
  if (count >= CHAR_MAX) return "bg-red-50 border-red-200"
  if (count >= CHAR_WARN) return "bg-yellow-50 border-yellow-200"
  return ""
}

function replaceVariablesForPreview(text: string): string {
  return text
    .replace(/\{\{name\}\}/g, "Sarah")
    .replace(/\{\{business_name\}\}/g, "Your Business")
    .replace(/\{\{discount\}\}/g, "15% OFF")
    .replace(/\{\{product_name\}\}/g, "Premium Package")
}

function getCurrentTime(): string {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes} ${ampm}`
}

export function Step4Customize({
  messages,
  sequenceSteps,
  onUpdate,
  onNext,
  onBack,
}: Step4CustomizeProps) {
  const [activeMessageIndex, setActiveMessageIndex] = useState(0)
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map())
  const [previewTime] = useState(getCurrentTime)

  const stepMap = useMemo(() => {
    const map = new Map<string, CampaignSequenceStep>()
    for (const step of sequenceSteps) {
      map.set(step.message_key, step)
    }
    return map
  }, [sequenceSteps])

  const handleBodyChange = useCallback(
    (index: number, newBody: string) => {
      if (newBody.length > CHAR_MAX) return
      const updated = messages.map((msg, i) =>
        i === index ? { ...msg, body: newBody } : msg
      )
      onUpdate(updated)
    },
    [messages, onUpdate]
  )

  const insertVariable = useCallback(
    (variable: string) => {
      const textarea = textareaRefs.current.get(activeMessageIndex)
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentBody = messages[activeMessageIndex]?.body ?? ""
      const newBody =
        currentBody.substring(0, start) +
        variable +
        currentBody.substring(end)

      if (newBody.length > CHAR_MAX) return

      const updated = messages.map((msg, i) =>
        i === activeMessageIndex ? { ...msg, body: newBody } : msg
      )
      onUpdate(updated)

      requestAnimationFrame(() => {
        const cursorPos = start + variable.length
        textarea.focus()
        textarea.setSelectionRange(cursorPos, cursorPos)
      })
    },
    [activeMessageIndex, messages, onUpdate]
  )

  const setTextareaRef = useCallback(
    (index: number) => (el: HTMLTextAreaElement | null) => {
      if (el) {
        textareaRefs.current.set(index, el)
      } else {
        textareaRefs.current.delete(index)
      }
    },
    []
  )

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`
  }, [])

  useEffect(() => {
    textareaRefs.current.forEach((el) => autoResize(el))
  }, [messages, autoResize])

  const activeMessage = messages[activeMessageIndex] ?? null
  const activeStep = activeMessage ? stepMap.get(activeMessage.key) : null
  const previewBody = activeMessage
    ? replaceVariablesForPreview(activeMessage.body)
    : ""

  const hasValidMessages =
    messages.length > 0 && messages.every((m) => m.body.trim().length > 0)

  if (messages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Badge variant="outline" className="mb-3 text-sm font-medium px-3 py-1">
            Step 4 of 6
          </Badge>
          <h2 className="text-2xl font-bold text-gray-900">Customize Messages</h2>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No Messages to Customize
            </h3>
            <p className="text-gray-500 text-sm text-center max-w-md">
              The selected template doesn’t have any message templates yet.
              Go back and select a different template, or add messages manually.
            </p>
          </CardContent>
        </Card>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Badge variant="outline" className="mb-3 text-sm font-medium px-3 py-1">
          Step 4 of 6
        </Badge>
        <h2 className="text-2xl font-bold text-gray-900">Customize Messages</h2>
        <p className="text-gray-500 mt-1">
          Edit your campaign messages and preview how they’ll appear on WhatsApp
        </p>
      </div>

      {/* Variable Insertion Toolbar */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5 mr-1">
              <Sparkles className="h-3.5 w-3.5" />
              Insert Variable:
            </span>
            <TooltipProvider delay={200}>
              {VARIABLES.map((v) => (
                <Tooltip key={v.value}>
                  <TooltipTrigger>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-white hover:bg-emerald-50 border-emerald-200 hover:border-emerald-400 text-emerald-700 transition-all duration-200"
                      onClick={() => insertVariable(v.value)}
                    >
                      {v.icon}
                      <span className="ml-1">{v.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      {v.description} — inserts{" "}
                      <code className="bg-gray-100 px-1 rounded">{v.value}</code>
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Main Content: Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Message Editor Cards */}
        <div className="lg:col-span-3 space-y-4">
          {messages.map((msg, index) => {
            const step = stepMap.get(msg.key)
            const charCount = msg.body.length
            const isActive = index === activeMessageIndex

            return (
              <Card
                key={msg.key}
                className={cn(
                  "cursor-pointer transition-all duration-300",
                  isActive
                    ? "ring-2 ring-emerald-500 border-emerald-300 shadow-md"
                    : "hover:border-gray-300 hover:shadow-sm"
                )}
                onClick={() => setActiveMessageIndex(index)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors duration-200",
                          isActive
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {step?.step ?? index + 1}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {msg.name}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {step ? formatDelay(step.delay_minutes) : "No delay set"}
                          {step?.condition && (
                            <Badge
                              variant="secondary"
                              className="ml-2 text-[10px] px-1.5 py-0"
                            >
                              {step.condition}
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {msg.has_discount && (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                          <Tag className="h-3 w-3 mr-1" />
                          Discount
                        </Badge>
                      )}
                      {isActive && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                          <Eye className="h-3 w-3 mr-1" />
                          Previewing
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="relative">
                    <Textarea
                      ref={setTextareaRef(index)}
                      value={msg.body}
                      onChange={(e) => {
                        handleBodyChange(index, e.target.value)
                        autoResize(e.target)
                      }}
                      onFocus={() => setActiveMessageIndex(index)}
                      placeholder="Type your message here..."
                      className={cn(
                        "min-h-[120px] resize-none text-sm leading-relaxed transition-colors duration-200 font-mono",
                        getCharCountBg(charCount)
                      )}
                    />
                    <div
                      className={cn(
                        "absolute bottom-2 right-2 text-[11px] font-medium flex items-center gap-1 transition-colors duration-200",
                        getCharCountColor(charCount)
                      )}
                    >
                      {charCount >= CHAR_MAX && <XCircle className="h-3.5 w-3.5" />}
                      {charCount >= CHAR_WARN && charCount < CHAR_MAX && (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {charCount.toLocaleString()} / {CHAR_MAX.toLocaleString()}
                    </div>
                  </div>
                  {charCount >= CHAR_WARN && charCount < CHAR_MAX && (
                    <p className="text-[11px] text-yellow-600 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Message is getting long. Shorter messages tend to get better
                      engagement.
                    </p>
                  )}
                  {charCount >= CHAR_MAX && (
                    <p className="text-[11px] text-red-600 mt-1.5 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Maximum character limit reached.
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Right: WhatsApp Phone Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Live Preview</span>
            </div>

            {/* Phone Frame */}
            <div className="mx-auto max-w-[320px]">
              <div className="bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
                {/* Notch */}
                <div className="flex justify-center mb-1">
                  <div className="w-28 h-5 bg-gray-900 rounded-b-2xl" />
                </div>

                {/* Screen */}
                <div className="bg-[#efeae2] rounded-[2rem] overflow-hidden">
                  {/* WhatsApp Header */}
                  <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold leading-tight">
                        Your Business
                      </p>
                      <p className="text-emerald-200 text-[10px]">online</p>
                    </div>
                  </div>

                  {/* Chat Background */}
                  <div
                    className="px-3 py-4 min-h-[380px] max-h-[380px] overflow-y-auto"
                    style={{
                      backgroundImage:
                        `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c8c8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  >
                    {/* Date Chip */}
                    <div className="flex justify-center mb-3">
                      <span className="bg-white/80 text-gray-500 text-[10px] px-3 py-1 rounded-lg shadow-sm">
                        Today
                      </span>
                    </div>

                    {/* Message Bubble */}
                    {activeMessage && (
                      <div className="flex justify-end mb-2">
                        <div
                          className="relative bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[85%] shadow-sm"
                          style={{ animation: "wa-msg-in 0.2s ease-out" }}
                        >
                          <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
                            {previewBody || (
                              <span className="text-gray-400 italic">
                                Start typing to see preview…
                              </span>
                            )}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">
                              {previewTime}
                            </span>
                            <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                          {/* Bubble tail */}
                          <div
                            className="absolute -top-0 -right-2 w-0 h-0"
                            style={{
                              borderLeft: "8px solid #dcf8c6",
                              borderTop: "8px solid transparent",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Step indicator */}
                    {activeStep && (
                      <div className="flex justify-center mt-3">
                        <span className="bg-white/80 text-gray-500 text-[10px] px-3 py-1 rounded-lg shadow-sm flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Step {activeStep.step} •{" "}
                          {formatDelay(activeStep.delay_minutes)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Input Bar */}
                  <div className="bg-[#f0f0f0] px-3 py-2 flex items-center gap-2">
                    <div className="flex-1 bg-white rounded-full px-4 py-2">
                      <p className="text-gray-400 text-xs">Type a message</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#075e54] flex items-center justify-center">
                      <Type className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Selector Pills */}
            {messages.length > 1 && (
              <div className="flex justify-center gap-2 mt-4 flex-wrap">
                {messages.map((msg, index) => (
                  <button
                    key={msg.key}
                    onClick={() => setActiveMessageIndex(index)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                      index === activeMessageIndex
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    Step {stepMap.get(msg.key)?.step ?? index + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {messages.length} message{messages.length !== 1 ? "s" : ""} in
            sequence
          </span>
          <Button
            onClick={onNext}
            disabled={!hasValidMessages}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes wa-msg-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
