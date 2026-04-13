import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a15] z-[9999]">
          <div className="max-w-md w-full mx-4 p-6 rounded-xl border border-red-500/50 bg-[#1a1a2e]/90 backdrop-blur-sm shadow-[0_0_30px_rgba(255,0,80,0.3)]">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-xl font-bold text-red-400 mb-2 font-mono">
                SYSTEM ERROR
              </h2>
              <p className="text-gray-400 text-sm">
                Something went wrong. The system encountered an unexpected error.
              </p>
            </div>

            {this.state.error && (
              <div className="mb-6 p-3 rounded bg-black/50 border border-gray-700">
                <p className="text-xs text-gray-500 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 px-4 py-3 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 font-bold font-mono hover:bg-cyan-500/30 transition-all"
              >
                RETRY
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 font-bold font-mono hover:bg-red-500/30 transition-all"
              >
                RELOAD
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
