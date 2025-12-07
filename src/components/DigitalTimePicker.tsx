import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { t } from '../utils/i18n';

interface DigitalTimePickerProps {
    alarmTime: Date | null;
    onAlarmSet: (time: Date) => void;
    theme?: 'default' | 'penguin';
    timeOfDay?: 'day' | 'night';
    use24Hour?: boolean;
}

const DigitalTimePicker: React.FC<DigitalTimePickerProps> = ({
    alarmTime,
    onAlarmSet,
    theme = 'default',
    timeOfDay = 'day',
    use24Hour = true
}) => {
    // Initialize state from props
    const [hours, setHours] = useState(7);
    const [minutes, setMinutes] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempHours, setTempHours] = useState(7); // Always stored in 24h format internally
    const [tempMinutes, setTempMinutes] = useState(0);
    const [tempIsAm, setTempIsAm] = useState(true); // For 12h mode AM/PM toggle

    // Update internal state when alarmTime prop changes
    useEffect(() => {
        if (alarmTime) {
            // Use setTimeout to avoid synchronous setState within effect
            const timeoutId = setTimeout(() => {
                setHours(alarmTime.getHours());
                setMinutes(alarmTime.getMinutes());
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [alarmTime]);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isModalOpen && e.key === 'Escape') {
                setIsModalOpen(false);
            }
        };

        if (isModalOpen) {
            window.addEventListener('keydown', handleKeyDown);
            // Prevent scrolling on body when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isModalOpen]);

    // Helper to update parent
    const updateTime = (newHours: number, newMinutes: number) => {
        const date = new Date();
        date.setHours(newHours);
        date.setMinutes(newMinutes);
        date.setSeconds(0);
        date.setMilliseconds(0);
        onAlarmSet(date);
    };

    const openModal = () => {
        setTempHours(hours);
        setTempMinutes(minutes);
        setTempIsAm(hours < 12); // Set AM/PM based on current hours
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const confirmTime = () => {
        setHours(tempHours);
        setMinutes(tempMinutes);
        updateTime(tempHours, tempMinutes);
        setIsModalOpen(false);
    };

    const adjustTempHours = (delta: number) => {
        if (use24Hour) {
            // 24h mode: cycle 0-23
            let newHours = (tempHours + delta) % 24;
            if (newHours < 0) newHours += 24;
            setTempHours(newHours);
        } else {
            // 12h mode: cycle within AM (0-11) or PM (12-23) separately
            const isPm = tempHours >= 12;
            let hour12 = tempHours % 12 || 12; // Convert to 1-12 format
            hour12 += delta;

            // Wrap around 1-12
            if (hour12 > 12) hour12 = 1;
            if (hour12 < 1) hour12 = 12;

            // Convert back to 24h format
            let newHours = hour12 === 12 ? 0 : hour12;
            if (isPm) newHours += 12;
            if (newHours === 24) newHours = 12; // 12 PM case

            setTempHours(newHours);
        }
    };

    const adjustTempMinutes = (delta: number) => {
        let newMinutes = (tempMinutes + delta) % 60;
        if (newMinutes < 0) newMinutes += 60;
        setTempMinutes(newMinutes);
    };

    // Toggle AM/PM (only used in 12h mode)
    const toggleAmPm = () => {
        const newHours = (tempHours + 12) % 24;
        setTempHours(newHours);
        setTempIsAm(!tempIsAm);
    };

    // Get display hours for modal (12h or 24h format)
    const getModalDisplayHours = () => {
        if (use24Hour) {
            return String(tempHours).padStart(2, '0');
        }
        const h12 = tempHours % 12 || 12;
        return String(h12).padStart(2, '0');
    };

    // Format hours for display (12h vs 24h)
    const formatDisplayHours = (h: number) => {
        if (use24Hour) {
            return String(h).padStart(2, '0');
        }
        const h12 = h % 12 || 12;
        return String(h12).padStart(2, '0');
    };

    const getAmPm = (h: number) => {
        return h < 12 ? 'AM' : 'PM';
    };

    // Theme styling
    const isPenguinTheme = theme === 'penguin';
    const isLightBackground = isPenguinTheme && timeOfDay === 'day';

    const containerClass = isPenguinTheme
        ? 'bg-transparent border-none cursor-pointer hover:scale-105 active:scale-95'
        : 'bg-black/20 border-white/10 text-white backdrop-blur-md';

    // Force dark text for penguin theme (on white belly)
    const numberClass = (isLightBackground || isPenguinTheme) ? 'text-slate-800' : 'text-white';

    return (
        <>
            {/* Main Clock Display - Clickable for penguin theme */}
            <div
                className={`flex flex-col items-center justify-center p-8 rounded-3xl border ${containerClass} transition-all duration-300`}
                onClick={isPenguinTheme ? openModal : undefined}
                role={isPenguinTheme ? 'button' : undefined}
                tabIndex={isPenguinTheme ? 0 : undefined}
                aria-label={isPenguinTheme ? t('tapToSetTime') : undefined}
                onKeyDown={(e) => {
                    if (isPenguinTheme && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        openModal();
                    }
                }}
            >
                <div className={`flex items-center ${isPenguinTheme ? 'gap-2' : 'gap-4 sm:gap-8'}`}>
                    {/* AM/PM indicator (before hours for 12h) */}
                    {!use24Hour && (
                        <div className={`${isPenguinTheme ? 'text-xl' : 'text-2xl'} font-medium ${numberClass} opacity-70`}>
                            {getAmPm(hours)}
                        </div>
                    )}

                    {/* Hours */}
                    <div className={`${isPenguinTheme ? 'text-5xl sm:text-6xl w-20 sm:w-24' : 'text-6xl sm:text-7xl w-24 sm:w-32'} font-bold font-display tracking-wider text-center select-none ${numberClass}`}>
                        {formatDisplayHours(hours)}
                    </div>

                    {/* Separator */}
                    <div className={`${isPenguinTheme ? 'text-5xl sm:text-6xl' : 'text-6xl sm:text-7xl'} font-bold ${numberClass} opacity-50 animate-pulse`}>:</div>

                    {/* Minutes */}
                    <div className={`${isPenguinTheme ? 'text-5xl sm:text-6xl w-20 sm:w-24' : 'text-6xl sm:text-7xl w-24 sm:w-32'} font-bold font-display tracking-wider text-center select-none ${numberClass}`}>
                        {String(minutes).padStart(2, '0')}
                    </div>
                </div>

                {isPenguinTheme && (
                    <div className="mt-2 text-xs text-slate-500 opacity-70">
                        {t('tapToSetTime')}
                    </div>
                )}
            </div>

            {/* Time Picker Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="time-picker-title"
                >
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="w-full max-w-sm bg-nebula-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6">
                                <h2 id="time-picker-title" className="text-xl font-display font-bold text-white">{t('setAlarmTime')}</h2>
                                <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-white/70" />
                                </button>
                            </div>

                            {/* Time Picker */}
                            <div className="flex items-center justify-center gap-4 py-6">
                                {/* AM/PM Toggle (12h mode only) */}
                                {!use24Hour && (
                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={toggleAmPm}
                                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all"
                                            aria-label="Toggle AM/PM"
                                        >
                                            <ChevronUp className="w-6 h-6 text-white" />
                                        </button>

                                        <div className="text-2xl font-bold font-display text-center select-none text-white w-14">
                                            {tempHours < 12 ? 'AM' : 'PM'}
                                        </div>

                                        <button
                                            onClick={toggleAmPm}
                                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all"
                                            aria-label="Toggle AM/PM"
                                        >
                                            <ChevronDown className="w-6 h-6 text-white" />
                                        </button>
                                        <span className="text-xs font-medium uppercase tracking-widest text-nebula-400 invisible">AM</span>
                                    </div>
                                )}

                                {/* Hours */}
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        onClick={() => adjustTempHours(1)}
                                        className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all"
                                        aria-label="Increase hours"
                                    >
                                        <ChevronUp className="w-8 h-8 text-white" />
                                    </button>

                                    <div className="text-6xl font-bold font-display tracking-wider text-center select-none text-white w-24">
                                        {getModalDisplayHours()}
                                    </div>

                                    <button
                                        onClick={() => adjustTempHours(-1)}
                                        className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all"
                                        aria-label="Decrease hours"
                                    >
                                        <ChevronDown className="w-8 h-8 text-white" />
                                    </button>
                                    <span className="text-xs font-medium uppercase tracking-widest text-nebula-400">{t('hourUnit')}</span>
                                </div>

                                {/* Separator */}
                                <div className="text-6xl font-bold text-white opacity-50">:</div>

                                {/* Minutes */}
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        onClick={() => adjustTempMinutes(5)}
                                        className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all"
                                        aria-label="Increase minutes"
                                    >
                                        <ChevronUp className="w-8 h-8 text-white" />
                                    </button>

                                    <div className="text-6xl font-bold font-display tracking-wider text-center select-none text-white w-24">
                                        {String(tempMinutes).padStart(2, '0')}
                                    </div>

                                    <button
                                        onClick={() => adjustTempMinutes(-5)}
                                        className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all"
                                        aria-label="Decrease minutes"
                                    >
                                        <ChevronDown className="w-8 h-8 text-white" />
                                    </button>
                                    <span className="text-xs font-medium uppercase tracking-widest text-nebula-400">{t('minuteUnit')}</span>
                                </div>
                            </div>

                            {/* Confirm Button */}
                            <button
                                onClick={confirmTime}
                                className="w-full mt-4 py-4 bg-nebula-500 hover:bg-nebula-400 text-white font-bold rounded-xl transition-colors text-lg"
                            >
                                {t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DigitalTimePicker;
