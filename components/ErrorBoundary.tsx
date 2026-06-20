import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#09090b] border border-red-500/20 rounded-2xl p-6 shadow-2xl shadow-red-500/10 text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Something went wrong</h1>
              <p className="text-sm text-zinc-400">
                The application encountered an unexpected error. Don't worry, your data is safe.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/50 border border-white/5 rounded-lg p-3 text-left overflow-auto max-h-32 custom-scrollbar">
                <code className="text-xs text-red-300 font-mono break-words">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl transition-colors border border-white/10"
            >
              <RefreshCw size={16} />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
