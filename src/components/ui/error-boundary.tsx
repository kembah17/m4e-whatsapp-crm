"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary that catches runtime errors in child components
 * and displays a friendly error message instead of a white screen.
 *
 * Usage:
 *   <ErrorBoundary fallbackTitle="Something went wrong">
 *     <YourComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">
              {this.props.fallbackTitle ?? "Something went wrong"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.props.fallbackMessage ??
                "An unexpected error occurred. Please try again."}
            </p>
            {this.state.error && (
              <details className="mt-3 text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Technical details
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted p-2 text-xs text-muted-foreground">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = "/automations"}
            >
              Back to Automations
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
