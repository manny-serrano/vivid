import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('React ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] p-8 font-sans">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
            <p className="text-[#94A3B8] mb-4">The app crashed. Check the browser console (F12 → Console) for details.</p>
            <pre className="bg-[#1E293B] border border-red-500/50 rounded-lg p-4 text-sm overflow-auto max-h-64 text-red-300">
              {this.state.error.toString()}
            </pre>
            {this.state.errorInfo?.componentStack && (
              <details className="mt-4">
                <summary className="text-sm text-[#94A3B8] cursor-pointer">Component stack</summary>
                <pre className="mt-2 bg-[#1E293B] rounded p-3 text-xs overflow-auto text-slate-400 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
