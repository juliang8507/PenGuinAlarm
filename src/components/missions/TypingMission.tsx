import React, { useState, useEffect } from 'react';


interface TypingMissionProps {
    difficulty: 'easy' | 'medium' | 'hard';
    onComplete: () => void;
    onFail: () => void;
}

const QUOTES = {
    easy: [
        '오늘도 좋은 하루 되세요!',
        '새로운 시작을 응원합니다.',
        '행복한 하루 보내세요.',
    ],
    medium: [
        '어제의 나보다 오늘의 내가 더 성장하길.',
        '작은 노력이 큰 변화를 만들어 갑니다.',
        '매일 조금씩 앞으로 나아가면 됩니다.',
    ],
    hard: [
        '성공은 열정을 잃지 않고 실패에서 실패로 나아가는 것이다.',
        '인생에서 가장 중요한 것은 자신을 믿고 끝까지 포기하지 않는 것이다.',
        '꿈을 이루는 가장 좋은 방법은 깨어나는 것이다.',
    ],
};

const getRandomQuote = (diff: 'easy' | 'medium' | 'hard') => {
    const quotes = QUOTES[diff];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

const TypingMission: React.FC<TypingMissionProps> = ({ difficulty, onComplete, onFail }) => {
    const [targetQuote, setTargetQuote] = useState(() => getRandomQuote(difficulty));

    useEffect(() => {
        setTargetQuote(getRandomQuote(difficulty));
    }, [difficulty]);

    const [input, setInput] = useState('');
    const [attempts, setAttempts] = useState(0);
    const maxAttempts = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 3 : 2;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = () => {
        if (input.trim() === targetQuote) {
            onComplete();
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            if (newAttempts >= maxAttempts) {
                onFail();
            } else {
                setInput('');
            }
        }
    };

    const isCorrect = input === targetQuote;
    const progress = targetQuote.split('').map((char, idx) => input[idx] === char);

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">✍️ 타이핑 미션</h2>
                <p className="text-white/70">아래 문장을 정확히 입력하세요</p>
            </div>

            {/* Target Quote */}
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                <p className="text-lg text-white font-mono leading-relaxed">
                    {targetQuote.split('').map((char, idx) => (
                        <span
                            key={idx}
                            className={
                                idx < input.length
                                    ? progress[idx]
                                        ? 'text-green-400'
                                        : 'text-red-400'
                                    : 'text-white'
                            }
                        >
                            {char}
                        </span>
                    ))}
                </p>
            </div>

            {/* Input Field */}
            <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="여기에 입력하세요..."
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-nebula-500"
                autoFocus
                aria-label="타이핑 입력"
            />

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={input.length === 0}
                className={`w-full py-4 rounded-xl font-bold transition-all ${isCorrect
                    ? 'bg-green-500 text-white'
                    : 'bg-nebula-500 text-white hover:bg-nebula-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {isCorrect ? '✓ 완료!' : '확인'}
            </button>

            {/* Attempts Counter */}
            <p className="text-center text-white/50 text-sm">
                시도: {attempts} / {maxAttempts}
            </p>
        </div>
    );
};

export default TypingMission;
