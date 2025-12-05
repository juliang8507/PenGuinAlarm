import { useState, useEffect, useCallback, useRef } from 'react';
import { audioEngine } from '../utils/audio';
import { alarmScheduler } from '../utils/scheduler';
import type { SchedulerConfig } from '../utils/scheduler';
import { alarmStorage } from '../utils/storage';
import type { AlarmSettings } from '../utils/storage';
import { setLanguage } from '../utils/i18n';
import type { Language } from '../utils/i18n';
import {
    notificationManager,
    wakeLockManager,
    audioAutoplayManager,
} from '../utils/notifications';

export type Recurrence = 'daily' | 'every-other-day';
export type MissionType = 'math' | 'memory' | 'puzzle' | 'typing' | 'qr' | 'photo' | 'random';
export type MissionDifficulty = 'easy' | 'medium' | 'hard';
export type VibrationPattern = 'heartbeat' | 'ticktock' | 'rapid' | 'sos' | 'continuous' | 'off';

export const VIBRATION_PATTERNS: Record<VibrationPattern, number[]> = {
    heartbeat: [200, 100, 200, 1000],
    ticktock: [100, 900],
    rapid: [200, 200],
    sos: [100, 100, 100, 100, 100, 100, 500, 500, 500, 100, 100, 100],
    continuous: [1000],
    off: [],
};

export interface AlarmState {
    // Core alarm settings
    alarmTime: Date | null;
    recurrence: Recurrence;
    startDate: Date;
    enabled: boolean;

    // Sound settings
    customSoundName: string | null;
    volume: number;
    fadeDuration: number;
    soundPreset: string;

    // Snooze settings
    snoozeLimit: number;
    snoozeCount: number;
    snoozeEndTime: Date | null;

    // Mission settings
    missionType: MissionType;
    missionDifficulty: MissionDifficulty;

    // UI settings
    use24Hour: boolean;
    language: Language;

    // Optional features
    weatherEnabled: boolean;
    vibrationPattern: VibrationPattern;
    qrRegisteredCode: string | null;

    // Runtime state
    isAlarmActive: boolean;
    nextAlarmTime: Date | null;
    isLoading: boolean;
    isAudioBlocked: boolean;
}

export const useAlarm = () => {
    const [state, setState] = useState<AlarmState>({
        alarmTime: null,
        recurrence: 'daily',
        startDate: new Date(),
        enabled: false,
        customSoundName: null,
        volume: 0.7,
        fadeDuration: 30,
        soundPreset: 'ethereal',
        snoozeLimit: 3,
        snoozeCount: 0,
        snoozeEndTime: null,
        missionType: 'math',
        missionDifficulty: 'medium',
        use24Hour: true,
        language: 'ko',
        weatherEnabled: false,
        vibrationPattern: 'heartbeat',
        qrRegisteredCode: null,
        isAlarmActive: false,
        nextAlarmTime: null,
        isLoading: true,
        isAudioBlocked: false,
    });

    const snoozeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isInitializedRef = useRef(false);
    const notificationHandlerRef = useRef<{
        stopAlarm: () => Promise<void>;
        snoozeAlarm: (minutes?: number) => Promise<void>;
    } | null>(null);

    // Convert state to storage settings
    const stateToSettings = useCallback((s: AlarmState): AlarmSettings => ({
        alarmTime: s.alarmTime?.toISOString() || null,
        recurrence: s.recurrence,
        startDate: s.startDate.toISOString(),
        customSoundName: s.customSoundName,
        customSoundData: null, // Handle separately
        volume: s.volume,
        fadeDuration: s.fadeDuration,
        soundPreset: s.soundPreset,
        snoozeLimit: s.snoozeLimit,
        missionDifficulty: s.missionDifficulty,
        missionType: s.missionType,
        use24Hour: s.use24Hour,
        language: s.language,
        // Persistence for recovery
        snoozeEndTime: s.snoozeEndTime?.toISOString() || null,
        snoozeCount: s.snoozeCount,
        nextAlarmTime: s.nextAlarmTime?.toISOString() || null,
        // Optional features
        weatherEnabled: s.weatherEnabled,
        vibrationPattern: s.vibrationPattern,
        qrRegisteredCode: s.qrRegisteredCode,
    }), []);

    // Convert storage settings to state
    const settingsToState = useCallback((settings: AlarmSettings): Partial<AlarmState> => ({
        alarmTime: settings.alarmTime ? new Date(settings.alarmTime) : null,
        recurrence: settings.recurrence,
        startDate: new Date(settings.startDate),
        enabled: settings.alarmTime !== null,
        customSoundName: settings.customSoundName,
        volume: settings.volume,
        fadeDuration: settings.fadeDuration,
        soundPreset: settings.soundPreset,
        snoozeLimit: settings.snoozeLimit,
        missionDifficulty: settings.missionDifficulty,
        missionType: settings.missionType,
        use24Hour: settings.use24Hour,
        language: settings.language,
        // Restore snooze state
        snoozeEndTime: settings.snoozeEndTime ? new Date(settings.snoozeEndTime) : null,
        snoozeCount: settings.snoozeCount ?? 0,
        nextAlarmTime: settings.nextAlarmTime ? new Date(settings.nextAlarmTime) : null,
        // Optional features
        weatherEnabled: settings.weatherEnabled ?? false,
        vibrationPattern: settings.vibrationPattern ?? 'heartbeat',
        qrRegisteredCode: settings.qrRegisteredCode ?? null,
    }), []);

    // Trigger alarm callback
    const triggerAlarm = useCallback(async () => {
        setState(prev => ({
            ...prev,
            isAlarmActive: true,
            snoozeCount: 0,
            snoozeEndTime: null,
            isAudioBlocked: false,
        }));

        // Acquire wake lock to keep screen on
        await wakeLockManager.acquire();

        // Show notification
        await notificationManager.showAlarmNotification();

        // Play alarm sound with autoplay handling
        const playSuccess = await audioAutoplayManager.attemptPlay(async () => {
            audioEngine.playAlarm();
        });

        if (!playSuccess) {
            // Audio was blocked - user needs to tap to play
            console.log('Audio autoplay blocked, waiting for user interaction');
            setState(prev => ({ ...prev, isAudioBlocked: true }));

            // Set up callback for when user interacts
            audioAutoplayManager.onPendingPlay(() => {
                audioEngine.playAlarm();
                setState(prev => ({ ...prev, isAudioBlocked: false }));
            });
        }
    }, []);

    // Initialize storage and scheduler
    useEffect(() => {
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;

        const initialize = async () => {
            try {
                await alarmStorage.init();
                const settings = await alarmStorage.load();

                // Apply language setting
                setLanguage(settings.language);

                // Load custom sound if exists
                if (settings.customSoundData) {
                    try {
                        const arrayBuffer = alarmStorage.base64ToArrayBuffer(settings.customSoundData);
                        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
                        const file = new File([blob], settings.customSoundName || 'custom-sound', { type: 'audio/mpeg' });
                        await audioEngine.setCustomSound(file);
                    } catch (e) {
                        console.error('Failed to load custom sound:', e);
                    }
                }

                const restoredState = settingsToState(settings);

                // Sync audio settings to audio engine
                audioEngine.setVolume(settings.volume);
                audioEngine.setFadeDuration(settings.fadeDuration);
                if (settings.soundPreset) {
                    audioEngine.setPreset(settings.soundPreset);
                }

                setState(prev => ({
                    ...prev,
                    ...restoredState,
                    isLoading: false,
                }));

                // Recover pending snooze timer if exists
                if (settings.snoozeEndTime) {
                    const snoozeEnd = new Date(settings.snoozeEndTime);
                    const remainingMs = snoozeEnd.getTime() - Date.now();

                    if (remainingMs > 0) {
                        // Snooze is still pending, restore the timer
                        console.log(`Restoring snooze timer: ${remainingMs}ms remaining`);
                        snoozeTimeoutRef.current = setTimeout(() => {
                            triggerAlarm();
                        }, remainingMs);
                    } else if (remainingMs > -60000) {
                        // Snooze just expired (within last minute), trigger alarm now
                        console.log('Snooze expired while away, triggering alarm');
                        triggerAlarm();
                    } else {
                        // Snooze expired long ago, clear the state
                        console.log('Snooze expired, clearing state');
                        setState(prev => ({
                            ...prev,
                            snoozeEndTime: null,
                            snoozeCount: 0,
                        }));
                    }
                }

                // Initialize scheduler if alarm is set
                if (settings.alarmTime) {
                    const alarmDate = new Date(settings.alarmTime);
                    const config: SchedulerConfig = {
                        alarmHour: alarmDate.getHours(),
                        alarmMinute: alarmDate.getMinutes(),
                        recurrence: settings.recurrence,
                        startDate: new Date(settings.startDate),
                        enabled: true,
                    };

                    alarmScheduler.init(config, {
                        onAlarm: triggerAlarm,
                        onNextAlarmUpdate: (nextAlarm) => {
                            setState(prev => ({ ...prev, nextAlarmTime: nextAlarm }));
                        },
                        onVisibilityChange: (visible) => {
                            if (visible) {
                                console.log('Tab became visible');
                            }
                        },
                    });
                }
            } catch (e) {
                console.error('Failed to initialize alarm:', e);
                setState(prev => ({ ...prev, isLoading: false }));
            }
        };

        initialize();

        return () => {
            alarmScheduler.destroy();
        };
    }, [settingsToState, triggerAlarm]);

    // Save settings whenever they change
    useEffect(() => {
        if (state.isLoading) return;

        const saveSettings = async () => {
            try {
                await alarmStorage.save(stateToSettings(state));
            } catch (e) {
                console.error('Failed to save alarm settings:', e);
            }
        };

        saveSettings();
    }, [state, stateToSettings]);

    // Set alarm time
    const setAlarmTime = useCallback((time: Date | null) => {
        setState(prev => {
            const newState = {
                ...prev,
                alarmTime: time,
                enabled: time !== null,
            };

            // Update scheduler
            if (time) {
                const config: SchedulerConfig = {
                    alarmHour: time.getHours(),
                    alarmMinute: time.getMinutes(),
                    recurrence: prev.recurrence,
                    startDate: prev.startDate,
                    enabled: true,
                };

                if (!alarmScheduler.getNextAlarmTime()) {
                    alarmScheduler.init(config, {
                        onAlarm: triggerAlarm,
                        onNextAlarmUpdate: (nextAlarm) => {
                            setState(s => ({ ...s, nextAlarmTime: nextAlarm }));
                        },
                    });
                } else {
                    alarmScheduler.updateConfig(config);
                }
            } else {
                alarmScheduler.updateConfig({ enabled: false });
            }

            return newState;
        });
    }, [triggerAlarm]);

    // Set recurrence mode
    const setRecurrence = useCallback((recurrence: Recurrence) => {
        setState(prev => {
            alarmScheduler.updateConfig({ recurrence });
            return { ...prev, recurrence };
        });
    }, []);

    // Set start date (for shift cycle)
    const setStartDate = useCallback((date: Date) => {
        setState(prev => {
            alarmScheduler.updateConfig({ startDate: date });
            return { ...prev, startDate: date };
        });
    }, []);

    // Stop alarm
    const stopAlarm = useCallback(async () => {
        setState(prev => ({
            ...prev,
            isAlarmActive: false,
            snoozeEndTime: null,
            isAudioBlocked: false,
        }));
        audioEngine.stopAlarm();

        // Close notification
        await notificationManager.closeAlarmNotification();

        // Release wake lock
        await wakeLockManager.release();

        // Clear snooze timeout
        if (snoozeTimeoutRef.current) {
            clearTimeout(snoozeTimeoutRef.current);
            snoozeTimeoutRef.current = null;
        }
    }, []);

    // Manual play when audio was blocked
    const playBlockedAudio = useCallback(() => {
        if (state.isAudioBlocked && state.isAlarmActive) {
            audioEngine.playAlarm();
            setState(prev => ({ ...prev, isAudioBlocked: false }));
        }
    }, [state.isAudioBlocked, state.isAlarmActive]);

    // Snooze alarm
    const snoozeAlarm = useCallback(async (minutes: number = 5) => {
        setState(prev => {
            if (prev.snoozeCount >= prev.snoozeLimit) {
                return prev;
            }

            audioEngine.stopAlarm();

            const snoozeEndTime = new Date(Date.now() + minutes * 60 * 1000);

            // Clear existing snooze timeout
            if (snoozeTimeoutRef.current) {
                clearTimeout(snoozeTimeoutRef.current);
            }

            // Set new snooze timeout
            snoozeTimeoutRef.current = setTimeout(() => {
                triggerAlarm();
            }, minutes * 60 * 1000);

            return {
                ...prev,
                isAlarmActive: false,
                snoozeCount: prev.snoozeCount + 1,
                snoozeEndTime,
            };
        });

        // Close notification but keep wake lock active for snooze period
        await notificationManager.closeAlarmNotification();
    }, [triggerAlarm]);

    // Check if can snooze
    const canSnooze = useCallback(() => {
        return state.snoozeCount < state.snoozeLimit;
    }, [state.snoozeCount, state.snoozeLimit]);

    // Set custom sound
    const handleCustomSoundSelect = useCallback(async (file: File) => {
        try {
            await audioEngine.setCustomSound(file);

            // Convert to base64 for storage
            const base64 = await alarmStorage.fileToBase64(file);

            setState(prev => ({
                ...prev,
                customSoundName: file.name,
            }));

            // Save the custom sound data separately
            const currentSettings = await alarmStorage.load();
            await alarmStorage.save({
                ...currentSettings,
                customSoundName: file.name,
                customSoundData: base64,
            });
        } catch (e) {
            console.error('Failed to set custom sound:', e);
            throw e;
        }
    }, []);

    // Update volume
    const setVolume = useCallback((volume: number) => {
        setState(prev => ({ ...prev, volume }));
    }, []);

    // Update fade duration
    const setFadeDuration = useCallback((fadeDuration: number) => {
        setState(prev => ({ ...prev, fadeDuration }));
    }, []);

    // Update sound preset
    const setSoundPreset = useCallback((soundPreset: string) => {
        setState(prev => ({
            ...prev,
            soundPreset,
            customSoundName: null,
        }));
    }, []);

    // Update snooze limit
    const setSnoozeLimit = useCallback((snoozeLimit: number) => {
        setState(prev => ({ ...prev, snoozeLimit }));
    }, []);

    // Update mission type
    const setMissionType = useCallback((missionType: MissionType) => {
        setState(prev => ({ ...prev, missionType }));
    }, []);

    // Update mission difficulty
    const setMissionDifficulty = useCallback((missionDifficulty: MissionDifficulty) => {
        setState(prev => ({ ...prev, missionDifficulty }));
    }, []);

    // Update 24-hour format preference
    const setUse24Hour = useCallback((use24Hour: boolean) => {
        setState(prev => ({ ...prev, use24Hour }));
    }, []);

    // Update language
    const setLanguagePreference = useCallback((language: Language) => {
        setLanguage(language);
        setState(prev => ({ ...prev, language }));
    }, []);

    // Update weather enabled preference
    const setWeatherEnabled = useCallback((weatherEnabled: boolean) => {
        setState(prev => ({ ...prev, weatherEnabled }));
    }, []);

    // Update vibration pattern
    const setVibrationPattern = useCallback((vibrationPattern: VibrationPattern) => {
        setState(prev => ({ ...prev, vibrationPattern }));
    }, []);

    // Update QR registered code
    const setQrRegisteredCode = useCallback((qrRegisteredCode: string | null) => {
        setState(prev => ({ ...prev, qrRegisteredCode }));
    }, []);

    // Check if a date is a work day
    const isWorkDay = useCallback((date: Date): boolean => {
        return alarmScheduler.isWorkDay(date);
    }, []);

    // Keep ref updated with latest handlers
    useEffect(() => {
        notificationHandlerRef.current = { stopAlarm, snoozeAlarm };
    }, [stopAlarm, snoozeAlarm]);

    // Sync alarm schedule to Service Worker whenever it changes
    useEffect(() => {
        if (state.isLoading) return;

        notificationManager.syncAlarmSchedule({
            nextAlarmTime: state.nextAlarmTime?.toISOString() || null,
            snoozeEndTime: state.snoozeEndTime?.toISOString() || null,
            enabled: state.enabled,
        });
    }, [state.nextAlarmTime, state.snoozeEndTime, state.enabled, state.isLoading]);

    // Request alarm check when page becomes visible (recover from sleep/background)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                notificationManager.requestAlarmCheck();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Set up notification action handler
    useEffect(() => {
        const cleanup = notificationManager.onNotificationAction((action: string) => {
            if (action === 'snooze' && notificationHandlerRef.current) {
                // Check snooze limit before allowing snooze from notification
                if (state.snoozeCount < state.snoozeLimit) {
                    notificationHandlerRef.current.snoozeAlarm(5);
                } else {
                    // Snooze limit reached - show mission instead
                    console.log('Snooze limit reached from notification action');
                }
            } else if (action === 'dismiss' && notificationHandlerRef.current) {
                notificationHandlerRef.current.stopAlarm();
            } else if (action === 'alarm_check') {
                // SW detected alarm should fire - trigger it
                triggerAlarm();
            }
        });

        return cleanup;
    }, [state.snoozeCount, state.snoozeLimit, triggerAlarm]);

    return {
        // Core state
        alarmTime: state.alarmTime,
        recurrence: state.recurrence,
        startDate: state.startDate,
        enabled: state.enabled,
        isAlarmActive: state.isAlarmActive,
        nextAlarmTime: state.nextAlarmTime,
        isLoading: state.isLoading,
        isAudioBlocked: state.isAudioBlocked,

        // Sound settings
        customSoundName: state.customSoundName,
        volume: state.volume,
        fadeDuration: state.fadeDuration,
        soundPreset: state.soundPreset,

        // Snooze state
        snoozeLimit: state.snoozeLimit,
        snoozeCount: state.snoozeCount,
        snoozeEndTime: state.snoozeEndTime,

        // Mission settings
        missionType: state.missionType,
        missionDifficulty: state.missionDifficulty,

        // UI settings
        use24Hour: state.use24Hour,
        language: state.language,

        // Optional features
        weatherEnabled: state.weatherEnabled,
        vibrationPattern: state.vibrationPattern,
        qrRegisteredCode: state.qrRegisteredCode,

        // Actions
        setAlarmTime,
        setRecurrence,
        setStartDate,
        stopAlarm,
        snoozeAlarm,
        canSnooze,
        setCustomSound: handleCustomSoundSelect,
        setVolume,
        setFadeDuration,
        setSoundPreset,
        setSnoozeLimit,
        setMissionType,
        setMissionDifficulty,
        setUse24Hour,
        setLanguage: setLanguagePreference,
        setWeatherEnabled,
        setVibrationPattern,
        setQrRegisteredCode,
        isWorkDay,
        playBlockedAudio,
    };
};
