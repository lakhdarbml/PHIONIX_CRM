'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6 flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button 
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Try again
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}

export function ErrorCard({ 
  title = "Something went wrong", 
  message, 
  retryFn 
}: { 
  title?: string;
  message?: string;
  retryFn?: () => void;
}) {
  return (
    <Card className="p-6 flex flex-col items-center gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {message && (
        <p className="text-muted-foreground">{message}</p>
      )}
      {retryFn && (
        <Button onClick={retryFn}>Try again</Button>
      )}
    </Card>
  );
}