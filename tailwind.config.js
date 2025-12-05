/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nebula: {
          900: '#0a0a1a', // Deep space
          800: '#1a1a3a',
          500: '#6b4cff', // Primary glow
          400: '#00f0ff', // Cyan accent
          100: '#e0e0ff', // Light nebula
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Rajdhani', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(10px, 20px)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'breathe-slow': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(-20px)', opacity: '0' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'breathe-slow': 'breathe-slow 4s ease-in-out infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
        sway: 'sway 3s ease-in-out infinite',
        'float-up': 'float-up 2s ease-out infinite',
      },
    },
  },
  plugins: [],
}
