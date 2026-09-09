/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#050811',
          900: '#0a0f1d',
          850: '#0f172a',
          800: '#151f38',
          700: '#1e2d4f',
          600: '#2b3f6c',
          teal: '#00f2fe',
          cyan: '#00d2ff',
          neon: '#00ffc4',
          crimson: '#ff0055',
          blood: '#dc2626',
          amber: '#f59e0b',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 0.8, filter: 'drop-shadow(0 0 8px rgba(0, 242, 254, 0.4))' },
          '50%': { opacity: 1, filter: 'drop-shadow(0 0 16px rgba(0, 242, 254, 0.8))' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
    },
  },
  plugins: [],
}
