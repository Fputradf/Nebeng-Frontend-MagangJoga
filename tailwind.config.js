/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Kanvas halaman: netral sedikit hangat, bukan krem
        canvas: '#f6f6f3',
        // Aksen: hanya untuk titik tujuan pada motif rute, bukan untuk teks
        accent: '#74b4d9',
        brand: {
          50: '#f0f4f8',
          100: '#e0e8f0',
          200: '#c0d0e0',
          300: '#a0b8d0',
          400: '#80a0c0',
          500: '#10367d',
          600: '#0c2c66',
          700: '#0a1e3c',
          800: '#061528',
          900: '#030d1a',
          950: '#020612',
        },
        slate: {
          canvas: '#f8fafc',
          card: '#ffffff',
          subtle: '#f1f5f9',
          border: '#e2e8f0',
        },
        status: {
          success: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
          warning: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
          danger: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
          info: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
        }
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'card': '0 0 0 1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 0 0 1px rgba(0, 0, 0, 0.04), 0 4px 8px -2px rgba(0, 0, 0, 0.04)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Judul: Plus Jakarta Sans (humanis, ramah, berasal dari Jakarta)
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        // Titik bergerak dari asal ke tujuan pada indikator memuat
        rute: {
          '0%': { left: '0.25rem' },
          '100%': { left: 'calc(100% - 0.75rem)' },
        },
      },
      animation: {
        rute: 'rute 1.2s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};