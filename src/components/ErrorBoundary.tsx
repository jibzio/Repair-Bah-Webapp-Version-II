import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  compact?: boolean;
  onRecover?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected UI error',
    };
  }

  render() {
    if (this.state.hasError) {
      const containerClass = this.props.compact
        ? 'w-full h-full min-h-[220px] bg-[#0E1117]/95 text-white flex flex-col items-center justify-center p-5 text-center border border-red-500/30 rounded-2xl'
        : 'min-h-screen bg-[#0E1117] text-white flex flex-col items-center justify-center p-6 text-center';

      return (
        <div className={containerClass}>
          <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
          <h2 className="text-lg font-black mb-1.5">
            {this.props.fallbackTitle || 'RepairBah Recovery Shield'}
          </h2>
          <p className="text-xs text-gray-400 mb-5 max-w-xs">
            {this.state.message}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, message: '' });
              this.props.onRecover?.();
            }}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white"
          >
            Restore Live Session
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
