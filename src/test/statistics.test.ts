import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { StatisticsProvider, useStatistics, type WakeUpLog } from '../contexts/StatisticsContext';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('StatisticsContext', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(StatisticsProvider, null, children);

    describe('addLog', () => {
        it('should generate unique IDs for each log entry', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            // Set a specific time
            vi.setSystemTime(new Date('2025-12-07T07:00:00.000Z'));

            act(() => {
                result.current.addLog({
                    snoozeCount: 0,
                    missionCompleted: true,
                    missionType: 'typing',
                    alarmTime: '07:00',
                });
            });

            // Advance time slightly
            vi.setSystemTime(new Date('2025-12-07T07:00:00.100Z'));

            act(() => {
                result.current.addLog({
                    snoozeCount: 1,
                    missionCompleted: true,
                    missionType: 'math',
                    alarmTime: '07:00',
                });
            });

            const stats = result.current.getStats();
            expect(stats.logs.length).toBe(2);

            // Verify both logs have different IDs
            const ids = stats.logs.map(log => log.id);
            expect(new Set(ids).size).toBe(2);
        });

        it('should allow multiple entries on the same day', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            // First alarm of the day
            vi.setSystemTime(new Date('2025-12-07T06:30:00.000Z'));
            act(() => {
                result.current.addLog({
                    snoozeCount: 2,
                    missionCompleted: true,
                    missionType: 'typing',
                    alarmTime: '06:30',
                });
            });

            // Second alarm of the day (e.g., after a nap)
            vi.setSystemTime(new Date('2025-12-07T14:00:00.000Z'));
            act(() => {
                result.current.addLog({
                    snoozeCount: 0,
                    missionCompleted: true,
                    missionType: 'photo',
                    alarmTime: '14:00',
                });
            });

            const stats = result.current.getStats();
            expect(stats.logs.length).toBe(2);

            // Both should have the same date but different times
            expect(stats.logs[0].date).toBe(stats.logs[1].date);
            expect(stats.logs[0].wakeUpTime).not.toBe(stats.logs[1].wakeUpTime);
        });

        it('should not overwrite existing entries with same date', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            vi.setSystemTime(new Date('2025-12-07T07:00:00.000Z'));
            act(() => {
                result.current.addLog({
                    snoozeCount: 3,
                    missionCompleted: false,
                    missionType: 'typing',
                    alarmTime: '07:00',
                });
            });

            const firstLogId = result.current.logs[0]?.id;

            // Add another entry shortly after
            vi.setSystemTime(new Date('2025-12-07T07:05:00.000Z'));
            act(() => {
                result.current.addLog({
                    snoozeCount: 0,
                    missionCompleted: true,
                    missionType: 'typing',
                    alarmTime: '07:00',
                });
            });

            const stats = result.current.getStats();

            // Should have both entries
            expect(stats.logs.length).toBe(2);

            // First entry should still exist
            expect(stats.logs.some(log => log.id === firstLogId)).toBe(true);

            // Should have entries with different snooze counts
            const snoozeCounts = stats.logs.map(log => log.snoozeCount);
            expect(snoozeCounts).toContain(3);
            expect(snoozeCounts).toContain(0);
        });

        it('should include unique ID with date and timestamp', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            vi.setSystemTime(new Date('2025-12-07T08:30:00.123Z'));
            act(() => {
                result.current.addLog({
                    snoozeCount: 0,
                    missionCompleted: true,
                    missionType: 'qr',
                    alarmTime: '08:30',
                });
            });

            const log = result.current.logs[0];
            expect(log).toBeDefined();

            // ID should contain the date
            expect(log.id).toContain('2025-12-07');

            // ID should contain a timestamp portion
            expect(log.id.split('-').length).toBeGreaterThan(3);
        });

        it('should calculate diffMinutes correctly', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            // Create dates for alarm (07:00) and wake (07:10) - 10 minutes late
            const alarmDate = new Date(2025, 11, 7, 7, 0, 0); // Local time
            const wakeDate = new Date(2025, 11, 7, 7, 10, 0); // Local time, 10 min later
            const alarmTimeStr = alarmDate.toTimeString().slice(0, 5);

            vi.setSystemTime(wakeDate);
            act(() => {
                result.current.addLog({
                    snoozeCount: 2,
                    missionCompleted: true,
                    missionType: 'typing',
                    alarmTime: alarmTimeStr,
                });
            });

            const log = result.current.logs[0];
            expect(log.diffMinutes).toBe(10);
        });

        it('should record actualWakeTime correctly', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            // Use local time Date constructor
            const wakeDate = new Date(2025, 11, 7, 7, 15, 0);
            const expectedWakeTime = wakeDate.toTimeString().slice(0, 5);
            const alarmTimeStr = new Date(2025, 11, 7, 7, 0, 0).toTimeString().slice(0, 5);

            vi.setSystemTime(wakeDate);
            act(() => {
                result.current.addLog({
                    snoozeCount: 1,
                    missionCompleted: true,
                    missionType: 'typing',
                    alarmTime: alarmTimeStr,
                });
            });

            const log = result.current.logs[0];
            expect(log.actualWakeTime).toBe(expectedWakeTime);
            expect(log.wakeUpTime).toBe(expectedWakeTime);
        });
    });

    describe('getStats', () => {
        it('should calculate average snooze count correctly', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            vi.setSystemTime(new Date('2025-12-05T07:00:00.000Z'));
            act(() => {
                result.current.addLog({ snoozeCount: 2, missionCompleted: true, alarmTime: '07:00' });
            });

            vi.setSystemTime(new Date('2025-12-06T07:00:00.000Z'));
            act(() => {
                result.current.addLog({ snoozeCount: 4, missionCompleted: true, alarmTime: '07:00' });
            });

            vi.setSystemTime(new Date('2025-12-07T07:00:00.000Z'));
            act(() => {
                result.current.addLog({ snoozeCount: 0, missionCompleted: true, alarmTime: '07:00' });
            });

            const stats = result.current.getStats();
            expect(stats.averageSnoozeCount).toBe(2); // (2 + 4 + 0) / 3 = 2
        });

        it('should calculate success rate correctly', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            vi.setSystemTime(new Date('2025-12-05T07:00:00.000Z'));
            act(() => {
                result.current.addLog({ snoozeCount: 0, missionCompleted: true, alarmTime: '07:00' });
            });

            vi.setSystemTime(new Date('2025-12-06T07:00:00.000Z'));
            act(() => {
                result.current.addLog({ snoozeCount: 0, missionCompleted: false, alarmTime: '07:00' });
            });

            vi.setSystemTime(new Date('2025-12-07T07:00:00.000Z'));
            act(() => {
                result.current.addLog({ snoozeCount: 0, missionCompleted: true, alarmTime: '07:00' });
            });

            vi.setSystemTime(new Date('2025-12-08T07:00:00.000Z'));
            act(() => {
                result.current.addLog({ snoozeCount: 0, missionCompleted: true, alarmTime: '07:00' });
            });

            const stats = result.current.getStats();
            expect(stats.successRate).toBe(75); // 3 out of 4 = 75%
        });

        it('should return last 7 days of logs', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            // Add 10 logs
            for (let i = 0; i < 10; i++) {
                const day = (i + 1).toString().padStart(2, '0');
                vi.setSystemTime(new Date(`2025-12-${day}T07:00:00.000Z`));
                act(() => {
                    result.current.addLog({ snoozeCount: i, missionCompleted: true, alarmTime: '07:00' });
                });
            }

            const stats = result.current.getStats();
            expect(stats.last7Days.length).toBe(7);
        });

        it('should calculate average wake delay', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            // Use local time to avoid timezone issues
            const alarmTimeStr = new Date(2025, 11, 5, 7, 0, 0).toTimeString().slice(0, 5);

            // 5 minutes late
            vi.setSystemTime(new Date(2025, 11, 5, 7, 5, 0));
            act(() => {
                result.current.addLog({ snoozeCount: 1, missionCompleted: true, alarmTime: alarmTimeStr });
            });

            // 10 minutes late
            vi.setSystemTime(new Date(2025, 11, 6, 7, 10, 0));
            act(() => {
                result.current.addLog({ snoozeCount: 2, missionCompleted: true, alarmTime: alarmTimeStr });
            });

            // 15 minutes late
            vi.setSystemTime(new Date(2025, 11, 7, 7, 15, 0));
            act(() => {
                result.current.addLog({ snoozeCount: 3, missionCompleted: true, alarmTime: alarmTimeStr });
            });

            const stats = result.current.getStats();
            expect(stats.averageWakeDelay).toBe(10); // (5 + 10 + 15) / 3 = 10
        });
    });

    describe('clearLogs', () => {
        it('should remove all logs', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            vi.setSystemTime(new Date('2025-12-07T07:00:00.000Z'));
            act(() => {
                result.current.addLog({ snoozeCount: 0, missionCompleted: true, alarmTime: '07:00' });
                result.current.addLog({ snoozeCount: 1, missionCompleted: true, alarmTime: '07:00' });
            });

            expect(result.current.logs.length).toBeGreaterThan(0);

            act(() => {
                result.current.clearLogs();
            });

            expect(result.current.logs.length).toBe(0);
        });
    });

    describe('exportLogs', () => {
        it('should export logs as JSON string', () => {
            const { result } = renderHook(() => useStatistics(), { wrapper });

            vi.setSystemTime(new Date('2025-12-07T07:00:00.000Z'));
            act(() => {
                result.current.addLog({
                    snoozeCount: 2,
                    missionCompleted: true,
                    missionType: 'typing',
                    alarmTime: '07:00',
                });
            });

            const exported = result.current.exportLogs();
            const parsed = JSON.parse(exported) as WakeUpLog[];

            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBe(1);
            expect(parsed[0].snoozeCount).toBe(2);
            expect(parsed[0].missionType).toBe('typing');
        });
    });
});
