import { useState, useEffect, useCallback } from 'react';
import { notificationManager } from '../utils/notifications';

/**
 * Hook for managing Service Worker updates
 * @returns Object with update status and update function
 */
export const useServiceWorker = () => {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

    useEffect(() => {
        // Subscribe to update notifications
        notificationManager.onUpdateAvailable(() => {
            setIsUpdateAvailable(true);
        });
    }, []);

    const updateServiceWorker = useCallback(() => {
        // Tell the waiting SW to skip waiting
        notificationManager.skipWaiting();

        // Reload once the new SW has taken control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }, []);

    return {
        isUpdateAvailable,
        updateServiceWorker,
    };
};
