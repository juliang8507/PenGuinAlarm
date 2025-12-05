import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { notificationManager } from '../utils/notifications';
import { t } from '../utils/i18n';

interface PermissionBannerProps {
    onPermissionGranted?: () => void;
}

const PermissionBanner: React.FC<PermissionBannerProps> = ({ onPermissionGranted }) => {
    const [show, setShow] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if notifications are supported and permission not yet granted
        if (!notificationManager.isSupported()) return;

        const permission = notificationManager.getPermission();
        const wasDismissed = localStorage.getItem('notification-banner-dismissed');

        if (permission === 'default' && !wasDismissed) {
            // Show banner after a short delay for better UX
            const timer = setTimeout(() => setShow(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleRequestPermission = async () => {
        const permission = await notificationManager.requestPermission();

        if (permission === 'granted') {
            onPermissionGranted?.();
        }

        setShow(false);
    };

    const handleDismiss = () => {
        setDismissed(true);
        setShow(false);
        localStorage.setItem('notification-banner-dismissed', 'true');
    };

    if (!show || dismissed) return null;

    return (
        <div
            className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up"
            role="alert"
            aria-live="polite"
        >
            <div className="bg-nebula-800/95 backdrop-blur-xl border border-nebula-500/30 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-nebula-500/20 rounded-full">
                        <Bell className="w-5 h-5 text-nebula-400" aria-hidden="true" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white mb-1">
                            {t('notificationPermissionTitle')}
                        </h3>
                        <p className="text-xs text-nebula-300 mb-3">
                            {t('notificationPermissionDesc')}
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleRequestPermission}
                                className="px-4 py-2 bg-nebula-500 text-white text-xs font-bold rounded-full hover:bg-nebula-400 transition-colors focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:ring-offset-2 focus:ring-offset-nebula-900"
                            >
                                {t('allowNotifications')}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 bg-white/10 text-white/70 text-xs font-medium rounded-full hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-nebula-900"
                            >
                                {t('notNow')}
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 p-1 text-white/50 hover:text-white/80 transition-colors focus:outline-none"
                        aria-label={t('dismiss')}
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PermissionBanner;
