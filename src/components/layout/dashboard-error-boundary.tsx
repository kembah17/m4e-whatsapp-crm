"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Dashboard-level error boundary. Catches runtime errors in any
 * dashboard page and shows a recovery UI instead of silently
 * redirecting to the login page (which happens when the React
 * tree unmounts due to an uncaught error).
 */
export function DashboardErrorBoundary({ children }: Props) {
  // We use a class component wrapper via a hook-based approach
  // because error boundaries require componentDidCatch which
  // only works in class components.
  return (
    <ErrorBoundaryClass>
      {children}
    </ErrorBoundaryClass>
  );
}

class ErrorBoundaryClass extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Dashboard Error Boundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This page encountered an error. Try refreshing or go back to the dashboard.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-muted p-3 rounded-md mb-6 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </button>
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-accent"
              >
                <Home className="h-4 w-4" />
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// React import needed for class component
import React from "react";
