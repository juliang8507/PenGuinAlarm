import { describe, it, expect, beforeEach } from 'vitest';
import { AlarmScheduler } from '../utils/scheduler';

describe('AlarmScheduler', () => {
    let scheduler: AlarmScheduler;

    beforeEach(() => {
        scheduler = new AlarmScheduler();
    });

    describe('calculateNextAlarmTime', () => {
        it('should return null when not initialized', () => {
            const result = scheduler.calculateNextAlarmTime();
            expect(result).toBeNull();
        });

        it('should return null when disabled', () => {
            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 0,
                    recurrence: 'daily',
                    startDate: new Date(),
                    enabled: false,
                },
                { onAlarm: () => { } }
            );
            const result = scheduler.calculateNextAlarmTime();
            expect(result).toBeNull();
        });

        it('should calculate next alarm for daily recurrence', () => {
            const now = new Date('2025-12-05T06:00:00');
            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 30,
                    recurrence: 'daily',
                    startDate: now,
                    enabled: true,
                },
                { onAlarm: () => { } }
            );

            const result = scheduler.calculateNextAlarmTime(now);
            expect(result).not.toBeNull();
            expect(result?.getHours()).toBe(7);
            expect(result?.getMinutes()).toBe(30);
        });

        it('should return next day if current time passed alarm time', () => {
            const now = new Date('2025-12-05T08:00:00');
            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 0,
                    recurrence: 'daily',
                    startDate: now,
                    enabled: true,
                },
                { onAlarm: () => { } }
            );

            const result = scheduler.calculateNextAlarmTime(now);
            expect(result).not.toBeNull();
            // Should be December 6th
            expect(result?.getDate()).toBe(6);
        });

        it('should skip rest days for every-other-day recurrence', () => {
            // Start date is Dec 5th (work day)
            const startDate = new Date('2025-12-05T00:00:00');
            // Current time is after alarm on Dec 5th
            const now = new Date('2025-12-05T09:00:00');

            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 0,
                    recurrence: 'every-other-day',
                    startDate,
                    enabled: true,
                },
                { onAlarm: () => { } }
            );

            const result = scheduler.calculateNextAlarmTime(now);
            expect(result).not.toBeNull();
            // Dec 6th is rest day, so next alarm should be Dec 7th
            expect(result?.getDate()).toBe(7);
        });
    });

    describe('isWorkDay', () => {
        it('should return true for daily recurrence', () => {
            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 0,
                    recurrence: 'daily',
                    startDate: new Date('2025-12-05'),
                    enabled: true,
                },
                { onAlarm: () => { } }
            );

            const any날 = new Date('2025-12-10');
            expect(scheduler.isWorkDay(any날)).toBe(true);
        });

        it('should correctly identify work days for every-other-day', () => {
            const startDate = new Date('2025-12-05'); // This is day 0 (work day)
            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 0,
                    recurrence: 'every-other-day',
                    startDate,
                    enabled: true,
                },
                { onAlarm: () => { } }
            );

            // Dec 5 (day 0) - work day
            expect(scheduler.isWorkDay(new Date('2025-12-05'))).toBe(true);
            // Dec 6 (day 1) - rest day
            expect(scheduler.isWorkDay(new Date('2025-12-06'))).toBe(false);
            // Dec 7 (day 2) - work day
            expect(scheduler.isWorkDay(new Date('2025-12-07'))).toBe(true);
            // Dec 8 (day 3) - rest day
            expect(scheduler.isWorkDay(new Date('2025-12-08'))).toBe(false);
        });

        it('should handle dates before start date', () => {
            const startDate = new Date('2025-12-05');
            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 0,
                    recurrence: 'every-other-day',
                    startDate,
                    enabled: true,
                },
                { onAlarm: () => { } }
            );

            // Dec 3 is 2 days before start, so daysDiff = -2, which is even = work day
            expect(scheduler.isWorkDay(new Date('2025-12-03'))).toBe(true);
            // Dec 4 is 1 day before start, so daysDiff = -1, which is odd = rest day
            expect(scheduler.isWorkDay(new Date('2025-12-04'))).toBe(false);
        });
    });

    describe('updateConfig', () => {
        it('should update alarm time correctly', () => {
            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 0,
                    recurrence: 'daily',
                    startDate: new Date('2025-12-05'),
                    enabled: true,
                },
                {
                    onAlarm: () => { },
                    onNextAlarmUpdate: () => { }
                }
            );

            // Update to 8:30
            scheduler.updateConfig({ alarmHour: 8, alarmMinute: 30 });

            // The next alarm should now be at 8:30
            const calculatedNext = scheduler.calculateNextAlarmTime(new Date('2025-12-05T06:00:00'));
            expect(calculatedNext?.getHours()).toBe(8);
            expect(calculatedNext?.getMinutes()).toBe(30);
        });

        it('should clear next alarm when disabled', () => {
            let nextAlarm: Date | null = new Date();
            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 0,
                    recurrence: 'daily',
                    startDate: new Date(),
                    enabled: true,
                },
                {
                    onAlarm: () => { },
                    onNextAlarmUpdate: (alarm) => { nextAlarm = alarm; }
                }
            );

            // Disable
            scheduler.updateConfig({ enabled: false });
            expect(nextAlarm).toBeNull();
        });
    });

    describe('getNextAlarmTime', () => {
        it('should return null before initialization', () => {
            expect(scheduler.getNextAlarmTime()).toBeNull();
        });

        it('should return scheduled time after init', () => {
            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 0,
                    recurrence: 'daily',
                    startDate: new Date(),
                    enabled: true,
                },
                { onAlarm: () => { } }
            );

            expect(scheduler.getNextAlarmTime()).not.toBeNull();
        });
    });

    describe('stop', () => {
        it('should clear next alarm time', () => {
            scheduler.init(
                {
                    alarmHour: 7,
                    alarmMinute: 0,
                    recurrence: 'daily',
                    startDate: new Date(),
                    enabled: true,
                },
                {
                    onAlarm: () => { },
                    onNextAlarmUpdate: () => { }
                }
            );

            scheduler.stop();
            expect(scheduler.getNextAlarmTime()).toBeNull();
        });
    });
});
