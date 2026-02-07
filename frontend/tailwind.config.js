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
        dark: {
          'primary': '#0f172a',
          'secondary': '#1e293b',
          'tertiary': '#334155',
        }
      }
    },
  },
  plugins: [],
}

