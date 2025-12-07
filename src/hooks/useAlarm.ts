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
import { saveAlarmSchedule, getAlarmSchedule } from '../utils/alarmPersistence';

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

    // Custom sound data (base64)
    customSoundData: string | null;

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
        customSoundData: null,
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
    // Ref to access vibration pattern in callbacks without re-creating them
    const vibrationPatternRef = useRef<VibrationPattern>(state.vibrationPattern);
    // Track loading state via ref for use in callbacks (avoids stale closure)
    const isLoadingRef = useRef(true);
    // Accumulate user changes made during initialization to preserve them
    const pendingUserChangesRef = useRef<Partial<AlarmState>>({});
    // Debounce timer for settings save (prevents excessive writes during slider drags)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Convert state to storage settings
    const stateToSettings = useCallback((s: AlarmState): AlarmSettings => ({
        alarmTime: s.alarmTime?.toISOString() || null, // Legacy field for backward compatibility
        alarmHour: s.alarmTime?.getHours() ?? null, // Timezone-independent hour
        alarmMinute: s.alarmTime?.getMinutes() ?? null, // Timezone-independent minute
        recurrence: s.recurrence,
        startDate: s.startDate.toISOString(),
        customSoundName: s.customSoundName,
        customSoundData: s.customSoundData,
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

    // Reconstruct alarm time from timezone-independent hour/minute
    const reconstructAlarmTime = (settings: AlarmSettings): Date | null => {
        // Prefer timezone-independent hour/minute if available
        if (settings.alarmHour !== null && settings.alarmHour !== undefined &&
            settings.alarmMinute !== null && settings.alarmMinute !== undefined) {
            const now = new Date();
            now.setHours(settings.alarmHour, settings.alarmMinute, 0, 0);
            return now;
        }
        // Fallback to legacy alarmTime (for backward compatibility with old data)
        if (settings.alarmTime) {
            const legacyDate = new Date(settings.alarmTime);
            // Extract hour/minute from legacy timestamp and apply to today
            const now = new Date();
            now.setHours(legacyDate.getHours(), legacyDate.getMinutes(), 0, 0);
            return now;
        }
        return null;
    };

    // Convert storage settings to state
    const settingsToState = useCallback((settings: AlarmSettings): Partial<AlarmState> => {
        const alarmTime = reconstructAlarmTime(settings);
        return {
        alarmTime,
        recurrence: settings.recurrence,
        startDate: new Date(settings.startDate),
        enabled: alarmTime !== null,
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
        customSoundData: settings.customSoundData ?? null,
    };
    }, []);

    // Trigger alarm callback
    // preserveSnoozeCount: true when triggered by snooze expiry to maintain count
    const triggerAlarm = useCallback(async (preserveSnoozeCount = false) => {
        setState(prev => ({
            ...prev,
            isAlarmActive: true,
            snoozeCount: preserveSnoozeCount ? prev.snoozeCount : 0,
            snoozeEndTime: null,
            isAudioBlocked: false,
        }));

        // Acquire wake lock to keep screen on and enable auto-reacquisition
        await wakeLockManager.acquire();
        wakeLockManager.enableAutoReacquire();

        // Show notification with vibration pattern (if enabled)
        const vibrationArray = vibrationPatternRef.current !== 'off'
            ? VIBRATION_PATTERNS[vibrationPatternRef.current]
            : undefined;
        await notificationManager.showAlarmNotification(vibrationArray);

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

                // Sync alarm schedule from SW's IndexedDB (SW may have updated it after background alarm/snooze)
                // This fixes bugs where:
                // 1. SW calculates next alarm but app reads stale data
                // 2. Lock screen snooze sets snoozeEndTime but app doesn't restore it
                let swSnoozeEndTime: Date | null = null;
                let swSnoozeCount: number | undefined;
                try {
                    const swSchedule = await getAlarmSchedule();
                    if (swSchedule) {
                        // Sync nextAlarmTime
                        if (swSchedule.nextAlarmTime && settings.alarmTime) {
                            const swNextTime = new Date(swSchedule.nextAlarmTime).getTime();
                            const settingsNextTime = settings.nextAlarmTime
                                ? new Date(settings.nextAlarmTime).getTime()
                                : 0;

                            // Use SW's nextAlarmTime if it's different and in the future
                            if (swNextTime !== settingsNextTime && swNextTime > Date.now()) {
                                console.log('[useAlarm] Syncing nextAlarmTime from SW:', swSchedule.nextAlarmTime);
                                settings.nextAlarmTime = swSchedule.nextAlarmTime;
                            }
                        }

                        // BUG FIX: Sync snoozeEndTime from SW (lock screen snooze case)
                        if (swSchedule.snoozeEndTime) {
                            const snoozeEnd = new Date(swSchedule.snoozeEndTime);
                            if (snoozeEnd.getTime() > Date.now()) {
                                console.log('[useAlarm] Restoring snoozeEndTime from SW:', swSchedule.snoozeEndTime);
                                swSnoozeEndTime = snoozeEnd;
                                swSnoozeCount = swSchedule.snoozeCount;
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to sync SW schedule:', e);
                }

                // Apply SW snooze state to settings so normal recovery flow handles it
                if (swSnoozeEndTime) {
                    settings.snoozeEndTime = swSnoozeEndTime.toISOString();
                    if (swSnoozeCount !== undefined) {
                        settings.snoozeCount = swSnoozeCount;
                    }
                }

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

                // Mark loading complete BEFORE setting state
                isLoadingRef.current = false;

                // Get any user changes made during loading (they take precedence)
                const userChanges = pendingUserChangesRef.current;
                pendingUserChangesRef.current = {};

                setState(prev => ({
                    ...prev,
                    ...restoredState,
                    ...userChanges, // User changes override loaded settings
                    isLoading: false,
                }));

                // BUG FIX: Re-sync audioEngine with user changes made during loading
                // If user changed volume/preset while settings were loading, apply them now
                if (userChanges.volume !== undefined) {
                    audioEngine.setVolume(userChanges.volume);
                }
                if (userChanges.fadeDuration !== undefined) {
                    audioEngine.setFadeDuration(userChanges.fadeDuration);
                }
                if (userChanges.soundPreset !== undefined) {
                    audioEngine.setPreset(userChanges.soundPreset);
                }

                // Recover pending snooze timer if exists
                if (settings.snoozeEndTime) {
                    const snoozeEnd = new Date(settings.snoozeEndTime);
                    const remainingMs = snoozeEnd.getTime() - Date.now();

                    if (remainingMs > 0) {
                        // Snooze is still pending, restore the timer
                        console.log(`Restoring snooze timer: ${remainingMs}ms remaining`);
                        snoozeTimeoutRef.current = setTimeout(() => {
                            triggerAlarm(true); // Preserve snoozeCount on snooze wakeup
                        }, remainingMs);
                    } else if (remainingMs > -60000) {
                        // Snooze just expired (within last minute), trigger alarm now
                        console.log('Snooze expired while away, triggering alarm');
                        triggerAlarm(true); // Preserve snoozeCount on snooze wakeup
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

                // Check for missed alarm (nextAlarmTime is in the past)
                if (settings.nextAlarmTime && !settings.snoozeEndTime) {
                    const nextAlarm = new Date(settings.nextAlarmTime);
                    const now = Date.now();
                    const timeDiff = nextAlarm.getTime() - now;

                    // If alarm was within the last 5 minutes, trigger it now
                    if (timeDiff < 0 && timeDiff > -5 * 60 * 1000) {
                        console.log('Missed alarm detected, triggering now');
                        triggerAlarm();
                        // Continue to initialize scheduler so next alarm is scheduled
                        // when user dismisses this alarm
                    } else if (timeDiff < 0) {
                        // Alarm was missed more than 5 minutes ago, just log and continue
                        console.log('Alarm was missed more than 5 minutes ago, skipping');
                    }
                }

                // Initialize scheduler if alarm is set
                // BUG FIX: Use merged settings with user changes made during loading
                // so scheduler reflects the most up-to-date configuration
                // BUG FIX: Use reconstructAlarmTime to properly handle both alarmHour/alarmMinute
                // and legacy alarmTime. Previously only checked settings.alarmTime which would
                // be null if only alarmHour/alarmMinute were stored.
                const finalAlarmTime = userChanges.alarmTime !== undefined
                    ? userChanges.alarmTime
                    : reconstructAlarmTime(settings);
                const finalRecurrence = userChanges.recurrence ?? settings.recurrence;
                const finalStartDate = userChanges.startDate ?? new Date(settings.startDate);

                if (finalAlarmTime) {
                    const config: SchedulerConfig = {
                        alarmHour: finalAlarmTime.getHours(),
                        alarmMinute: finalAlarmTime.getMinutes(),
                        recurrence: finalRecurrence,
                        startDate: finalStartDate,
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
                                // Check for missed alarm on visibility resume
                                notificationManager.requestAlarmCheck();
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

    // Save settings whenever they change (debounced to prevent excessive writes)
    // OPTIMIZATION: Only trigger save when actual persisted properties change,
    // not runtime-only state like isAlarmActive, isAudioBlocked, enabled
    // DEBOUNCE: 300ms delay prevents rapid writes during slider drags
    useEffect(() => {
        if (state.isLoading) return;

        // Clear any pending save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce the save operation
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await alarmStorage.save(stateToSettings(state));
            } catch (e) {
                console.error('Failed to save alarm settings:', e);
            }
        }, 300); // 300ms debounce

        // Cleanup timeout on unmount or before next effect run
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        // Note: We intentionally list individual properties instead of 'state' to enable debouncing.
        // Using 'state' would cause infinite loops since every save updates state.
        // Core settings
        state.alarmTime,
        state.recurrence,
        state.startDate,
        // Sound settings
        state.customSoundName,
        state.customSoundData,
        state.volume,
        state.fadeDuration,
        state.soundPreset,
        // Snooze settings (persisted for recovery)
        state.snoozeLimit,
        state.snoozeCount,
        state.snoozeEndTime,
        // Mission settings
        state.missionType,
        state.missionDifficulty,
        // UI settings
        state.use24Hour,
        state.language,
        // Optional features
        state.weatherEnabled,
        state.vibrationPattern,
        state.qrRegisteredCode,
        // Runtime recovery state
        state.nextAlarmTime,
        // Excluded (runtime-only, no save needed):
        // - state.isLoading (handled by early return)
        // - state.isAlarmActive
        // - state.isAudioBlocked
        // - state.enabled (derived from alarmTime)
        state.isLoading,
        stateToSettings,
    ]);

    // Keep vibration pattern ref in sync with state for use in callbacks
    useEffect(() => {
        vibrationPatternRef.current = state.vibrationPattern;
    }, [state.vibrationPattern]);

    // Set alarm time
    const setAlarmTime = useCallback((time: Date | null) => {
        // If still loading, record this change to preserve it after initialization
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = {
                ...pendingUserChangesRef.current,
                alarmTime: time,
                enabled: time !== null,
                // Always clear snooze state when alarm time changes (not just when disabled)
                // This prevents ghost snoozes from firing before the new alarm time
                nextAlarmTime: null,
                snoozeEndTime: null,
                snoozeCount: 0,
            };
        }

        // Always clear snooze timeout when alarm time changes (prevents ghost snoozes)
        if (snoozeTimeoutRef.current) {
            clearTimeout(snoozeTimeoutRef.current);
            snoozeTimeoutRef.current = null;
        }

        setState(prev => {
            const newState = {
                ...prev,
                alarmTime: time,
                enabled: time !== null,
                // Always clear snooze state when alarm time changes (not just when disabled)
                // This prevents ghost snoozes and stale snooze counts
                nextAlarmTime: null,
                snoozeEndTime: null,
                snoozeCount: 0,
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
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, recurrence };
        }
        setState(prev => {
            alarmScheduler.updateConfig({ recurrence });
            return { ...prev, recurrence };
        });
    }, []);

    // Set start date (for shift cycle)
    const setStartDate = useCallback((date: Date) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, startDate: date };
        }
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

        // Clear any pending autoplay callback to prevent unexpected playback
        audioAutoplayManager.clearPendingPlay();

        // Close notification
        await notificationManager.closeAlarmNotification();

        // Release wake lock and disable auto-reacquisition
        wakeLockManager.disableAutoReacquire();
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

            // Clear any pending autoplay callback to prevent unexpected playback
            audioAutoplayManager.clearPendingPlay();

            const snoozeEndTime = new Date(Date.now() + minutes * 60 * 1000);

            // Clear existing snooze timeout
            if (snoozeTimeoutRef.current) {
                clearTimeout(snoozeTimeoutRef.current);
            }

            // Set new snooze timeout
            snoozeTimeoutRef.current = setTimeout(() => {
                triggerAlarm(true); // Preserve snoozeCount on snooze wakeup
            }, minutes * 60 * 1000);

            return {
                ...prev,
                isAlarmActive: false,
                snoozeCount: prev.snoozeCount + 1,
                snoozeEndTime,
            };
        });

        // Release wake lock and disable auto-reacquire during snooze to save battery
        // Wake lock will be re-acquired when triggerAlarm is called after snooze expires
        wakeLockManager.disableAutoReacquire();
        await wakeLockManager.release();
        await notificationManager.closeAlarmNotification();
    }, [triggerAlarm]);

    // Check if can snooze
    const canSnooze = useCallback(() => {
        return state.snoozeCount < state.snoozeLimit;
    }, [state.snoozeCount, state.snoozeLimit]);

    // Set custom sound
    const handleCustomSoundSelect = useCallback(async (file: File) => {
        try {
            const highlightResult = await audioEngine.setCustomSound(file);

            // Convert to base64 for storage
            const base64 = await alarmStorage.fileToBase64(file);

            if (isLoadingRef.current) {
                pendingUserChangesRef.current = {
                    ...pendingUserChangesRef.current,
                    customSoundName: file.name,
                    customSoundData: base64,
                };
            }

            setState(prev => ({
                ...prev,
                customSoundName: file.name,
                customSoundData: base64,
            }));

            return highlightResult;
        } catch (e) {
            console.error('Failed to set custom sound:', e);
            throw e;
        }
    }, []);

    // Update volume
    const setVolume = useCallback((volume: number) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, volume };
        }
        // BUG FIX: Sync audioEngine immediately so volume changes take effect
        audioEngine.setVolume(volume);
        setState(prev => ({ ...prev, volume }));
    }, []);

    // Update fade duration
    const setFadeDuration = useCallback((fadeDuration: number) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, fadeDuration };
        }
        // BUG FIX: Sync audioEngine immediately so fade duration changes take effect
        audioEngine.setFadeDuration(fadeDuration);
        setState(prev => ({ ...prev, fadeDuration }));
    }, []);

    // Update sound preset
    const setSoundPreset = useCallback((soundPreset: string) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = {
                ...pendingUserChangesRef.current,
                soundPreset,
                customSoundName: null,
                customSoundData: null,
            };
        }
        // Clear custom sound from audio engine and switch to preset
        audioEngine.clearCustomSound();
        audioEngine.setPreset(soundPreset);

        setState(prev => ({
            ...prev,
            soundPreset,
            customSoundName: null,
            customSoundData: null,
        }));
    }, []);

    // Update snooze limit
    const setSnoozeLimit = useCallback((snoozeLimit: number) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, snoozeLimit };
        }
        setState(prev => ({ ...prev, snoozeLimit }));
    }, []);

    // Update mission type
    const setMissionType = useCallback((missionType: MissionType) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, missionType };
        }
        setState(prev => ({ ...prev, missionType }));
    }, []);

    // Update mission difficulty
    const setMissionDifficulty = useCallback((missionDifficulty: MissionDifficulty) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, missionDifficulty };
        }
        setState(prev => ({ ...prev, missionDifficulty }));
    }, []);

    // Update 24-hour format preference
    const setUse24Hour = useCallback((use24Hour: boolean) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, use24Hour };
        }
        setState(prev => ({ ...prev, use24Hour }));
    }, []);

    // Update language
    const setLanguagePreference = useCallback((language: Language) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, language };
        }
        setLanguage(language);
        setState(prev => ({ ...prev, language }));
    }, []);

    // Update weather enabled preference
    const setWeatherEnabled = useCallback((weatherEnabled: boolean) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, weatherEnabled };
        }
        setState(prev => ({ ...prev, weatherEnabled }));
    }, []);

    // Update vibration pattern
    const setVibrationPattern = useCallback((vibrationPattern: VibrationPattern) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, vibrationPattern };
        }
        setState(prev => ({ ...prev, vibrationPattern }));
    }, []);

    // Update QR registered code
    const setQrRegisteredCode = useCallback((qrRegisteredCode: string | null) => {
        if (isLoadingRef.current) {
            pendingUserChangesRef.current = { ...pendingUserChangesRef.current, qrRegisteredCode };
        }
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

        // Get the actual vibration pattern array from the pattern name
        const vibrationPatternArray = state.vibrationPattern !== 'off'
            ? VIBRATION_PATTERNS[state.vibrationPattern]
            : undefined;

        const schedule = {
            nextAlarmTime: state.nextAlarmTime?.toISOString() || null,
            snoozeEndTime: state.snoozeEndTime?.toISOString() || null,
            enabled: state.enabled,
            vibrationPattern: vibrationPatternArray,
            // Include recurrence config for SW to calculate next alarm
            alarmHour: state.alarmTime?.getHours(),
            alarmMinute: state.alarmTime?.getMinutes(),
            recurrence: state.recurrence,
            startDate: state.startDate?.toISOString(),
            // Snooze limit enforcement for SW (so it can check limits when handling background snooze)
            snoozeCount: state.snoozeCount,
            snoozeLimit: state.snoozeLimit,
            // User's language setting (for correct notification language in SW)
            language: state.language,
        };

        notificationManager.syncAlarmSchedule(schedule);

        // Persist schedule to IndexedDB for SW recovery (includes vibrationPattern for background notifications)
        saveAlarmSchedule({
            nextAlarmTime: schedule.nextAlarmTime,
            snoozeEndTime: schedule.snoozeEndTime,
            enabled: schedule.enabled,
            vibrationPattern: vibrationPatternArray,
            // Include recurrence config for SW to calculate next alarm
            alarmHour: schedule.alarmHour,
            alarmMinute: schedule.alarmMinute,
            recurrence: schedule.recurrence,
            startDate: schedule.startDate,
            // Snooze limit enforcement for SW
            snoozeCount: schedule.snoozeCount,
            snoozeLimit: schedule.snoozeLimit,
            // User's language setting for correct notification language
            language: schedule.language,
        });
    }, [state.nextAlarmTime, state.snoozeEndTime, state.enabled, state.isLoading, state.vibrationPattern, state.alarmTime, state.recurrence, state.startDate, state.snoozeCount, state.snoozeLimit, state.language]);

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
        const cleanup = notificationManager.onNotificationAction((action: string, reason?: string, data?: { nextAlarmTime?: string; snoozeEndTime?: string; snoozeCount?: number }) => {
            if (action === 'snooze' && notificationHandlerRef.current) {
                // Check snooze limit before allowing snooze from notification
                if (state.snoozeCount < state.snoozeLimit) {
                    notificationHandlerRef.current.snoozeAlarm(5);
                } else {
                    // Snooze limit reached - show mission instead
                    console.log('Snooze limit reached from notification action');
                }
            } else if (action === 'dismiss') {
                // Don't allow direct dismiss - force user to complete mission
                // Trigger alarm to show mission UI instead of bypassing it
                if (!state.isAlarmActive) {
                    triggerAlarm();
                }
                // Note: Alarm will continue until mission is completed
            } else if (action === 'alarm_check') {
                // SW detected alarm should fire - trigger it
                // BUG FIX: Cancel scheduler's pending timeout to prevent duplicate alarm triggers
                // The SW is now handling this alarm, so scheduler shouldn't also fire it
                alarmScheduler.cancelPendingAndReschedule();

                // Preserve snooze count if this is a snooze expiry (not a new alarm)
                // This prevents users from bypassing snooze limits via background snooze
                const preserveSnoozeCount = reason === 'snooze_expired';
                triggerAlarm(preserveSnoozeCount);
            } else if (action === 'click' || action === 'open') {
                // User tapped notification body or "Open" button
                // Trigger alarm if not already active (SW showed notification because alarm time passed)
                if (!state.isAlarmActive) {
                    triggerAlarm();
                }
            } else if (action === 'snooze_set_by_sw' && data?.snoozeEndTime) {
                // SW handled snooze directly from notification action (app was in background)
                // Sync client state: stop audio, release wake lock, update snooze state
                console.log('[useAlarm] SW set snooze directly, syncing state:', data.snoozeEndTime, 'count:', data.snoozeCount);

                // Stop alarm audio immediately
                audioEngine.stopAlarm();

                // Release wake lock
                wakeLockManager.disableAutoReacquire();
                wakeLockManager.release();

                // Clear any pending audio callback
                audioAutoplayManager.clearPendingPlay();

                // Close any open notifications
                notificationManager.closeAlarmNotification();

                // Update state with snooze info from SW (use SW's snoozeCount as source of truth)
                setState(prev => ({
                    ...prev,
                    isAlarmActive: false,
                    snoozeEndTime: new Date(data.snoozeEndTime!),
                    snoozeCount: data.snoozeCount ?? prev.snoozeCount + 1, // Use SW count or fallback to increment
                }));

                // Set local fallback timer in case SW polling fails or SW terminates
                // This ensures alarm triggers even without SW intervention
                if (snoozeTimeoutRef.current) {
                    clearTimeout(snoozeTimeoutRef.current);
                }
                const snoozeEndMs = new Date(data.snoozeEndTime!).getTime();
                const remainingMs = Math.max(0, snoozeEndMs - Date.now());
                console.log('[useAlarm] Setting local fallback timer for SW snooze:', remainingMs, 'ms');
                snoozeTimeoutRef.current = setTimeout(() => {
                    console.log('[useAlarm] Local fallback timer fired for SW snooze');
                    triggerAlarm(true); // Preserve snoozeCount on snooze wakeup
                }, remainingMs);
            } else if (action === 'snooze_limit_reached') {
                // SW tried to snooze but limit was reached
                // Trigger alarm UI so user must complete mission (can't snooze anymore)
                console.log('[useAlarm] Snooze limit reached from SW notification action');

                // Close any open notifications
                notificationManager.closeAlarmNotification();

                // Trigger alarm if not already active - user must complete mission
                if (!state.isAlarmActive) {
                    triggerAlarm(true); // Preserve snooze count - don't reset
                }
            } else if (action === 'next_alarm_updated' && data?.nextAlarmTime) {
                // SW calculated new nextAlarmTime after alarm triggered
                // Update state to prevent sync effect from overwriting with stale data
                console.log('[useAlarm] Received new nextAlarmTime from SW:', data.nextAlarmTime);
                setState(prev => ({
                    ...prev,
                    nextAlarmTime: new Date(data.nextAlarmTime!),
                }));
            }
        });

        return cleanup;
    }, [state.snoozeCount, state.snoozeLimit, state.isAlarmActive, triggerAlarm]);

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
