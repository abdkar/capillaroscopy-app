/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          50: '#F8FAFC',  // slate-50
          100: '#E0F2FE', // sky-100
          200: '#BAE6FD', // sky-200
          300: '#7DD3FC', // sky-300
          400: '#38BDF8', // sky-400
          500: '#0EA5E9', // sky-500
          600: '#0891B2', // cyan-600 (Primary Brand)
          700: '#0E7490', // cyan-700
          800: '#155E75', // cyan-800
          900: '#164E63', // cyan-900
          950: '#083344', // cyan-950
        },
        accent: {
          50: '#ECFDF5',  // emerald-50
          100: '#D1FAE5', // emerald-100
          500: '#10B981', // emerald-500 (Positive/Accent)
          600: '#059669', // emerald-600
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
