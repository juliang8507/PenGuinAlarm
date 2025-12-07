// Notification API, Wake Lock, and PWA support for Nebula Alarm

import { t } from './i18n';

// Notification permission state
export type NotificationPermission = 'default' | 'granted' | 'denied';

// Extended schedule type that includes recurrence config for SW
interface AlarmScheduleSync {
    nextAlarmTime: string | null;
    snoozeEndTime: string | null;
    enabled: boolean;
    vibrationPattern?: number[];
    alarmHour?: number;
    alarmMinute?: number;
    recurrence?: 'daily' | 'every-other-day';
    startDate?: string;
    // Snooze limit enforcement (synced to SW for background snooze handling)
    snoozeCount?: number;
    snoozeLimit?: number;
    // User's language setting (synced to SW for correct notification language)
    language?: 'ko' | 'en';
}

class NotificationManager {
    private swRegistration: ServiceWorkerRegistration | null = null;
    private updateAvailableCallback: (() => void) | null = null;
    // Track fallback notification when SW is not available
    private fallbackNotification: Notification | null = null;
    // Store pending schedule to sync when SW becomes ready (fixes race condition)
    private pendingSchedule: AlarmScheduleSync | null = null;
    // Store notification action callback for fallback notifications (when SW unavailable)
    private notificationActionCallback: ((action: string, reason?: string, data?: { nextAlarmTime?: string; snoozeEndTime?: string; snoozeCount?: number }) => void) | null = null;

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
     * @param vibrationPattern - Optional vibration pattern from user settings. undefined/null means no vibration.
     */
    public async showAlarmNotification(vibrationPattern?: number[] | null): Promise<void> {
        if (!this.isSupported() || this.getPermission() !== 'granted') return;

        const options: NotificationOptions & {
            vibrate?: number[];
            actions?: Array<{ action: string; title: string; icon?: string }>;
        } = {
            body: t('notificationBody'),
            icon: '/penguin-icon-192.png',
            badge: '/penguin-icon-192.png',
            tag: 'nebula-alarm',
            requireInteraction: true,
            // Only include vibrate if user has set a pattern (undefined/null means vibration is off)
            ...(vibrationPattern && vibrationPattern.length > 0 ? { vibrate: vibrationPattern } : {}),
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
                // Store fallback notification so it can be closed later
                // Note: actions property only works with SW notifications, not with new Notification()
                // For fallback, clicking notification body triggers 'open' action
                this.fallbackNotification = new Notification(t('notificationTitle'), options);

                // Add click handler for fallback notification
                // Since actions don't work, clicking the notification body opens the app and triggers alarm
                this.fallbackNotification.onclick = () => {
                    console.log('[NotificationManager] Fallback notification clicked');
                    // Focus the app window
                    window.focus();
                    // Trigger 'open' action to activate alarm in foreground
                    if (this.notificationActionCallback) {
                        this.notificationActionCallback('open');
                    }
                    // Close the notification
                    this.fallbackNotification?.close();
                    this.fallbackNotification = null;
                };
            }
        } catch (e) {
            console.error('Failed to show notification:', e);
        }
    }

    /**
     * Close alarm notifications (both foreground and background tags)
     */
    public async closeAlarmNotification(): Promise<void> {
        // Close fallback notification if it exists (when SW wasn't available)
        if (this.fallbackNotification) {
            this.fallbackNotification.close();
            this.fallbackNotification = null;
        }

        if (this.swRegistration) {
            // Close foreground alarm notifications
            const foregroundNotifications = await this.swRegistration.getNotifications({ tag: 'nebula-alarm' });
            foregroundNotifications.forEach(notification => notification.close());

            // Also close background alarm notifications (from SW)
            const backgroundNotifications = await this.swRegistration.getNotifications({ tag: 'nebula-alarm-background' });
            backgroundNotifications.forEach(notification => notification.close());
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
     * Set existing service worker registration (e.g., from VitePWA)
     * Use this when SW is registered externally but we need to use it for notifications
     */
    public setServiceWorker(registration: ServiceWorkerRegistration): void {
        this.swRegistration = registration;
        console.log('Service Worker set from external registration');

        // Sync pending schedule if there was one waiting for SW to be ready
        if (this.pendingSchedule && registration.active) {
            console.log('Syncing pending alarm schedule to newly ready SW');
            this.syncAlarmSchedule(this.pendingSchedule);
            this.pendingSchedule = null;
        }

        // Set up update listeners on the existing registration
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New Service Worker available');
                    this.updateAvailableCallback?.();
                }
            });
        });

        // Check if there's already a waiting worker
        if (registration.waiting && navigator.serviceWorker.controller) {
            console.log('Service Worker update waiting on load');
            this.updateAvailableCallback?.();
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
    public onNotificationAction(callback: (action: string, reason?: string, data?: { nextAlarmTime?: string; snoozeEndTime?: string; snoozeCount?: number }) => void): () => void {
        // Store callback for fallback notifications (when SW unavailable)
        this.notificationActionCallback = callback;

        if (!('serviceWorker' in navigator)) return () => {
            this.notificationActionCallback = null;
        };

        const handler = (event: MessageEvent) => {
            if (event.data?.type === 'NOTIFICATION_ACTION') {
                callback(event.data.action);
            } else if (event.data?.type === 'ALARM_CHECK') {
                // SW is requesting alarm state check (after wake/visibility change)
                // Pass reason to distinguish between alarm_time and snooze_expired
                callback('alarm_check', event.data.reason);
            } else if (event.data?.type === 'NEXT_ALARM_UPDATED') {
                // SW calculated new nextAlarmTime after alarm triggered - sync to client
                callback('next_alarm_updated', undefined, { nextAlarmTime: event.data.nextAlarmTime });
            } else if (event.data?.type === 'SNOOZE_SET_BY_SW') {
                // SW handled snooze directly (from notification action when app was in background)
                // Client needs to sync state: stop audio, release wake lock, update snoozeEndTime/snoozeCount
                callback('snooze_set_by_sw', undefined, {
                    snoozeEndTime: event.data.snoozeEndTime,
                    snoozeCount: event.data.snoozeCount,
                });
            } else if (event.data?.type === 'SNOOZE_LIMIT_REACHED') {
                // SW tried to snooze but limit was reached - client should trigger wake up flow
                callback('snooze_limit_reached');
            }
        };

        navigator.serviceWorker.addEventListener('message', handler);

        // Return cleanup function
        return () => {
            navigator.serviceWorker.removeEventListener('message', handler);
            this.notificationActionCallback = null;
        };
    }

    /**
     * Send alarm schedule to Service Worker for background monitoring
     */
    public async syncAlarmSchedule(schedule: {
        nextAlarmTime: string | null;
        snoozeEndTime: string | null;
        enabled: boolean;
        vibrationPattern?: number[];
        alarmHour?: number;
        alarmMinute?: number;
        recurrence?: 'daily' | 'every-other-day';
        startDate?: string;
        snoozeCount?: number;
        snoozeLimit?: number;
        language?: 'ko' | 'en';
    }): Promise<void> {
        // Store as pending if SW not ready yet (fixes race condition on initial load)
        if (!this.swRegistration?.active) {
            console.log('SW not ready, storing pending schedule for later sync');
            this.pendingSchedule = schedule as AlarmScheduleSync;
            return;
        }

        // Clear any pending schedule since we're syncing now
        this.pendingSchedule = null;

        try {
            this.swRegistration.active.postMessage({
                type: 'SYNC_ALARM_SCHEDULE',
                schedule,
            });

            // Register/unregister Periodic Background Sync based on alarm state
            await this.managePeriodicSync(schedule.enabled || !!schedule.snoozeEndTime);
        } catch (e) {
            console.error('Failed to sync alarm schedule with SW:', e);
        }
    }

    /**
     * Manage Periodic Background Sync registration
     * This helps wake up the SW periodically when alarm is active
     */
    private async managePeriodicSync(enabled: boolean): Promise<void> {
        if (!this.swRegistration) return;

        // Check if Periodic Background Sync is supported
        const periodicSync = (this.swRegistration as ServiceWorkerRegistration & {
            periodicSync?: {
                register(tag: string, options?: { minInterval: number }): Promise<void>;
                unregister(tag: string): Promise<void>;
                getTags(): Promise<string[]>;
            };
        }).periodicSync;

        if (!periodicSync) {
            console.log('Periodic Background Sync not supported');
            return;
        }

        try {
            if (enabled) {
                // Request permission for periodic sync
                const status = await navigator.permissions.query({
                    name: 'periodic-background-sync' as PermissionName,
                });

                if (status.state === 'granted') {
                    // Register with minimum interval (browser may throttle this)
                    await periodicSync.register('alarm-check', {
                        minInterval: 60 * 1000, // Request 1 minute, browser will likely throttle
                    });
                    console.log('Periodic Background Sync registered for alarm-check');
                } else {
                    console.log('Periodic Background Sync permission not granted:', status.state);
                }
            } else {
                // Unregister when alarm is disabled
                const tags = await periodicSync.getTags();
                if (tags.includes('alarm-check')) {
                    await periodicSync.unregister('alarm-check');
                    console.log('Periodic Background Sync unregistered');
                }
            }
        } catch (e) {
            // Periodic sync may not be available in all browsers
            console.log('Periodic Background Sync management failed:', e);
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
    private shouldAutoReacquire = false; // Only re-acquire on visibility change when alarm is active

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
     * Only re-acquires if shouldAutoReacquire is true (alarm is active)
     */
    public setupVisibilityHandler(): void {
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && !this.wakeLock && this.shouldAutoReacquire) {
                // Re-acquire only if alarm is active and we should maintain wake lock
                await this.acquire();
            }
        });
    }

    /**
     * Enable auto-reacquisition of wake lock on visibility change
     * Call this when alarm becomes active
     */
    public enableAutoReacquire(): void {
        this.shouldAutoReacquire = true;
    }

    /**
     * Disable auto-reacquisition of wake lock on visibility change
     * Call this when alarm is stopped/snoozed
     */
    public disableAutoReacquire(): void {
        this.shouldAutoReacquire = false;
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

    /**
     * Clear pending play callback
     * Call this when alarm is stopped/snoozed to prevent
     * unexpected playback after user interaction
     */
    public clearPendingPlay(): void {
        this.pendingPlay = null;
    }
}

// Export singleton instances
export const notificationManager = new NotificationManager();
export const wakeLockManager = new WakeLockManager();
export const pwaManager = new PWAManager();
export const audioAutoplayManager = new AudioAutoplayManager();

// Export classes for testing
export { NotificationManager, WakeLockManager, PWAManager, AudioAutoplayManager };
