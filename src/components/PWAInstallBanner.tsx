import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { pwaManager } from '../utils/notifications';
import { t } from '../utils/i18n';
import { useToast } from '../contexts/ToastContext';

const PWAInstallBanner: React.FC = () => {
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const toast = useToast();

    useEffect(() => {
        // Check if we should show the banner
        const checkInstallability = () => {
            // Don't show if already dismissed in this session
            const dismissed = sessionStorage.getItem('pwa-banner-dismissed');
            if (dismissed) return;

            // Check if install prompt is available
            if (pwaManager.canInstall()) {
                setShowBanner(true);
            }
        };

        // Initial check
        checkInstallability();

        // Listen for beforeinstallprompt event (may fire after initial load)
        const handleBeforeInstall = () => {
            const dismissed = sessionStorage.getItem('pwa-banner-dismissed');
            if (!dismissed) {
                setShowBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Hide banner if app gets installed
        const handleInstalled = () => {
            setShowBanner(false);
        };

        window.addEventListener('appinstalled', handleInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }, []);

    const handleInstall = async () => {
        setIsInstalling(true);
        try {
            const installed = await pwaManager.promptInstall();
            if (installed) {
                toast.success('앱이 설치되었습니다!');
                setShowBanner(false);
            }
        } catch {
            toast.error('설치 중 오류가 발생했습니다');
        } finally {
            setIsInstalling(false);
        }
    };

    const handleDismiss = () => {
        sessionStorage.setItem('pwa-banner-dismissed', 'true');
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up">
            <div className="bg-nebula-800/95 backdrop-blur-xl border border-nebula-500/30 rounded-2xl p-4 shadow-2xl shadow-nebula-500/20">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-nebula-500 to-nebula-400 rounded-xl flex items-center justify-center">
                        <Download className="w-5 h-5 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm mb-0.5">
                            {t('installApp')}
                        </h3>
                        <p className="text-nebula-300 text-xs leading-relaxed">
                            {t('installPrompt')}
                        </p>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
                        aria-label={t('closeButton')}
                    >
                        <X className="w-4 h-4 text-white/60" />
                    </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-2 px-4 text-sm text-nebula-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                        {t('dismiss')}
                    </button>
                    <button
                        onClick={handleInstall}
                        disabled={isInstalling}
                        className="flex-1 py-2 px-4 text-sm font-bold text-white bg-gradient-to-r from-nebula-500 to-nebula-400 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isInstalling ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>{t('loading')}</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                <span>{t('installApp')}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallBanner;
