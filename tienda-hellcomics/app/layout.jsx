import { Inter } from "next/font/google";
import "./globals.css";

// Una sola familia para todo -- clara y legible (nombres/precios en la grilla,
// encabezados, todo). Pensado para un público de 30-50 años: nada de tipografía
// "de personalidad" que sacrifique legibilidad.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700", "800"] });

export const metadata = {
  title: "Hell Comics México",
  description: "Catálogo de cómics de Hell Comics México — pregunta por WhatsApp lo que te interese.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-brand-dark text-white font-sans">{children}</body>
    </html>
  );
}
