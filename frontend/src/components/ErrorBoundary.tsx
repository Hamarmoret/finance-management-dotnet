import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="p-6">
        <div className="card card-body text-center py-12">
          <AlertCircle className="w-12 h-12 text-danger-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {this.props.fallbackLabel ?? 'Something went wrong'}
          </h2>
          <p className="text-sm font-mono text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 rounded p-3 mb-4 text-left max-w-xl mx-auto break-all">
            {error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn btn-primary btn-sm mx-auto flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }
}
