import React, { useEffect, useState, useRef } from 'react';
import { Sun, Bell, BellOff, Volume2 } from 'lucide-react';
import { t } from '../utils/i18n';
import { VIBRATION_PATTERNS, type VibrationPattern } from '../hooks/useAlarm';

interface AlarmRingProps {
    onStop: () => void;
    onSnooze: () => void;
    snoozeCount: number;
    snoozeLimit: number;
    snoozeEndTime: Date | null;
    isAudioBlocked?: boolean;
    onPlayBlockedAudio?: () => void;
    vibrationPattern?: VibrationPattern;
}

const AlarmRing: React.FC<AlarmRingProps> = ({
    onStop,
    onSnooze,
    snoozeCount,
    snoozeLimit,
    snoozeEndTime,
    isAudioBlocked = false,
    onPlayBlockedAudio,
    vibrationPattern = 'heartbeat',
}) => {
    const [opacity, setOpacity] = useState(0);
    const [countdown, setCountdown] = useState<string | null>(null);
    const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const canSnooze = snoozeCount < snoozeLimit;
    const snoozesRemaining = snoozeLimit - snoozeCount;

    // Sunrise simulation: Fade in opacity over 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setOpacity(prev => Math.min(prev + 0.01, 1));
        }, 50);
        return () => clearInterval(interval);
    }, []);

    // Vibration loop
    useEffect(() => {
        if (vibrationPattern === 'off' || !navigator.vibrate) {
            return;
        }

        const pattern = VIBRATION_PATTERNS[vibrationPattern];
        if (!pattern || pattern.length === 0) return;

        // Calculate total duration of one pattern cycle
        const patternDuration = pattern.reduce((a, b) => a + b, 0);

        // Start vibration
        navigator.vibrate(pattern);

        // Repeat vibration pattern
        vibrationIntervalRef.current = setInterval(() => {
            navigator.vibrate(pattern);
        }, patternDuration);

        return () => {
            if (vibrationIntervalRef.current) {
                clearInterval(vibrationIntervalRef.current);
            }
            navigator.vibrate(0); // Stop vibration
        };
    }, [vibrationPattern]);

    // Snooze countdown timer - compute countdown string from snoozeEndTime
    useEffect(() => {
        if (!snoozeEndTime) {
            // Use timeout to avoid synchronous setState in effect
            const timeoutId = setTimeout(() => setCountdown(null), 0);
            return () => clearTimeout(timeoutId);
        }

        const updateCountdown = () => {
            const now = Date.now();
            const remaining = snoozeEndTime.getTime() - now;

            if (remaining <= 0) {
                setCountdown(null);
                return;
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };

        // Initial update via timeout to avoid sync setState
        const initialTimeout = setTimeout(updateCountdown, 0);
        const interval = setInterval(updateCountdown, 1000);
        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, [snoozeEndTime]);

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center text-white overflow-hidden"
            style={{
                background: `linear-gradient(to top, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)`,
                opacity: opacity
            }}
            role="alertdialog"
            aria-modal="true"
            aria-label="알람이 울리고 있습니다"
        >
            {/* Overlay for text readability */}
            <div className="absolute inset-0 bg-black/20" />

            <div className="z-10 flex flex-col items-center animate-pulse" aria-live="assertive">
                <Sun className="w-24 h-24 text-yellow-300 mb-8 drop-shadow-[0_0_30px_rgba(253,224,71,0.8)]" />
                <h1 className="text-6xl font-display font-bold mb-2 drop-shadow-lg">
                    {t('goodMorning')}
                </h1>
                <p className="text-xl font-light tracking-widest uppercase mb-12">
                    {t('wakeUp')}
                </p>
            </div>

            {/* Audio blocked banner - tap to play */}
            {isAudioBlocked && onPlayBlockedAudio && (
                <button
                    onClick={onPlayBlockedAudio}
                    className="z-10 mb-6 bg-red-500/80 backdrop-blur-md rounded-2xl px-6 py-4 border border-red-400/50 hover:bg-red-500/90 transition-colors animate-bounce"
                    aria-label={t('tapToPlay')}
                >
                    <div className="flex items-center gap-3">
                        <Volume2 className="w-6 h-6 text-white" />
                        <div className="text-left">
                            <p className="text-sm text-white/90">{t('audioBlocked')}</p>
                            <p className="text-lg font-bold text-white">{t('tapToPlay')}</p>
                        </div>
                    </div>
                </button>
            )}

            {/* Snooze countdown display */}
            {countdown && (
                <div className="z-10 mb-6 bg-white/20 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/30" aria-live="polite">
                    <p className="text-sm text-white/80 mb-1">{t('snoozeCountdown')}</p>
                    <p className="text-3xl font-display font-bold text-center">{countdown}</p>
                </div>
            )}

            <div className="z-10 flex flex-col gap-4 w-full max-w-xs px-6">
                <button
                    onClick={onStop}
                    className="w-full py-4 bg-white text-nebula-900 font-bold rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                    {t('wakeUp')}
                </button>

                {canSnooze ? (
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={onSnooze}
                            className="w-full py-4 bg-white/20 backdrop-blur-md border border-white/30 text-white font-medium rounded-full hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
                        >
                            <Bell className="w-5 h-5" />
                            {t('snooze')} (5{t('snoozeMinutes')})
                        </button>
                        <p className="text-center text-sm text-white/70">
                            {t('snoozeRemaining')}: {snoozesRemaining}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <button
                            disabled
                            className="w-full py-4 bg-white/10 border border-white/20 text-white/50 font-medium rounded-full flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                            <BellOff className="w-5 h-5" />
                            {t('snooze')}
                        </button>
                        <p className="text-center text-sm text-red-300">
                            {t('noMoreSnooze')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlarmRing;
