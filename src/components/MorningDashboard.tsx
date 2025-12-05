import React from 'react';
import { CloudSun, Calendar, ArrowRight, Sun, Cloud, CloudRain, CloudSnow, CloudLightning } from 'lucide-react';
import { format } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useWeather } from '../hooks/useWeather';
import { t, getLanguage } from '../utils/i18n';

interface MorningDashboardProps {
    onDismiss: () => void;
    weatherEnabled: boolean;
}

const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-8 h-8 text-yellow-400" />;
    if (code <= 3) return <CloudSun className="w-8 h-8 text-yellow-300" />;
    if (code <= 48) return <Cloud className="w-8 h-8 text-gray-300" />;
    if (code <= 67) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (code <= 77) return <CloudSnow className="w-8 h-8 text-white" />;
    if (code <= 82) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (code <= 86) return <CloudSnow className="w-8 h-8 text-white" />;
    if (code <= 99) return <CloudLightning className="w-8 h-8 text-purple-400" />;
    return <CloudSun className="w-8 h-8 text-yellow-300" />;
};

const getWeatherDescription = (code: number) => {
    if (code === 0) return t('weatherClear');
    if (code <= 3) return t('weatherPartlyCloudy');
    if (code <= 48) return t('weatherCloudy');
    if (code <= 67) return t('weatherRain');
    if (code <= 77) return t('weatherSnow');
    if (code <= 82) return t('weatherShowers');
    if (code <= 86) return t('weatherSnowstorm');
    if (code <= 99) return t('weatherThunderstorm');
    return t('weatherClear');
};

const MorningDashboard: React.FC<MorningDashboardProps> = ({ onDismiss, weatherEnabled }) => {
    const now = new Date();
    const { temperature, weatherCode, minTemp, maxTemp, loading, error } = useWeather({ enabled: weatherEnabled });

    return (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-between p-8 bg-nebula-900 text-white overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-nebula-800 to-nebula-900 z-[-1]" />

            {/* Header */}
            <div className="w-full flex justify-between items-center mt-4">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-display font-bold">{t('goodMorningGreeting')}</h1>
                    <p className="text-nebula-300">{t('todayIs')} {format(now, getLanguage() === 'ko' ? 'M월 d일 EEEE' : 'EEEE, MMM d', { locale: getLanguage() === 'ko' ? ko : enUS })}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-full backdrop-blur-md">
                    {loading ? <CloudSun className="w-8 h-8 text-white/50 animate-pulse" /> : getWeatherIcon(weatherCode)}
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full flex-1 flex flex-col justify-center gap-6">
                {/* Weather Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center justify-between">
                    {loading ? (
                        <div className="w-full text-center text-white/50">{t('loadingWeather')}</div>
                    ) : error ? (
                        <div className="w-full text-center text-red-300 text-sm">{error}</div>
                    ) : (
                        <>
                            <div>
                                <span className="text-5xl font-bold">{temperature}°</span>
                                <p className="text-nebula-300">{getWeatherDescription(weatherCode)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-white/50">{t('highTemp')}: {maxTemp}°</p>
                                <p className="text-sm text-white/50">{t('lowTemp')}: {minTemp}°</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Quote/Info Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-2 text-nebula-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">{t('todayQuote')}</span>
                    </div>
                    <p className="text-lg font-light italic">
                        {t('dailyQuote')}
                    </p>
                </div>
            </div>

            {/* Footer Action */}
            <button
                onClick={onDismiss}
                className="w-full py-4 bg-nebula-500 hover:bg-nebula-400 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 group transition-all"
            >
                {t('startYourDay')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
};

export default MorningDashboard;
