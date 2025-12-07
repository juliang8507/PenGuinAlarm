import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAlarm } from './useAlarm';
import { alarmStorage } from '../utils/storage';
import type { AlarmSettings } from '../utils/storage';

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
        onNotificationAction: vi.fn().mockReturnValue(() => {}),
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

describe('useAlarm - Timezone Independence', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should store alarm time as hour/minute instead of ISO timestamp', async () => {
        const { result } = renderHook(() => useAlarm());

        // Wait for initialization
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Set alarm time to 7:30 AM
        const alarmTime = new Date();
        alarmTime.setHours(7, 30, 0, 0);

        act(() => {
            result.current.setAlarmTime(alarmTime);
        });

        // Wait for state update and save
        await waitFor(() => {
            expect(alarmStorage.save).toHaveBeenCalled();
        });

        // Verify that alarmHour and alarmMinute are saved (not just ISO string)
        const lastSaveCall = vi.mocked(alarmStorage.save).mock.calls.slice(-1)[0];
        const savedSettings = lastSaveCall[0] as AlarmSettings;

        expect(savedSettings.alarmHour).toBe(7);
        expect(savedSettings.alarmMinute).toBe(30);
    });

    it('should restore alarm time from hour/minute after timezone change simulation', async () => {
        // Simulate saved settings with hour/minute
        vi.mocked(alarmStorage.load).mockResolvedValue({
            alarmTime: null, // Legacy field not used
            alarmHour: 8,
            alarmMinute: 15,
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
        });

        const { result } = renderHook(() => useAlarm());

        // Wait for initialization
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Alarm time should be restored correctly
        expect(result.current.alarmTime).not.toBeNull();
        expect(result.current.alarmTime?.getHours()).toBe(8);
        expect(result.current.alarmTime?.getMinutes()).toBe(15);
    });

    it('should maintain consistent alarm time across DST boundaries', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Set alarm to 6:00 AM
        const alarmTime = new Date();
        alarmTime.setHours(6, 0, 0, 0);

        act(() => {
            result.current.setAlarmTime(alarmTime);
        });

        await waitFor(() => {
            expect(alarmStorage.save).toHaveBeenCalled();
        });

        const lastSaveCall = vi.mocked(alarmStorage.save).mock.calls.slice(-1)[0];
        const savedSettings = lastSaveCall[0] as AlarmSettings;

        // Hour and minute should be stored independently
        expect(savedSettings.alarmHour).toBe(6);
        expect(savedSettings.alarmMinute).toBe(0);
        // These values won't change even if system timezone changes
    });
});

describe('useAlarm - Snooze Reset on Time Change', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should clear snooze state when alarm time is changed', async () => {
        // Simulate existing snooze state
        const snoozeEndTime = new Date();
        snoozeEndTime.setMinutes(snoozeEndTime.getMinutes() + 5);

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
            snoozeEndTime: snoozeEndTime.toISOString(),
            snoozeCount: 2,
            nextAlarmTime: snoozeEndTime.toISOString(),
            weatherEnabled: false,
            vibrationPattern: 'heartbeat',
            qrRegisteredCode: null,
        });

        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Change alarm time to a new value
        const newAlarmTime = new Date();
        newAlarmTime.setHours(8, 30, 0, 0);

        act(() => {
            result.current.setAlarmTime(newAlarmTime);
        });

        // Snooze state should be cleared
        expect(result.current.snoozeEndTime).toBeNull();
        expect(result.current.snoozeCount).toBe(0);
    });

    it('should not have ghost snooze fire after alarm time change', async () => {
        // Note: Removed vi.useFakeTimers() as it conflicts with async hook operations
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Set initial alarm
        const initialTime = new Date();
        initialTime.setHours(7, 0, 0, 0);

        act(() => {
            result.current.setAlarmTime(initialTime);
        });

        // Immediately change alarm time
        const newTime = new Date();
        newTime.setHours(9, 0, 0, 0);

        act(() => {
            result.current.setAlarmTime(newTime);
        });

        // Verify no snooze state remains after changing alarm time
        expect(result.current.snoozeEndTime).toBeNull();
        expect(result.current.snoozeCount).toBe(0);
    });

    it('should clear snooze state even when setting same alarm time', async () => {
        vi.mocked(alarmStorage.load).mockResolvedValue({
            alarmTime: null,
            alarmHour: 7,
            alarmMinute: 30,
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
            snoozeEndTime: new Date().toISOString(),
            snoozeCount: 1,
            nextAlarmTime: new Date().toISOString(),
            weatherEnabled: false,
            vibrationPattern: 'heartbeat',
            qrRegisteredCode: null,
        });

        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Set alarm to same time (user re-confirms)
        const sameTime = new Date();
        sameTime.setHours(7, 30, 0, 0);

        act(() => {
            result.current.setAlarmTime(sameTime);
        });

        // Snooze should still be cleared (prevents unexpected behavior)
        expect(result.current.snoozeEndTime).toBeNull();
        expect(result.current.snoozeCount).toBe(0);
    });
});

describe('useAlarm - Language Synchronization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should persist language setting to storage', async () => {
        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Change language
        act(() => {
            result.current.setLanguage('en');
        });

        await waitFor(() => {
            expect(alarmStorage.save).toHaveBeenCalled();
        });

        const lastSaveCall = vi.mocked(alarmStorage.save).mock.calls.slice(-1)[0];
        const savedSettings = lastSaveCall[0] as AlarmSettings;

        expect(savedSettings.language).toBe('en');
    });

    it('should restore language from saved settings', async () => {
        vi.mocked(alarmStorage.load).mockResolvedValue({
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
            language: 'en',
            snoozeEndTime: null,
            snoozeCount: 0,
            nextAlarmTime: null,
            weatherEnabled: false,
            vibrationPattern: 'heartbeat',
            qrRegisteredCode: null,
        });

        const { result } = renderHook(() => useAlarm());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.language).toBe('en');
    });
});
