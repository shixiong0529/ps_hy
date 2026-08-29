/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ps: {
          bg: 'rgb(var(--ps-bg) / <alpha-value>)',
          panel: 'rgb(var(--ps-panel) / <alpha-value>)',
          panel2: 'rgb(var(--ps-panel2) / <alpha-value>)',
          panel3: 'rgb(var(--ps-panel3) / <alpha-value>)',
          border: 'rgb(var(--ps-border) / <alpha-value>)',
          border2: 'rgb(var(--ps-border2) / <alpha-value>)',
          text: 'rgb(var(--ps-text) / <alpha-value>)',
          dim: 'rgb(var(--ps-dim) / <alpha-value>)',
          muted: 'rgb(var(--ps-muted) / <alpha-value>)',
          accent: 'rgb(var(--ps-accent) / <alpha-value>)',
          accent2: 'rgb(var(--ps-accent2) / <alpha-value>)',
          accentSoft: 'rgb(var(--ps-accent-soft) / <alpha-value>)',
          danger: 'rgb(var(--ps-danger) / <alpha-value>)',
          ok: 'rgb(var(--ps-ok) / <alpha-value>)',
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
        '2xs': ['11px', '15px'],
        xs: ['12px', '17px'],
        sm: ['14px', '20px'],
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        pop: 'var(--shadow-pop)',
      },
    },
  },
  plugins: [],
}
