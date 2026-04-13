import { Component, type ReactNode, type ErrorInfo } from 'react';

interface SceneErrorBoundaryProps {
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  constructor(props: SceneErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SceneErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('3D Scene error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a15]">
          <div className="text-center p-8">
            <div className="text-5xl mb-4">🖥️</div>
            <h3 className="text-lg font-bold text-red-400 font-mono mb-2">
              3D RENDER ERROR
            </h3>
            <p className="text-gray-400 text-sm mb-4 max-w-sm">
              The 3D scene failed to render. This may be due to a WebGL issue.
            </p>
            {this.state.error && (
              <p className="text-xs text-gray-600 font-mono mb-4 break-all max-w-sm">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleRetry}
              className="px-6 py-2 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 font-mono hover:bg-cyan-500/30 transition-all"
            >
              RETRY RENDER
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
