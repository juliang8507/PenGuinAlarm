import React, { useState, useEffect, useMemo } from 'react';
import { t, type TranslationKey } from '../../utils/i18n';

interface TypingMissionProps {
    difficulty: 'easy' | 'medium' | 'hard';
    onComplete: () => void;
    onFail: () => void;
}

const getQuotes = (diff: 'easy' | 'medium' | 'hard'): string[] => {
    const quoteKeys: Record<'easy' | 'medium' | 'hard', TranslationKey[]> = {
        easy: ['typingQuoteEasy1', 'typingQuoteEasy2', 'typingQuoteEasy3'],
        medium: ['typingQuoteMedium1', 'typingQuoteMedium2', 'typingQuoteMedium3'],
        hard: ['typingQuoteHard1', 'typingQuoteHard2', 'typingQuoteHard3'],
    };
    return quoteKeys[diff].map(key => t(key));
};

const getRandomQuote = (diff: 'easy' | 'medium' | 'hard') => {
    const quotes = getQuotes(diff);
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
    const progress = useMemo(() => targetQuote.split('').map((char, idx) => input[idx] === char), [targetQuote, input]);

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">{t('typingMissionHeader')}</h2>
                <p className="text-white/70">{t('typeQuote')}</p>
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
                placeholder={t('typeHere')}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-nebula-500"
                autoFocus
                aria-label={t('typingMission')}
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
                {isCorrect ? t('missionComplete') : t('confirm')}
            </button>

            {/* Attempts Counter */}
            <p className="text-center text-white/50 text-sm">
                {t('attempts')}: {attempts} / {maxAttempts}
            </p>
        </div>
    );
};

export default TypingMission;
