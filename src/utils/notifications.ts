// Notification API, Wake Lock, and PWA support for Nebula Alarm

import { t } from './i18n';

// Notification permission state
export type NotificationPermission = 'default' | 'granted' | 'denied';

class NotificationManager {
    private swRegistration: ServiceWorkerRegistration | null = null;
    private updateAvailableCallback: (() => void) | null = null;

    /**
     * Check if notifications are supported
     */
    public isSupported(): boolean {
        return 'Notification' in window;
    }

    /**
     * Get current notification permission
     */
    public getPermission(): NotificationPermission {
        if (!this.isSupported()) return 'denied';
        return Notification.permission as NotificationPermission;
    }

    /**
     * Request notification permission
     */
    public async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) return 'denied';

        try {
            const permission = await Notification.requestPermission();
            return permission as NotificationPermission;
        } catch {
            console.error('Failed to request notification permission');
            return 'denied';
        }
    }

    /**
     * Show an alarm notification
     */
    public async showAlarmNotification(): Promise<void> {
        if (!this.isSupported() || this.getPermission() !== 'granted') return;

        const options: NotificationOptions & {
            vibrate?: number[];
            actions?: Array<{ action: string; title: string; icon?: string }>;
        } = {
            body: t('notificationBody'),
            icon: '/nebula-icon-192.png',
            badge: '/nebula-icon-192.png',
            tag: 'nebula-alarm',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            actions: [
                { action: 'snooze', title: t('snooze') },
                { action: 'dismiss', title: t('dismiss') },
            ],
        };

        try {
            // Use service worker notification if available
            if (this.swRegistration) {
                await this.swRegistration.showNotification(t('notificationTitle'), options);
            } else {
                new Notification(t('notificationTitle'), options);
            }
        } catch (e) {
            console.error('Failed to show notification:', e);
        }
    }

    /**
     * Close alarm notifications
     */
    public async closeAlarmNotification(): Promise<void> {
        if (this.swRegistration) {
            const notifications = await this.swRegistration.getNotifications({ tag: 'nebula-alarm' });
            notifications.forEach(notification => notification.close());
        }
    }

    /**
     * Register service worker for background notifications
     */
    public async registerServiceWorker(): Promise<void> {
        if (!('serviceWorker' in navigator)) return;

        try {
            this.swRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');

            // Listen for updates
            this.swRegistration.addEventListener('updatefound', () => {
                const newWorker = this.swRegistration?.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    // New SW is installed and waiting, and there's an existing controller
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('New Service Worker available');
                        this.updateAvailableCallback?.();
                    }
                });
            });

            // Also check if there's already a waiting worker on load
            if (this.swRegistration.waiting && navigator.serviceWorker.controller) {
                console.log('Service Worker update waiting on load');
                this.updateAvailableCallback?.();
            }
        } catch (e) {
            console.error('Service Worker registration failed:', e);
        }
    }

    /**
     * Register callback for when an update is available
     */
    public onUpdateAvailable(callback: () => void): void {
        this.updateAvailableCallback = callback;

        // Check if update is already available
        if (this.swRegistration?.waiting && navigator.serviceWorker.controller) {
            callback();
        }
    }

    /**
     * Tell the waiting service worker to skip waiting and activate
     */
    public skipWaiting(): void {
        const waitingWorker = this.swRegistration?.waiting;
        if (!waitingWorker) return;

        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }

    /**
     * Set up notification action handlers
     * @returns cleanup function to remove the listener
     */
    public onNotificationAction(callback: (action: string) => void): () => void {
        if (!('serviceWorker' in navigator)) return () => { };

        const handler = (event: MessageEvent) => {
            if (event.data?.type === 'NOTIFICATION_ACTION') {
                callback(event.data.action);
            } else if (event.data?.type === 'ALARM_CHECK') {
                // SW is requesting alarm state check (after wake/visibility change)
                callback('alarm_check');
            }
        };

        navigator.serviceWorker.addEventListener('message', handler);

        // Return cleanup function
        return () => {
            navigator.serviceWorker.removeEventListener('message', handler);
        };
    }

    /**
     * Send alarm schedule to Service Worker for background monitoring
     */
    public async syncAlarmSchedule(schedule: {
        nextAlarmTime: string | null;
        snoozeEndTime: string | null;
        enabled: boolean;
    }): Promise<void> {
        if (!this.swRegistration?.active) return;

        try {
            this.swRegistration.active.postMessage({
                type: 'SYNC_ALARM_SCHEDULE',
                schedule,
            });
        } catch (e) {
            console.error('Failed to sync alarm schedule with SW:', e);
        }
    }

    /**
     * Request Service Worker to check and trigger alarm if needed
     */
    public async requestAlarmCheck(): Promise<void> {
        if (!this.swRegistration?.active) return;

        try {
            this.swRegistration.active.postMessage({
                type: 'CHECK_ALARM',
            });
        } catch (e) {
            console.error('Failed to request alarm check:', e);
        }
    }
}

class WakeLockManager {
    private wakeLock: WakeLockSentinel | null = null;
    private isAcquiring = false;

    /**
     * Check if Wake Lock API is supported
     */
    public isSupported(): boolean {
        return 'wakeLock' in navigator;
    }

    /**
     * Acquire wake lock to prevent screen from sleeping
     */
    public async acquire(): Promise<boolean> {
        if (!this.isSupported() || this.isAcquiring) return false;

        this.isAcquiring = true;

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');

            this.wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
                this.wakeLock = null;
            });

            console.log('Wake Lock acquired');
            return true;
        } catch (e) {
            console.error('Failed to acquire wake lock:', e);
            return false;
        } finally {
            this.isAcquiring = false;
        }
    }

    /**
     * Release wake lock
     */
    public async release(): Promise<void> {
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
            } catch (e) {
                console.error('Failed to release wake lock:', e);
            }
        }
    }

    /**
     * Re-acquire wake lock when page becomes visible
     * (Wake locks are automatically released when page is hidden)
     */
    public setupVisibilityHandler(): void {
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && !this.wakeLock) {
                // Re-acquire if we had one before
                await this.acquire();
            }
        });
    }

    /**
     * Check if wake lock is currently active
     */
    public isActive(): boolean {
        return this.wakeLock !== null;
    }
}

// PWA Install Prompt handling
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class PWAManager {
    private deferredPrompt: BeforeInstallPromptEvent | null = null;
    private isInstalled = false;

    /**
     * Initialize PWA manager
     */
    public init(): void {
        // Capture the install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e as BeforeInstallPromptEvent;
        });

        // Check if already installed
        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            this.deferredPrompt = null;
            console.log('PWA installed');
        });

        // Check if running as PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
        }
    }

    /**
     * Check if install prompt is available
     */
    public canInstall(): boolean {
        return this.deferredPrompt !== null && !this.isInstalled;
    }

    /**
     * Check if app is installed
     */
    public isAppInstalled(): boolean {
        return this.isInstalled;
    }

    /**
     * Show install prompt
     */
    public async promptInstall(): Promise<boolean> {
        if (!this.deferredPrompt) return false;

        try {
            await this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                this.isInstalled = true;
            }

            this.deferredPrompt = null;
            return outcome === 'accepted';
        } catch (e) {
            console.error('Failed to show install prompt:', e);
            return false;
        }
    }
}

// Audio autoplay handling for mobile browsers
class AudioAutoplayManager {
    private userInteracted = false;
    private pendingPlay: (() => void) | null = null;

    /**
     * Initialize autoplay manager
     */
    public init(): void {
        // Track user interaction
        const interactionEvents = ['click', 'touchstart', 'keydown'];

        const handleInteraction = () => {
            this.userInteracted = true;

            // Play pending audio
            if (this.pendingPlay) {
                this.pendingPlay();
                this.pendingPlay = null;
            }

            // Remove listeners after first interaction
            interactionEvents.forEach(event => {
                document.removeEventListener(event, handleInteraction);
            });
        };

        interactionEvents.forEach(event => {
            document.addEventListener(event, handleInteraction, { once: true });
        });
    }

    /**
     * Check if user has interacted with the page
     */
    public hasUserInteracted(): boolean {
        return this.userInteracted;
    }

    /**
     * Attempt to play audio, queuing if not allowed
     */
    public async attemptPlay(playCallback: () => Promise<void>): Promise<boolean> {
        if (this.userInteracted) {
            try {
                await playCallback();
                return true;
            } catch (e) {
                console.error('Audio playback failed:', e);
                return false;
            }
        }

        // Queue for later
        this.pendingPlay = () => {
            playCallback().catch(console.error);
        };

        return false;
    }

    /**
     * Set callback for pending play
     */
    public onPendingPlay(callback: () => void): void {
        if (!this.userInteracted) {
            this.pendingPlay = callback;
        }
    }
}

// Export singleton instances
export const notificationManager = new NotificationManager();
export const wakeLockManager = new WakeLockManager();
export const pwaManager = new PWAManager();
export const audioAutoplayManager = new AudioAutoplayManager();

// Export classes for testing
export { NotificationManager, WakeLockManager, PWAManager, AudioAutoplayManager };
