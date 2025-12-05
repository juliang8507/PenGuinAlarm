import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import ErrorState from './ErrorState';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    isRetrying: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            isRetrying: false,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Call optional error handler
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ isRetrying: true });

        // Small delay to show loading state
        setTimeout(() => {
            this.setState({
                hasError: false,
                error: null,
                isRetrying: false,
            });
        }, 500);
    };

    handleDismiss = (): void => {
        // Reload the page as a last resort
        window.location.reload();
    };

    handleFactoryReset = (): void => {
        if (confirm('모든 설정과 데이터가 삭제됩니다. 계속하시겠습니까?')) {
            // Clear all localStorage
            localStorage.clear();
            // Unregister service workers
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => registration.unregister());
                });
            }
            // Reload the page
            window.location.reload();
        }
    };

    render(): ReactNode {
        const { hasError, error, isRetrying } = this.state;
        const { children, fallback } = this.props;

        if (hasError) {
            // Use custom fallback if provided
            if (fallback) {
                return fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-nebula-900 flex items-center justify-center p-6">
                    <div className="max-w-md w-full space-y-4">
                        <ErrorState
                            type="general"
                            error={error}
                            onRetry={this.handleRetry}
                            onDismiss={this.handleDismiss}
                            showDetails={import.meta.env.DEV}
                            isRetrying={isRetrying}
                        />
                        <button
                            onClick={this.handleFactoryReset}
                            className="w-full py-3 bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-600/30 transition-colors text-sm"
                        >
                            ⚠️ 공장 초기화 (모든 데이터 삭제)
                        </button>
                    </div>
                </div>
            );
        }

        return children;
    }
}

export default ErrorBoundary;
