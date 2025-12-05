import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, WifiOff, Volume2, Lock, Database } from 'lucide-react';
import { t } from '../utils/i18n';
import type { TranslationKey } from '../utils/i18n';

export type ErrorType = 'general' | 'network' | 'audio' | 'permission' | 'storage';

interface ErrorStateProps {
    type?: ErrorType;
    title?: string;
    message?: string;
    error?: Error | null;
    onRetry?: () => void;
    onDismiss?: () => void;
    showDetails?: boolean;
    className?: string;
    isRetrying?: boolean;
}

const errorConfig: Record<ErrorType, { icon: React.ElementType; titleKey: TranslationKey; messageKey: TranslationKey }> = {
    general: {
        icon: AlertTriangle,
        titleKey: 'errorOccurred',
        messageKey: 'errorUnexpected',
    },
    network: {
        icon: WifiOff,
        titleKey: 'errorOccurred',
        messageKey: 'errorNetwork',
    },
    audio: {
        icon: Volume2,
        titleKey: 'errorOccurred',
        messageKey: 'errorAudio',
    },
    permission: {
        icon: Lock,
        titleKey: 'errorOccurred',
        messageKey: 'errorPermission',
    },
    storage: {
        icon: Database,
        titleKey: 'errorOccurred',
        messageKey: 'errorStorage',
    },
};

const ErrorState: React.FC<ErrorStateProps> = ({
    type = 'general',
    title,
    message,
    error,
    onRetry,
    onDismiss,
    showDetails = false,
    className = '',
    isRetrying = false,
}) => {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const config = errorConfig[type];
    const Icon = config.icon;

    const displayTitle = title || t(config.titleKey);
    const displayMessage = message || t(config.messageKey);

    return (
        <div className={`bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl p-6 ${className}`}>
            {/* Icon and Title */}
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1">
                        {displayTitle}
                    </h3>
                    <p className="text-red-200/80 text-sm leading-relaxed">
                        {displayMessage}
                    </p>
                </div>
            </div>

            {/* Error Details (collapsible) */}
            {showDetails && error && (
                <div className="mt-4">
                    <button
                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        className="flex items-center gap-2 text-xs text-red-300/60 hover:text-red-300 transition-colors"
                    >
                        {isDetailsOpen ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                        {t('errorDetails')}
                    </button>
                    {isDetailsOpen && (
                        <div className="mt-2 p-3 bg-black/20 rounded-lg overflow-auto max-h-32">
                            <code className="text-xs text-red-300/80 font-mono whitespace-pre-wrap break-all">
                                {error.message}
                                {error.stack && (
                                    <>
                                        {'\n\n'}
                                        {error.stack}
                                    </>
                                )}
                            </code>
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-5">
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="flex-1 py-2.5 px-4 text-sm text-red-200 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                        {t('goBack')}
                    </button>
                )}
                {onRetry && (
                    <button
                        onClick={onRetry}
                        disabled={isRetrying}
                        className="flex-1 py-2.5 px-4 text-sm font-bold text-white bg-red-500/30 hover:bg-red-500/50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                        {isRetrying ? t('loading') : t('retry')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorState;
