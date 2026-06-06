import Lottie from "lottie-react";
import animationData from "../assets/loader.json";

// Loader Lottie reutilizable.
// Props:
//   size      → ancho en px (default 120). El alto se ajusta proporcional.
//   message   → texto opcional debajo de la animación.
//   inline    → si true, no centra ni le pone padding (úsalo dentro de botones, badges, etc.)
//   fullScreen→ si true, ocupa toda la pantalla con overlay oscuro.
export default function Loader({ size = 120, message, inline = false, fullScreen = false }) {
  const anim = (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      style={{ width: size, height: "auto" }}
    />
  );

  if (inline) return anim;

  if (fullScreen) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "rgba(10,10,15,0.92)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 12,
      }}>
        {anim}
        {message && (
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 12, color: "#FFE000",
            letterSpacing: 2, textTransform: "uppercase",
          }}>
            {message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 8, padding: "24px 0",
    }}>
      {anim}
      {message && (
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11, color: "#888", letterSpacing: 1.5,
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
