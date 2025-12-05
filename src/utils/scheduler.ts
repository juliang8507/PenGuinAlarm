// Reliable alarm scheduler with setTimeout chain, DST handling, and visibility monitoring

import { differenceInCalendarDays, addDays, startOfDay, setHours, setMinutes, setSeconds, isBefore, isEqual } from 'date-fns';

export interface SchedulerConfig {
    alarmHour: number;
    alarmMinute: number;
    recurrence: 'daily' | 'every-other-day';
    startDate: Date; // Reference date for shift cycle
    enabled: boolean;
}

export interface SchedulerCallbacks {
    onAlarm: () => void;
    onNextAlarmUpdate?: (nextAlarm: Date | null) => void;
    onVisibilityChange?: (visible: boolean) => void;
}

class AlarmScheduler {
    private config: SchedulerConfig | null = null;
    private callbacks: SchedulerCallbacks | null = null;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private visibilityHandler: (() => void) | null = null;
    private lastCheckedTimezone: string = '';
    private nextAlarmTime: Date | null = null;

    /**
     * Initialize the scheduler with configuration and callbacks
     */
    public init(config: SchedulerConfig, callbacks: SchedulerCallbacks): void {
        this.config = config;
        this.callbacks = callbacks;
        this.lastCheckedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Setup visibility change listener
        this.setupVisibilityListener();

        // Schedule the next alarm
        if (config.enabled) {
            this.scheduleNext();
        }
    }

    /**
     * Update scheduler configuration
     */
    public updateConfig(config: Partial<SchedulerConfig>): void {
        if (!this.config) return;

        this.config = { ...this.config, ...config };

        // Clear existing timeout and reschedule
        this.clearTimeout();

        if (this.config.enabled) {
            this.scheduleNext();
        } else {
            this.nextAlarmTime = null;
            this.callbacks?.onNextAlarmUpdate?.(null);
        }
    }

    /**
     * Calculate the next alarm time based on current config
     */
    public calculateNextAlarmTime(from: Date = new Date()): Date | null {
        if (!this.config || !this.config.enabled) return null;

        const { alarmHour, alarmMinute, recurrence, startDate } = this.config;

        // Create today's alarm time
        let alarmTime = setSeconds(setMinutes(setHours(startOfDay(from), alarmHour), alarmMinute), 0);

        // If today's alarm time has passed, start from tomorrow
        if (isBefore(alarmTime, from) || isEqual(alarmTime, from)) {
            alarmTime = addDays(alarmTime, 1);
        }

        // For every-other-day mode, find the next work day
        if (recurrence === 'every-other-day') {
            const refDate = startOfDay(startDate);

            // Keep advancing until we find a work day
            while (true) {
                const daysDiff = differenceInCalendarDays(alarmTime, refDate);
                // Work days are when daysDiff is even (0, 2, 4, ...)
                if (daysDiff % 2 === 0) {
                    break;
                }
                alarmTime = addDays(alarmTime, 1);
            }
        }

        return alarmTime;
    }

    /**
     * Check if a specific date is a work day (for every-other-day mode)
     */
    public isWorkDay(date: Date): boolean {
        if (!this.config) return true;
        if (this.config.recurrence === 'daily') return true;

        const refDate = startOfDay(this.config.startDate);
        const targetDate = startOfDay(date);
        const daysDiff = differenceInCalendarDays(targetDate, refDate);

        return daysDiff % 2 === 0;
    }

    /**
     * Get the next alarm time
     */
    public getNextAlarmTime(): Date | null {
        return this.nextAlarmTime;
    }

    /**
     * Schedule the next alarm using setTimeout chain
     */
    private scheduleNext(): void {
        if (!this.config || !this.callbacks) return;

        this.clearTimeout();

        // Check for timezone/DST changes
        this.checkTimezoneChange();

        const nextAlarm = this.calculateNextAlarmTime();
        if (!nextAlarm) {
            this.nextAlarmTime = null;
            this.callbacks.onNextAlarmUpdate?.(null);
            return;
        }

        this.nextAlarmTime = nextAlarm;
        this.callbacks.onNextAlarmUpdate?.(nextAlarm);

        const now = new Date();
        const msUntilAlarm = nextAlarm.getTime() - now.getTime();

        // Safety check: if somehow negative, recalculate
        if (msUntilAlarm <= 0) {
            // Trigger immediately and reschedule
            setTimeout(() => {
                this.triggerAlarm();
            }, 0);
            return;
        }

        // Use multiple timeouts for long durations to handle DST changes
        // Max timeout ~24 hours to periodically recheck
        const MAX_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

        if (msUntilAlarm > MAX_TIMEOUT) {
            // Set intermediate timeout and reschedule
            this.timeoutId = setTimeout(() => {
                this.scheduleNext();
            }, MAX_TIMEOUT);
        } else {
            // Set final timeout for alarm
            this.timeoutId = setTimeout(() => {
                this.triggerAlarm();
            }, msUntilAlarm);
        }
    }

    /**
     * Trigger the alarm and schedule the next one
     */
    private triggerAlarm(): void {
        if (!this.callbacks) return;

        this.callbacks.onAlarm();

        // Schedule next alarm (will be tomorrow or next work day)
        // Add small delay to ensure we're past the current minute
        setTimeout(() => {
            this.scheduleNext();
        }, 1000);
    }

    /**
     * Check for timezone/DST changes and recalculate if needed
     */
    private checkTimezoneChange(): void {
        const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (currentTimezone !== this.lastCheckedTimezone) {
            this.lastCheckedTimezone = currentTimezone;
            // Timezone changed, will recalculate in scheduleNext
            console.log('Timezone change detected, recalculating alarm time');
        }
    }

    /**
     * Setup visibility change listener for tab deactivation handling
     */
    private setupVisibilityListener(): void {
        if (typeof document === 'undefined') return;

        this.visibilityHandler = () => {
            const visible = document.visibilityState === 'visible';
            this.callbacks?.onVisibilityChange?.(visible);

            if (visible && this.config?.enabled) {
                // Tab became visible - verify alarm timing
                this.verifyAlarmTiming();
            }
        };

        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * Verify alarm timing when tab becomes visible
     * (tab may have been suspended, timers may be inaccurate)
     */
    private verifyAlarmTiming(): void {
        if (!this.config || !this.nextAlarmTime) return;

        const now = new Date();

        // If we missed the alarm while tab was hidden
        if (isBefore(this.nextAlarmTime, now)) {
            const missedBy = now.getTime() - this.nextAlarmTime.getTime();

            // If missed by less than 5 minutes, trigger it now
            if (missedBy < 5 * 60 * 1000) {
                console.log('Alarm was missed while tab was hidden, triggering now');
                this.triggerAlarm();
            } else {
                // Missed by too much, schedule next
                console.log('Alarm was missed by too long, scheduling next');
                this.scheduleNext();
            }
        } else {
            // Reschedule to ensure accurate timing
            this.scheduleNext();
        }
    }

    /**
     * Clear the current timeout
     */
    private clearTimeout(): void {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    /**
     * Stop the scheduler and cleanup
     */
    public stop(): void {
        this.clearTimeout();
        this.nextAlarmTime = null;

        if (this.visibilityHandler && typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }

        this.callbacks?.onNextAlarmUpdate?.(null);
    }

    /**
     * Completely destroy the scheduler instance
     */
    public destroy(): void {
        this.stop();
        this.config = null;
        this.callbacks = null;
    }
}

// Export singleton instance
export const alarmScheduler = new AlarmScheduler();

// Export class for testing
export { AlarmScheduler };
