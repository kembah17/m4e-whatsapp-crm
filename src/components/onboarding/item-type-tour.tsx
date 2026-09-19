"use client"

import { useCallback, useEffect, useState } from 'react'
import { X, ChevronRight, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TourStep {
  target: string // CSS selector or data attribute
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="item-type"]',
    title: 'Choose your item type',
    description:
      'Select what kind of item you're adding — product, service, menu item, room, and more. This determines which fields and metadata are available.',
    position: 'bottom',
  },
  {
    target: '[data-tour="item-role"]',
    title: 'Set the role',
    description:
      'Define how this item functions in your business — is it for sale, internal use, or a raw material? The role affects inventory tracking and reporting.',
    position: 'bottom',
  },
  {
    target: '[data-tour="item-metadata"]',
    title: 'Add metadata',
    description:
      'Fill in industry-specific details like dietary info for restaurants, room amenities for hotels, or fabric type for fashion. These help with search and filtering.',
    position: 'top',
  },
  {
    target: '[data-tour="item-save"]',
    title: 'Save your item',
    description:
      'Once everything looks good, save your item. You can always come back and edit the type, role, or metadata later.',
    position: 'top',
  },
]

const STORAGE_KEY = 'bge-item-type-tour-seen'

export function ItemTypeTour() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 })

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      // Small delay to let the form render
      const timer = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const updatePosition = useCallback(() => {
    if (!active) return
    const currentStep = TOUR_STEPS[step]
    if (!currentStep) return

    const el = document.querySelector(currentStep.target)
    if (el) {
      const rect = el.getBoundingClientRect()
      setPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      })
    }
  }, [active, step])

  useEffect(() => {
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [updatePosition])

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      handleClose()
    }
  }

  const handleClose = () => {
    setActive(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  if (!active) return null

  const currentStep = TOUR_STEPS[step]
  if (!currentStep) return null

  // Calculate tooltip position
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10001,
    maxWidth: 320,
  }

  switch (currentStep.position) {
    case 'bottom':
      tooltipStyle.top = position.top + position.height + 12
      tooltipStyle.left = position.left
      break
    case 'top':
      tooltipStyle.bottom = window.innerHeight - position.top + 12
      tooltipStyle.left = position.left
      break
    case 'right':
      tooltipStyle.top = position.top
      tooltipStyle.left = position.left + position.width + 12
      break
    case 'left':
      tooltipStyle.top = position.top
      tooltipStyle.right = window.innerWidth - position.left + 12
      break
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        style={{ zIndex: 10000 }}
        onClick={handleClose}
      />

      {/* Highlight box */}
      <div
        className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-300"
        style={{
          zIndex: 10001,
          top: position.top - 4,
          left: position.left - 4,
          width: position.width + 8,
          height: position.height + 8,
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip */}
      <div
        className="rounded-lg border border-border bg-popover p-4 shadow-lg"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-foreground">
            {currentStep.title}
          </h3>
          <button
            onClick={handleClose}
            className="rounded p-0.5 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {currentStep.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {step + 1} of {TOUR_STEPS.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-7 text-xs"
            >
              <SkipForward className="mr-1 h-3 w-3" />
              Skip
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="h-7 text-xs"
            >
              {step < TOUR_STEPS.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="ml-1 h-3 w-3" />
                </>
              ) : (
                'Done'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
