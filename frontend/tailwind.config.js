/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          black: '#0B0B0B',
          dark: '#121212',
          surface: '#1E1E1E',
          border: '#2A2A2A',
          muted: '#8E8E8E',
          light: '#E2E2E2',
        },
        caterpillar: {
          DEFAULT: '#FFCD00',
          dark: '#F2B705',
          gold: '#FFD700',
        },
        semantic: {
          emerald: '#10B981', // green for positive abonos
          red: '#EF4444',     // red for alert/overdue
          orange: '#F97316',  // orange for alerts
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
