"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ImportWizard } from '@/components/contacts/import-wizard'
import { ProductImportWizard } from '@/components/products/product-import-wizard'
import {
  Users,
  Package,
  Layers,
  ArrowRight,
  Upload,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

type ImportMode = 'choose' | 'contacts' | 'products' | 'both-contacts' | 'both-products' | 'done'

interface UnifiedImportHubProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported?: () => void
}

const importOptions = [
  {
    id: 'contacts' as const,
    title: 'Customer Contacts',
    description: 'Import names, phone numbers, emails, and customer details from spreadsheets, Google Sheets, or your phone',
    icon: Users,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    hoverColor: 'hover:border-blue-500/50 hover:bg-blue-500/5',
    features: ['Excel & CSV files', 'Google Sheets', 'Phone contacts', 'WhatsApp export', 'Manual entry'],
  },
  {
    id: 'products' as const,
    title: 'Product Catalog',
    description: 'Import your products with pricing, images, inventory levels, and supplier information',
    icon: Package,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    hoverColor: 'hover:border-emerald-500/50 hover:bg-emerald-500/5',
    features: ['CSV files', 'Product images', 'Pricing & inventory', 'Categories & tags'],
  },
  {
    id: 'both' as const,
    title: 'Both — Contacts & Products',
    description: 'Import your full business data in one go. We\'ll guide you through contacts first, then products',
    icon: Layers,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    hoverColor: 'hover:border-purple-500/50 hover:bg-purple-500/5',
    features: ['Complete data setup', 'Guided two-step flow', 'Best for new accounts'],
    recommended: true,
  },
]

export function UnifiedImportHub({ open, onOpenChange, onImported }: UnifiedImportHubProps) {
  const [mode, setMode] = useState<ImportMode>('choose')
  const [contactsDone, setContactsDone] = useState(false)

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setMode('choose')
      setContactsDone(false)
    }
    onOpenChange(isOpen)
  }

  const handleSelect = (option: 'contacts' | 'products' | 'both') => {
    if (option === 'both') {
      setMode('both-contacts')
    } else {
      setMode(option)
    }
  }

  const handleContactsImported = () => {
    onImported?.()
    if (mode === 'both-contacts') {
      setContactsDone(true)
      setMode('both-products')
    } else {
      handleClose(false)
    }
  }

  const handleProductsImported = () => {
    onImported?.()
    if (mode === 'both-products') {
      setMode('done')
    } else {
      handleClose(false)
    }
  }

  // Show the chooser dialog
  if (mode === 'choose') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Upload className="w-5 h-5 text-primary" />
              Import Your Business Data
            </DialogTitle>
            <DialogDescription>
              Choose what you&apos;d like to import. You can always come back to add more later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 mt-2">
            {importOptions.map(option => {
              const Icon = option.icon
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`relative flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${option.hoverColor} bg-card border-border`}
                >
                  {option.recommended && (
                    <span className="absolute -top-2 right-3 flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-purple-500 text-white rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Recommended
                    </span>
                  )}

                  <div className={`p-3 rounded-lg border ${option.color} flex-shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{option.title}</h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {option.features.map(f => (
                        <span key={f} className="inline-flex items-center px-2 py-0.5 text-[11px] rounded-md bg-muted text-muted-foreground">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Show completion screen for "both" mode
  if (mode === 'done') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="py-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">All Data Imported!</h2>
            <p className="text-muted-foreground mb-6">
              Your contacts and products have been imported successfully. You&apos;re ready to start engaging your customers.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
              >
                Go to Data Center
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Show transition screen between contacts and products in "both" mode
  if (mode === 'both-products' && contactsDone) {
    return (
      <>
        {/* Brief transition — auto-open product wizard */}
        <ProductImportWizard
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              // If they close the product wizard, show completion
              setMode('done')
            }
          }}
          onImported={handleProductsImported}
        />
      </>
    )
  }

  // Contacts wizard (standalone or first step of "both")
  if (mode === 'contacts' || mode === 'both-contacts') {
    return (
      <ImportWizard
        open={true}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            if (mode === 'both-contacts') {
              // They closed without completing — go back to chooser
              setMode('choose')
            } else {
              handleClose(false)
            }
          }
        }}
        onImported={handleContactsImported}
      />
    )
  }

  // Products wizard (standalone)
  if (mode === 'products') {
    return (
      <ProductImportWizard
        open={true}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose(false)
        }}
        onImported={handleProductsImported}
      />
    )
  }

  return null
}
