// Internationalization system for Nebula Alarm

export type Language = 'ko' | 'en';

export const translations = {
    ko: {
        // App header
        appName: 'PenGuin Alarm',

        // Main card
        nextWakeUp: '다음 기상',
        tomorrowMorning: '내일 아침',
        nextWorkdayMorning: '다음 근무일 아침',
        alarmOn: '켜짐',
        alarmOff: '꺼짐',
        everyOtherDayMode: '격일 모드',
        restDay: '휴무일',
        workDay: '근무일',

        // Time display
        nextAlarmAt: '다음 알람:',
        nextAlarm: '다음 알람',
        noAlarmSet: '알람 없음',
        today: '오늘',
        tomorrow: '내일',

        // Footer
        swipeForSleep: '수면 사운드를 들으려면 위로 스와이프',

        // Settings
        alarmSettings: '알람 설정',
        recurrenceSettings: '반복 설정',
        daily: '매일',
        everyOtherDay: '격일 (2일 간격)',
        firstWorkDay: '첫 근무일',
        firstWorkDayHelp: '이 날짜를 기준으로 2일마다 알람이 울립니다.',
        alarmSound: '알람 소리',
        defaultSound: '기본음',
        changeSound: '변경',
        volume: '볼륨',
        fadeDuration: '페이드 인 (초)',
        preview: '미리듣기',
        stopPreview: '정지',
        done: '완료',

        // Sound presets
        soundPresets: '프리셋 사운드',
        etherealRise: '에테리얼 라이즈',
        gentleChime: '젠틀 차임',
        natureBirds: '자연의 새소리',
        oceanWaves: '파도 소리',
        customSound: '커스텀 사운드',

        // Sound errors
        soundLoadError: '사운드를 불러올 수 없습니다',
        soundFormatError: '지원하지 않는 오디오 형식입니다',
        soundSizeError: '파일이 너무 큽니다 (최대 10MB)',

        // Alarm ring
        goodMorning: '좋은 아침이에요',
        wakeUp: '기상',
        snooze: '스누즈',
        snoozeRemaining: '스누즈 남은 횟수',
        snoozeCountdown: '스누즈 종료까지',
        noMoreSnooze: '더 이상 스누즈할 수 없습니다',

        // Mission
        wakeMission: '기상 미션',
        solveToWake: '뇌를 깨우기 위해 문제를 풀어보세요',
        submit: '제출',
        answer: '정답',
        hint: '힌트',
        tryAgain: '다시 시도하세요',

        // Mission types
        missionType: '미션 종류',
        mathMission: '수학 문제',
        memoryMission: '기억력 테스트',
        puzzleMission: '패턴 찾기',
        randomMission: '랜덤',

        // Mission difficulty
        missionDifficulty: '난이도',
        easy: '쉬움',
        medium: '보통',
        hard: '어려움',

        // Memory mission
        memorizeSequence: '숫자를 기억하세요',
        recallSequence: '순서대로 입력하세요',
        memorizing: '기억하세요...',
        timeRemaining: '남은 시간',
        tapNumbers: '숫자를 순서대로 탭하세요',
        correct: '정답!',
        wrong: '틀렸습니다',

        // Pattern mission
        findPattern: '패턴을 찾아 빈칸을 채우세요',
        nextNumber: '다음 숫자는?',

        // Dashboard
        currentTime: '현재 시각',
        todayQuote: '오늘의 명언',
        weather: '날씨',
        haveANiceDay: '좋은 하루 보내세요!',
        dismiss: '닫기',

        // Calendar preview
        calendarPreview: '달력 미리보기',
        on: 'ON',
        off: 'OFF',

        // Notifications
        notificationTitle: 'Nebula Alarm',
        notificationBody: '알람 시간입니다!',
        notificationPermission: '알림 권한이 필요합니다',
        enableNotifications: '알림 허용',
        notificationPermissionTitle: '알림을 허용해주세요',
        notificationPermissionDesc: '앱이 백그라운드에 있을 때도 알람을 받으려면 알림 권한이 필요합니다.',
        allowNotifications: '알림 허용',
        notNow: '나중에',

        // Audio autoplay
        audioBlocked: '오디오 자동재생이 차단되었습니다',
        tapToPlay: '탭하여 알람 재생',

        // PWA
        installApp: '앱 설치',
        installPrompt: '홈 화면에 추가하여 더 나은 경험을 즐기세요',

        // Time format
        use24Hour: '24시간 형식',
        use12Hour: '12시간 형식',

        // Accessibility
        closeButton: '닫기',
        settingsButton: '설정',
        alarmButton: '알람',
        viewStats: '통계 보기',

        // Status
        offline: '오프라인',

        // Snooze
        snoozeLimit: '스누즈 제한 횟수',
        snoozeMinutes: '분 후 다시 알림',

        // Loading
        loading: '불러오는 중...',
        restoring: '설정 복원 중...',

        // Time remaining badge
        alarmIn: '알람까지',
        hoursShort: '시간',
        minutesShort: '분',
        lessThanMinute: '1분 미만',

        // Error handling
        errorOccurred: '오류가 발생했습니다',
        errorUnexpected: '예상치 못한 오류가 발생했습니다',
        errorNetwork: '네트워크 연결을 확인해주세요',
        errorAudio: '오디오를 재생할 수 없습니다',
        errorPermission: '권한이 필요합니다',
        errorStorage: '저장 공간에 접근할 수 없습니다',
        retry: '다시 시도',
        goBack: '돌아가기',
        errorDetails: '오류 상세',
        somethingWentWrong: '문제가 발생했습니다',
        tryAgainLater: '잠시 후 다시 시도해주세요',

        // Weather conditions
        weatherClear: '맑음',
        weatherPartlyCloudy: '구름 조금',
        weatherCloudy: '흐림',
        weatherRain: '비',
        weatherSnow: '눈',
        weatherShowers: '소나기',
        weatherSnowstorm: '눈보라',
        weatherThunderstorm: '뇌우',
        loadingWeather: '날씨 정보를 불러오는 중...',
        highTemp: '최고',
        lowTemp: '최저',

        // Morning dashboard
        goodMorningGreeting: '좋은 아침입니다',
        todayIs: '오늘은',
        startYourDay: '하루 시작하기',
        dailyQuote: '"미래를 예측하는 가장 좋은 방법은 미래를 창조하는 것이다."',

        // Day names (short)
        daySun: '일',
        dayMon: '월',
        dayTue: '화',
        dayWed: '수',
        dayThu: '목',
        dayFri: '금',
        daySat: '토',

        // Clock display
        alarmAt: '알람',

        // Toast
        notification: '알림',

        // Settings (additional)
        settings: '설정',
        recurrence: '반복',
        startDate: '시작일',
        alarmDay: '알람일',

        change: '변경',
        fadeDurationDesc: '알람이 시작될 때 소리가 점점 커집니다',
        timeFormat: '시간 형식',

        // Weather settings
        weatherSettings: '날씨 정보',
        weatherOn: '켜기',
        weatherOff: '끄기',
        weatherDescription: '켜면 위치 정보를 사용하여 아침 대시보드에 날씨를 표시합니다.',

        // Statistics Dashboard
        statisticsTitle: '기상 통계',
        wakeUpStats: '기상 통계',
        avgSnooze: '평균 스누즈',
        averageSnooze: '평균 스누즈',
        successRate: '성공률',
        last7Days: '최근 7일 스누즈 기록',
        noRecords: '기록이 없습니다',
        clearStats: '통계 초기화',
        confirmClearStats: '모든 통계를 삭제하시겠습니까?',
        avgDelay: '지연',
        minutes: '분',
        export: '내보내기',
        cancel: '취소',
        delete: '삭제',
        close: '닫기',

        // Update Banner
        updateAvailable: '새 업데이트가 있습니다',
        refresh: '새로고침',

        // New Missions
        typingMission: '타이핑 미션',
        qrMission: 'QR 코드 미션',
        photoMission: '사진 미션',
        typeQuote: '아래 문장을 정확히 입력하세요',
        typeHere: '여기에 입력하세요...',
        confirm: '확인',
        attempts: '시도',
        takePhoto: '사진 찍기',
        photoMissionDesc: '사진을 찍어 알람을 해제하세요',
        retake: '다시 찍기',
        scanQR: 'QR 코드를 스캔하세요',
        registerQR: '알람 해제에 사용할 QR 코드를 스캔하세요',
        register: '등록',
        rescan: '다시 스캔',
        scannedCode: '스캔된 코드',
        qrMismatch: '등록된 코드와 일치하지 않습니다',
        cameraError: '카메라에 접근할 수 없습니다. 권한을 확인해 주세요.',
        noQrRegistered: 'QR 코드가 등록되지 않았습니다. 설정에서 QR 코드를 먼저 등록해 주세요.',
        useMathMission: '수학 미션으로 대체',
        registerQrCode: 'QR 코드 등록',
        qrCodeRegistered: 'QR 코드가 등록되었습니다',
        clearQrCode: 'QR 코드 삭제',
        cameraPermissionDenied: '카메라 권한이 거부되었습니다. 설정에서 권한을 허용해 주세요.',
        fallbackToMath: '수학 미션으로 전환',

        // Language
        language: '언어',
        korean: '한국어',
        english: 'English',

        // Factory Reset
        factoryReset: '공장 초기화',
        factoryResetDesc: '모든 데이터 삭제',
        confirmFactoryReset: '모든 설정과 데이터가 삭제됩니다. 계속하시겠습니까?',

        // Vibration Pattern
        vibrationPattern: '진동 패턴',
        vibrationHeartbeat: '심장박동',
        vibrationTicktock: '틱톡',
        vibrationRapid: '빠른',
        vibrationSos: 'SOS',
        vibrationContinuous: '연속',
        vibrationOff: '끄기',

        // Mission Settings
        missionTypeSetting: '미션 종류',
        missionMath: '수학 문제',
        missionMemory: '기억력 게임',
        missionPuzzle: '퍼즐',
        missionTyping: '타이핑',
        missionQr: 'QR 스캔',
        missionPhoto: '사진 촬영',
        missionRandom: '랜덤',
        missionDifficultySetting: '미션 난이도',
        difficultyEasy: '쉬움',
        difficultyMedium: '보통',
        difficultyHard: '어려움',
        snoozeLimitSetting: '스누즈 제한',
        snoozeLimitDesc: '0회로 설정하면 스누즈를 사용할 수 없습니다',
        timesUnit: '회',

        // Time Picker
        setAlarmTime: '알람 시간 설정',
        tapToSetTime: '탭하여 시간 설정',
        hourUnit: '시',
        minuteUnit: '분',

        // Typing Mission
        typingMissionHeader: '✍️ 타이핑 미션',
        missionComplete: '✓ 완료!',
        typingQuoteEasy1: '오늘도 좋은 하루 되세요!',
        typingQuoteEasy2: '새로운 시작을 응원합니다.',
        typingQuoteEasy3: '행복한 하루 보내세요.',
        typingQuoteMedium1: '어제의 나보다 오늘의 내가 더 성장하길.',
        typingQuoteMedium2: '작은 습관이 큰 변화를 만들어갑니다.',
        typingQuoteMedium3: '매일 조금씩 나아가면 됩니다.',
        typingQuoteHard1: '성공은 열정을 잃지 않고 실패에서 실패로 나아가는 것이다.',
        typingQuoteHard2: '천 리 길도 한 걸음부터 시작된다는 것을 기억하세요.',
        typingQuoteHard3: '오늘의 노력이 내일의 자신을 만들어갑니다.',
    },
    en: {
        // App header
        appName: 'PenGuin Alarm',

        // Main card
        nextWakeUp: 'Next Wake Up',
        tomorrowMorning: 'Tomorrow morning',
        nextWorkdayMorning: 'Next workday morning',
        alarmOn: 'ON',
        alarmOff: 'OFF',
        everyOtherDayMode: 'Every-other-day',
        restDay: 'Rest day',
        workDay: 'Work day',

        // Time display
        nextAlarmAt: 'Next alarm:',
        nextAlarm: 'Next Alarm',
        noAlarmSet: 'No alarm set',
        today: 'Today',
        tomorrow: 'Tomorrow',

        // Footer
        swipeForSleep: 'Swipe up for sleep sounds',

        // Settings
        alarmSettings: 'Alarm Settings',
        recurrenceSettings: 'Recurrence',
        daily: 'Daily',
        everyOtherDay: 'Every other day',
        firstWorkDay: 'First work day',
        firstWorkDayHelp: 'Alarm rings every 2 days from this date.',
        alarmSound: 'Alarm Sound',
        defaultSound: 'Default',
        changeSound: 'Change',
        volume: 'Volume',
        fadeDuration: 'Fade in (sec)',
        preview: 'Preview',
        stopPreview: 'Stop',
        done: 'Done',

        // Sound presets
        soundPresets: 'Sound Presets',
        etherealRise: 'Ethereal Rise',
        gentleChime: 'Gentle Chime',
        natureBirds: 'Nature Birds',
        oceanWaves: 'Ocean Waves',
        customSound: 'Custom Sound',

        // Sound errors
        soundLoadError: 'Could not load sound',
        soundFormatError: 'Unsupported audio format',
        soundSizeError: 'File too large (max 10MB)',

        // Alarm ring
        goodMorning: 'Good Morning',
        wakeUp: 'Wake Up',
        snooze: 'Snooze',
        snoozeRemaining: 'Snoozes remaining',
        snoozeCountdown: 'Snooze ends in',
        noMoreSnooze: 'No more snoozes available',

        // Mission
        wakeMission: 'Wake Mission',
        solveToWake: 'Solve to wake your brain',
        submit: 'Submit',
        answer: 'Answer',
        hint: 'Hint',
        tryAgain: 'Try again',

        // Mission types
        missionType: 'Mission Type',
        mathMission: 'Math Problem',
        memoryMission: 'Memory Cards',
        puzzleMission: 'Slide Puzzle',
        randomMission: 'Random',

        // Mission difficulty
        missionDifficulty: 'Difficulty',
        easy: 'Easy',
        medium: 'Medium',
        hard: 'Hard',

        // Memory mission
        memorizeSequence: 'Memorize the sequence',
        recallSequence: 'Enter in order',
        memorizing: 'Memorizing...',
        timeRemaining: 'Time remaining',
        tapNumbers: 'Tap numbers in order',
        correct: 'Correct!',
        wrong: 'Wrong',

        // Pattern mission
        findPattern: 'Find the pattern and fill the blank',
        nextNumber: 'Next number?',

        // Dashboard
        currentTime: 'Current Time',
        todayQuote: 'Quote of the Day',
        weather: 'Weather',
        haveANiceDay: 'Have a nice day!',
        dismiss: 'Dismiss',

        // Calendar preview
        calendarPreview: 'Calendar Preview',
        on: 'ON',
        off: 'OFF',

        // Notifications
        notificationTitle: 'Nebula Alarm',
        notificationBody: 'Time to wake up!',
        notificationPermission: 'Notification permission required',
        enableNotifications: 'Enable Notifications',
        notificationPermissionTitle: 'Enable Notifications',
        notificationPermissionDesc: 'Allow notifications to receive alarms when the app is in the background.',
        allowNotifications: 'Allow',
        notNow: 'Not Now',

        // Audio autoplay
        audioBlocked: 'Audio autoplay blocked',
        tapToPlay: 'Tap to play alarm',

        // PWA
        installApp: 'Install App',
        installPrompt: 'Add to home screen for better experience',

        // Time format
        use24Hour: '24-hour format',
        use12Hour: '12-hour format',

        // Accessibility
        closeButton: 'Close',
        settingsButton: 'Settings',
        alarmButton: 'Alarm',
        viewStats: 'View Statistics',

        // Status
        offline: 'Offline',

        // Snooze
        snoozeLimit: 'Snooze limit',
        snoozeMinutes: 'minutes later',

        // Loading
        loading: 'Loading...',
        restoring: 'Restoring settings...',

        // Time remaining badge
        alarmIn: 'Alarm in',
        hoursShort: 'h',
        minutesShort: 'm',
        lessThanMinute: 'Less than 1 min',

        // Error handling
        errorOccurred: 'An error occurred',
        errorUnexpected: 'An unexpected error occurred',
        errorNetwork: 'Please check your network connection',
        errorAudio: 'Unable to play audio',
        errorPermission: 'Permission required',
        errorStorage: 'Cannot access storage',
        retry: 'Retry',
        goBack: 'Go Back',
        errorDetails: 'Error Details',
        somethingWentWrong: 'Something went wrong',
        tryAgainLater: 'Please try again later',

        // Weather conditions
        weatherClear: 'Clear',
        weatherPartlyCloudy: 'Partly Cloudy',
        weatherCloudy: 'Cloudy',
        weatherRain: 'Rain',
        weatherSnow: 'Snow',
        weatherShowers: 'Showers',
        weatherSnowstorm: 'Snowstorm',
        weatherThunderstorm: 'Thunderstorm',
        loadingWeather: 'Loading weather...',
        highTemp: 'High',
        lowTemp: 'Low',

        // Morning dashboard
        goodMorningGreeting: 'Good Morning',
        todayIs: 'Today is',
        startYourDay: 'Start Your Day',
        dailyQuote: '"The best way to predict the future is to create it."',

        // Day names (short)
        daySun: 'Sun',
        dayMon: 'Mon',
        dayTue: 'Tue',
        dayWed: 'Wed',
        dayThu: 'Thu',
        dayFri: 'Fri',
        daySat: 'Sat',

        // Clock display
        alarmAt: 'Alarm',

        // Toast
        notification: 'Notification',

        // Settings (additional)
        settings: 'Settings',
        recurrence: 'Recurrence',
        startDate: 'Start Date',
        alarmDay: 'Alarm day',

        change: 'Change',
        fadeDurationDesc: 'Sound gradually increases when alarm starts',
        timeFormat: 'Time Format',

        // Weather settings
        weatherSettings: 'Weather Info',
        weatherOn: 'On',
        weatherOff: 'Off',
        weatherDescription: 'When enabled, uses your location to show weather on the morning dashboard.',

        // Statistics Dashboard
        statisticsTitle: 'Wake-up Statistics',
        wakeUpStats: 'Wake-up Statistics',
        avgSnooze: 'Avg Snooze',
        averageSnooze: 'Avg Snooze',
        successRate: 'Success Rate',
        last7Days: 'Last 7 Days Snooze',
        noRecords: 'No records yet',
        clearStats: 'Clear Stats',
        confirmClearStats: 'Delete all statistics?',
        avgDelay: 'Delay',
        minutes: 'min',
        export: 'Export',
        cancel: 'Cancel',
        delete: 'Delete',
        close: 'Close',

        // Update Banner
        updateAvailable: 'Update available',
        refresh: 'Refresh',

        // New Missions
        typingMission: 'Typing Mission',
        qrMission: 'QR Code Mission',
        photoMission: 'Photo Mission',
        typeQuote: 'Type the sentence exactly',
        typeHere: 'Type here...',
        confirm: 'Confirm',
        attempts: 'Attempts',
        takePhoto: 'Take Photo',
        photoMissionDesc: 'Take a photo to dismiss alarm',
        retake: 'Retake',
        scanQR: 'Scan a QR code',
        registerQR: 'Scan a QR code to register for alarm dismissal',
        register: 'Register',
        rescan: 'Rescan',
        scannedCode: 'Scanned code',
        qrMismatch: 'Code does not match registered code',
        cameraError: 'Cannot access camera. Please check permissions.',
        noQrRegistered: 'No QR code registered. Please register a QR code in Settings first.',
        useMathMission: 'Use Math Mission',
        registerQrCode: 'Register QR Code',
        qrCodeRegistered: 'QR code has been registered',
        clearQrCode: 'Clear QR Code',
        cameraPermissionDenied: 'Camera permission denied. Please allow in Settings.',
        fallbackToMath: 'Switch to Math Mission',

        // Language
        language: 'Language',
        korean: '한국어',
        english: 'English',

        // Factory Reset
        factoryReset: 'Factory Reset',
        factoryResetDesc: 'Delete all data',
        confirmFactoryReset: 'All settings and data will be deleted. Continue?',

        // Vibration Pattern
        vibrationPattern: 'Vibration Pattern',
        vibrationHeartbeat: 'Heartbeat',
        vibrationTicktock: 'Tick Tock',
        vibrationRapid: 'Rapid',
        vibrationSos: 'SOS',
        vibrationContinuous: 'Continuous',
        vibrationOff: 'Off',

        // Mission Settings
        missionTypeSetting: 'Mission Type',
        missionMath: 'Math Problem',
        missionMemory: 'Memory Game',
        missionPuzzle: 'Puzzle',
        missionTyping: 'Typing',
        missionQr: 'QR Scan',
        missionPhoto: 'Photo',
        missionRandom: 'Random',
        missionDifficultySetting: 'Mission Difficulty',
        difficultyEasy: 'Easy',
        difficultyMedium: 'Medium',
        difficultyHard: 'Hard',
        snoozeLimitSetting: 'Snooze Limit',
        snoozeLimitDesc: 'Set to 0 to disable snooze',
        timesUnit: 'times',

        // Time Picker
        setAlarmTime: 'Set Alarm Time',
        tapToSetTime: 'Tap to set time',
        hourUnit: 'H',
        minuteUnit: 'M',

        // Typing Mission
        typingMissionHeader: '✍️ Typing Mission',
        missionComplete: '✓ Complete!',
        typingQuoteEasy1: 'Have a great day!',
        typingQuoteEasy2: 'Cheering for your new start.',
        typingQuoteEasy3: 'Wishing you happiness.',
        typingQuoteMedium1: 'May today be better than yesterday.',
        typingQuoteMedium2: 'Small habits lead to big changes.',
        typingQuoteMedium3: 'Progress a little each day.',
        typingQuoteHard1: 'Success is going from failure to failure without losing enthusiasm.',
        typingQuoteHard2: 'Remember that a journey of a thousand miles begins with a single step.',
        typingQuoteHard3: "Today's effort shapes tomorrow's you.",
    },
} as const;

export type TranslationKey = keyof typeof translations.ko;

let currentLanguage: Language = 'ko';

export const setLanguage = (lang: Language) => {
    currentLanguage = lang;
};

export const getLanguage = () => currentLanguage;

export const t = (key: TranslationKey): string => {
    return translations[currentLanguage][key] || translations.ko[key] || key;
};

// Format time based on 12h/24h preference
export const formatTime = (date: Date, use24Hour: boolean, lang: Language = currentLanguage): string => {
    if (use24Hour) {
        return date.toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    } else {
        return date.toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    }
};

// Format date for display
export const formatDate = (date: Date, lang: Language = currentLanguage): string => {
    return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
};

// Format day of week
export const formatDayOfWeek = (date: Date, lang: Language = currentLanguage): string => {
    return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
        weekday: 'long',
    });
};
