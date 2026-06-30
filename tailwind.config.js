/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0b1f3a', 800: '#102844', 700: '#16314f', 600: '#1d3b5c' },
        signal: { DEFAULT: '#f5a623', 600: '#e0931a', 300: '#fbcd7a' },
        paper: '#f7f8fa',
        line: '#e3e7ec',
        good: '#1f9d6b',
        warn: '#d4761a',
        bad: '#d24545'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: { card: '0 1px 2px rgba(11,31,58,.06), 0 4px 16px rgba(11,31,58,.05)' }
    }
  },
  plugins: []
};
