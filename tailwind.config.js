/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#171412',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f47b20',
          600: '#df6815',
          700: '#bd5110',
          800: '#963f10',
          900: '#7c3410',
        },
        success: {
          50: '#f3faf5', 100: '#e1f1e5', 200: '#c4e3cc', 300: '#98cfa6', 400: '#6bb77b',
          500: '#4d9e61', 600: '#3f8f5b', 700: '#347548', 800: '#2c5e3d', 900: '#244d33',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
        },
        error: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
          500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d',
        },
      },
      boxShadow: {
        soft: '0 2px 8px rgba(41,37,36,0.06)',
        card: '0 8px 24px rgba(41,37,36,0.08)',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out', 'fade-up': 'fade-up 0.5s ease-out',
        'radar-sweep': 'radar-sweep 4s linear infinite', 'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'radar-sweep': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'pulse-ring': { '0%': { transform: 'scale(1)', opacity: '1' }, '100%': { transform: 'scale(2.5)', opacity: '0' } },
        'ping-slow': { '0%': { transform: 'scale(1)', opacity: '1' }, '75%, 100%': { transform: 'scale(2)', opacity: '0' } },
      },
    },
  },
  plugins: [],
};
