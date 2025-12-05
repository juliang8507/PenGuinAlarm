import { useState, useEffect } from 'react';
import Background from './components/Background';
import ClockDial from './components/ClockDial';
import AlarmRing from './components/AlarmRing';
import MissionOverlay from './components/MissionOverlay';
import MorningDashboard from './components/MorningDashboard';
import ShiftSettings from './components/ShiftSettings';
import PWAInstallBanner from './components/PWAInstallBanner';
import PermissionBanner from './components/PermissionBanner';
import PenguinCharacter from './components/PenguinCharacter';
import UpdateBanner from './components/UpdateBanner';
import StatisticsDashboard from './components/StatisticsDashboard';
import { useAlarm } from './hooks/useAlarm';
import { useStatistics } from './contexts/StatisticsContext';
import { Settings, Moon, Palette, WifiOff, BarChart3 } from 'lucide-react';
import { t, formatTime } from './utils/i18n';

function App() {
  const {
    alarmTime,
    setAlarmTime,
    isAlarmActive,
    stopAlarm,
    snoozeAlarm,
    snoozeCount,
    snoozeLimit,
    snoozeEndTime,
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
    missionType,
    missionDifficulty,
    use24Hour,
    setUse24Hour,
    nextAlarmTime,
    isAudioBlocked,
    playBlockedAudio,
    weatherEnabled,
    setWeatherEnabled,
    vibrationPattern,
    setVibrationPattern,
    qrRegisteredCode,
    setQrRegisteredCode,
  } = useAlarm();

  const [isMissionActive, setIsMissionActive] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'default' | 'penguin'>('penguin');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const { addLog } = useStatistics();

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine time of day for theme
  const currentHour = new Date().getHours();
  const timeOfDay = currentHour >= 6 && currentHour < 18 ? 'day' : 'night';

  const handleWakeUp = () => {
    setIsMissionActive(true);
  };

  const handleMissionComplete = () => {
    // Log the wake-up for statistics with extended info
    addLog({
      snoozeCount,
      missionCompleted: true,
      missionType,
      alarmTime: alarmTime ? `${String(alarmTime.getHours()).padStart(2, '0')}:${String(alarmTime.getMinutes()).padStart(2, '0')}` : undefined,
    });
    setIsMissionActive(false);
    stopAlarm();
    setShowDashboard(true);
  };

  const handleDashboardDismiss = () => {
    setShowDashboard(false);
  };


  // Determine text colors based on theme and time
  const isLightBackground = theme === 'penguin' && timeOfDay === 'day';
  const textColor = isLightBackground ? 'text-slate-800' : 'text-white';
  const subTextColor = isLightBackground ? 'text-slate-600' : 'text-white/70';
  const iconColor = isLightBackground ? 'text-slate-700' : 'text-nebula-400';
  const buttonBg = isLightBackground ? 'bg-white/40 hover:bg-white/60 border-white/20' : 'bg-white/5 hover:bg-white/10 border-white/10';

  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-between p-6 ${textColor} overflow-hidden select-none`}>
      <Background theme={theme} timeOfDay={timeOfDay} />

      {isAlarmActive && !isMissionActive && !showDashboard && (
        <AlarmRing
          onStop={handleWakeUp}
          onSnooze={() => snoozeAlarm(5)}
          snoozeCount={snoozeCount}
          snoozeLimit={snoozeLimit}
          snoozeEndTime={snoozeEndTime}
          isAudioBlocked={isAudioBlocked}
          onPlayBlockedAudio={playBlockedAudio}
          vibrationPattern={vibrationPattern}
        />
      )}

      {isMissionActive && (
        <MissionOverlay
          onComplete={handleMissionComplete}
          missionType={missionType}
          missionDifficulty={missionDifficulty}
          qrRegisteredCode={qrRegisteredCode}
          onFallbackToMath={() => {
            // QR mission not available, switch to math mission
            setIsMissionActive(false);
            setTimeout(() => setIsMissionActive(true), 100);
          }}
        />
      )}

      {showDashboard && (
        <MorningDashboard onDismiss={handleDashboardDismiss} weatherEnabled={weatherEnabled} />
      )}

      <ShiftSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        recurrence={recurrence}
        setRecurrence={setRecurrence}
        startDate={startDate}
        setStartDate={setStartDate}
        customSoundName={customSoundName}
        setCustomSound={setCustomSound}
        volume={volume}
        setVolume={setVolume}
        fadeDuration={fadeDuration}
        setFadeDuration={setFadeDuration}
        soundPreset={soundPreset}
        setSoundPreset={setSoundPreset}
        isWorkDay={isWorkDay}
        use24Hour={use24Hour}
        setUse24Hour={setUse24Hour}
        weatherEnabled={weatherEnabled}
        setWeatherEnabled={setWeatherEnabled}
        vibrationPattern={vibrationPattern}
        setVibrationPattern={setVibrationPattern}
        missionType={missionType}
        qrRegisteredCode={qrRegisteredCode}
        setQrRegisteredCode={setQrRegisteredCode}
      />

      <PWAInstallBanner />
      <PermissionBanner />
      <UpdateBanner />
      <StatisticsDashboard isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />

      {/* Header */}
      <header className="w-full flex justify-between items-center z-10" role="banner">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className={`p-3 rounded-full backdrop-blur-md border transition-colors focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:ring-offset-2 focus:ring-offset-nebula-900 ${buttonBg}`}
          aria-label={t('settingsButton')}
        >
          <Settings className={`w-6 h-6 ${iconColor}`} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 animate-pulse">
              <WifiOff className="w-3 h-3 text-amber-400" aria-hidden="true" />
              <span className="text-xs text-amber-400">오프라인</span>
            </div>
          )}
          <button
            onClick={() => setTheme(prev => prev === 'default' ? 'penguin' : 'default')}
            className={`p-2 rounded-full backdrop-blur-md border transition-colors ${buttonBg}`}
            aria-label="Toggle Theme"
          >
            <Palette className={`w-4 h-4 ${isLightBackground ? 'text-slate-600' : 'text-nebula-300'}`} />
          </button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border ${buttonBg}`}>
            <Moon className={`w-4 h-4 ${isLightBackground ? 'text-slate-600' : 'text-nebula-500'}`} aria-hidden="true" />
            <span className={`text-xs font-medium tracking-wider uppercase ${isLightBackground ? 'text-slate-700' : 'text-nebula-100'}`}>{t('appName')}</span>
          </div>
        </div>

        <button
          onClick={() => setIsStatsOpen(true)}
          className={`p-3 rounded-full backdrop-blur-md border transition-colors focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:ring-offset-2 focus:ring-offset-nebula-900 ${buttonBg}`}
          aria-label="통계 보기"
        >
          <BarChart3 className={`w-6 h-6 ${iconColor}`} aria-hidden="true" />
        </button>
      </header>

      {/* Main Clock */}
      <main className="flex-1 flex flex-col items-center justify-center z-10 w-full max-w-md relative" role="main">

        <div className="relative mb-12 z-10">
          {/* Penguin Character - Aligned behind the clock */}
          {theme === 'penguin' && (
            <div className="absolute inset-0 z-[-1] rounded-full overflow-hidden opacity-90">
              <PenguinCharacter
                state={isAlarmActive ? 'waking' : 'idle'}
                className="w-full h-full object-cover scale-110"
              />
              {/* Overlay to ensure text readability if needed, though text color change should handle it */}
              <div className="absolute inset-0 bg-white/10 pointer-events-none" />
            </div>
          )}

          <ClockDial
            alarmTime={alarmTime}
            onAlarmSet={setAlarmTime}
            nextAlarmTime={nextAlarmTime}
            use24Hour={use24Hour}
            theme={theme}
            timeOfDay={timeOfDay}
          />
        </div>

        {/* Next Alarm Card */}
        <section
          className={`w-full backdrop-blur-xl border rounded-3xl p-6 shadow-2xl z-10 transition-colors flex flex-col items-center text-center gap-2 ${isLightBackground ? 'bg-white/60 border-white/40' : 'bg-white/5 border-white/10'}`}
          aria-label={t('nextWakeUp')}
        >
          <div className="flex flex-col items-center gap-1 mb-2">
            <h2 className={`text-lg font-display font-bold ${textColor}`}>{t('nextWakeUp')}</h2>
            <p className={`${subTextColor} text-sm`}>
              {recurrence === 'daily' ? t('tomorrowMorning') : t('nextWorkdayMorning')}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className={`text-5xl font-display font-bold ${textColor}`} aria-label={alarmTime ? `${t('nextAlarmAt')} ${formatTime(alarmTime, use24Hour)}` : t('noAlarmSet')}>
              {alarmTime ? formatTime(alarmTime, use24Hour) : '--:--'}
            </span>

            <div className="flex items-center gap-2 mt-1">
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors ${alarmTime ? (isLightBackground ? 'bg-slate-800 text-white border-transparent' : 'bg-nebula-500/20 text-nebula-400 border-nebula-500/30') : 'bg-white/5 text-white/30 border-white/10'}`}
                role="status"
                aria-live="polite"
              >
                {alarmTime ? t('alarmOn') : t('alarmOff')}
              </div>
              {recurrence === 'every-other-day' && <span className="text-xs bg-nebula-500/20 px-2 py-0.5 rounded text-nebula-300">{t('everyOtherDayMode')}</span>}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full z-10 text-center pb-4" role="contentinfo">
        <p className={`${subTextColor} text-xs`}>{t('swipeForSleep')}</p>
        <div className={`w-12 h-1 rounded-full mx-auto mt-2 ${isLightBackground ? 'bg-slate-400/50' : 'bg-white/20'}`} aria-hidden="true" />
      </footer>
    </div>
  );
}

export default App;
