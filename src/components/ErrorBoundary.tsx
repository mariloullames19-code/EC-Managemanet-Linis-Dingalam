import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 bg-slate-900 border border-emerald-500/40 rounded-2xl text-center space-y-3 m-4">
          <div className="flex items-center justify-center space-x-2 text-rose-400 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>Nagkaroon ng bahagyang aberya sa display.</span>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>I-reload ang component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
