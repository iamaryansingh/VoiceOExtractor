/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          darkBg: '#090D16',       // Deepest slate background
          cardBg: 'rgba(21, 29, 45, 0.4)', // Semi-transparent glass background
          cardBorder: 'rgba(255, 255, 255, 0.08)',
          glowViolet: 'rgba(139, 92, 246, 0.15)',
          glowIndigo: 'rgba(99, 102, 241, 0.15)',
          accentViolet: '#A78BFA',
          accentIndigo: '#818CF8',
          textMuted: '#94A3B8',
          textLight: '#F8FAFC'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.3))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.6))' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(15px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      }
    },
  },
  plugins: [],
}
