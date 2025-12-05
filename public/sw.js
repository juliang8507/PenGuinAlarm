// Service Worker for Nebula Alarm
// Handles background notifications, caching, and alarm schedule monitoring

const CACHE_NAME = 'nebula-alarm-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/nebula-icon-192.png',
    '/nebula-icon-512.png',
    // Penguin Theme Assets
    '/assets/penguin/idle.png',
    '/assets/penguin/sleeping.png',
    '/assets/penguin/waking.png',
    '/assets/penguin/bg-day.png',
    '/assets/penguin/bg-night.png',
    '/assets/penguin/bg-snowy.png',
];

// Alarm schedule state (synced from main app)
let alarmSchedule = {
    nextAlarmTime: null,
    snoozeEndTime: null,
    enabled: false,
};

// Periodic alarm check interval (runs every 30 seconds when alarm is active)
let alarmCheckInterval = null;

function startAlarmCheckInterval() {
    if (alarmCheckInterval) return; // Already running

    alarmCheckInterval = setInterval(() => {
        if (alarmSchedule.enabled || alarmSchedule.snoozeEndTime) {
            checkAndNotifyAlarm();
        }
    }, 30000); // Check every 30 seconds

    console.log('[SW] Started periodic alarm check interval');
}

function stopAlarmCheckInterval() {
    if (alarmCheckInterval) {
        clearInterval(alarmCheckInterval);
        alarmCheckInterval = null;
        console.log('[SW] Stopped periodic alarm check interval');
    }
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
    const { type, schedule } = event.data || {};

    switch (type) {
        case 'SYNC_ALARM_SCHEDULE':
            // Update local alarm schedule from main app
            if (schedule) {
                alarmSchedule = {
                    nextAlarmTime: schedule.nextAlarmTime,
                    snoozeEndTime: schedule.snoozeEndTime,
                    enabled: schedule.enabled,
                };
                console.log('[SW] Alarm schedule synced:', alarmSchedule);

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
async function checkAndNotifyAlarm() {
    const now = Date.now();

    // Check snooze first (higher priority)
    if (alarmSchedule.snoozeEndTime) {
        const snoozeEnd = new Date(alarmSchedule.snoozeEndTime).getTime();
        const diff = snoozeEnd - now;

        // Snooze expired within last 2 minutes - trigger alarm
        if (diff <= 0 && diff > -120000) {
            console.log('[SW] Snooze expired, notifying clients');
            await notifyClients('ALARM_CHECK', { reason: 'snooze_expired' });
            return;
        }
    }

    // Check regular alarm
    if (alarmSchedule.enabled && alarmSchedule.nextAlarmTime) {
        const alarmTime = new Date(alarmSchedule.nextAlarmTime).getTime();
        const diff = alarmTime - now;

        // Alarm time passed within last 2 minutes - trigger alarm
        if (diff <= 0 && diff > -120000) {
            console.log('[SW] Alarm time passed, notifying clients');
            await notifyClients('ALARM_CHECK', { reason: 'alarm_time' });
            return;
        }
    }
}

// Send message to all connected clients
async function notifyClients(type, data = {}) {
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
async function showBackgroundAlarmNotification() {
    try {
        await self.registration.showNotification('Nebula Alarm', {
            body: '알람 시간입니다! 탭하여 앱을 열어주세요.',
            icon: '/nebula-icon-192.png',
            badge: '/nebula-icon-192.png',
            tag: 'nebula-alarm-background',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200, 100, 200],
            actions: [
                { action: 'open', title: '열기' },
                { action: 'snooze', title: '스누즈' },
            ],
        });
    } catch (e) {
        console.error('[SW] Failed to show background notification:', e);
    }
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const action = event.action;

    notification.close();

    // Send action to client
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            // Focus existing window or open new one
            if (clients.length > 0) {
                const client = clients[0];
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
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {
        title: 'Nebula Alarm',
        body: '알람 시간입니다!',
    };

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/nebula-icon-192.png',
            badge: '/nebula-icon-192.png',
            tag: 'nebula-alarm',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
        })
    );
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'alarm-check') {
        event.waitUntil(checkAndNotifyAlarm());
    }
});
