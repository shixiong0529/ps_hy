/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ps: {
          bg: '#0b0d11',
          panel: '#14171e',
          panel2: '#1a1e27',
          panel3: '#212632',
          border: '#272d3a',
          border2: '#333b4b',
          text: '#d7dce5',
          dim: '#98a2b3',
          muted: '#6b7484',
          accent: '#3d7eff',
          accent2: '#5a90ff',
          accentSoft: '#1c2a45',
          danger: '#ef4444',
          ok: '#22c55e',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs: ['11px', '16px'],
sm: ['12px', '18px'],
      },
      boxShadow: {
        panel: '0 8px 28px rgba(0,0,0,.45)',
        pop: '0 12px 40px rgba(0,0,0,.6)',
      },
    },
  },
  plugins: [],
}
