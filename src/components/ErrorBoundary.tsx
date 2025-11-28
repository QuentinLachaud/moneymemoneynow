import React from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-4 z-50 p-4 bg-red-50 border border-red-200 rounded shadow-lg text-sm text-red-900 overflow-auto">
          <div className="font-semibold mb-2">Runtime Error</div>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '60vh', overflow: 'auto' }}>{String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error)}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
