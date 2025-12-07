import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VIBRATION_PATTERNS, type VibrationPattern } from '../hooks/useAlarm';
import { notificationManager } from '../utils/notifications';
import { mockServiceWorkerRegistration } from './setup';

describe('Vibration Patterns', () => {
    describe('VIBRATION_PATTERNS export', () => {
        it('should export all vibration pattern types', () => {
            const expectedPatterns: VibrationPattern[] = [
                'heartbeat',
                'ticktock',
                'rapid',
                'sos',
                'continuous',
                'off',
            ];

            for (const pattern of expectedPatterns) {
                expect(VIBRATION_PATTERNS).toHaveProperty(pattern);
            }
        });

        it('should have correct heartbeat pattern', () => {
            expect(VIBRATION_PATTERNS.heartbeat).toEqual([200, 100, 200, 1000]);
        });

        it('should have correct ticktock pattern', () => {
            expect(VIBRATION_PATTERNS.ticktock).toEqual([100, 900]);
        });

        it('should have correct rapid pattern', () => {
            expect(VIBRATION_PATTERNS.rapid).toEqual([200, 200]);
        });

        it('should have correct sos pattern', () => {
            expect(VIBRATION_PATTERNS.sos).toEqual([
                100, 100, 100, 100, 100, 100, // S (3 dots)
                500, 500, 500, // O (3 dashes)
                100, 100, 100, // S (3 dots)
            ]);
        });

        it('should have correct continuous pattern', () => {
            expect(VIBRATION_PATTERNS.continuous).toEqual([1000]);
        });

        it('should have empty array for off pattern', () => {
            expect(VIBRATION_PATTERNS.off).toEqual([]);
        });

        it('should have all patterns as number arrays', () => {
            for (const [pattern, values] of Object.entries(VIBRATION_PATTERNS)) {
                expect(Array.isArray(values), `${pattern} should be an array`).toBe(true);
                values.forEach((v, i) => {
                    expect(typeof v, `${pattern}[${i}] should be a number`).toBe('number');
                });
            }
        });
    });

    describe('Pattern to array conversion', () => {
        it('should return correct array for non-off patterns', () => {
            const pattern = 'heartbeat' as VibrationPattern;
            const result = pattern !== 'off' ? VIBRATION_PATTERNS[pattern] : undefined;
            expect(result).toEqual([200, 100, 200, 1000]);
        });

        it('should return undefined for off pattern when using conditional', () => {
            const pattern: VibrationPattern = 'off';
            const result = pattern !== 'off' ? VIBRATION_PATTERNS[pattern] : undefined;
            expect(result).toBeUndefined();
        });
    });
});

describe('NotificationManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Set the service worker registration for notification manager
        notificationManager.setServiceWorker(mockServiceWorkerRegistration as unknown as ServiceWorkerRegistration);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('showAlarmNotification', () => {
        it('should call showNotification with vibration pattern when provided', async () => {
            const vibrationPattern = [200, 100, 200, 1000];
            await notificationManager.showAlarmNotification(vibrationPattern);

            expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalled();

            // Check that vibration pattern was included in options
            const callArgs = mockServiceWorkerRegistration.showNotification.mock.calls[0];
            const options = callArgs[1] as NotificationOptions & { vibrate?: number[] };
            expect(options.vibrate).toEqual(vibrationPattern);
        });

        it('should not include vibrate property when pattern is null', async () => {
            await notificationManager.showAlarmNotification(null);

            expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalled();

            const callArgs = mockServiceWorkerRegistration.showNotification.mock.calls[0];
            const options = callArgs[1] as NotificationOptions & { vibrate?: number[] };
            expect(options.vibrate).toBeUndefined();
        });

        it('should not include vibrate property when pattern is undefined', async () => {
            await notificationManager.showAlarmNotification(undefined);

            expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalled();

            const callArgs = mockServiceWorkerRegistration.showNotification.mock.calls[0];
            const options = callArgs[1] as NotificationOptions & { vibrate?: number[] };
            expect(options.vibrate).toBeUndefined();
        });

        it('should not include vibrate property when pattern is empty array', async () => {
            await notificationManager.showAlarmNotification([]);

            expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalled();

            const callArgs = mockServiceWorkerRegistration.showNotification.mock.calls[0];
            const options = callArgs[1] as NotificationOptions & { vibrate?: number[] };
            expect(options.vibrate).toBeUndefined();
        });

        it('should include requireInteraction in notification options', async () => {
            await notificationManager.showAlarmNotification([200, 100]);

            const callArgs = mockServiceWorkerRegistration.showNotification.mock.calls[0];
            const options = callArgs[1] as NotificationOptions;
            expect(options.requireInteraction).toBe(true);
        });

        it('should include notification actions', async () => {
            await notificationManager.showAlarmNotification([200, 100]);

            const callArgs = mockServiceWorkerRegistration.showNotification.mock.calls[0];
            const options = callArgs[1] as NotificationOptions & { actions?: Array<{ action: string; title: string }> };
            expect(options.actions).toBeDefined();
            expect(options.actions?.length).toBeGreaterThan(0);
        });
    });

    describe('syncAlarmSchedule', () => {
        it('should send vibration pattern to service worker', async () => {
            const schedule = {
                nextAlarmTime: '2025-12-07T07:00:00',
                snoozeEndTime: null,
                enabled: true,
                vibrationPattern: [200, 100, 200, 1000],
            };

            await notificationManager.syncAlarmSchedule(schedule);

            expect(mockServiceWorkerRegistration.active?.postMessage).toHaveBeenCalledWith({
                type: 'SYNC_ALARM_SCHEDULE',
                schedule,
            });
        });

        it('should send schedule without vibration when pattern is undefined', async () => {
            const schedule = {
                nextAlarmTime: '2025-12-07T07:00:00',
                snoozeEndTime: null,
                enabled: true,
            };

            await notificationManager.syncAlarmSchedule(schedule);

            expect(mockServiceWorkerRegistration.active?.postMessage).toHaveBeenCalledWith({
                type: 'SYNC_ALARM_SCHEDULE',
                schedule,
            });
        });
    });
});
