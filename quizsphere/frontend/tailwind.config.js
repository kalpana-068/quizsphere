/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Atkinson Hyperlegible"', 'system-ui', 'Segoe UI', 'sans-serif'] },
      colors: {
        brand: { 50: '#effaf8', 100: '#d3f3ee', 500: '#14958a', 600: '#0f7a71', 700: '#0c625b' },
        paper: '#f6f7f4',
      },
    },
  },
  plugins: [],
};
