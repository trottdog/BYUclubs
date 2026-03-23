import React from "react";

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App crashed", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground">Frontend Error</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The app hit a client-side runtime error. The details below will help us fix it.
            </p>
            <pre className="mt-4 overflow-auto rounded-lg bg-muted p-4 text-xs text-foreground whitespace-pre-wrap break-words">
              {this.state.error.stack || this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
