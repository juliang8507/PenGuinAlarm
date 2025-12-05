import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Lightbulb, Grid3X3, Type, QrCode, Camera } from 'lucide-react';
import { t } from '../utils/i18n';
import type { MissionType, MissionDifficulty } from '../hooks/useAlarm';
import TypingMission from './missions/TypingMission';
import PhotoMission from './missions/PhotoMission';
import QRMission from './missions/QRMission';

interface MissionOverlayProps {
    onComplete: () => void;
    missionType?: MissionType;
    missionDifficulty?: MissionDifficulty;
    qrRegisteredCode?: string | null;
    onFallbackToMath?: () => void;
}

// ============= MATH MISSION =============
interface MathProblem {
    question: string;
    answer: number;
}

const createMathProblem = (difficulty: MissionDifficulty): MathProblem => {
    switch (difficulty) {
        case 'easy': {
            const a = Math.floor(Math.random() * 9) + 1; // 1-9
            const b = Math.floor(Math.random() * 9) + 1;
            const ops = ['+', '-'];
            const op = ops[Math.floor(Math.random() * ops.length)];
            const answer = op === '+' ? a + b : a - b;
            return { question: `${a} ${op} ${b}`, answer };
        }
        case 'medium': {
            const a = Math.floor(Math.random() * 90) + 10; // 10-99
            const b = Math.floor(Math.random() * 90) + 10;
            const ops = ['+', '-', '×'];
            const op = ops[Math.floor(Math.random() * ops.length)];
            let answer: number;
            if (op === '+') answer = a + b;
            else if (op === '-') answer = a - b;
            else answer = Math.floor(a / 10) * Math.floor(b / 10); // Simpler multiplication
            const displayQ = op === '×' ? `${Math.floor(a / 10)} × ${Math.floor(b / 10)}` : `${a} ${op} ${b}`;
            return { question: displayQ, answer };
        }
        case 'hard': {
            const a = Math.floor(Math.random() * 50) + 10;
            const b = Math.floor(Math.random() * 20) + 5;
            const c = Math.floor(Math.random() * 10) + 1;
            const patterns = [
                { q: `${a} + ${b} × ${c}`, ans: a + b * c },
                { q: `${a} - ${b} + ${c}`, ans: a - b + c },
                { q: `(${Math.floor(a / 5)} + ${Math.floor(b / 5)}) × ${c}`, ans: (Math.floor(a / 5) + Math.floor(b / 5)) * c },
            ];
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            return { question: pattern.q, answer: pattern.ans };
        }
        default:
            return { question: '5 + 3', answer: 8 };
    }
};

// ============= MEMORY MISSION =============
interface MemoryState {
    sequence: number[];
    phase: 'memorize' | 'recall';
    userInput: number[];
    countdown: number;
}

const createMemorySequence = (difficulty: MissionDifficulty): number[] => {
    const lengths = { easy: 4, medium: 6, hard: 8 };
    const length = lengths[difficulty];
    return Array.from({ length }, () => Math.floor(Math.random() * 9) + 1);
};

// ============= PATTERN MISSION =============
interface PatternProblem {
    sequence: number[];
    answer: number;
    hint: string;
}

const createPatternProblem = (difficulty: MissionDifficulty): PatternProblem => {
    const patterns: PatternProblem[] = [];

    if (difficulty === 'easy') {
        // Simple arithmetic sequences
        const start = Math.floor(Math.random() * 10) + 1;
        const diff = Math.floor(Math.random() * 5) + 1;
        const seq = Array.from({ length: 4 }, (_, i) => start + diff * i);
        patterns.push({
            sequence: seq,
            answer: start + diff * 4,
            hint: `+${diff}`,
        });
    } else if (difficulty === 'medium') {
        // Geometric or alternating
        const type = Math.random() > 0.5 ? 'geometric' : 'alternating';
        if (type === 'geometric') {
            const start = Math.floor(Math.random() * 3) + 2;
            const ratio = 2;
            const seq = Array.from({ length: 4 }, (_, i) => start * Math.pow(ratio, i));
            patterns.push({
                sequence: seq,
                answer: start * Math.pow(ratio, 4),
                hint: `×${ratio}`,
            });
        } else {
            const a = Math.floor(Math.random() * 5) + 1;
            const b = Math.floor(Math.random() * 5) + 6;
            const seq = [a, b, a + 2, b + 2];
            patterns.push({
                sequence: seq,
                answer: a + 4,
                hint: t('findPattern'),
            });
        }
    } else {
        // Fibonacci-like or squared
        const type = Math.random() > 0.5 ? 'fibonacci' : 'squared';
        if (type === 'fibonacci') {
            const seq = [1, 1, 2, 3, 5];
            patterns.push({
                sequence: seq,
                answer: 8,
                hint: 'a + b = c',
            });
        } else {
            const seq = [1, 4, 9, 16, 25];
            patterns.push({
                sequence: seq,
                answer: 36,
                hint: 'n²',
            });
        }
    }

    return patterns[Math.floor(Math.random() * patterns.length)];
};

// Helper to resolve random mission type
const resolveRandomMissionType = (type: MissionType): 'math' | 'memory' | 'puzzle' | 'typing' | 'qr' | 'photo' => {
    if (type === 'random') {
        const types: ('math' | 'memory' | 'puzzle' | 'typing' | 'photo')[] = ['math', 'memory', 'puzzle', 'typing', 'photo'];
        return types[Math.floor(Math.random() * types.length)];
    }
    return type;
};

// ============= MAIN COMPONENT =============
const MissionOverlay: React.FC<MissionOverlayProps> = ({
    onComplete,
    missionType = 'math',
    missionDifficulty = 'medium',
    qrRegisteredCode,
    onFallbackToMath,
}) => {
    // Resolve random mission type once on mount
    const [actualType] = useState(() => resolveRandomMissionType(missionType));

    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Math state
    const [mathProblem] = useState(() => createMathProblem(missionDifficulty));

    // Memory state
    const [memoryState, setMemoryState] = useState<MemoryState>(() => ({
        sequence: createMemorySequence(missionDifficulty),
        phase: 'memorize',
        userInput: [],
        countdown: missionDifficulty === 'easy' ? 5 : missionDifficulty === 'medium' ? 4 : 3,
    }));

    // Pattern state
    const [patternProblem] = useState(() => createPatternProblem(missionDifficulty));

    // Memory countdown timer
    useEffect(() => {
        if (actualType !== 'memory' || memoryState.phase !== 'memorize') return;
        if (memoryState.countdown <= 0) return;

        const timer = setTimeout(() => {
            setMemoryState((prev) => {
                const newCountdown = prev.countdown - 1;
                if (newCountdown <= 0) {
                    return { ...prev, countdown: 0, phase: 'recall' };
                }
                return { ...prev, countdown: newCountdown };
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [actualType, memoryState.phase, memoryState.countdown]);

    // Handle math/pattern submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userAnswer = parseInt(input);

        if (actualType === 'math') {
            if (userAnswer === mathProblem.answer) {
                onComplete();
            } else {
                setError(true);
                setInput('');
                setTimeout(() => setError(false), 500);
            }
        } else if (actualType === 'puzzle') {
            if (userAnswer === patternProblem.answer) {
                onComplete();
            } else {
                setError(true);
                setInput('');
                setTimeout(() => setError(false), 500);
            }
        }
    };

    // Handle memory tap
    const handleMemoryTap = useCallback((num: number) => {
        if (memoryState.phase !== 'recall') return;

        const nextInput = [...memoryState.userInput, num];
        const currentIndex = memoryState.userInput.length;

        if (num !== memoryState.sequence[currentIndex]) {
            setError(true);
            setMemoryState((prev) => ({ ...prev, userInput: [], phase: 'memorize', countdown: 3 }));
            setTimeout(() => setError(false), 500);
            return;
        }

        if (nextInput.length === memoryState.sequence.length) {
            onComplete();
        } else {
            setMemoryState((prev) => ({ ...prev, userInput: nextInput }));
        }
    }, [memoryState, onComplete]);

    const getMissionIcon = () => {
        switch (actualType) {
            case 'memory': return <Grid3X3 className="w-16 h-16 text-nebula-500 mb-4" />;
            case 'puzzle': return <Lightbulb className="w-16 h-16 text-nebula-500 mb-4" />;
            case 'typing': return <Type className="w-16 h-16 text-nebula-500 mb-4" />;
            case 'qr': return <QrCode className="w-16 h-16 text-nebula-500 mb-4" />;
            case 'photo': return <Camera className="w-16 h-16 text-nebula-500 mb-4" />;
            default: return <Brain className="w-16 h-16 text-nebula-500 mb-4" />;
        }
    };

    const getMissionTitle = () => {
        switch (actualType) {
            case 'memory': return t('memoryMission');
            case 'puzzle': return t('puzzleMission');
            case 'typing': return '타이핑 미션';
            case 'qr': return 'QR 코드 미션';
            case 'photo': return '사진 미션';
            default: return t('mathMission');
        }
    };

    // ============= RENDER MATH MISSION =============
    const renderMathMission = () => (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-8">
                <span className="text-5xl font-bold font-display tracking-wider">
                    {mathProblem.question} = ?
                </span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="number"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className={`w-full bg-black/30 border-2 rounded-xl px-4 py-4 text-center text-3xl font-bold focus:outline-none transition-colors ${error ? 'border-red-500 text-red-500 animate-shake' : 'border-white/20 focus:border-nebula-500'}`}
                    placeholder={t('answer')}
                    autoFocus
                />
                <button
                    type="submit"
                    className="w-full py-4 bg-nebula-500 hover:bg-nebula-400 text-white font-bold rounded-xl shadow-lg transition-colors"
                >
                    {t('submit')}
                </button>
            </form>
        </div>
    );

    // ============= RENDER MEMORY MISSION =============
    const renderMemoryMission = () => (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            {memoryState.phase === 'memorize' ? (
                <>
                    <div className="text-center mb-4">
                        <p className="text-nebula-300 mb-2">{t('memorizeSequence')}</p>
                        <p className="text-nebula-400 text-sm">{t('timeRemaining')}: {memoryState.countdown}s</p>
                    </div>
                    <div className="flex justify-center gap-3 flex-wrap">
                        {memoryState.sequence.map((num, idx) => (
                            <div
                                key={idx}
                                className="w-12 h-12 bg-nebula-500 rounded-xl flex items-center justify-center text-2xl font-bold animate-pulse"
                            >
                                {num}
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <div className="text-center mb-4">
                        <p className="text-nebula-300 mb-2">{t('tapNumbers')}</p>
                        <div className="flex justify-center gap-2 mb-4">
                            {memoryState.sequence.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${idx < memoryState.userInput.length ? 'bg-nebula-500' : 'bg-white/10'}`}
                                >
                                    {idx < memoryState.userInput.length ? memoryState.userInput[idx] : '?'}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleMemoryTap(num)}
                                className={`w-full aspect-square rounded-xl text-2xl font-bold transition-all ${error ? 'bg-red-500/30 border-red-500' : 'bg-white/10 hover:bg-nebula-500/50 border-white/20'} border-2`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );

    // ============= RENDER PATTERN MISSION =============
    const renderPatternMission = () => (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-6">
                <p className="text-nebula-300 mb-4">{t('findPattern')}</p>
                <div className="flex justify-center gap-3 flex-wrap mb-4">
                    {patternProblem.sequence.map((num, idx) => (
                        <div
                            key={idx}
                            className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-xl font-bold"
                        >
                            {num}
                        </div>
                    ))}
                    <div className="w-12 h-12 bg-nebula-500/30 border-2 border-nebula-500 rounded-xl flex items-center justify-center text-xl font-bold">
                        ?
                    </div>
                </div>
                {showHint && (
                    <p className="text-nebula-400 text-sm animate-in fade-in">{t('hint')}: {patternProblem.hint}</p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="number"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className={`w-full bg-black/30 border-2 rounded-xl px-4 py-4 text-center text-3xl font-bold focus:outline-none transition-colors ${error ? 'border-red-500 text-red-500 animate-shake' : 'border-white/20 focus:border-nebula-500'}`}
                    placeholder={t('nextNumber')}
                    autoFocus
                />
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setShowHint(true)}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
                    >
                        {t('hint')}
                    </button>
                    <button
                        type="submit"
                        className="flex-1 py-3 bg-nebula-500 hover:bg-nebula-400 text-white font-bold rounded-xl shadow-lg transition-colors"
                    >
                        {t('submit')}
                    </button>
                </div>
            </form>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-nebula-900 text-white p-6">
            <div className="flex flex-col items-center mb-8">
                {getMissionIcon()}
                <h2 className="text-3xl font-display font-bold">{t('wakeMission')}</h2>
                <p className="text-nebula-300">{t('solveToWake')}</p>
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs bg-nebula-500/20 text-nebula-300 px-2 py-1 rounded">
                        {getMissionTitle()}
                    </span>
                    <span className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded">
                        {t(missionDifficulty)}
                    </span>
                </div>
            </div>

            {actualType === 'math' && renderMathMission()}
            {actualType === 'memory' && renderMemoryMission()}
            {actualType === 'puzzle' && renderPatternMission()}
            {actualType === 'typing' && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                    <TypingMission
                        difficulty={missionDifficulty}
                        onComplete={onComplete}
                        onFail={() => setError(true)}
                    />
                </div>
            )}
            {actualType === 'qr' && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                    {qrRegisteredCode ? (
                        <QRMission
                            registeredCode={qrRegisteredCode}
                            onComplete={onComplete}
                            onFail={() => setError(true)}
                        />
                    ) : (
                        <div className="text-center space-y-4">
                            <p className="text-white/70">{t('noQrRegistered')}</p>
                            <button
                                onClick={onFallbackToMath}
                                className="px-6 py-3 bg-nebula-500 text-white rounded-xl hover:bg-nebula-400 transition-colors"
                            >
                                {t('useMathMission')}
                            </button>
                        </div>
                    )}
                </div>
            )}
            {actualType === 'photo' && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                    <PhotoMission
                        onComplete={onComplete}
                    />
                </div>
            )}

            {error && (
                <p className="mt-4 text-red-400 font-medium animate-in fade-in">{t('tryAgain')}</p>
            )}
        </div>
    );
};

export default MissionOverlay;
