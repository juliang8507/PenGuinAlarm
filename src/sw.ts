/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Extended NotificationOptions for mobile browsers
interface ExtendedNotificationOptions extends NotificationOptions {
    vibrate?: number[];
    actions?: Array<{ action: string; title: string; icon?: string }>;
}

// Periodic Sync Event type (experimental API)
interface PeriodicSyncEvent extends Event {
    tag: string;
    waitUntil(promise: Promise<void>): void;
}

// Workbox precaching - VitePWA will inject manifest here
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ============================================
// Simple i18n for Service Worker
// ============================================
const swTranslations = {
    ko: {
        alarmBody: '알람 시간입니다! 탭하여 앱을 열어주세요.',
        alarmBodyShort: '알람 시간입니다!',
        open: '열기',
        snooze: '스누즈',
    },
    en: {
        alarmBody: "It's alarm time! Tap to open the app.",
        alarmBodyShort: "It's alarm time!",
        open: 'Open',
        snooze: 'Snooze',
    },
};

function getSwLang(): 'ko' | 'en' {
    // Use synced user language setting if available (fixes navigator.language mismatch)
    if (alarmSchedule.language) {
        return alarmSchedule.language;
    }
    // Fallback to navigator.language (for when SW starts before sync)
    const lang = navigator.language?.toLowerCase() || 'en';
    return lang.startsWith('ko') ? 'ko' : 'en';
}

function swT(key: keyof typeof swTranslations.en): string {
    return swTranslations[getSwLang()][key];
}

// Runtime caching for weather API
registerRoute(
    /^https:\/\/api\.open-meteo\.com\/.*/i,
    new NetworkFirst({
        cacheName: 'weather-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 hour
            }),
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
        ],
    })
);

// ============================================
// Alarm Schedule Logic
// ============================================

interface AlarmSchedule {
    nextAlarmTime: string | null;
    snoozeEndTime: string | null;
    enabled: boolean;
    vibrationPattern?: number[];
    // Recurrence config for SW to calculate next alarm
    alarmHour?: number;
    alarmMinute?: number;
    recurrence?: 'daily' | 'every-other-day';
    startDate?: string; // ISO string
    // Snooze limit enforcement (synced from client)
    snoozeCount?: number;
    snoozeLimit?: number;
    // User's language setting (synced from client, fixes navigator.language mismatch)
    language?: 'ko' | 'en';
}

// Alarm schedule state (synced from main app)
let alarmSchedule: AlarmSchedule = {
    nextAlarmTime: null,
    snoozeEndTime: null,
    enabled: false,
};

// Track last triggered alarm time to prevent duplicate notifications
let lastTriggeredAlarmTime: string | null = null;
let lastTriggeredSnoozeTime: string | null = null;

// Periodic alarm check interval (runs every 30 seconds when alarm is active)
let alarmCheckInterval: ReturnType<typeof setInterval> | null = null;

// IndexedDB Configuration
const DB_NAME = 'nebula-alarm-db';
const DB_VERSION = 2; // Unified schema with all stores
const STORE_NAME = 'alarm-store';
const SETTINGS_STORE_NAME = 'alarm-settings'; // Also create for storage.ts

// Helper to open DB
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            // Create schedule store for SW/alarmPersistence
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
            // Create settings store for main app storage
            if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
                db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

// Helper to get schedule from DB
async function getScheduleFromDB(): Promise<AlarmSchedule | null> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get('schedule');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result as AlarmSchedule | null);
        });
    } catch (e) {
        console.error('[SW] Failed to read from DB:', e);
        return null;
    }
}

// Helper to save schedule to DB
async function saveScheduleToDB(schedule: AlarmSchedule): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(schedule, 'schedule');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (e) {
        console.error('[SW] Failed to save to DB:', e);
    }
}

// Restore schedule on startup
getScheduleFromDB().then(savedSchedule => {
    if (savedSchedule) {
        console.log('[SW] Restored schedule from DB:', savedSchedule);
        alarmSchedule = savedSchedule;
        if (alarmSchedule.enabled || alarmSchedule.snoozeEndTime) {
            startAlarmCheckInterval();
        }
    }
});

function startAlarmCheckInterval(): void {
    if (alarmCheckInterval) return; // Already running

    alarmCheckInterval = setInterval(() => {
        if (alarmSchedule.enabled || alarmSchedule.snoozeEndTime) {
            checkAndNotifyAlarm();
        }
    }, 30000); // Check every 30 seconds

    console.log('[SW] Started periodic alarm check interval');
}

function stopAlarmCheckInterval(): void {
    if (alarmCheckInterval) {
        clearInterval(alarmCheckInterval);
        alarmCheckInterval = null;
        console.log('[SW] Stopped periodic alarm check interval');
    }
}

// Calculate next alarm time based on recurrence config (vanilla JS, no date-fns)
function calculateNextAlarmTime(schedule: AlarmSchedule, from: Date = new Date()): Date | null {
    if (!schedule.enabled || schedule.alarmHour === undefined || schedule.alarmMinute === undefined) {
        return null;
    }

    const { alarmHour, alarmMinute, recurrence, startDate } = schedule;

    // Create alarm time for today
    const alarmTime = new Date(from);
    alarmTime.setHours(alarmHour, alarmMinute, 0, 0);

    // If alarm time has passed today, move to tomorrow
    if (alarmTime <= from) {
        alarmTime.setDate(alarmTime.getDate() + 1);
    }

    // Handle every-other-day recurrence
    if (recurrence === 'every-other-day' && startDate) {
        const refDate = new Date(startDate);
        refDate.setHours(0, 0, 0, 0);

        // Find next valid every-other-day alarm
        while (true) {
            const alarmDateMidnight = new Date(alarmTime);
            alarmDateMidnight.setHours(0, 0, 0, 0);

            // Calculate days difference from start date (DST-safe using UTC)
            // Using UTC avoids DST issues where days can be 23 or 25 hours
            const utcAlarm = Date.UTC(alarmDateMidnight.getFullYear(), alarmDateMidnight.getMonth(), alarmDateMidnight.getDate());
            const utcRef = Date.UTC(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
            const daysDiff = Math.round((utcAlarm - utcRef) / (1000 * 60 * 60 * 24));

            // Check if this is a valid every-other-day (even days from start)
            if (daysDiff % 2 === 0) {
                break;
            }

            // Move to next day
            alarmTime.setDate(alarmTime.getDate() + 1);
        }
    }

    return alarmTime;
}

// Message handler for communication with main app
self.addEventListener('message', (event: ExtendableMessageEvent) => {
    const { type, schedule } = event.data || {};

    switch (type) {
        case 'SYNC_ALARM_SCHEDULE':
            // Update local alarm schedule from main app
            if (schedule) {
                // Reset triggered trackers if alarm time changed
                if (schedule.nextAlarmTime !== alarmSchedule.nextAlarmTime) {
                    lastTriggeredAlarmTime = null;
                }
                if (schedule.snoozeEndTime !== alarmSchedule.snoozeEndTime) {
                    lastTriggeredSnoozeTime = null;
                }

                alarmSchedule = {
                    nextAlarmTime: schedule.nextAlarmTime,
                    snoozeEndTime: schedule.snoozeEndTime,
                    enabled: schedule.enabled,
                    vibrationPattern: schedule.vibrationPattern,
                    // Recurrence config for calculating next alarm
                    alarmHour: schedule.alarmHour,
                    alarmMinute: schedule.alarmMinute,
                    recurrence: schedule.recurrence,
                    startDate: schedule.startDate,
                    // BUG FIX: Sync snooze limit enforcement from client
                    snoozeCount: schedule.snoozeCount ?? 0,
                    snoozeLimit: schedule.snoozeLimit ?? 3,
                    // User's language setting (fixes navigator.language mismatch)
                    language: schedule.language,
                };
                console.log('[SW] Alarm schedule synced:', alarmSchedule);

                // Save to IndexedDB for persistence
                saveScheduleToDB(alarmSchedule);

                // Start/stop periodic check based on whether alarm is active
                if (schedule.enabled || schedule.snoozeEndTime) {
                    startAlarmCheckInterval();
                } else {
                    stopAlarmCheckInterval();
                }
            }
            break;

        case 'CHECK_ALARM':
            // Main app is requesting alarm check (e.g., on visibility change)
            checkAndNotifyAlarm();
            break;

        case 'SKIP_WAITING':
            // New version available - skip waiting and activate immediately
            self.skipWaiting();
            break;

        default:
            break;
    }
});

// Check if alarm should trigger and notify clients
async function checkAndNotifyAlarm(): Promise<void> {
    const now = Date.now();

    // Check snooze first (higher priority)
    if (alarmSchedule.snoozeEndTime) {
        const snoozeEnd = new Date(alarmSchedule.snoozeEndTime).getTime();
        const diff = snoozeEnd - now;

        // Snooze expired - trigger alarm (only if not already triggered for this snooze)
        if (diff <= 0 && alarmSchedule.snoozeEndTime !== lastTriggeredSnoozeTime) {
            console.log('[SW] Snooze expired, notifying clients');
            lastTriggeredSnoozeTime = alarmSchedule.snoozeEndTime;
            await notifyClients('ALARM_CHECK', { reason: 'snooze_expired' });

            // Clear snooze after triggering to prevent re-triggering
            alarmSchedule.snoozeEndTime = null;

            // BUG FIX: Prevent duplicate trigger from stale nextAlarmTime
            // Race condition: If client syncs stale nextAlarmTime during snooze,
            // the regular alarm check would fire immediately after snooze expires.
            // Solution: If nextAlarmTime is in the past, recalculate it now or
            // mark it as already triggered to prevent duplicate notification.
            if (alarmSchedule.nextAlarmTime) {
                const nextAlarmTime = new Date(alarmSchedule.nextAlarmTime).getTime();
                if (nextAlarmTime <= Date.now()) {
                    // nextAlarmTime is stale (in the past) - recalculate to next valid time
                    const nextAlarm = calculateNextAlarmTime(alarmSchedule, new Date());
                    if (nextAlarm) {
                        alarmSchedule.nextAlarmTime = nextAlarm.toISOString();
                        console.log('[SW] Recalculated stale nextAlarmTime after snooze:', alarmSchedule.nextAlarmTime);
                    } else {
                        // No next alarm (non-recurring or no valid days) - mark as triggered
                        lastTriggeredAlarmTime = alarmSchedule.nextAlarmTime;
                        console.log('[SW] Marked stale nextAlarmTime as triggered to prevent duplicate');
                    }
                }
            }

            await saveScheduleToDB(alarmSchedule);
            return;
        }
    }

    // Check regular alarm
    if (alarmSchedule.enabled && alarmSchedule.nextAlarmTime) {
        const alarmTime = new Date(alarmSchedule.nextAlarmTime).getTime();
        const diff = alarmTime - now;

        // Alarm time passed - trigger alarm (only if not already triggered for this time)
        if (diff <= 0 && alarmSchedule.nextAlarmTime !== lastTriggeredAlarmTime) {
            console.log('[SW] Alarm time passed, notifying clients');
            lastTriggeredAlarmTime = alarmSchedule.nextAlarmTime;
            await notifyClients('ALARM_CHECK', { reason: 'alarm_time' });

            // BUG FIX: Calculate and save the next alarm time for recurring alarms
            const nextAlarm = calculateNextAlarmTime(alarmSchedule, new Date());
            if (nextAlarm) {
                alarmSchedule.nextAlarmTime = nextAlarm.toISOString();
                // BUG FIX: Reset snooze count for new alarm cycle
                alarmSchedule.snoozeCount = 0;
                console.log('[SW] Calculated next alarm time:', alarmSchedule.nextAlarmTime, '(snoozeCount reset to 0)');
                await saveScheduleToDB(alarmSchedule);
                // Notify clients of the new nextAlarmTime so they don't overwrite it with stale data
                await notifyClients('NEXT_ALARM_UPDATED', { nextAlarmTime: alarmSchedule.nextAlarmTime });
            }
            return;
        }
    }
}

// Send message to all connected clients
async function notifyClients(type: string, data: Record<string, unknown> = {}): Promise<void> {
    const clients = await self.clients.matchAll({ type: 'window' });

    for (const client of clients) {
        client.postMessage({ type, ...data });
    }

    // If no clients are open, show notification to bring user back
    if (clients.length === 0 && (data.reason === 'snooze_expired' || data.reason === 'alarm_time')) {
        await showBackgroundAlarmNotification();
    }
}

// Show alarm notification when app is not open
async function showBackgroundAlarmNotification(): Promise<void> {
    try {
        // Only vibrate if user has explicitly set a pattern
        // undefined/null means vibration is OFF (user disabled it)
        const hasVibration = alarmSchedule.vibrationPattern && alarmSchedule.vibrationPattern.length > 0;

        const options: ExtendedNotificationOptions = {
            body: swT('alarmBody'),
            icon: '/penguin-icon-192.jpg',
            badge: '/penguin-icon-192.jpg',
            tag: 'nebula-alarm-background',
            requireInteraction: true,
            // Only include vibrate property if user has enabled vibration
            ...(hasVibration ? { vibrate: alarmSchedule.vibrationPattern } : {}),
            actions: [
                { action: 'open', title: swT('open') },
                { action: 'snooze', title: swT('snooze') },
            ],
        };
        await self.registration.showNotification('PenGuin Alarm', options as NotificationOptions);
    } catch (e) {
        console.error('[SW] Failed to show background notification:', e);
    }
}

// Handle snooze directly in SW (doesn't depend on client being ready)
// Returns true if snooze was set, false if limit reached
async function handleSnoozeInSW(snoozeDurationMinutes: number = 5): Promise<boolean> {
    // Check snooze limit before allowing snooze
    const currentSnoozeCount = alarmSchedule.snoozeCount ?? 0;
    const snoozeLimit = alarmSchedule.snoozeLimit ?? 3; // Default to 3 if not set

    if (currentSnoozeCount >= snoozeLimit) {
        console.log('[SW] Snooze limit reached:', currentSnoozeCount, '>=', snoozeLimit);
        return false; // Don't allow more snoozes
    }

    const snoozeEndTime = new Date(Date.now() + snoozeDurationMinutes * 60 * 1000).toISOString();

    // Update alarm schedule with snooze and increment count
    alarmSchedule.snoozeEndTime = snoozeEndTime;
    alarmSchedule.snoozeCount = currentSnoozeCount + 1;
    lastTriggeredSnoozeTime = null; // Reset so it can trigger again

    // Persist to IndexedDB
    await saveScheduleToDB(alarmSchedule);

    // Ensure alarm check interval is running
    startAlarmCheckInterval();

    console.log('[SW] Snooze set directly in SW, count:', alarmSchedule.snoozeCount, '/', snoozeLimit, 'will trigger at:', snoozeEndTime);
    return true;
}

// Notification click handler
self.addEventListener('notificationclick', (event: NotificationEvent) => {
    const notification = event.notification;
    const action = event.action;

    notification.close();

    // Handle snooze action directly in SW (critical for reliability)
    if (action === 'snooze') {
        event.waitUntil(
            handleSnoozeInSW(5).then((snoozeAllowed) => {
                // Also notify client if available (for UI sync)
                return self.clients.matchAll({ type: 'window' }).then((clients) => {
                    if (snoozeAllowed) {
                        // Snooze was successful - notify client to sync state
                        if (clients.length > 0) {
                            const client = clients[0] as WindowClient;
                            client.focus();
                            client.postMessage({
                                type: 'SNOOZE_SET_BY_SW',
                                snoozeEndTime: alarmSchedule.snoozeEndTime,
                                snoozeCount: alarmSchedule.snoozeCount,
                            });
                        }
                        // Don't open new window for snooze - let user sleep
                    } else {
                        // Snooze limit reached - notify client or open app to complete mission
                        if (clients.length > 0) {
                            const client = clients[0] as WindowClient;
                            client.focus();
                            client.postMessage({
                                type: 'SNOOZE_LIMIT_REACHED',
                            });
                        } else {
                            // No client open - open app so user must complete mission
                            self.clients.openWindow('/');
                        }
                    }
                });
            })
        );
        return;
    }

    // For other actions (click, open, dismiss), send to client
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            // Focus existing window or open new one
            if (clients.length > 0) {
                const client = clients[0] as WindowClient;
                client.focus();
                client.postMessage({
                    type: 'NOTIFICATION_ACTION',
                    action: action || 'click',
                });
            } else {
                self.clients.openWindow('/').then((client) => {
                    // Delay message to allow app initialization
                    setTimeout(() => {
                        if (client) {
                            client.postMessage({
                                type: 'NOTIFICATION_ACTION',
                                action: action || 'click',
                            });
                        }
                    }, 1000);
                });
            }
        })
    );
});

// Push event for future server-sent notifications
self.addEventListener('push', (event: PushEvent) => {
    const data = event.data?.json() || {
        title: 'PenGuin Alarm',
        body: swT('alarmBodyShort'),
    };

    // Use vibration pattern from push data, fall back to user's stored setting
    // Only vibrate if user has explicitly set a pattern (undefined/null means vibration OFF)
    const vibrationPattern = data.vibrationPattern ?? alarmSchedule.vibrationPattern;
    const hasVibration = vibrationPattern && vibrationPattern.length > 0;

    const options: ExtendedNotificationOptions = {
        body: data.body,
        icon: '/penguin-icon-192.jpg',
        badge: '/penguin-icon-192.jpg',
        tag: 'nebula-alarm',
        requireInteraction: true,
        // Only include vibrate property if user has enabled vibration
        ...(hasVibration ? { vibrate: vibrationPattern } : {}),
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options as NotificationOptions)
    );
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync' as keyof ServiceWorkerGlobalScopeEventMap, ((event: PeriodicSyncEvent) => {
    if (event.tag === 'alarm-check') {
        event.waitUntil(checkAndNotifyAlarm());
    }
}) as EventListener);
