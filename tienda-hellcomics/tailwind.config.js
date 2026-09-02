/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta placeholder -- se reemplaza cuando compartan el logo/marca real.
        brand: {
          DEFAULT: "#e11d2e",
          dark: "#0c0c0f",
          surface: "#17171c",
          surface2: "#202028",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
