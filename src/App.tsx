import { useState, useEffect } from 'react';
import Background from './components/Background';
import DigitalTimePicker from './components/DigitalTimePicker';
import AlarmRing from './components/AlarmRing';
import MissionOverlay from './components/MissionOverlay';
import MorningDashboard from './components/MorningDashboard';
import ShiftSettings from './components/ShiftSettings';
import PWAInstallBanner from './components/PWAInstallBanner';
import PermissionBanner from './components/PermissionBanner';
import PenguinCharacter from './components/PenguinCharacter';
import UpdateBanner from './components/UpdateBanner';
import StatisticsDashboard from './components/StatisticsDashboard';
import { useAlarm, type MissionType } from './hooks/useAlarm';
import { useStatistics } from './contexts/StatisticsContext';
import { Settings, Moon, WifiOff, BarChart3 } from 'lucide-react';
import { t } from './utils/i18n';

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
    isAudioBlocked,
    playBlockedAudio,
    weatherEnabled,
    setWeatherEnabled,
    vibrationPattern,
    setVibrationPattern,
    qrRegisteredCode,
    setQrRegisteredCode,
    setMissionType,
    setMissionDifficulty,
    setSnoozeLimit,
  } = useAlarm();

  const [isMissionActive, setIsMissionActive] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme] = useState<'default' | 'penguin'>('penguin');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  // Temporary fallback mission type for current alarm only (doesn't overwrite saved settings)
  const [fallbackMissionType, setFallbackMissionType] = useState<MissionType | null>(null);

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

  const handleMissionComplete = (actualMissionType: MissionType) => {
    // Log the wake-up for statistics with extended info
    // Use the actual resolved mission type (not 'random') for accurate statistics
    addLog({
      snoozeCount,
      missionCompleted: true,
      missionType: actualMissionType,
      alarmTime: alarmTime ? `${String(alarmTime.getHours()).padStart(2, '0')}:${String(alarmTime.getMinutes()).padStart(2, '0')}` : undefined,
    });
    setIsMissionActive(false);
    setFallbackMissionType(null); // Clear temporary fallback after mission completes
    stopAlarm();
    setShowDashboard(true);
  };

  const handleDashboardDismiss = () => {
    setShowDashboard(false);
  };

  // Determine text colors based on theme and time
  const isLightBackground = theme === 'penguin' && timeOfDay === 'day';
  const textColor = isLightBackground ? 'text-slate-800' : 'text-white';
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
          missionType={fallbackMissionType ?? missionType}
          missionDifficulty={missionDifficulty}
          qrRegisteredCode={qrRegisteredCode}
          onFallbackToMath={() => {
            // QR/Photo mission not available - use temporary fallback for current alarm only
            // This does NOT overwrite the user's saved mission type setting
            setIsMissionActive(false);
            setFallbackMissionType('math'); // Temporary fallback, not saved to settings
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
        setMissionType={setMissionType}
        missionDifficulty={missionDifficulty}
        setMissionDifficulty={setMissionDifficulty}
        snoozeLimit={snoozeLimit}
        setSnoozeLimit={setSnoozeLimit}
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
              <span className="text-xs text-amber-400">{t('offline')}</span>
            </div>
          )}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border ${buttonBg}`}>
            <Moon className={`w-4 h-4 ${isLightBackground ? 'text-slate-600' : 'text-nebula-500'}`} aria-hidden="true" />
            <span className={`text-xs font-medium tracking-wider uppercase ${isLightBackground ? 'text-slate-700' : 'text-nebula-100'}`}>{t('appName')}</span>
          </div>
        </div>

        <button
          onClick={() => setIsStatsOpen(true)}
          className={`p-3 rounded-full backdrop-blur-md border transition-colors focus:outline-none focus:ring-2 focus:ring-nebula-500 focus:ring-offset-2 focus:ring-offset-nebula-900 ${buttonBg}`}
          aria-label={t('viewStats')}
        >
          <BarChart3 className={`w-6 h-6 ${iconColor}`} aria-hidden="true" />
        </button>
      </header>

      {/* Main Clock */}
      <main className="flex-1 flex flex-col items-center justify-center z-10 w-full max-w-md relative" role="main">

        <div className="relative mb-12 z-10 w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
          {/* Penguin Character - Aligned behind the clock */}
          {theme === 'penguin' && (
            <div className="absolute inset-0 opacity-100">
              <PenguinCharacter
                state={isAlarmActive ? 'waking' : 'idle'}
                className="w-full h-full"
              />
            </div>
          )}

          <div className={`relative z-10 ${theme === 'penguin' ? 'pt-20' : ''}`}>
            <DigitalTimePicker
              alarmTime={alarmTime}
              onAlarmSet={setAlarmTime}
              theme={theme}
              timeOfDay={timeOfDay}
              use24Hour={use24Hour}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`w-full flex justify-center items-center py-4 z-10 ${isLightBackground ? 'text-slate-500' : 'text-white/30'}`}>
        <div className="flex items-center gap-4 text-xs tracking-widest uppercase">
          <span>Alarm</span>
          <div className={`w-1 h-1 rounded-full ${isLightBackground ? 'bg-slate-400' : 'bg-white/20'}`} />
          <span>Timer</span>
          <div className={`w-1 h-1 rounded-full ${isLightBackground ? 'bg-slate-400' : 'bg-white/20'}`} />
          <span>Stopwatch</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
