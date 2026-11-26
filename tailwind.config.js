/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mesma escala de superfícies de src/index.css: página < painel < cartão.
        ink: '#0b101b',
        panel: '#1a2130',
        panel2: '#232c3e',
        line: '#1e2431',
        brand: '#ff2d3f',
        red: '#ff2d3f',
        gold: '#ffc857',
        good: '#22e3a0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 18px 50px rgba(255,45,63,.22)',
        card: '0 10px 30px rgba(0,0,0,.35)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '.55', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        popIn: {
          '0%': { transform: 'scale(.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        riseIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        winFlash: {
          '0%,100%': { filter: 'brightness(1)' },
          '45%': { filter: 'brightness(1.55) saturate(1.3)' },
        },
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        pulseGlow: 'pulseGlow 2.6s ease-in-out infinite',
        popIn: 'popIn .22s ease-out both',
        riseIn: 'riseIn .3s ease-out both',
        spinSlow: 'spinSlow 9s linear infinite',
        winFlash: 'winFlash .6s ease-out',
      },
    },
  },
  plugins: [],
}
