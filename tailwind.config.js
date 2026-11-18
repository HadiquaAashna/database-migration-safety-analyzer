/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        dev: {
          bg: '#0B0F19',
          surface: '#111827',
          surfaceSubtle: '#182234',
          border: '#1E293B',
          borderHover: '#334155',
          text: '#F1F5F9',
          muted: '#94A3B8',
          dim: '#64748B',
        },
        risk: {
          critical: '#EF4444',
          high: '#F97316',
          medium: '#F59E0B',
          low: '#10B981',
          info: '#3B82F6',
        }
      }
    },
  },
  plugins: [],
}
