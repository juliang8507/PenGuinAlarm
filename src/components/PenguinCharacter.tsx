import React, { useMemo } from 'react';

interface PenguinCharacterProps {
    state: 'idle' | 'sleeping' | 'waking';
    className?: string;
}

const PenguinCharacter: React.FC<PenguinCharacterProps> = ({ state, className = '' }) => {
    const { imageSrc, animationClass } = useMemo(() => {
        switch (state) {
            case 'sleeping':
                return {
                    imageSrc: '/assets/penguin/sleeping.png',
                    animationClass: 'animate-breathe-slow'
                };
            case 'waking':
                return {
                    imageSrc: '/assets/penguin/waking.png',
                    animationClass: 'animate-bounce-gentle'
                };
            case 'idle':
            default:
                return {
                    imageSrc: '/assets/penguin/idle.png',
                    animationClass: 'animate-sway'
                };
        }
    }, [state]);

    return (
        <div className={`relative ${className}`}>
            <img
                src={imageSrc}
                alt="Cute Penguin"
                className={`w-full h-full object-contain drop-shadow-xl transition-all duration-500 ${animationClass}`}
            />
            {state === 'sleeping' && (
                <div className="absolute -top-4 right-0 animate-float-up text-2xl font-bold text-white/80">
                    Zzz...
                </div>
            )}
        </div>
    );
};

export default PenguinCharacter;
