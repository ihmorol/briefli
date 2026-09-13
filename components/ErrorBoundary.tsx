import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Render errors can only be caught by a class component (no hook equivalent
// exists), so this is the one class in the tree. It keeps a render exception
// from blanking the whole app by showing a self-contained fallback card.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mx-auto w-12 h-12 bg-red-950/60 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">Something went wrong</h1>
          <p className="text-sm text-slate-400 mb-6 break-words">
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-900/20"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
