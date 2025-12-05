import React, { useState, useMemo } from 'react';
import { Calendar, Repeat, X, Music, Volume2, Play, Square, Clock, CloudSun, QrCode, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { t, getLanguage } from '../utils/i18n';
import type { TranslationKey } from '../utils/i18n';
import type { Recurrence, VibrationPattern, MissionType } from '../hooks/useAlarm';
import { audioEngine, SOUND_PRESETS } from '../utils/audio';

interface ShiftSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    recurrence: Recurrence;
    setRecurrence: (r: Recurrence) => void;
    startDate: Date;
    setStartDate: (d: Date) => void;
    customSoundName: string | null;
    setCustomSound: (file: File) => void;
    volume: number;
    setVolume: (v: number) => void;
    fadeDuration: number;
    setFadeDuration: (d: number) => void;
    soundPreset: string;
    setSoundPreset: (p: string) => void;
    isWorkDay: (date: Date) => boolean;
    use24Hour: boolean;
    setUse24Hour: (v: boolean) => void;
    weatherEnabled: boolean;
    setWeatherEnabled: (v: boolean) => void;
    vibrationPattern: VibrationPattern;
    setVibrationPattern: (p: VibrationPattern) => void;
    missionType: MissionType;
    qrRegisteredCode: string | null;
    setQrRegisteredCode: (code: string | null) => void;
}

const ShiftSettings: React.FC<ShiftSettingsProps> = ({
    isOpen,
    onClose,
    recurrence,
    setRecurrence,
    startDate,
    setStartDate,
    customSoundName,
    setCustomSound,
    volume,
    setVolume,
    fadeDuration,
    setFadeDuration,
    soundPreset,
    setSoundPreset,
    isWorkDay,
    use24Hour,
    setUse24Hour,
    weatherEnabled,
    setWeatherEnabled,
    vibrationPattern,
    setVibrationPattern,
    missionType,
    qrRegisteredCode,
    setQrRegisteredCode,
}) => {
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [previewingPreset, setPreviewingPreset] = useState<string | null>(null);
    const [soundError, setSoundError] = useState<string | null>(null);
    const [isQrScanning, setIsQrScanning] = useState(false);

    // Generate calendar days for the current month view
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(calendarMonth);
        const monthEnd = endOfMonth(calendarMonth);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Add padding days for the start of the week (Sunday = 0)
        const startPadding = getDay(monthStart);
        const paddedDays: (Date | null)[] = Array(startPadding).fill(null);

        return [...paddedDays, ...days];
    }, [calendarMonth]);

    // Check if a day is an alarm day based on recurrence settings
    const isAlarmDay = (date: Date | null): boolean => {
        if (!date) return false;
        if (recurrence === 'daily') return true;
        return isWorkDay(date);
    };

    const handlePreviewPreset = (presetId: string) => {
        if (previewingPreset === presetId) {
            audioEngine.stopPreview();
            setPreviewingPreset(null);
            setIsPreviewing(false);
        } else {
            audioEngine.setVolume(volume);
            audioEngine.previewPreset(presetId, 3);
            setPreviewingPreset(presetId);
            setIsPreviewing(true);

            // Auto-reset after preview ends
            setTimeout(() => {
                setPreviewingPreset(null);
                setIsPreviewing(false);
            }, 3000);
        }
    };

    const handlePreviewCustom = () => {
        if (isPreviewing && !previewingPreset) {
            audioEngine.stopPreview();
            setIsPreviewing(false);
        } else if (audioEngine.hasCustomSound()) {
            audioEngine.setVolume(volume);
            audioEngine.previewCustomSound(3);
            setPreviewingPreset(null);
            setIsPreviewing(true);

            setTimeout(() => {
                setIsPreviewing(false);
            }, 3000);
        }
    };

    const handleSelectPreset = (presetId: string) => {
        setSoundPreset(presetId);
        audioEngine.setPreset(presetId);
        audioEngine.clearCustomSound();
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        audioEngine.setVolume(newVolume);
    };

    const handleFadeDurationChange = (duration: number) => {
        setFadeDuration(duration);
        audioEngine.setFadeDuration(duration);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-md bg-nebula-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden my-4">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-nebula-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="flex justify-between items-center mb-6 relative z-10">
                    <h2 className="text-xl font-display font-bold text-white">{t('settings')}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/70" />
                    </button>
                </div>

                <div className="space-y-6 relative z-10">
                    {/* Recurrence Toggle */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-nebula-300 text-sm font-medium uppercase tracking-wider">
                            <Repeat className="w-4 h-4" />
                            {t('recurrence')}
                        </label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl">
                            <button
                                onClick={() => setRecurrence('daily')}
                                className={`py-2 rounded-lg text-sm font-bold transition-all ${recurrence === 'daily' ? 'bg-nebula-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                            >
                                {t('daily')}
                            </button>
                            <button
                                onClick={() => setRecurrence('every-other-day')}
                                className={`py-2 rounded-lg text-sm font-bold transition-all ${recurrence === 'every-other-day' ? 'bg-nebula-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                            >
                                {t('everyOtherDay')}
                            </button>
                        </div>
                    </div>

                    {/* Start Date Picker (Only if Shift Mode) */}
                    {recurrence === 'every-other-day' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                            <label className="flex items-center gap-2 text-nebula-300 text-sm font-medium uppercase tracking-wider">
                                <Calendar className="w-4 h-4" />
                                {t('startDate')}
                            </label>
                            <input
                                type="date"
                                value={format(startDate, 'yyyy-MM-dd')}
                                onChange={(e) => setStartDate(new Date(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-nebula-500 transition-colors"
                            />

                            {/* Calendar Preview */}
                            <div className="bg-black/30 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                                        className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                                    >
                                        ◀
                                    </button>
                                    <span className="text-white font-medium">
                                        {format(calendarMonth, getLanguage() === 'ko' ? 'yyyy년 M월' : 'MMM yyyy', { locale: getLanguage() === 'ko' ? ko : enUS })}
                                    </span>
                                    <button
                                        onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                                        className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                                    >
                                        ▶
                                    </button>
                                </div>

                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/40">
                                    {[t('daySun'), t('dayMon'), t('dayTue'), t('dayWed'), t('dayThu'), t('dayFri'), t('daySat')].map((day) => (
                                        <div key={day} className="py-1">{day}</div>
                                    ))}
                                </div>

                                {/* Calendar Days */}
                                <div className="grid grid-cols-7 gap-1">
                                    {calendarDays.map((day, index) => (
                                        <div
                                            key={index}
                                            className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-colors ${!day
                                                ? ''
                                                : isAlarmDay(day)
                                                    ? isSameDay(day, new Date())
                                                        ? 'bg-nebula-400 text-nebula-900 font-bold'
                                                        : 'bg-nebula-500/30 text-nebula-300'
                                                    : isSameMonth(day, calendarMonth)
                                                        ? 'text-white/30'
                                                        : 'text-white/10'
                                                }`}
                                        >
                                            {day ? format(day, 'd') : ''}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-4 text-xs pt-2 border-t border-white/10">
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded bg-nebula-500/30" />
                                        <span className="text-white/50">{t('alarmDay')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded bg-nebula-400" />
                                        <span className="text-white/50">{t('today')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sound Settings */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <label className="flex items-center gap-2 text-nebula-300 text-sm font-medium uppercase tracking-wider">
                            <Music className="w-4 h-4" />
                            {t('alarmSound')}
                        </label>

                        {/* Sound Presets Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            {SOUND_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => handleSelectPreset(preset.id)}
                                    className={`relative p-3 rounded-xl text-left transition-all ${soundPreset === preset.id && !customSoundName
                                        ? 'bg-nebula-500/30 border border-nebula-500'
                                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-white">{preset.nameKo}</div>
                                            <div className="text-xs text-white/50">{preset.name}</div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePreviewPreset(preset.id);
                                            }}
                                            className={`p-1.5 rounded-full transition-colors ${previewingPreset === preset.id
                                                ? 'bg-nebula-400 text-nebula-900'
                                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                                                }`}
                                        >
                                            {previewingPreset === preset.id ? (
                                                <Square className="w-3 h-3" />
                                            ) : (
                                                <Play className="w-3 h-3" />
                                            )}
                                        </button>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Custom Sound */}
                        <div className="relative">
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={async (e) => {
                                    if (e.target.files?.[0]) {
                                        try {
                                            setSoundError(null);
                                            await setCustomSound(e.target.files[0]);
                                        } catch (err) {
                                            const validErrorKeys: TranslationKey[] = ['soundLoadError', 'soundFormatError', 'soundSizeError'];
                                            const errorMsg = err instanceof Error ? err.message : 'soundLoadError';
                                            const errorKey = validErrorKeys.includes(errorMsg as TranslationKey)
                                                ? (errorMsg as TranslationKey)
                                                : 'soundLoadError';
                                            setSoundError(t(errorKey));
                                        }
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`w-full border rounded-xl px-4 py-3 flex items-center justify-between transition-colors ${customSoundName
                                ? 'bg-nebula-500/30 border-nebula-500'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }`}>
                                <span className="truncate max-w-[200px] text-sm text-white">
                                    {customSoundName || t('customSound')}
                                </span>
                                <div className="flex items-center gap-2">
                                    {customSoundName && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePreviewCustom();
                                            }}
                                            className={`p-1.5 rounded-full transition-colors z-20 relative ${isPreviewing && !previewingPreset
                                                ? 'bg-nebula-400 text-nebula-900'
                                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                                                }`}
                                        >
                                            {isPreviewing && !previewingPreset ? (
                                                <Square className="w-3 h-3" />
                                            ) : (
                                                <Play className="w-3 h-3" />
                                            )}
                                        </button>
                                    )}
                                    <span className="text-xs bg-nebula-500/20 text-nebula-300 px-2 py-1 rounded">
                                        {t('change')}
                                    </span>
                                </div>
                            </div>
                            {soundError && (
                                <p className="text-red-400 text-xs mt-2">{soundError}</p>
                            )}
                        </div>
                    </div>

                    {/* Volume Control */}
                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <label className="flex items-center justify-between text-nebula-300 text-sm font-medium uppercase tracking-wider">
                            <span className="flex items-center gap-2">
                                <Volume2 className="w-4 h-4" />
                                {t('volume')}
                            </span>
                            <span className="text-white font-mono">{Math.round(volume * 100)}%</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume * 100}
                            onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-nebula-500"
                        />
                    </div>

                    {/* Fade Duration */}
                    <div className="space-y-3">
                        <label className="flex items-center justify-between text-nebula-300 text-sm font-medium uppercase tracking-wider">
                            <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {t('fadeDuration')}
                            </span>
                            <span className="text-white font-mono">{fadeDuration}s</span>
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="120"
                            value={fadeDuration}
                            onChange={(e) => handleFadeDurationChange(Number(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-nebula-500"
                        />
                        <p className="text-xs text-white/40">
                            {t('fadeDurationDesc')}
                        </p>
                    </div>

                    {/* Vibration Pattern */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-nebula-300 text-sm font-medium uppercase tracking-wider">
                            <span className="text-lg">📳</span>
                            진동 패턴
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'heartbeat' as const, label: '심장박동', emoji: '💓' },
                                { id: 'ticktock' as const, label: '틱톡', emoji: '⏰' },
                                { id: 'rapid' as const, label: '빠른', emoji: '⚡' },
                                { id: 'sos' as const, label: 'SOS', emoji: '🆘' },
                                { id: 'continuous' as const, label: '연속', emoji: '〰️' },
                                { id: 'off' as const, label: '끄기', emoji: '🔕' },
                            ].map((pattern) => (
                                <button
                                    key={pattern.id}
                                    onClick={() => {
                                        setVibrationPattern(pattern.id);
                                        // Preview vibration
                                        if (pattern.id !== 'off' && navigator.vibrate) {
                                            navigator.vibrate([200, 100, 200]);
                                        }
                                    }}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all ${vibrationPattern === pattern.id
                                        ? 'bg-nebula-500/30 border border-nebula-500'
                                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="text-lg">{pattern.emoji}</span>
                                    <span className="text-xs text-white">{pattern.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Time Format Toggle */}
                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <label className="flex items-center gap-2 text-nebula-300 text-sm font-medium uppercase tracking-wider">
                            <Clock className="w-4 h-4" aria-hidden="true" />
                            {t('timeFormat')}
                        </label>
                        <div
                            className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl"
                            role="radiogroup"
                            aria-label={t('timeFormat')}
                        >
                            <button
                                onClick={() => setUse24Hour(true)}
                                className={`py-2 rounded-lg text-sm font-bold transition-all ${use24Hour ? 'bg-nebula-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                role="radio"
                                aria-checked={use24Hour}
                                aria-label={t('use24Hour')}
                            >
                                {t('use24Hour')}
                            </button>
                            <button
                                onClick={() => setUse24Hour(false)}
                                className={`py-2 rounded-lg text-sm font-bold transition-all ${!use24Hour ? 'bg-nebula-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                role="radio"
                                aria-checked={!use24Hour}
                                aria-label={t('use12Hour')}
                            >
                                {t('use12Hour')}
                            </button>
                        </div>
                    </div>

                    {/* Weather Toggle */}
                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <label className="flex items-center gap-2 text-nebula-300 text-sm font-medium uppercase tracking-wider">
                            <CloudSun className="w-4 h-4" aria-hidden="true" />
                            {t('weatherSettings')}
                        </label>
                        <div
                            className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl"
                            role="radiogroup"
                            aria-label={t('weatherSettings')}
                        >
                            <button
                                onClick={() => setWeatherEnabled(true)}
                                className={`py-2 rounded-lg text-sm font-bold transition-all ${weatherEnabled ? 'bg-nebula-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                role="radio"
                                aria-checked={weatherEnabled}
                            >
                                {t('weatherOn')}
                            </button>
                            <button
                                onClick={() => setWeatherEnabled(false)}
                                className={`py-2 rounded-lg text-sm font-bold transition-all ${!weatherEnabled ? 'bg-nebula-500 text-white shadow-lg' : 'text-white/50 hover:text-white'}`}
                                role="radio"
                                aria-checked={!weatherEnabled}
                            >
                                {t('weatherOff')}
                            </button>
                        </div>
                        <p className="text-xs text-white/40">
                            {t('weatherDescription')}
                        </p>
                    </div>

                    {/* QR Code Registration (only show when QR mission is selected) */}
                    {missionType === 'qr' && (
                        <div className="space-y-3 pt-4 border-t border-white/10">
                            <label className="flex items-center gap-2 text-nebula-300 text-sm font-medium uppercase tracking-wider">
                                <QrCode className="w-4 h-4" aria-hidden="true" />
                                {t('registerQrCode')}
                            </label>
                            {qrRegisteredCode ? (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <p className="text-white text-sm">{t('qrCodeRegistered')}</p>
                                            <p className="text-white/50 text-xs font-mono truncate">{qrRegisteredCode}</p>
                                        </div>
                                        <button
                                            onClick={() => setQrRegisteredCode(null)}
                                            className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                                            aria-label={t('clearQrCode')}
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                    {isQrScanning ? (
                                        <div className="text-center">
                                            <p className="text-white/70 text-sm">{t('scanQR')}</p>
                                            {/* QR Scanner would go here - for now just a placeholder */}
                                            <button
                                                onClick={() => setIsQrScanning(false)}
                                                className="mt-3 px-4 py-2 bg-nebula-500 text-white rounded-lg text-sm"
                                            >
                                                {t('done')}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsQrScanning(true)}
                                            className="w-full py-3 bg-nebula-500/20 hover:bg-nebula-500/30 text-nebula-300 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            📷 {t('registerQR')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
                    aria-label={t('done')}
                >
                    {t('done')}
                </button>
            </div>
        </div>
    );
};

export default ShiftSettings;
