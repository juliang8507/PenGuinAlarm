/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { MissionType } from '../hooks/useAlarm';

export interface WakeUpLog {
    date: string; // YYYY-MM-DD
    wakeUpTime: string; // HH:mm
    snoozeCount: number;
    missionCompleted: boolean;
    // Extended fields
    missionType?: MissionType;
    alarmTime?: string; // HH:mm - scheduled alarm time
    actualWakeTime?: string; // HH:mm - when user actually woke up
    diffMinutes?: number; // difference between alarm and wake time
}

interface StatisticsContextValue {
    logs: WakeUpLog[];
    addLog: (log: Omit<WakeUpLog, 'date' | 'wakeUpTime' | 'actualWakeTime'>) => void;
    clearLogs: () => void;
    getStats: () => {
        logs: WakeUpLog[];
        last7Days: WakeUpLog[];
        averageSnoozeCount: number;
        successRate: number;
        averageWakeDelay: number; // average minutes between alarm and actual wake
    };
    exportLogs: () => string; // Export as JSON string
}

const STORAGE_KEY = 'nebula-alarm-statistics';

const StatisticsContext = createContext<StatisticsContextValue | null>(null);

export const StatisticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [logs, setLogs] = useState<WakeUpLog[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to load statistics:', e);
            return [];
        }
    });

    // Save logs to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        } catch (e) {
            console.error('Failed to save statistics:', e);
        }
    }, [logs]);

    // Add a new wake-up log
    const addLog = useCallback((log: Omit<WakeUpLog, 'date' | 'wakeUpTime' | 'actualWakeTime'>) => {
        const now = new Date();
        const actualWakeTime = now.toTimeString().slice(0, 5);

        // Calculate difference from alarm time
        let diffMinutes: number | undefined;
        if (log.alarmTime) {
            const [alarmH, alarmM] = log.alarmTime.split(':').map(Number);
            const [wakeH, wakeM] = actualWakeTime.split(':').map(Number);
            diffMinutes = (wakeH * 60 + wakeM) - (alarmH * 60 + alarmM);
            // Handle day wrap (e.g., alarm at 23:50, wake at 00:10)
            if (diffMinutes < -720) diffMinutes += 1440;
        }

        const newLog: WakeUpLog = {
            date: now.toISOString().split('T')[0],
            wakeUpTime: actualWakeTime,
            actualWakeTime,
            snoozeCount: log.snoozeCount,
            missionCompleted: log.missionCompleted,
            missionType: log.missionType,
            alarmTime: log.alarmTime,
            diffMinutes,
        };

        setLogs(prev => {
            // Prevent duplicate entries for the same day
            const filtered = prev.filter(l => l.date !== newLog.date);
            return [...filtered, newLog].slice(-30); // Keep last 30 days
        });
    }, []);

    // Clear all statistics
    const clearLogs = useCallback(() => {
        setLogs([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    // Export logs as JSON string
    const exportLogs = useCallback(() => {
        return JSON.stringify(logs, null, 2);
    }, [logs]);

    // Calculate statistics
    const getStats = useCallback(() => {
        const last7Days = logs.slice(-7);

        const totalSnooze = logs.reduce((sum, log) => sum + log.snoozeCount, 0);
        const successCount = logs.filter(log => log.missionCompleted).length;

        // Calculate average wake delay
        const logsWithDelay = logs.filter(log => log.diffMinutes !== undefined);
        const totalDelay = logsWithDelay.reduce((sum, log) => sum + (log.diffMinutes || 0), 0);
        const averageWakeDelay = logsWithDelay.length > 0 ? totalDelay / logsWithDelay.length : 0;

        return {
            logs,
            last7Days,
            averageSnoozeCount: logs.length > 0 ? totalSnooze / logs.length : 0,
            successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
            averageWakeDelay,
        };
    }, [logs]);

    return (
        <StatisticsContext.Provider value={{ logs, addLog, clearLogs, getStats, exportLogs }}>
            {children}
        </StatisticsContext.Provider>
    );
};

export const useStatistics = (): StatisticsContextValue => {
    const context = useContext(StatisticsContext);
    if (!context) {
        throw new Error('useStatistics must be used within a StatisticsProvider');
    }
    return context;
};
