// IndexedDB + localStorage fallback for alarm state persistence

const DB_NAME = 'nebula-alarm-db';
const DB_VERSION = 1;
const STORE_NAME = 'alarm-settings';
const LS_KEY = 'nebula-alarm-settings';

export interface AlarmSettings {
    alarmTime: string | null; // ISO string
    recurrence: 'daily' | 'every-other-day';
    startDate: string; // ISO string
    customSoundName: string | null;
    customSoundData: string | null; // Base64 encoded audio
    volume: number;
    fadeDuration: number;
    soundPreset: string;
    snoozeLimit: number;
    missionDifficulty: 'easy' | 'medium' | 'hard';
    missionType: 'math' | 'memory' | 'puzzle' | 'typing' | 'qr' | 'photo' | 'random';
    use24Hour: boolean;
    language: 'ko' | 'en';
    // Persistence for recovery
    snoozeEndTime: string | null; // ISO string
    snoozeCount: number;
    nextAlarmTime: string | null; // ISO string
    // Optional features
    weatherEnabled: boolean; // User opt-in for geolocation/weather
    vibrationPattern: 'heartbeat' | 'ticktock' | 'rapid' | 'sos' | 'continuous' | 'off';
    qrRegisteredCode: string | null; // For QR mission
}

export const defaultSettings: AlarmSettings = {
    alarmTime: null,
    recurrence: 'daily',
    startDate: new Date().toISOString(),
    customSoundName: null,
    customSoundData: null,
    volume: 0.7,
    fadeDuration: 30,
    soundPreset: 'ethereal',
    snoozeLimit: 3,
    missionDifficulty: 'medium',
    missionType: 'math',
    use24Hour: true,
    language: 'ko',
    snoozeEndTime: null,
    snoozeCount: 0,
    nextAlarmTime: null,
    weatherEnabled: false, // Disabled by default for privacy
    vibrationPattern: 'heartbeat',
    qrRegisteredCode: null,
};

class AlarmStorage {
    private db: IDBDatabase | null = null;
    private useIndexedDB = true;

    async init(): Promise<void> {
        try {
            this.db = await this.openDB();
        } catch {
            console.warn('IndexedDB not available, falling back to localStorage');
            this.useIndexedDB = false;
        }
    }

    private openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }

    async save(settings: AlarmSettings): Promise<void> {
        if (this.useIndexedDB && this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put({ id: 'settings', ...settings });

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } else {
            localStorage.setItem(LS_KEY, JSON.stringify(settings));
        }
    }

    async load(): Promise<AlarmSettings> {
        if (this.useIndexedDB && this.db) {
            return new Promise((resolve) => {
                const transaction = this.db!.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get('settings');

                request.onerror = () => resolve(defaultSettings);
                request.onsuccess = () => {
                    if (request.result) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { id, ...settings } = request.result;
                        resolve({ ...defaultSettings, ...settings });
                    } else {
                        resolve(defaultSettings);
                    }
                };
            });
        } else {
            const data = localStorage.getItem(LS_KEY);
            if (data) {
                try {
                    return { ...defaultSettings, ...JSON.parse(data) };
                } catch {
                    return defaultSettings;
                }
            }
            return defaultSettings;
        }
    }

    async clear(): Promise<void> {
        if (this.useIndexedDB && this.db) {
            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete('settings');

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } else {
            localStorage.removeItem(LS_KEY);
        }
    }

    // Convert File to base64 for storage
    async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Convert base64 back to ArrayBuffer for audio
    base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = atob(base64.split(',')[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

export const alarmStorage = new AlarmStorage();
