/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Tomada del logo: fondo negro, fuego naranja/rojo, calavera con ojos ámbar.
        brand: {
          DEFAULT: "#ff5e14",       // naranja fuego -- botones, precios, acentos
          dark: "#0a0a0a",          // fondo, igual que el logo
          surface: "#18130f",       // gris cálido en vez de frío, para que combine con el fuego
          surface2: "#241a12",
          "flame-start": "#7c1d1d", // rojo profundo del borde de las llamas
          "flame-end": "#facc15",   // amarillo de la punta caliente
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
