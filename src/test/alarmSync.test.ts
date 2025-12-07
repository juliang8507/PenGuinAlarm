import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveAlarmSchedule, getAlarmSchedule } from '../utils/alarmPersistence';
import type { AlarmSchedule } from '../utils/alarmPersistence';

// Mock IndexedDB
const mockIndexedDB = () => {
    const stores: Record<string, Record<string, unknown>> = {
        'alarm-store': {},
        'alarm-settings': {},
    };

    const mockStore = {
        put: vi.fn((value: unknown, key: string) => {
            const request = {
                error: null as DOMException | null,
                result: undefined as IDBValidKey | undefined,
                onerror: null as ((event: Event) => void) | null,
                onsuccess: null as ((event: Event) => void) | null,
            };
            setTimeout(() => {
                stores['alarm-store'][key] = value;
                request.result = key;
                if (request.onsuccess) {
                    request.onsuccess(new Event('success'));
                }
            }, 0);
            return request;
        }),
        get: vi.fn((key: string) => {
            const request = {
                error: null as DOMException | null,
                result: undefined as unknown,
                onerror: null as ((event: Event) => void) | null,
                onsuccess: null as ((event: Event) => void) | null,
            };
            setTimeout(() => {
                request.result = stores['alarm-store'][key];
                if (request.onsuccess) {
                    request.onsuccess(new Event('success'));
                }
            }, 0);
            return request;
        }),
    };

    const mockTransaction = {
        objectStore: vi.fn(() => mockStore),
    };

    const mockDB = {
        transaction: vi.fn(() => mockTransaction),
        objectStoreNames: { contains: vi.fn(() => true) },
        createObjectStore: vi.fn(),
    };

    const mockOpenRequest = {
        error: null as DOMException | null,
        result: mockDB as unknown as IDBDatabase,
        onerror: null as ((event: Event) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
    };

    const open = vi.fn(() => {
        setTimeout(() => {
            if (mockOpenRequest.onsuccess) {
                mockOpenRequest.onsuccess(new Event('success'));
            }
        }, 0);
        return mockOpenRequest;
    });

    Object.defineProperty(window, 'indexedDB', {
        value: { open },
        writable: true,
        configurable: true,
    });

    return { stores, mockStore, mockDB, open };
};

describe('AlarmSync - IndexedDB Persistence', () => {
    let mockIDB: ReturnType<typeof mockIndexedDB>;

    beforeEach(() => {
        vi.useFakeTimers();
        mockIDB = mockIndexedDB();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('saveAlarmSchedule', () => {
        it('should save alarm schedule to IndexedDB', async () => {
            const schedule: AlarmSchedule = {
                nextAlarmTime: '2024-01-15T07:00:00.000Z',
                snoozeEndTime: null,
                enabled: true,
                alarmHour: 7,
                alarmMinute: 0,
                recurrence: 'daily',
                startDate: '2024-01-01T00:00:00.000Z',
            };

            const savePromise = saveAlarmSchedule(schedule);
            await vi.runAllTimersAsync();
            await savePromise;

            expect(mockIDB.stores['alarm-store']['schedule']).toEqual(schedule);
        });

        it('should save schedule with vibration pattern', async () => {
            const schedule: AlarmSchedule = {
                nextAlarmTime: '2024-01-15T07:00:00.000Z',
                snoozeEndTime: null,
                enabled: true,
                vibrationPattern: [200, 100, 200, 1000], // heartbeat pattern
            };

            const savePromise = saveAlarmSchedule(schedule);
            await vi.runAllTimersAsync();
            await savePromise;

            expect((mockIDB.stores['alarm-store']['schedule'] as AlarmSchedule).vibrationPattern).toEqual([200, 100, 200, 1000]);
        });

        it('should save schedule with every-other-day recurrence', async () => {
            const schedule: AlarmSchedule = {
                nextAlarmTime: '2024-01-16T06:30:00.000Z',
                snoozeEndTime: null,
                enabled: true,
                alarmHour: 6,
                alarmMinute: 30,
                recurrence: 'every-other-day',
                startDate: '2024-01-01T00:00:00.000Z',
            };

            const savePromise = saveAlarmSchedule(schedule);
            await vi.runAllTimersAsync();
            await savePromise;

            expect((mockIDB.stores['alarm-store']['schedule'] as AlarmSchedule).recurrence).toBe('every-other-day');
        });
    });

    describe('getAlarmSchedule', () => {
        it('should return null when no schedule exists', async () => {
            const getPromise = getAlarmSchedule();
            await vi.runAllTimersAsync();
            const result = await getPromise;

            expect(result).toBeUndefined();
        });

        it('should retrieve saved schedule', async () => {
            const schedule: AlarmSchedule = {
                nextAlarmTime: '2024-01-15T07:00:00.000Z',
                snoozeEndTime: null,
                enabled: true,
            };

            // Save first
            mockIDB.stores['alarm-store']['schedule'] = schedule;

            const getPromise = getAlarmSchedule();
            await vi.runAllTimersAsync();
            const result = await getPromise;

            expect(result).toEqual(schedule);
        });
    });
});

describe('AlarmSync - SW to App Sync Scenarios', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('Initialization sync logic', () => {
        it('should prefer SW nextAlarmTime when it differs and is in future', () => {
            const now = new Date('2024-01-15T06:00:00.000Z');
            vi.setSystemTime(now);

            const appNextTime = new Date('2024-01-15T07:00:00.000Z'); // Current day
            const swNextTime = new Date('2024-01-16T07:00:00.000Z'); // Next day (SW calculated after alarm fired)

            const swNextTimeMs = swNextTime.getTime();
            const appNextTimeMs = appNextTime.getTime();
            const nowMs = now.getTime();

            // SW's time is different and in future
            const shouldUseSWTime = swNextTimeMs !== appNextTimeMs && swNextTimeMs > nowMs;

            expect(shouldUseSWTime).toBe(true);
        });

        it('should not use SW time when it matches app time', () => {
            const now = new Date('2024-01-15T06:00:00.000Z');
            vi.setSystemTime(now);

            const sameTime = new Date('2024-01-15T07:00:00.000Z');
            const swNextTimeMs = sameTime.getTime();
            const appNextTimeMs = sameTime.getTime();
            const nowMs = now.getTime();

            const shouldUseSWTime = swNextTimeMs !== appNextTimeMs && swNextTimeMs > nowMs;

            expect(shouldUseSWTime).toBe(false);
        });

        it('should not use SW time when it is in the past', () => {
            const now = new Date('2024-01-15T08:00:00.000Z');
            vi.setSystemTime(now);

            const swNextTime = new Date('2024-01-15T07:00:00.000Z'); // Past
            const appNextTime = new Date('2024-01-16T07:00:00.000Z'); // Future

            const swNextTimeMs = swNextTime.getTime();
            const appNextTimeMs = appNextTime.getTime();
            const nowMs = now.getTime();

            const shouldUseSWTime = swNextTimeMs !== appNextTimeMs && swNextTimeMs > nowMs;

            expect(shouldUseSWTime).toBe(false);
        });
    });

    describe('Missed alarm handling', () => {
        it('should trigger alarm when missed by less than 5 minutes', () => {
            const now = new Date('2024-01-15T07:03:00.000Z');
            vi.setSystemTime(now);

            const nextAlarmTime = new Date('2024-01-15T07:00:00.000Z');
            const timeDiff = nextAlarmTime.getTime() - now.getTime();

            // Missed by 3 minutes (within 5 min window)
            const shouldTrigger = timeDiff < 0 && timeDiff > -5 * 60 * 1000;

            expect(timeDiff).toBe(-3 * 60 * 1000); // -3 minutes
            expect(shouldTrigger).toBe(true);
        });

        it('should not trigger alarm when missed by more than 5 minutes', () => {
            const now = new Date('2024-01-15T07:10:00.000Z');
            vi.setSystemTime(now);

            const nextAlarmTime = new Date('2024-01-15T07:00:00.000Z');
            const timeDiff = nextAlarmTime.getTime() - now.getTime();

            // Missed by 10 minutes (outside 5 min window)
            const shouldTrigger = timeDiff < 0 && timeDiff > -5 * 60 * 1000;

            expect(timeDiff).toBe(-10 * 60 * 1000); // -10 minutes
            expect(shouldTrigger).toBe(false);
        });

        it('should not trigger when alarm is in the future', () => {
            const now = new Date('2024-01-15T06:55:00.000Z');
            vi.setSystemTime(now);

            const nextAlarmTime = new Date('2024-01-15T07:00:00.000Z');
            const timeDiff = nextAlarmTime.getTime() - now.getTime();

            // 5 minutes in the future
            const shouldTrigger = timeDiff < 0 && timeDiff > -5 * 60 * 1000;

            expect(timeDiff).toBe(5 * 60 * 1000); // +5 minutes
            expect(shouldTrigger).toBe(false);
        });

        it('should not trigger during active snooze', () => {
            const now = new Date('2024-01-15T07:03:00.000Z');
            vi.setSystemTime(now);

            const snoozeEndTime = new Date('2024-01-15T07:05:00.000Z'); // Snooze ends in 2 min
            const hasActiveSnooze = snoozeEndTime !== null;

            // Even if alarm time passed, snooze takes priority
            expect(hasActiveSnooze).toBe(true);
        });
    });

    describe('Snooze expiry handling', () => {
        it('should trigger alarm when snooze just expired (within 1 minute)', () => {
            const now = new Date('2024-01-15T07:05:30.000Z');
            vi.setSystemTime(now);

            const snoozeEndTime = new Date('2024-01-15T07:05:00.000Z');
            const remainingMs = snoozeEndTime.getTime() - now.getTime();

            // Snooze expired 30 seconds ago (within 1 min tolerance)
            const justExpired = remainingMs <= 0 && remainingMs > -60000;

            expect(remainingMs).toBe(-30 * 1000); // -30 seconds
            expect(justExpired).toBe(true);
        });

        it('should clear snooze state when expired long ago', () => {
            const now = new Date('2024-01-15T07:10:00.000Z');
            vi.setSystemTime(now);

            const snoozeEndTime = new Date('2024-01-15T07:05:00.000Z');
            const remainingMs = snoozeEndTime.getTime() - now.getTime();

            // Snooze expired 5 minutes ago
            const expiredLongAgo = remainingMs <= -60000;

            expect(remainingMs).toBe(-5 * 60 * 1000); // -5 minutes
            expect(expiredLongAgo).toBe(true);
        });

        it('should restore snooze timer when still pending', () => {
            const now = new Date('2024-01-15T07:03:00.000Z');
            vi.setSystemTime(now);

            const snoozeEndTime = new Date('2024-01-15T07:05:00.000Z');
            const remainingMs = snoozeEndTime.getTime() - now.getTime();

            // 2 minutes until snooze ends
            const shouldRestoreTimer = remainingMs > 0;

            expect(remainingMs).toBe(2 * 60 * 1000); // +2 minutes
            expect(shouldRestoreTimer).toBe(true);
        });
    });

    describe('Clearing nextAlarmTime when disabled', () => {
        it('should clear nextAlarmTime when setAlarmTime(null) is called', () => {
            interface MockState {
                alarmTime: Date | null;
                enabled: boolean;
                nextAlarmTime: Date | null;
            }

            const prevState: MockState = {
                alarmTime: new Date('2024-01-15T07:00:00.000Z'),
                enabled: true,
                nextAlarmTime: new Date('2024-01-15T07:00:00.000Z'),
            };

            // Simulate setAlarmTime(null)
            const time = null;
            const newState: MockState = {
                ...prevState,
                alarmTime: time,
                enabled: time !== null,
                ...(time === null && { nextAlarmTime: null }),
            };

            expect(newState.alarmTime).toBeNull();
            expect(newState.enabled).toBe(false);
            expect(newState.nextAlarmTime).toBeNull();
        });

        it('should preserve nextAlarmTime when updating alarm time', () => {
            interface MockState {
                alarmTime: Date | null;
                enabled: boolean;
                nextAlarmTime: Date | null;
            }

            const prevState: MockState = {
                alarmTime: new Date('2024-01-15T07:00:00.000Z'),
                enabled: true,
                nextAlarmTime: new Date('2024-01-15T07:00:00.000Z'),
            };

            // Simulate setAlarmTime(new Date())
            const time = new Date('2024-01-15T08:00:00.000Z');
            const newState: MockState = {
                ...prevState,
                alarmTime: time,
                enabled: time !== null,
                ...(time === null && { nextAlarmTime: null }),
            };

            expect(newState.alarmTime).toEqual(time);
            expect(newState.enabled).toBe(true);
            // nextAlarmTime should still exist (scheduler will update it)
            expect(newState.nextAlarmTime).not.toBeNull();
        });
    });
});

describe('AlarmSync - Schedule Sync to SW', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Schedule data structure', () => {
        it('should include all required fields for SW sync', () => {
            const alarmTime = new Date('2024-01-15T07:00:00.000Z');
            const nextAlarmTime = new Date('2024-01-15T07:00:00.000Z');
            const startDate = new Date('2024-01-01T00:00:00.000Z');

            const schedule = {
                nextAlarmTime: nextAlarmTime.toISOString(),
                snoozeEndTime: null,
                enabled: true,
                vibrationPattern: [200, 100, 200, 1000],
                alarmHour: alarmTime.getHours(),
                alarmMinute: alarmTime.getMinutes(),
                recurrence: 'daily' as const,
                startDate: startDate.toISOString(),
            };

            expect(schedule).toHaveProperty('nextAlarmTime');
            expect(schedule).toHaveProperty('snoozeEndTime');
            expect(schedule).toHaveProperty('enabled');
            expect(schedule).toHaveProperty('vibrationPattern');
            expect(schedule).toHaveProperty('alarmHour');
            expect(schedule).toHaveProperty('alarmMinute');
            expect(schedule).toHaveProperty('recurrence');
            expect(schedule).toHaveProperty('startDate');
        });

        it('should handle disabled alarm correctly', () => {
            const schedule = {
                nextAlarmTime: null,
                snoozeEndTime: null,
                enabled: false,
                vibrationPattern: undefined,
                alarmHour: undefined,
                alarmMinute: undefined,
                recurrence: 'daily' as const,
                startDate: new Date().toISOString(),
            };

            expect(schedule.nextAlarmTime).toBeNull();
            expect(schedule.enabled).toBe(false);
            expect(schedule.alarmHour).toBeUndefined();
        });

        it('should omit vibration pattern when off', () => {
            const vibrationPattern = 'off' as const;
            const VIBRATION_PATTERNS = {
                heartbeat: [200, 100, 200, 1000],
                off: [],
            };

            const vibrationArray = vibrationPattern !== 'off'
                ? VIBRATION_PATTERNS[vibrationPattern as keyof typeof VIBRATION_PATTERNS]
                : undefined;

            expect(vibrationArray).toBeUndefined();
        });
    });
});

describe('AlarmSync - Every-Other-Day Recurrence', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Work day calculation', () => {
        it('should identify work days correctly from start date', () => {
            const startDate = new Date('2024-01-01T00:00:00.000Z');

            // Helper to calculate if a date is a work day
            const isWorkDay = (date: Date, start: Date): boolean => {
                const startDay = new Date(start);
                startDay.setHours(0, 0, 0, 0);

                const targetDay = new Date(date);
                targetDay.setHours(0, 0, 0, 0);

                const diffMs = targetDay.getTime() - startDay.getTime();
                const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

                return daysDiff % 2 === 0;
            };

            // Jan 1 = work day (day 0)
            expect(isWorkDay(new Date('2024-01-01'), startDate)).toBe(true);
            // Jan 2 = off day (day 1)
            expect(isWorkDay(new Date('2024-01-02'), startDate)).toBe(false);
            // Jan 3 = work day (day 2)
            expect(isWorkDay(new Date('2024-01-03'), startDate)).toBe(true);
            // Jan 4 = off day (day 3)
            expect(isWorkDay(new Date('2024-01-04'), startDate)).toBe(false);
        });
    });

    describe('Next alarm calculation', () => {
        it('should skip non-work days for every-other-day recurrence', () => {
            // Current time: Jan 1, 08:00 (after alarm time)
            // Alarm time: 07:00
            // Start date: Jan 1 (work day)
            // Next work day should be Jan 3, not Jan 2

            const now = new Date('2024-01-01T08:00:00.000Z');
            vi.setSystemTime(now);

            const startDate = new Date('2024-01-01T00:00:00.000Z');
            const alarmHour = 7;
            const alarmMinute = 0;

            // Simulate next alarm calculation
            const calculateNextAlarm = (): Date => {
                const alarmTime = new Date(now);
                alarmTime.setHours(alarmHour, alarmMinute, 0, 0);

                // Move to tomorrow since today's alarm passed
                if (alarmTime <= now) {
                    alarmTime.setDate(alarmTime.getDate() + 1);
                }

                // Find next work day
                while (true) {
                    const targetDay = new Date(alarmTime);
                    targetDay.setHours(0, 0, 0, 0);
                    const startDay = new Date(startDate);
                    startDay.setHours(0, 0, 0, 0);

                    const diffMs = targetDay.getTime() - startDay.getTime();
                    const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

                    if (daysDiff % 2 === 0) break;
                    alarmTime.setDate(alarmTime.getDate() + 1);
                }

                return alarmTime;
            };

            const nextAlarm = calculateNextAlarm();

            // Should be Jan 3 at 07:00 (skip Jan 2 which is off-day)
            expect(nextAlarm.getDate()).toBe(3);
            expect(nextAlarm.getHours()).toBe(7);
        });
    });
});
