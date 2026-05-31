/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        light: '#F8FAFC',
        navy: '#1E293B',
        orange: '#F59E0B',
      }
    }
  },
  plugins: [],
}