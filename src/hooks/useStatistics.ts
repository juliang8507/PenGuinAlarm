import { useState, useEffect, useCallback } from 'react';

export interface WakeUpLog {
    date: string; // YYYY-MM-DD
    wakeUpTime: string; // HH:mm
    snoozeCount: number;
    missionCompleted: boolean;
}

interface Statistics {
    logs: WakeUpLog[];
    averageSnoozeCount: number;
    successRate: number; // percentage
    last7Days: WakeUpLog[];
}

const STORAGE_KEY = 'nebula-alarm-statistics';

/**
 * Hook for managing wake-up statistics
 */
export const useStatistics = () => {
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
    const addLog = useCallback((log: Omit<WakeUpLog, 'date' | 'wakeUpTime'>) => {
        const now = new Date();
        const newLog: WakeUpLog = {
            date: now.toISOString().split('T')[0],
            wakeUpTime: now.toTimeString().slice(0, 5),
            snoozeCount: log.snoozeCount,
            missionCompleted: log.missionCompleted,
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

    // Calculate statistics
    const getStats = useCallback((): Statistics => {
        const last7Days = logs.slice(-7);

        const totalSnooze = logs.reduce((sum, log) => sum + log.snoozeCount, 0);
        const successCount = logs.filter(log => log.missionCompleted).length;

        return {
            logs,
            last7Days,
            averageSnoozeCount: logs.length > 0 ? totalSnooze / logs.length : 0,
            successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
        };
    }, [logs]);

    return {
        logs,
        addLog,
        clearLogs,
        getStats,
    };
};
