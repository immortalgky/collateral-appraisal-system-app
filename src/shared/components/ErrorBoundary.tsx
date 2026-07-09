import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { isChunkLoadError } from '@shared/utils/lazyWithRetry';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // A failed dynamic import that survived lazyWithRetry's retry-and-reload almost
      // always means the app was redeployed and this tab still points at old chunk
      // hashes. Show an update-oriented message rather than a scary generic error.
      const isChunkError = isChunkLoadError(this.state.error);

      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Icon name="triangle-exclamation" style="solid" className="size-24 text-error" />
            </div>
            <p className="text-base font-semibold text-error">Error</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-base-content sm:text-5xl">
              {isChunkError ? 'A new version is available' : 'Something went wrong'}
            </h1>
            <p className="mt-4 text-base text-base-content/60 max-w-md mx-auto">
              {isChunkError
                ? 'The app was updated while this page was open. Please refresh to load the latest version.'
                : 'An unexpected error occurred. Please try refreshing the page or go back to the home page.'}
            </p>
            {this.state.error && (
              <div className="mt-4 p-4 bg-error/10 rounded-lg max-w-lg mx-auto">
                <p className="text-sm text-error font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="mt-8 flex items-center justify-center gap-x-4">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                <Icon name="rotate-right" style="solid" className="size-4" />
                Refresh page
              </button>
              <Link to="/" className="btn btn-ghost">
                <Icon name="house" style="solid" className="size-4" />
                Go back home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
