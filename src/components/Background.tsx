import React, { useEffect, useRef } from 'react';

interface BackgroundProps {
    theme?: 'default' | 'penguin';
    timeOfDay?: 'day' | 'night';
}

const Background: React.FC<BackgroundProps> = ({ theme = 'default', timeOfDay = 'day' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Default Nebula Theme - useEffect must be called unconditionally
    useEffect(() => {
        // Skip canvas animation for penguin theme
        if (theme === 'penguin') return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener('resize', resize);
        resize();

        const orbs = [
            { x: Math.random() * width, y: Math.random() * height, r: 300, color: 'rgba(107, 76, 255, 0.15)', vx: 0.5, vy: 0.2 }, // Purple
            { x: Math.random() * width, y: Math.random() * height, r: 400, color: 'rgba(0, 240, 255, 0.1)', vx: -0.3, vy: 0.4 }, // Cyan
            { x: Math.random() * width, y: Math.random() * height, r: 350, color: 'rgba(26, 26, 58, 0.5)', vx: 0.2, vy: -0.2 }, // Dark Blue
        ];

        const animate = () => {
            ctx.fillStyle = '#0a0a1a'; // Nebula 900
            ctx.fillRect(0, 0, width, height);

            orbs.forEach(orb => {
                orb.x += orb.vx;
                orb.y += orb.vy;

                if (orb.x < -orb.r || orb.x > width + orb.r) orb.vx *= -1;
                if (orb.y < -orb.r || orb.y > height + orb.r) orb.vy *= -1;

                const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
                gradient.addColorStop(0, orb.color);
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, [theme]);

    // Penguin Theme Background
    if (theme === 'penguin') {
        const bgImage = timeOfDay === 'day' ? '/assets/penguin/bg-day.png' : '/assets/penguin/bg-night.png';
        const fallbackBg = timeOfDay === 'day' ? 'bg-slate-100' : 'bg-nebula-900';

        return (
            <div className={`fixed inset-0 z-[-1] w-full h-full overflow-hidden pointer-events-none ${fallbackBg}`}>
                <img
                    src={bgImage}
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
                />
                <div className="absolute inset-0 bg-white/5 pointer-events-none" />
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-[-1] w-full h-full pointer-events-none"
        />
    );
};

export default Background;
