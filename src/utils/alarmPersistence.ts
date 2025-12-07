export interface AlarmSchedule {
    nextAlarmTime: string | null;
    snoozeEndTime: string | null;
    enabled: boolean;
    vibrationPattern?: number[];
    // Recurrence config for SW to calculate next alarm
    alarmHour?: number;
    alarmMinute?: number;
    recurrence?: 'daily' | 'every-other-day';
    startDate?: string; // ISO string
    // Snooze limit enforcement (synced to/from SW for background snooze handling)
    snoozeCount?: number;
    snoozeLimit?: number;
    // User's language setting (synced to SW for correct notification language)
    language?: 'ko' | 'en';
}

const DB_NAME = 'nebula-alarm-db';
const DB_VERSION = 2; // Unified schema with all stores
const STORE_NAME = 'alarm-store';
const SETTINGS_STORE_NAME = 'alarm-settings'; // Also create for storage.ts

const openDB = (): Promise<IDBDatabase> => {
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
};

export const saveAlarmSchedule = async (schedule: AlarmSchedule): Promise<void> => {
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
        console.error('Failed to save alarm schedule to IndexedDB:', e);
    }
};

export const getAlarmSchedule = async (): Promise<AlarmSchedule | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get('schedule');

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    } catch (e) {
        console.error('Failed to load alarm schedule from IndexedDB:', e);
        return null;
    }
};
