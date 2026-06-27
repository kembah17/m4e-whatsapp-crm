"use client"

import { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ArrowRight,
  ArrowLeft,
  Zap,
  Calendar,
  GitBranch,
  MessageCircle,
  Mail,
  Smartphone,
  Wand2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  CampaignSequenceStep,
  CampaignMessageTemplate,
} from "@/types/campaigns"

interface Step5ScheduleProps {
  scheduledAt: string | null
  onScheduleChange: (date: string | null) => void
  campaignName: string
  onNameChange: (name: string) => void
  channel: "whatsapp" | "email" | "sms" | "auto"
  onChannelChange: (ch: "whatsapp" | "email" | "sms" | "auto") => void
  sequenceSteps: CampaignSequenceStep[]
  messages: CampaignMessageTemplate[]
  onNext: () => void
  onBack: () => void
}

type SendMode = "now" | "scheduled" | "drip"

interface SendModeOption {
  id: SendMode
  label: string
  description: string
  icon: React.ReactNode
}

interface ChannelOption {
  id: "whatsapp" | "email" | "sms" | "auto"
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  ringColor: string
}

const SEND_MODES: SendModeOption[] = [
  {
    id: "now",
    label: "Send Now",
    description: "Campaign starts immediately after launch",
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: "scheduled",
    label: "Schedule for Later",
    description: "Pick a specific date and time to send",
    icon: <Calendar className="h-6 w-6" />,
  },
  {
    id: "drip",
    label: "Drip Campaign",
    description: "Send messages in a timed sequence",
    icon: <GitBranch className="h-6 w-6" />,
  },
]

const CHANNELS: ChannelOption[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Best open rates, personal touch",
    icon: <MessageCircle className="h-5 w-5" />,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    ringColor: "ring-emerald-500",
  },
  {
    id: "email",
    label: "Email",
    description: "Rich content, attachments",
    icon: <Mail className="h-5 w-5" />,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    ringColor: "ring-blue-500",
  },
  {
    id: "sms",
    label: "SMS",
    description: "Universal reach, no internet needed",
    icon: <Smartphone className="h-5 w-5" />,
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    ringColor: "ring-orange-500",
  },
  {
    id: "auto",
    label: "Auto",
    description: "AI picks the best channel per contact",
    icon: <Wand2 className="h-5 w-5" />,
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    ringColor: "ring-purple-500",
  },
]

function formatDelay(minutes: number): string {
  if (minutes === 0) return "Immediately"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) {
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`
}

function formatDelayLong(minutes: number): string {
  if (minutes === 0) return "Sent immediately"
  if (minutes < 60)
    return `After ${minutes} minute${minutes !== 1 ? "s" : ""}`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours < 24) {
    if (remainingMinutes === 0)
      return `After ${hours} hour${hours !== 1 ? "s" : ""}`
    return `After ${hours}h ${remainingMinutes}m`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0)
    return `After ${days} day${days !== 1 ? "s" : ""}`
  return `After ${days}d ${remainingHours}h`
}

export function Step5Schedule({
  scheduledAt,
  onScheduleChange,
  campaignName,
  onNameChange,
  channel,
  onChannelChange,
  sequenceSteps,
  messages,
  onNext,
  onBack,
}: Step5ScheduleProps) {
  const [sendMode, setSendMode] = useState<SendMode>(
    scheduledAt ? "scheduled" : sequenceSteps.length > 1 ? "drip" : "now"
  )
  const [nameError, setNameError] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(() => {
    if (!scheduledAt) return ""
    try {
      return new Date(scheduledAt).toISOString().split("T")[0]
    } catch {
      return ""
    }
  })
  const [scheduleTime, setScheduleTime] = useState(() => {
    if (!scheduledAt) return ""
    try {
      const d = new Date(scheduledAt)
      return `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`
    } catch {
      return ""
    }
  })

  const messageMap = useMemo(() => {
    const map = new Map<string, CampaignMessageTemplate>()
    for (const msg of messages) {
      map.set(msg.key, msg)
    }
    return map
  }, [messages])

  const sortedSteps = useMemo(
    () => [...sequenceSteps].sort((a, b) => a.step - b.step),
    [sequenceSteps]
  )

  const handleSendModeChange = (mode: SendMode) => {
    setSendMode(mode)
    if (mode === "now") {
      onScheduleChange(null)
    }
  }

  const handleDateChange = (date: string) => {
    setScheduleDate(date)
    if (date && scheduleTime) {
      onScheduleChange(new Date(`${date}T${scheduleTime}`).toISOString())
    }
  }

  const handleTimeChange = (time: string) => {
    setScheduleTime(time)
    if (scheduleDate && time) {
      onScheduleChange(
        new Date(`${scheduleDate}T${time}`).toISOString()
      )
    }
  }

  const handleNext = () => {
    if (!campaignName.trim()) {
      setNameError(true)
      return
    }
    setNameError(false)
    onNext()
  }

  const isScheduleValid =
    sendMode !== "scheduled" || (scheduleDate !== "" && scheduleTime !== "")
  const canProceed = campaignName.trim().length > 0 && isScheduleValid

  const minDate = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <Badge
          variant="outline"
          className="mb-3 text-sm font-medium px-3 py-1"
        >
          Step 5 of 6
        </Badge>
        <h2 className="text-2xl font-bold text-gray-900">
          Schedule & Settings
        </h2>
        <p className="text-gray-500 mt-1">
          Choose when to send and how to deliver your campaign
        </p>
      </div>

      {/* Campaign Name */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campaign Name</CardTitle>
          <CardDescription>
            Give your campaign a memorable name for easy tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Input
              value={campaignName}
              onChange={(e) => {
                onNameChange(e.target.value)
                if (e.target.value.trim()) setNameError(false)
              }}
              placeholder="e.g., Q1 Win-Back Campaign"
              className={cn(
                "text-base",
                nameError && "border-red-400 ring-1 ring-red-400"
              )}
              maxLength={100}
            />
            {nameError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Campaign name is required
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send Mode Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-gray-700">
          When to Send
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SEND_MODES.map((mode) => {
            const isSelected = sendMode === mode.id
            return (
              <Card
                key={mode.id}
                className={cn(
                  "cursor-pointer transition-all duration-300 hover:shadow-md",
                  isSelected
                    ? "ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/50"
                    : "hover:border-gray-300"
                )}
                onClick={() => handleSendModeChange(mode.id)}
              >
                <CardContent className="pt-6 pb-4 text-center">
                  <div
                    className={cn(
                      "mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors duration-200",
                      isSelected
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {mode.icon}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{mode.label}</h3>
                  <p className="text-xs text-gray-500">{mode.description}</p>
                  {isSelected && (
                    <div className="mt-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Send Mode Details */}
      {sendMode === "now" && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-800 text-sm">
                  Immediate Delivery
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your campaign will start sending to all recipients immediately
                  after you launch. Make sure your messages are finalized before
                  proceeding.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {sendMode === "scheduled" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Schedule Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-date" className="text-sm">
                  Date
                </Label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={minDate}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-time" className="text-sm">
                  Time
                </Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            {scheduleDate && scheduleTime && (
              <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-4 w-4" />
                Scheduled for{" "}
                <span className="font-semibold">
                  {new Date(
                    `${scheduleDate}T${scheduleTime}`
                  ).toLocaleString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {!scheduleDate && !scheduleTime && (
              <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Select a date and time to schedule your campaign
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {sendMode === "drip" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-purple-600" />
              Drip Sequence Timeline
            </CardTitle>
            <CardDescription>
              Messages will be sent automatically based on the timing below
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedSteps.length === 0 ? (
              <div className="text-center py-8">
                <div className="rounded-full bg-gray-100 p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <GitBranch className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  No sequence steps defined
                </p>
              </div>
            ) : (
              <div className="relative pl-8">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-400 via-blue-400 to-purple-400 rounded-full" />

                <div className="space-y-6">
                  {sortedSteps.map((step, index) => {
                    const msg = messageMap.get(step.message_key)
                    const isFirst = index === 0
                    const isLast = index === sortedSteps.length - 1

                    return (
                      <div key={step.step} className="relative">
                        {/* Dot */}
                        <div
                          className={cn(
                            "absolute top-1 w-[14px] h-[14px] rounded-full border-2 border-white shadow-sm transition-colors duration-300",
                            isFirst
                              ? "bg-emerald-500"
                              : isLast
                                ? "bg-purple-500"
                                : "bg-blue-500"
                          )}
                          style={{ left: "-23px" }}
                        />

                        <div
                          className={cn(
                            "bg-gray-50 rounded-lg p-3 border transition-all duration-300 hover:shadow-sm",
                            isFirst && "border-emerald-200",
                            isLast && "border-purple-200",
                            !isFirst && !isLast && "border-gray-200"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px] px-1.5 py-0",
                                  isFirst &&
                                    "bg-emerald-100 text-emerald-700",
                                  isLast &&
                                    "bg-purple-100 text-purple-700",
                                  !isFirst &&
                                    !isLast &&
                                    "bg-blue-100 text-blue-700"
                                )}
                              >
                                Step {step.step}
                              </Badge>
                              <span className="text-sm font-medium text-gray-800">
                                {msg?.name ?? step.message_key}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {formatDelay(step.delay_minutes)}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">
                            {formatDelayLong(step.delay_minutes)}
                            {step.condition && (
                              <span className="ml-2 text-amber-600">
                                • Condition: {step.condition}
                              </span>
                            )}
                          </p>
                          {msg && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {msg.body.substring(0, 80)}
                              {msg.body.length > 80 ? "…" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Channel Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-gray-700">
          Delivery Channel
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CHANNELS.map((ch) => {
            const isSelected = channel === ch.id
            return (
              <TooltipProvider key={ch.id} delay={300}>
                <Tooltip>
                  <TooltipTrigger>
                    <Card
                      className={cn(
                        "cursor-pointer transition-all duration-300 hover:shadow-md",
                        isSelected
                          ? `ring-2 ${ch.ringColor} ${ch.borderColor} ${ch.bgColor}`
                          : "hover:border-gray-300"
                      )}
                      onClick={() => onChannelChange(ch.id)}
                    >
                      <CardContent className="pt-4 pb-3 text-center">
                        <div
                          className={cn(
                            "mx-auto w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-colors duration-200",
                            isSelected
                              ? `${ch.bgColor} ${ch.color}`
                              : "bg-gray-100 text-gray-500"
                          )}
                        >
                          {ch.icon}
                        </div>
                        <h4
                          className={cn(
                            "font-semibold text-sm transition-colors duration-200",
                            isSelected ? ch.color : "text-gray-700"
                          )}
                        >
                          {ch.label}
                        </h4>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                          {ch.description}
                        </p>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{ch.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          Review Campaign <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
