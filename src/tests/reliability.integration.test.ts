import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAlarm } from '../hooks/useAlarm';
import { alarmStorage } from '../utils/storage';
import type { AlarmSettings } from '../utils/storage';
import { notificationManager } from '../utils/notifications';

// Capture notification action callback
let capturedNotificationCallback: ((action: string, reason?: string, data?: {
    nextAlarmTime?: string;
    snoozeEndTime?: string;
    snoozeCount?: number;
}) => void) | null = null;

// Mock dependencies
vi.mock('../utils/audio', () => ({
    audioEngine: {
        init: vi.fn(),
        play: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn(),
        playAlarm: vi.fn(),
        stopAlarm: vi.fn(),
        setVolume: vi.fn(),
        setFadeDuration: vi.fn(),
        setPreset: vi.fn(),
        setCustomSound: vi.fn().mockResolvedValue(undefined),
        isPlaying: vi.fn().mockReturnValue(false),
        loadCustomSound: vi.fn().mockResolvedValue(undefined),
        clearCustomSound: vi.fn(),
    },
}));

vi.mock('../utils/scheduler', () => ({
    alarmScheduler: {
        init: vi.fn(),
        stop: vi.fn(),
        destroy: vi.fn(),
        getNextAlarmTime: vi.fn().mockReturnValue(null),
        setRecurrence: vi.fn(),
        setStartDate: vi.fn(),
        updateConfig: vi.fn(),
        isWorkDay: vi.fn().mockReturnValue(true),
        cancelPendingAndReschedule: vi.fn(),
    },
}));

vi.mock('../utils/i18n', () => ({
    setLanguage: vi.fn(),
    t: vi.fn((key: string) => key),
}));

vi.mock('../utils/notifications', () => ({
    notificationManager: {
        init: vi.fn().mockResolvedValue(undefined),
        requestPermission: vi.fn().mockResolvedValue('granted'),
        showAlarmNotification: vi.fn().mockResolvedValue(undefined),
        cancelAlarmNotification: vi.fn(),
        closeAlarmNotification: vi.fn(),
        syncAlarmSchedule: vi.fn().mockResolvedValue(undefined),
        hasPermission: vi.fn().mockReturnValue(true),
        onNotificationAction: vi.fn().mockImplementation((callback) => {
            capturedNotificationCallback = callback;
            return () => {
                capturedNotificationCallback = null;
            };
        }),
        requestAlarmCheck: vi.fn().mockResolvedValue(undefined),
    },
    wakeLockManager: {
        acquire: vi.fn().mockResolvedValue(undefined),
        release: vi.fn().mockResolvedValue(undefined),
        enableAutoReacquire: vi.fn(),
        disableAutoReacquire: vi.fn(),
    },
    audioAutoplayManager: {
        request: vi.fn().mockResolvedValue(undefined),
        check: vi.fn().mockReturnValue(true),
        attemptPlay: vi.fn().mockResolvedValue(true),
        onPendingPlay: vi.fn(),
        clearPendingPlay: vi.fn(),
    },
}));

vi.mock('../utils/alarmPersistence', () => ({
    saveAlarmSchedule: vi.fn().mockResolvedValue(undefined),
    getAlarmSchedule: vi.fn().mockResolvedValue(null),
}));

// Mock alarmStorage
vi.mock('../utils/storage', () => ({
    alarmStorage: {
        init: vi.fn().mockResolvedValue(undefined),
        load: vi.fn().mockResolvedValue({
            alarmTime: null,
            alarmHour: null,
            alarmMinute: null,
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
            weatherEnabled: false,
            vibrationPattern: 'heartbeat',
            qrRegisteredCode: null,
        }),
        save: vi.fn().mockResolvedValue(undefined),
        fileToBase64: vi.fn().mockResolvedValue('base64data'),
        base64ToArrayBuffer: vi.fn().mockReturnValue(new ArrayBuffer(8)),
    },
}));

describe('Reliability Tests - Settings Save Debounce', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedNotificationCallback = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should debounce multiple rapid volume changes', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Clear any initial saves
        vi.mocked(alarmStorage.save).mockClear();

        // Simulate rapid volume slider changes (like dragging)
        act(() => {
            result.current.setVolume(0.1);
        });
        act(() => {
            result.current.setVolume(0.2);
        });
        act(() => {
            result.current.setVolume(0.3);
        });
        act(() => {
            result.current.setVolume(0.4);
        });
        act(() => {
            result.current.setVolume(0.5);
        });

        // Should not have saved immediately (debounce)
        // Wait a bit but less than debounce time
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify state is updated immediately but save is debounced
        expect(result.current.volume).toBe(0.5);

        // Wait for debounce to complete (300ms + buffer)
        await new Promise(resolve => setTimeout(resolve, 400));

        // After debounce, should save with final value
        await waitFor(() => {
            expect(alarmStorage.save).toHaveBeenCalled();
        });

        const lastSaveCall = vi.mocked(alarmStorage.save).mock.calls.slice(-1)[0];
        const savedSettings = lastSaveCall[0] as AlarmSettings;
        expect(savedSettings.volume).toBe(0.5); // Final value
    }, 10000);

    it('should debounce rapid fade duration changes', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        vi.mocked(alarmStorage.save).mockClear();

        // Simulate rapid fade duration slider changes
        for (let i = 10; i <= 60; i += 10) {
            act(() => {
                result.current.setFadeDuration(i);
            });
        }

        // Verify state is updated immediately
        expect(result.current.fadeDuration).toBe(60);

        // Wait for debounce to complete
        await new Promise(resolve => setTimeout(resolve, 400));

        // Should save with final value
        await waitFor(() => {
            expect(alarmStorage.save).toHaveBeenCalled();
        });

        const lastSaveCall = vi.mocked(alarmStorage.save).mock.calls.slice(-1)[0];
        const savedSettings = lastSaveCall[0] as AlarmSettings;
        expect(savedSettings.fadeDuration).toBe(60);
    }, 10000);

    it('should cancel pending save when component unmounts', async () => {
        const { result, unmount } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        vi.mocked(alarmStorage.save).mockClear();

        // Start a settings change
        act(() => {
            result.current.setVolume(0.9);
        });

        // Unmount immediately before debounce completes
        unmount();

        // Wait past debounce time
        await new Promise(resolve => setTimeout(resolve, 500));

        // Save should not have been called after unmount
        // (cleanup should have cleared the timeout)
        expect(alarmStorage.save).not.toHaveBeenCalled();
    });
});

describe('Reliability Tests - SW Snooze Fallback Timer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedNotificationCallback = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should set local snooze state when SW sets snooze', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Verify callback was captured by mock
        expect(capturedNotificationCallback).not.toBeNull();

        // Set up alarm first
        const alarmTime = new Date();
        alarmTime.setHours(7, 0, 0, 0);
        act(() => {
            result.current.setAlarmTime(alarmTime);
        });

        // Simulate SW setting snooze (5 minutes from now)
        const snoozeEndTime = new Date(Date.now() + 5 * 60 * 1000);

        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime.toISOString(),
                snoozeCount: 1,
            });
        });

        // Verify snooze state is updated in client
        expect(result.current.snoozeEndTime).not.toBeNull();
        expect(result.current.snoozeCount).toBe(1);

        // The snooze end time should match what SW sent
        const storedSnoozeEnd = new Date(result.current.snoozeEndTime!);
        expect(storedSnoozeEnd.getTime()).toBe(snoozeEndTime.getTime());
    });

    it('should update snoozeCount from SW snooze message', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Initial snoozeCount should be 0
        expect(result.current.snoozeCount).toBe(0);
        expect(capturedNotificationCallback).not.toBeNull();

        // Simulate multiple SW snooze actions
        const snoozeEndTime1 = new Date(Date.now() + 5 * 60 * 1000);

        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime1.toISOString(),
                snoozeCount: 1,
            });
        });
        expect(result.current.snoozeCount).toBe(1);

        const snoozeEndTime2 = new Date(Date.now() + 10 * 60 * 1000);
        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime2.toISOString(),
                snoozeCount: 2,
            });
        });
        expect(result.current.snoozeCount).toBe(2);
    });

    it('should clear previous snooze when new SW snooze arrives', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(capturedNotificationCallback).not.toBeNull();

        // First snooze
        const snoozeEndTime1 = new Date(Date.now() + 5 * 60 * 1000);
        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime1.toISOString(),
                snoozeCount: 1,
            });
        });

        const firstSnoozeEnd = result.current.snoozeEndTime;

        // Second snooze (new timer should replace old one)
        const snoozeEndTime2 = new Date(Date.now() + 10 * 60 * 1000);
        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime2.toISOString(),
                snoozeCount: 2,
            });
        });

        // Verify snooze time was updated
        expect(result.current.snoozeEndTime).not.toBe(firstSnoozeEnd);
        const newSnoozeEnd = new Date(result.current.snoozeEndTime!);
        expect(newSnoozeEnd.getTime()).toBe(snoozeEndTime2.getTime());
    });
});

describe('Reliability Tests - Fallback Notification Handlers', () => {
    it('should register onNotificationAction callback', async () => {
        // This test verifies that useAlarm properly registers a notification callback
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Verify onNotificationAction was called during init
        expect(notificationManager.onNotificationAction).toHaveBeenCalled();

        // Verify callback was captured
        expect(capturedNotificationCallback).not.toBeNull();
        expect(typeof capturedNotificationCallback).toBe('function');
    });

    it('should cleanup notification callback on unmount', async () => {
        capturedNotificationCallback = null;

        const { result, unmount } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Callback should be registered
        expect(capturedNotificationCallback).not.toBeNull();

        // Unmount
        unmount();

        // Mock's cleanup function was called, clearing the callback
        expect(capturedNotificationCallback).toBeNull();
    });
});

describe('Reliability Tests - Snooze Limit Enforcement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedNotificationCallback = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle snooze_limit_reached from SW', async () => {
        // Load with near-limit snooze count
        vi.mocked(alarmStorage.load).mockResolvedValue({
            alarmTime: null,
            alarmHour: 7,
            alarmMinute: 0,
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
            snoozeCount: 3, // Already at limit
            nextAlarmTime: null,
            weatherEnabled: false,
            vibrationPattern: 'heartbeat',
            qrRegisteredCode: null,
        });

        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Verify loaded snooze count
        expect(result.current.snoozeCount).toBe(3);
        expect(result.current.snoozeLimit).toBe(3);
        expect(capturedNotificationCallback).not.toBeNull();

        // Simulate SW reporting snooze limit reached
        // This should not throw and should be handled gracefully
        act(() => {
            capturedNotificationCallback!('snooze_limit_reached');
        });

        // Test passes if no error is thrown - the message is handled
    });
});

describe('Reliability Tests - Combined Scenarios', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedNotificationCallback = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle alarm time change clearing SW-set snooze', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(capturedNotificationCallback).not.toBeNull();

        // Set initial alarm
        const alarmTime = new Date();
        alarmTime.setHours(7, 0, 0, 0);
        act(() => {
            result.current.setAlarmTime(alarmTime);
        });

        // SW sets snooze
        const snoozeEndTime = new Date(Date.now() + 5 * 60 * 1000);
        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime.toISOString(),
                snoozeCount: 1,
            });
        });

        expect(result.current.snoozeEndTime).not.toBeNull();
        expect(result.current.snoozeCount).toBe(1);

        // User changes alarm time (should clear snooze)
        const newAlarmTime = new Date();
        newAlarmTime.setHours(8, 0, 0, 0);
        act(() => {
            result.current.setAlarmTime(newAlarmTime);
        });

        // Snooze should be cleared
        expect(result.current.snoozeEndTime).toBeNull();
        expect(result.current.snoozeCount).toBe(0);
    });

    it('should handle next_alarm_updated from SW', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(capturedNotificationCallback).not.toBeNull();

        // Set initial alarm
        const alarmTime = new Date();
        alarmTime.setHours(7, 0, 0, 0);
        act(() => {
            result.current.setAlarmTime(alarmTime);
        });

        // SW calculates next alarm time and sends it
        const nextAlarmTime = new Date();
        nextAlarmTime.setDate(nextAlarmTime.getDate() + 1);
        nextAlarmTime.setHours(7, 0, 0, 0);

        // This should not throw - the message is handled gracefully
        act(() => {
            capturedNotificationCallback!('next_alarm_updated', undefined, {
                nextAlarmTime: nextAlarmTime.toISOString(),
            });
        });

        // Test passes if no error is thrown
    });
});

describe('Reliability Tests - Wake Lock Lifecycle', () => {
    let wakeLockManagerMock: {
        acquire: ReturnType<typeof vi.fn>;
        release: ReturnType<typeof vi.fn>;
        enableAutoReacquire: ReturnType<typeof vi.fn>;
        disableAutoReacquire: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        vi.clearAllMocks();
        capturedNotificationCallback = null;

        // Get reference to the mock
        const { wakeLockManager } = await import('../utils/notifications');
        wakeLockManagerMock = wakeLockManager as unknown as typeof wakeLockManagerMock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should acquire wake lock and enable auto-reacquire when alarm rings', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Set up alarm
        const alarmTime = new Date();
        alarmTime.setHours(7, 0, 0, 0);
        act(() => {
            result.current.setAlarmTime(alarmTime);
        });

        // Clear mock counts from initialization
        wakeLockManagerMock.acquire.mockClear();
        wakeLockManagerMock.enableAutoReacquire.mockClear();

        // Simulate alarm ringing via SW notification (alarm_check triggers the alarm)
        expect(capturedNotificationCallback).not.toBeNull();
        act(() => {
            capturedNotificationCallback!('alarm_check');
        });

        // Wake lock should be acquired and auto-reacquire enabled
        await waitFor(() => {
            expect(wakeLockManagerMock.acquire).toHaveBeenCalled();
        });
        expect(wakeLockManagerMock.enableAutoReacquire).toHaveBeenCalled();
    });

    it('should release wake lock and disable auto-reacquire when snoozed', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Set up alarm
        const alarmTime = new Date();
        alarmTime.setHours(7, 0, 0, 0);
        act(() => {
            result.current.setAlarmTime(alarmTime);
        });

        // Clear mock counts
        wakeLockManagerMock.release.mockClear();
        wakeLockManagerMock.disableAutoReacquire.mockClear();

        // Simulate snooze via SW message
        expect(capturedNotificationCallback).not.toBeNull();
        const snoozeEndTime = new Date(Date.now() + 5 * 60 * 1000);
        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime.toISOString(),
                snoozeCount: 1,
            });
        });

        // Wake lock should be released and auto-reacquire disabled
        await waitFor(() => {
            expect(wakeLockManagerMock.disableAutoReacquire).toHaveBeenCalled();
        });
        expect(wakeLockManagerMock.release).toHaveBeenCalled();
    });

    it('should release wake lock when alarm is dismissed', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Set up alarm
        const alarmTime = new Date();
        alarmTime.setHours(7, 0, 0, 0);
        act(() => {
            result.current.setAlarmTime(alarmTime);
        });

        // Trigger alarm first (so we have an active alarm to dismiss)
        expect(capturedNotificationCallback).not.toBeNull();
        act(() => {
            capturedNotificationCallback!('alarm_check');
        });

        await waitFor(() => {
            expect(result.current.isAlarmActive).toBe(true);
        });

        // Clear mock counts after alarm trigger
        wakeLockManagerMock.release.mockClear();
        wakeLockManagerMock.disableAutoReacquire.mockClear();

        // Dismiss the alarm by calling stopAlarm directly
        // (In real usage, this is called after completing the mission)
        await act(async () => {
            await result.current.stopAlarm();
        });

        // Wake lock should be released
        await waitFor(() => {
            expect(wakeLockManagerMock.disableAutoReacquire).toHaveBeenCalled();
        });
        expect(wakeLockManagerMock.release).toHaveBeenCalled();
    });

    it('should not leak wake lock after rapid snooze/dismiss cycles', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(capturedNotificationCallback).not.toBeNull();

        // Clear mock counts
        wakeLockManagerMock.release.mockClear();

        // Simulate rapid snooze cycles (edge case)
        for (let i = 0; i < 3; i++) {
            // Snooze - each snooze_set_by_sw releases wake lock
            const snoozeEndTime = new Date(Date.now() + 5 * 60 * 1000);
            act(() => {
                capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                    snoozeEndTime: snoozeEndTime.toISOString(),
                    snoozeCount: i + 1,
                });
            });
        }

        // Each snooze should have released the wake lock
        await waitFor(() => {
            expect(wakeLockManagerMock.release.mock.calls.length).toBe(3);
        });

        // Final dismiss via stopAlarm (e.g., user completes mission)
        await act(async () => {
            await result.current.stopAlarm();
        });

        // Should end with wake lock released (4 total: 3 snoozes + 1 stopAlarm)
        expect(wakeLockManagerMock.release.mock.calls.length).toBe(4);
    });
});

describe('Reliability Tests - SW Snooze Expiry Duplicate Prevention', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedNotificationCallback = null;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle snooze expiry message idempotently', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Set up alarm
        const alarmTime = new Date();
        alarmTime.setHours(7, 0, 0, 0);
        act(() => {
            result.current.setAlarmTime(alarmTime);
        });

        // Set snooze state first
        expect(capturedNotificationCallback).not.toBeNull();
        const snoozeEndTime = new Date(Date.now() + 5 * 60 * 1000);
        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime.toISOString(),
                snoozeCount: 1,
            });
        });

        expect(result.current.snoozeCount).toBe(1);

        // Simulate snooze expiry (alarm rings again via alarm_check with snooze_expired reason)
        act(() => {
            capturedNotificationCallback!('alarm_check', 'snooze_expired');
        });

        // Simulate duplicate snooze expiry message (should be handled gracefully)
        // This shouldn't cause errors or unexpected state changes
        act(() => {
            capturedNotificationCallback!('alarm_check', 'snooze_expired');
        });

        // State should remain consistent - snoozeCount preserved with snooze_expired reason
        expect(result.current.snoozeCount).toBe(1);
    });

    it('should clear snooze state when snooze expires and alarm rings', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Set up alarm
        const alarmTime = new Date();
        alarmTime.setHours(7, 0, 0, 0);
        act(() => {
            result.current.setAlarmTime(alarmTime);
        });

        // Set snooze
        expect(capturedNotificationCallback).not.toBeNull();
        const snoozeEndTime = new Date(Date.now() + 5 * 60 * 1000);
        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime.toISOString(),
                snoozeCount: 1,
            });
        });

        expect(result.current.snoozeEndTime).not.toBeNull();

        // Simulate alarm triggered after snooze expires
        // The client clears snoozeEndTime when processing alarm_check with snooze_expired reason
        act(() => {
            capturedNotificationCallback!('alarm_check', 'snooze_expired');
        });

        // snoozeEndTime should be cleared (alarm is ringing, not snoozed)
        expect(result.current.snoozeEndTime).toBeNull();
        // snoozeCount persists until explicitly reset
        expect(result.current.snoozeCount).toBe(1);
    });

    it('should handle multiple SW messages arriving in quick succession', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(capturedNotificationCallback).not.toBeNull();

        // Simulate race condition: multiple SW messages arrive at once
        const snoozeEndTime = new Date(Date.now() + 5 * 60 * 1000);

        // All these should be handled without error
        act(() => {
            capturedNotificationCallback!('alarm_check');
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime.toISOString(),
                snoozeCount: 1,
            });
            capturedNotificationCallback!('alarm_check');
        });

        // State should be in a valid configuration
        // (the last message wins, but no errors should occur)
        expect(result.current.snoozeEndTime).toBeNull(); // Last was alarm_check
    });

    it('should not double-count snooze when receiving duplicate snooze_set_by_sw', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(capturedNotificationCallback).not.toBeNull();

        const snoozeEndTime = new Date(Date.now() + 5 * 60 * 1000);

        // Simulate duplicate snooze messages (network retry, etc.)
        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime.toISOString(),
                snoozeCount: 1,
            });
        });

        expect(result.current.snoozeCount).toBe(1);

        // Same message again (duplicate)
        act(() => {
            capturedNotificationCallback!('snooze_set_by_sw', undefined, {
                snoozeEndTime: snoozeEndTime.toISOString(),
                snoozeCount: 1, // Same count - idempotent
            });
        });

        // Should still be 1, not doubled
        expect(result.current.snoozeCount).toBe(1);
    });
});
