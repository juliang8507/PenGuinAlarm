import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { t, getLanguage, formatTime } from '../utils/i18n';

interface ClockDialProps {
    alarmTime: Date | null;
    onAlarmSet: (time: Date) => void;
    nextAlarmTime?: Date | null;
    use24Hour?: boolean;
    theme?: 'default' | 'penguin';
    timeOfDay?: 'day' | 'night';
}

const ClockDial: React.FC<ClockDialProps> = ({ alarmTime, onAlarmSet, nextAlarmTime, use24Hour = true, theme = 'default', timeOfDay = 'day' }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isDragging, setIsDragging] = useState(false);
    const dialRef = useRef<HTMLDivElement>(null);

    // Theme-based colors
    const isPenguinTheme = theme === 'penguin';
    const isLightBackground = isPenguinTheme && timeOfDay === 'day';

    // Using Slate colors for a softer, premium dark look that fits the winter theme better than harsh black
    const textColor = isLightBackground ? 'text-slate-800' : 'text-white';
    const subTextColor = isLightBackground ? 'text-slate-600' : 'text-nebula-400';
    const tickColor = isLightBackground ? 'bg-slate-800/20' : 'bg-nebula-500/50';
    const dialBorderColor = isLightBackground ? 'border-slate-800/10' : 'border-nebula-800';
    const handColor = isLightBackground ? 'bg-slate-700' : 'bg-nebula-400';
    const handShadow = isLightBackground ? 'shadow-[0_0_15px_rgba(30,41,59,0.3)]' : 'shadow-[0_0_15px_#00f0ff]';

    // Calculate remaining time until next alarm
    const getTimeRemaining = () => {
        if (!nextAlarmTime) return null;
        const diff = nextAlarmTime.getTime() - currentTime.getTime();
        if (diff <= 0) return null;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours === 0 && minutes === 0) {
            return t('lessThanMinute');
        }

        const parts = [];
        if (hours > 0) parts.push(`${hours}${t('hoursShort')}`);
        if (minutes > 0 || hours === 0) parts.push(`${minutes}${t('minutesShort')}`);
        return parts.join(' ');
    };

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
        if (!dialRef.current) return;

        const rect = dialRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;

        // Calculate angle in degrees (0 is top/12 o'clock)
        let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        // Snap to 5 minute increments
        const totalMinutes = Math.round((angle / 360) * 12 * 60 / 5) * 5;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const newTime = new Date();
        newTime.setHours(hours, minutes, 0, 0);

        if (isDragging || e.type === 'click') {
            onAlarmSet(newTime);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        handleInteraction(e);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) handleInteraction(e);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Calculate rotation for the alarm hand
    const getHandRotation = (date: Date) => {
        const hours = date.getHours() % 12;
        const minutes = date.getMinutes();
        return (hours * 30) + (minutes * 0.5);
    };

    return (
        <div
            className="relative w-72 h-72 flex items-center justify-center select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleInteraction}
            onTouchEnd={() => setIsDragging(false)}
            role="application"
            aria-label={`시계. 현재 시각: ${formatTime(currentTime, use24Hour)}${alarmTime ? `. 알람 설정: ${formatTime(alarmTime, use24Hour)}` : ''}`}
        >
            {/* Outer Glow Ring */}
            <div className={`absolute inset-0 rounded-full border-4 ${dialBorderColor} shadow-[0_0_50px_rgba(107,76,255,0.2)]`} />

            {/* Interactive Area */}
            <div
                ref={dialRef}
                className="absolute inset-0 rounded-full cursor-pointer"
                onMouseDown={handleMouseDown}
                onTouchStart={() => setIsDragging(true)}
                role="slider"
                aria-label="알람 시간 설정 다이얼"
                aria-valuemin={0}
                aria-valuemax={720}
                aria-valuenow={alarmTime ? alarmTime.getHours() * 60 + alarmTime.getMinutes() : 0}
                aria-valuetext={alarmTime ? formatTime(alarmTime, use24Hour) : '알람 미설정'}
                tabIndex={0}
            />

            {/* Clock Face Markers */}
            {[...Array(12)].map((_, i) => (
                <div
                    key={i}
                    className={`absolute w-1 h-3 ${tickColor} rounded-full`}
                    style={{
                        transform: `rotate(${i * 30}deg) translateY(-135px)`,
                        transformOrigin: 'center center'
                    }}
                />
            ))}

            {/* Alarm Hand (if set) */}
            {alarmTime && (
                <div
                    className={`absolute w-1 h-32 ${handColor} rounded-full origin-bottom ${handShadow}`}
                    style={{ transform: `rotate(${getHandRotation(alarmTime)}deg) translateY(-50%)` }}
                >
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 ${handColor} rounded-full ${handShadow}`} />
                </div>
            )}

            {/* Digital Time Display */}
            <div className="z-10 text-center pointer-events-none">
                <div className={`text-6xl font-display font-bold ${textColor} tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]`}>
                    {formatTime(currentTime, use24Hour)}
                </div>
                <div className={`${subTextColor} text-sm mt-2 font-medium tracking-widest uppercase`}>
                    {format(currentTime, getLanguage() === 'ko' ? 'M월 d일 EEEE' : 'EEE, MMM d', { locale: getLanguage() === 'ko' ? ko : enUS })}
                </div>
                {alarmTime && (
                    <div className={`${isPenguinTheme ? 'text-nebula-700' : 'text-nebula-500'} text-xs mt-1`}>
                        {t('alarmAt')}: {formatTime(alarmTime, use24Hour)}
                    </div>
                )}
                {/* Time Remaining Badge */}
                {nextAlarmTime && getTimeRemaining() && (
                    <div
                        className={`mt-3 px-4 py-1.5 ${isPenguinTheme ? 'bg-nebula-600 text-white' : 'bg-nebula-500/20 text-nebula-300'} border ${isPenguinTheme ? 'border-transparent' : 'border-nebula-500/30'} rounded-full inline-flex items-center gap-2`}
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        <span className={`${isPenguinTheme ? 'text-white/80' : 'text-nebula-300'} text-xs`}>{t('alarmIn')}</span>
                        <span className={`${isPenguinTheme ? 'text-white' : 'text-nebula-400'} text-sm font-bold`}>{getTimeRemaining()}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClockDial;
