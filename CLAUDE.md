# Nebula Alarm

React + TypeScript + Vite 기반의 우주 테마 알람 시계 애플리케이션

## Commands

```bash
npm run dev      # 개발 서버 실행 (Vite)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 실행
npm run preview  # 빌드 결과 미리보기
```

## Architecture

```
src/
├── App.tsx              # 메인 앱 컴포넌트 (알람 상태 관리)
├── main.tsx             # 앱 엔트리 포인트
├── index.css            # 글로벌 스타일
├── components/
│   ├── Background.tsx   # Canvas 기반 성운 애니메이션
│   ├── ClockDial.tsx    # 드래그로 알람 설정하는 시계 다이얼
│   ├── AlarmRing.tsx    # 알람 울림 화면 (일출 시뮬레이션)
│   ├── MissionOverlay.tsx  # 기상 미션 (수학 문제)
│   ├── MorningDashboard.tsx # 아침 대시보드 (날씨/명언)
│   └── ShiftSettings.tsx   # 알람 설정 모달
├── hooks/
│   └── useAlarm.ts      # 알람 로직 커스텀 훅
└── utils/
    └── audio.ts         # Web Audio API 기반 오디오 엔진
```

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 7** - 빌드 도구
- **Tailwind CSS** - 커스텀 nebula 테마
- **date-fns** - 날짜 포매팅 (한국어 로케일)
- **lucide-react** - 아이콘

## Tailwind Theme

커스텀 `nebula` 컬러 팔레트:
- `nebula-900`: #0a0a1a (배경)
- `nebula-800`: #1a1a3a
- `nebula-500`: #6b4cff (프라이머리)
- `nebula-400`: #00f0ff (액센트)
- `nebula-100`: #e0e0ff

폰트: Inter (본문), Rajdhani (디스플레이)

## Key Features

- **알람 반복**: 매일 / 격일(2일 간격) 모드
- **기상 미션**: 수학 문제 풀이로 알람 해제
- **커스텀 사운드**: 사용자 오디오 파일 지원
- **일출 시뮬레이션**: 30초에 걸쳐 소리가 점점 커짐
- **스누즈**: 5분 후 다시 알람

## Code Conventions

- 컴포넌트: PascalCase (`ClockDial.tsx`)
- 훅: camelCase with `use` prefix (`useAlarm.ts`)
- 유틸리티: camelCase (`audio.ts`)
- 한국어 UI 텍스트 사용
