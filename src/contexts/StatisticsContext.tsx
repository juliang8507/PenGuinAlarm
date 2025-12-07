/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { MissionType } from '../hooks/useAlarm';

export interface WakeUpLog {
    id: string; // Unique identifier (date + timestamp)
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
    addLog: (log: Omit<WakeUpLog, 'id' | 'date' | 'wakeUpTime' | 'actualWakeTime'>) => void;
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
    const addLog = useCallback((log: Omit<WakeUpLog, 'id' | 'date' | 'wakeUpTime' | 'actualWakeTime'>) => {
        const now = new Date();
        const actualWakeTime = now.toTimeString().slice(0, 5);

        // Use local date format (YYYY-MM-DD) to avoid UTC timezone issues
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Generate unique ID using date + timestamp to allow multiple entries per day
        const uniqueId = `${localDate}-${now.getTime()}`;

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
            id: uniqueId,
            date: localDate,
            wakeUpTime: actualWakeTime,
            actualWakeTime,
            snoozeCount: log.snoozeCount,
            missionCompleted: log.missionCompleted,
            missionType: log.missionType,
            alarmTime: log.alarmTime,
            diffMinutes,
        };

        setLogs(prev => {
            // Allow multiple entries per day - use unique ID to prevent exact duplicates
            const filtered = prev.filter(l => l.id !== newLog.id);
            return [...filtered, newLog].slice(-100); // Keep last 100 entries for detailed statistics
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
        // Sort logs by date to ensure correct ordering
        const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));

        // BUG FIX: Filter by actual calendar dates, not last N entries
        // Calculate date 7 days ago in YYYY-MM-DD format (includes today = 7 days total)
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6); // -6 because we include today
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        const last7Days = sortedLogs.filter(log => log.date >= sevenDaysAgoStr);

        const totalSnooze = sortedLogs.reduce((sum, log) => sum + log.snoozeCount, 0);
        const successCount = sortedLogs.filter(log => log.missionCompleted).length;

        // Calculate average wake delay
        const logsWithDelay = sortedLogs.filter(log => log.diffMinutes !== undefined);
        const totalDelay = logsWithDelay.reduce((sum, log) => sum + (log.diffMinutes || 0), 0);
        const averageWakeDelay = logsWithDelay.length > 0 ? totalDelay / logsWithDelay.length : 0;

        return {
            logs: sortedLogs,
            last7Days,
            averageSnoozeCount: sortedLogs.length > 0 ? totalSnooze / sortedLogs.length : 0,
            successRate: sortedLogs.length > 0 ? (successCount / sortedLogs.length) * 100 : 0,
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
