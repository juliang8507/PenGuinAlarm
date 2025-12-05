import React, { useState } from 'react';
import { X, BarChart3, Clock, Target, Trash2, Download, Timer } from 'lucide-react';
import { useStatistics } from '../contexts/StatisticsContext';
import { t } from '../utils/i18n';

interface StatisticsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ isOpen, onClose }) => {
    const { getStats, clearLogs, exportLogs } = useStatistics();
    const stats = getStats();
    const [showConfirmClear, setShowConfirmClear] = useState(false);

    if (!isOpen) return null;

    const maxSnooze = Math.max(...stats.last7Days.map(l => l.snoozeCount), 1);

    const handleExport = () => {
        const data = exportLogs();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nebula-alarm-stats-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        clearLogs();
        setShowConfirmClear(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-title"
        >
            <div className="w-full max-w-md bg-nebula-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 id="stats-title" className="text-xl font-display font-bold text-white flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-nebula-400" />
                        {t('wakeUpStats')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        aria-label={t('close')}
                    >
                        <X className="w-5 h-5 text-white/70" />
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="flex items-center gap-1 text-nebula-400 text-xs mb-1">
                            <Clock className="w-3 h-3" />
                            {t('averageSnooze')}
                        </div>
                        <div className="text-xl font-bold text-white">
                            {stats.averageSnoozeCount.toFixed(1)}
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="flex items-center gap-1 text-nebula-400 text-xs mb-1">
                            <Target className="w-3 h-3" />
                            {t('successRate')}
                        </div>
                        <div className="text-xl font-bold text-white">
                            {stats.successRate.toFixed(0)}%
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                        <div className="flex items-center gap-1 text-nebula-400 text-xs mb-1">
                            <Timer className="w-3 h-3" />
                            {t('avgDelay')}
                        </div>
                        <div className="text-xl font-bold text-white">
                            {stats.averageWakeDelay > 0 ? `+${Math.round(stats.averageWakeDelay)}` : '0'}
                            <span className="text-xs text-white/50">{t('minutes')}</span>
                        </div>
                    </div>
                </div>

                {/* 7-Day Chart */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                    <h3 className="text-sm text-nebula-300 mb-4">{t('last7Days')}</h3>
                    {stats.last7Days.length === 0 ? (
                        <p className="text-white/50 text-center py-4">{t('noRecords')}</p>
                    ) : (
                        <div className="flex items-end gap-2 h-24">
                            {stats.last7Days.map((log, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                    <div
                                        className="w-full bg-nebula-500 rounded-t"
                                        style={{ height: `${(log.snoozeCount / maxSnooze) * 100}%`, minHeight: '4px' }}
                                        title={`${log.snoozeCount} ${t('snooze')}`}
                                    />
                                    <span className="text-[10px] text-white/50">
                                        {log.date.slice(5)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        {t('export')}
                    </button>
                    <button
                        onClick={() => setShowConfirmClear(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        {t('clearStats')}
                    </button>
                </div>

                {/* Confirmation Modal */}
                {showConfirmClear && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 rounded-3xl">
                        <div className="bg-nebula-800 rounded-2xl p-6 w-full max-w-xs text-center">
                            <p className="text-white mb-4">{t('confirmClearStats')}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowConfirmClear(false)}
                                    className="flex-1 py-2 bg-white/10 text-white rounded-xl"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="flex-1 py-2 bg-red-500 text-white rounded-xl"
                                >
                                    {t('delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatisticsDashboard;
