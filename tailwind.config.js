/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        este: {
          blue: "#2E86AB",
          dark: "#f8fafc",
          panel: "#ffffff"
        }
      }
    },
  },
  plugins: [],
}
