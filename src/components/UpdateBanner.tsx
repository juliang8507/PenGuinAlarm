import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { t } from '../utils/i18n';

const UpdateBanner: React.FC = () => {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

    useEffect(() => {
        const handleUpdateAvailable = () => {
            setIsUpdateAvailable(true);
        };

        window.addEventListener('sw-update-available', handleUpdateAvailable);
        return () => {
            window.removeEventListener('sw-update-available', handleUpdateAvailable);
        };
    }, []);

    const handleUpdate = () => {
        if (window.__updateSW) {
            window.__updateSW(true); // Pass true to force update
        }
    };

    if (!isUpdateAvailable) return null;

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="flex items-center gap-3 px-4 py-3 bg-nebula-500/90 backdrop-blur-md rounded-2xl shadow-2xl border border-nebula-400/30">
                <RefreshCw className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '3s' }} />
                <span className="text-sm text-white font-medium">{t('updateAvailable')}</span>
                <button
                    onClick={handleUpdate}
                    className="px-3 py-1 bg-white text-nebula-900 text-sm font-bold rounded-full hover:bg-nebula-100 transition-colors"
                >
                    {t('refresh')}
                </button>
            </div>
        </div>
    );
};

export default UpdateBanner;
