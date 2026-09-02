import { Syne, Space_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({ subsets: ["latin"], variable: "--font-display", weight: ["700", "800"] });
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "700"] });

export const metadata = {
  title: "Hell Comics México",
  description: "Catálogo de cómics de Hell Comics México — pregunta por WhatsApp lo que te interese.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${syne.variable} ${spaceMono.variable}`}>
      <body className="min-h-screen bg-brand-dark text-white font-mono">{children}</body>
    </html>
  );
}
